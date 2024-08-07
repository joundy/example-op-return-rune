import {
  valueReturn,
  Column,
  ptrToString,
  getResultFromJson,
} from "@east-bitcoin-lib/smartindex-sdk/assembly";
import { getTxsByBlockHeight } from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";
import { RuneTransaction, Vin } from "./transaction";
import { outpoints, runeEntries, stateTable } from "./tables";
import { RuneId } from "./runeId";
import { u128 } from "as-bignum/assembly";
import { Option } from "./option";
import { OutpointEntry } from "./outpointEntry";
import { RunestoneParser } from "./runestone";
import { decodeHex } from "./utils";
import { Cenotaph, Runestone } from "./artifact";
import { Network } from "./constants";
import { Rune } from "./rune";
import { RuneEntry } from "./runeEntry";
import { Etching } from "./etching";
export { allocate } from "@east-bitcoin-lib/smartindex-sdk/assembly/external";

// TODO: remove hardcoded network
const NETWORK = Network.Regtest;

class Burned {
  rune: RuneId;
  count: u128;

  constructor(rune: RuneId, count: u128) {
    this.rune = rune;
    this.count = count;
  }

  static default(): Burned {
    return changetype<Burned>(0);
  }
}

class RuneUpdater {
  runeTx: RuneTransaction;

  etching: Option<Etching>;
  unallocated: Map<RuneId, u128>;
  allocated: Array<Map<RuneId, u128>>;
  minted: u128;
  burned: Burned[];

  constructor(runeTx: RuneTransaction) {
    this.runeTx = runeTx;

    this.etching = Option.None(Etching.default());
    this.unallocated = _getUnallocated(runeTx.vins);
    this.allocated = runeTx.vouts.map((): Map<RuneId, u128> => {
      return new Map<RuneId, u128>();
    });

    this.minted = u128.from(0);
    this.burned = [];
  }

  static default(): RuneUpdater {
    return changetype<RuneUpdater>(0);
  }

  allocate(
    runeId: RuneId,
    balance: u128,
    amount: u128,
    output: u32,
  ): Option<u128> {
    if (!u128.gt(amount, u128.from(0))) {
      return Option.None(u128.from(0));
    }
    balance = u128.sub(balance, amount);

    const outputAllocated = this.allocated[output];
    let outputAmount = u128.from(0);
    if (outputAllocated.has(runeId)) {
      outputAmount = u128.add(outputAllocated.get(runeId), amount);
    }

    this.allocated[output].set(runeId, outputAmount);
    return Option.Some(balance);
  }

  index(): Option<RuneUpdater> {
    const runeData = this.runeTx.runeData;
    if (!runeData.isSome()) {
      return Option.None(RuneUpdater.default());
    }

    const artifact = RunestoneParser.dechiper(decodeHex(runeData.unwrap()));

    if (artifact instanceof Cenotaph) {
      // TODO:
      // - etching
      // - flaw
      // - mint
      throw new Error("errors.cenotaph");
    }

    const runestone = artifact as Runestone;

    // MINT
    if (runestone.mint.isSome()) {
      const runeId = runestone.mint.unwrap();
      const amount = this.mint(runeId);
      if (amount.isSome() && this.unallocated.has(runeId)) {
        let prev = this.unallocated.get(runeId);
        this.unallocated.set(runeId, u128.add(prev, amount.unwrap()));
      }
    }

    // CHECK IS ETCHED
    const etched = this.etched(runestone);

    // PREMINE
    if (etched.isSome()) {
      if (runestone.etching.unwrap().premine.isSome()) {
        const runeId = new RuneId(this.runeTx.blockHeight, this.runeTx.index);
        if (this.unallocated.has(runeId)) {
          let prev = this.unallocated.get(runeId);
          this.unallocated.set(
            runeId,
            u128.add(prev, runestone.etching.unwrap().premine.unwrap()),
          );
        }
      }
    }

    // EDICTS / TRANSFERS
    for (let i = 0; i < runestone.edicts.length; i++) {
      const edict = runestone.edicts[i];
      if (edict.output >= <u32>this.runeTx.vouts.length) {
        // TODO: validate the edict output when parsing the data
        throw new Error("errors.edict output is not valid");
      }

      let _runeId = Option.None(RuneId.default());
      if (edict.runeId.tx === 0 && edict.runeId.block === 0) {
        if (etched.isSome()) {
          _runeId = Option.Some(
            new RuneId(this.runeTx.blockHeight, this.runeTx.index),
          );
        } else {
          continue;
        }
      } else {
        _runeId = Option.Some(edict.runeId);
      }
      const runeId = _runeId.unwrap();

      let _balance = Option.None(u128.from(0));
      if (this.unallocated.has(runeId)) {
        _balance = Option.Some(this.unallocated.get(runeId));
      } else {
        continue;
      }
      const balance = _balance.unwrap();

      if (edict.output === <u32>this.runeTx.vouts.length) {
        // TODO: handle divide balance into all outputs
      } else {
        let amount = edict.amount;
        if (u128.eq(amount, u128.from(0)) || u128.lt(balance, amount)) {
          amount = balance;
        }

        this.allocate(runeId, balance, amount, edict.output);
      }
    }

    if (etched.isSome()) {
      this.etching = runestone.etching;
    }

    // TODO:
    // - handle burned
    // - pointer pointing into ...

    return Option.None(RuneUpdater.default());
  }

