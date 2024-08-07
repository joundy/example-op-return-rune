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

  unallocated: Map<RuneId, u128>;
  allocated: Array<Map<RuneId, u128>>;
  minted: u128;
  burned: Burned[];

  constructor(runeTx: RuneTransaction) {
    this.runeTx = runeTx;

    this.unallocated = _getUnallocated(runeTx.vins);
    this.allocated = [];
    this.minted = u128.from(0);
    this.burned = [];
  }

  static default(): RuneUpdater {
    return changetype<RuneUpdater>(0);
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

    const runeId = new RuneId(this.runeTx.blockHeight, this.runeTx.index);

    const runestone = artifact as Runestone;
    if (runestone.mint.isSome()) {
      const runeId = runestone.mint.unwrap();
      const amount = this.mint(runeId);
      if (amount.isSome()) {
        let prev = this.unallocated.get(runeId);
        this.unallocated.set(runeId, u128.add(prev, amount.unwrap()));
      }
    }

    const etched = this.etched(runestone);

    if (etched.isSome()) {
      if (runestone.etching.unwrap().premine.isSome()) {
        let prev = this.unallocated.get(runeId);
        this.unallocated.set(
          runeId,
          u128.add(prev, runestone.etching.unwrap().premine.unwrap()),
        );
      }
    }

    return Option.None(RuneUpdater.default());
  }

  commit(): void {
    // TODO: commit transaction
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
  runeUpdater.commit();
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