  private mint(runeId: RuneId): Option<u128> {
    const runeEntry = RuneEntry.getByRuneId(runeId);
    if (runeEntry.isNone()) {
      return Option.Some(u128.from(0));
    }

    const amount = runeEntry.unwrap().mintable(this.runeTx.blockHeight);
    if (amount.isNone()) {
      return Option.Some(u128.from(0));
    }

    this.minted = u128.from(1);

    return amount;
  }

  private etched(runestone: Runestone): Option<Rune> {
    // TODO: cenotapth

    let rune = Option.None(Rune.default());
    if (runestone.etching.isSome()) {
      rune = runestone.etching.unwrap().rune;
    }

    if (rune.isSome()) {
      const minimum = Rune.minimumAtHeight(
        NETWORK,
        <u32>this.runeTx.blockHeight,
      );

      if (u128.lt(rune.unwrap().value, minimum.value)) {
        return Option.None(Rune.default());
      }
      if (rune.unwrap().isReserved()) {
        return Option.None(Rune.default());
      }
      if (RuneEntry.getByRune(rune.unwrap()).isSome()) {
        return Option.None(Rune.default());
      }

      // TODO:
      // validate commit
    } else {
      // TODO: count reserved rune
      rune = Option.Some(
        Rune.reserved(new RuneId(this.runeTx.blockHeight, this.runeTx.index)),
      );
    }

    return Option.Some(rune.unwrap());
  }
}

function _getUnallocated(vins: Vin[]): Map<RuneId, u128> {
  const result = new Map<RuneId, u128>();

  for (let i = 0; i < vins.length; i++) {
    const vin = vins[i];
    const entries = OutpointEntry.get(vin.txHash, vin.index);
    if (entries.isNone()) {
      continue;
    }

    for (let j = 0; j < entries.unwrap().length; j++) {
      const entry = entries.unwrap()[j];
      result.set(new RuneId(entry.block, entry.tx), entry.amount);
    }
  }

  return result;
}

function _processRune(runeTx: RuneTransaction): void {
  const runeUpdater = new RuneUpdater(runeTx);
  runeUpdater.index();
}

export function init(): void {
  stateTable.init("indexed_block_height");
  stateTable.insert([
    new Column("id", "0"),
    new Column("indexed_block_height", "0"),
  ]);

  runeEntries.init("");
  outpoints.init("");
}

export function getIndexedBlock(): void {
  const latestBlock: string = getResultFromJson(
    stateTable.select([new Column("id", "0")]),
    "indexed_block_height",
    "string",
  );
  valueReturn(latestBlock);
}

export function index(from_ptr: i32, to_ptr: i32): void {
  const fromBlock: i64 = i64(parseInt(ptrToString(from_ptr)));
  const toBlock: i64 = i64(parseInt(ptrToString(to_ptr)));

  for (let i = fromBlock; i <= toBlock; i++) {
    const txs = getTxsByBlockHeight(i);
    for (let j = 0; j < txs.length; j++) {
      const runeTransaction = RuneTransaction.fromTransaction(i, j, txs[j]);
      _processRune(runeTransaction);
    }

    stateTable.update(
      [new Column("id", "0")],
      [new Column("indexed_block_height", i.toString())],
    );
  }
}
