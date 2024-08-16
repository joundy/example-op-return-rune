import {
  valueReturn,
  Column,
  ptrToString,
  getResultFromJson,
} from "@east-bitcoin-lib/smartindex-sdk/assembly";
import { getTxsByBlockHeight } from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";
import { RuneTransaction, Vin } from "./transaction";
import { outpoints, runeEntries, stateTable } from "./tables";
import { RuneId, RuneIdKey } from "./runeId";
import { u128 } from "as-bignum/assembly";
import { Option } from "./option";
import { OutpointEntry } from "./outpointEntry";
import { RunestoneParser } from "./runestone";
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
  unallocated: Map<RuneIdKey, u128>;
  allocated: Array<Map<RuneIdKey, u128>>;
  minted: Option<RuneId>;
  burned: Burned[];

  constructor(runeTx: RuneTransaction) {
    this.runeTx = runeTx;

    this.etching = Option.None(Etching.default());
    this.unallocated = _getUnallocated(runeTx.vins);
    this.allocated = runeTx.vouts.map((): Map<RuneIdKey, u128> => {
      return new Map<RuneIdKey, u128>();
    });

    this.minted = Option.None(RuneId.default());
    this.burned = [];
  }

  static default(): RuneUpdater {
    return changetype<RuneUpdater>(0);
  }

  getUnallocatedBalance(runeId: RuneId): Option<u128> {
    let balance = Option.None(u128.from(0));
    if (this.unallocated.has(runeId.toKey())) {
      balance = Option.Some(this.unallocated.get(runeId.toKey()));
    }

    return balance;
  }

  allocate(runeId: RuneId, _amount: u128, output: u32): void {
    const _balance = this.getUnallocatedBalance(runeId);
    let amount = _amount;
    if (u128.eq(amount, u128.from(0)) || u128.lt(_balance.unwrap(), amount)) {
      amount = _balance.unwrap();
    }

    if (_balance.isNone()) {
      return;
    }
    const remainingBalance = u128.sub(_balance.unwrap(), amount);
    if (u128.eq(remainingBalance, u128.from(0))) {
      this.unallocated.delete(runeId.toKey());
    } else {
      this.unallocated.delete(runeId.toKey());
      this.unallocated.set(runeId.toKey(), remainingBalance);
    }

    const outputAllocated = this.allocated[output];
    let outputAmount = amount;
    if (outputAllocated.has(runeId.toKey())) {
      outputAmount = u128.add(outputAllocated.get(runeId.toKey()), amount);
    }

    // consoleLog(`ALLOCATE REMAINING_ALANCE: ${remainingBalance.toString()}`);
    // consoleLog(`ALLOCATE OUTPUT_AMOUNT: ${outputAmount.toString()}`);

    this.allocated[output].set(runeId.toKey(), outputAmount);
  }

  index(): void {
    const unallocatedKeys = this.unallocated.keys();
    for (let i = 0; i < unallocatedKeys.length; i++) {
      const key = unallocatedKeys[i];
      const runeId = RuneId.fromKey(key);
      // consoleLog("=== UNALLOCATED DATA");
      // consoleLog(`BLOCK: ${runeId.block}`);
      // consoleLog(`TX: ${runeId.tx}`);
      // consoleLog(`AMOUNT: ${this.unallocated.get(key)}`);
      // consoleLog("=== END UNALLOCATED DATA");
    }

    const runeData = this.runeTx.runeData;
    if (!runeData.isSome()) {
      return;
    }

    const artifact = RunestoneParser.dechiper(runeData.unwrap());
    if (artifact instanceof Cenotaph) {
      // TODO:
      // - etching
      // - flaw
      // - mint
      return;
      // throw new Error("errors.cenotaph");
    }

    const runestone = artifact as Runestone;

    // MINT
    if (runestone.mint.isSome()) {
      const runeId = runestone.mint.unwrap();
      const amount = this.mint(runeId);

      if (amount.isSome()) {
        if (this.unallocated.has(runeId.toKey())) {
          let prev = this.unallocated.get(runeId.toKey());
          this.unallocated.set(runeId.toKey(), u128.add(prev, amount.unwrap()));
        } else {
          this.unallocated.set(runeId.toKey(), amount.unwrap());
        }
      }
    }
    // CHECK IS ETCHED
    const etched = this.etched(runestone);
    // PREMINE
    if (etched.isSome()) {
      if (runestone.etching.unwrap().premine.isSome()) {
        const runeId = new RuneId(this.runeTx.blockHeight, this.runeTx.index);
        if (this.unallocated.has(runeId.toKey())) {
          let prev = this.unallocated.get(runeId.toKey());
          this.unallocated.set(
            runeId.toKey(),
            u128.add(prev, runestone.etching.unwrap().premine.unwrap()),
          );
        } else {
          this.unallocated.set(
            runeId.toKey(),
            runestone.etching.unwrap().premine.unwrap(),
          );
        }
      }
    }

    // EDICTS / TRANSFERS
    for (let i = 0; i < runestone.edicts.length; i++) {
      const edict = runestone.edicts[i];

      // consoleLog("=== EDICT DATA");
      // consoleLog(`runeId: ${edict.runeId.toKey()}`);
      // consoleLog(`amount: ${edict.amount.toString()}`);
      // consoleLog(`output: ${edict.output.toString()}`);
      // consoleLog("=== END EDICT DATA");

      if (edict.output > <u32>this.runeTx.vouts.length) {
        // TODO: validate the edict output when parsing the data
        return
        // throw new Error("errors.edict output is not valid");
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

      // consoleLog(`EDICT RUNE ID: ${runeId.toKey()}`);
      const _balance = this.getUnallocatedBalance(runeId);
      if (_balance.isNone()) {
        continue;
      }
      const balance = _balance.unwrap();

      // consoleLog(`EDICT BALANCE:  ${balance.unwrap().toString()}`);

      if (edict.output === <u32>this.runeTx.vouts.length) {
        // find all non op_return output indexes
        const eligbleOutputs: u32[] = [];
        for (let i = 0; i < this.runeTx.vouts.length; i++) {
          const vout = this.runeTx.vouts[i];
          if (vout.asmScripts.length > 1 && vout.asmScripts[0] == "OP_RETURN") {
            continue;
          }

          eligbleOutputs.push(i);
        }

        if (eligbleOutputs.length > 1) {
          if (u128.eq(edict.amount, u128.from(0))) {
            const amount = u128.div(balance, u128.from(eligbleOutputs.length));
            const remainder = u128.rem(
              balance,
              u128.from(eligbleOutputs.length),
            );

            for (let i = 0; i < eligbleOutputs.length; i++) {
              const output = eligbleOutputs[i];

              if (u128.lt(u128.from(i), remainder)) {
                this.allocate(runeId, u128.add(amount, u128.from(1)), output);
              } else {
                this.allocate(runeId, amount, output);
              }
            }
          } else {
            for (let i = 0; i < eligbleOutputs.length; i++) {
              const output = eligbleOutputs[i];
              this.allocate(runeId, edict.amount, output);
            }
          }
        }
      } else {
        // consoleLog("=== EDICT ALLOCATE");
        // consoleLog(`runeKey: ${runeId.toKey()}`);
        // consoleLog(`balance: ${balance.unwrap().toString()}`);
        // consoleLog(`amount: ${edict.amount.toString()}`);
        // consoleLog(`output: ${edict.output.toString()}`);
        // consoleLog("=== END EDICT ALLOCATE");

        this.allocate(runeId, edict.amount, edict.output);
      }
    }
    if (etched.isSome()) {
      this.etching = runestone.etching;
    }

    // TODO:
    // - handle burned

    let pointer = runestone.pointer;
    if (pointer.isSome() && pointer.unwrap() >= <u32>this.allocated.length) {
      return;
      // throw new Error("errors.pointer index is not valid");
    }
    if (pointer.isNone()) {
      // find first non op_return output index
      for (let i = 0; i < this.runeTx.vouts.length; i++) {
        const vout = this.runeTx.vouts[i];

        // consoleLog("=== VOUT ===");
        // consoleLog(`txHash: ${vout.txHash}`);
        // consoleLog(`index: ${vout.index}`);
        // consoleLog(`pkScript: ${vout.pkScript}`);
        // consoleLog(`spender: ${vout.spender}`);
        // consoleLog("=== END VOUT ===");

        if (vout.asmScripts.length > 1 && vout.asmScripts[0] == "OP_RETURN") {
          continue;
        }

        pointer = Option.Some(<u32>i);
        break;
      }
    }
    if (pointer.isSome()) {
      // consoleLog(`POINTER INDEX: ${pointer.unwrap().toString()}`);

      const unallocatedKeys = this.unallocated.keys();
      for (let i = 0; i < unallocatedKeys.length; i++) {
        const runeId = unallocatedKeys[i];
        const balance = this.unallocated.get(runeId);

        const allocatedIndex = this.allocated[pointer.unwrap()];

        if (allocatedIndex.has(runeId)) {
          let prev = allocatedIndex.get(runeId);
          allocatedIndex.set(runeId, u128.add(prev, balance));
        } else {
          allocatedIndex.set(runeId, balance);
        }

        this.allocated[pointer.unwrap()] = allocatedIndex;
        this.unallocated.delete(runeId);
      }
    } else {
      // TODO: oterwise burn the balance
    }
  }

  commit(): void {
    // TODO:
    // - commit using db transaction / dolt commit
    // - burned

    // etching
    if (this.etching.isSome()) {
      const runeEntry = RuneEntry.fromEtching(
        this.runeTx.blockHeight,
        this.runeTx.index,
        this.etching.unwrap(),
      );
      runeEntry.store();
    }

    // minted
    if (this.minted.isSome()) {
      const runeId = this.minted.unwrap();
      RuneEntry.incMinted(runeId.block, runeId.tx);
    }

    // edict, minted amount
    // outpoints

    // invalidate or remove previous outpoints or unallocate
    for (let i = 0; i < this.runeTx.vins.length; i++) {
      const vin = this.runeTx.vins[i];
      OutpointEntry.delete(vin.txHash, vin.index);
    }

    for (let i = 0; i < this.allocated.length; i++) {
      const vout = this.runeTx.vouts[i];
      const allocated = this.allocated[i];
      const keys = allocated.keys();

      for (let j = 0; j < keys.length; j++) {
        const runeId = RuneId.fromKey(keys[j]);
        const amount = allocated.get(runeId.toKey());

        // consoleLog("=== OUTPUT_ENTRY");
        // consoleLog(`OUTPUT_ENTRY RUNEID ${runeId.toKey()}`);
        // consoleLog(`OUTPUT_ENTRY AMOUNT ${amount}`);
        // consoleLog("=== END OUTPUT_ENTRY");

        const outputEntry = new OutpointEntry(
          runeId.block,
          runeId.tx,
          vout.txHash,
          vout.index,
          vout.spender,
          amount,
        );

        outputEntry.store();
      }
    }
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

    this.minted = Option.Some(runeId);

    return amount;
  }

  private etched(runestone: Runestone): Option<Rune> {
    // TODO: cenotapth

    if (runestone.etching.isNone()) {
      return Option.None(Rune.default());
    }

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

function _getUnallocated(vins: Vin[]): Map<RuneIdKey, u128> {
  const result = new Map<RuneIdKey, u128>();

  for (let i = 0; i < vins.length; i++) {
    const vin = vins[i];

    const entries = OutpointEntry.get(vin.txHash, vin.index);
    if (entries.isNone()) {
      continue;
    }

    for (let j = 0; j < entries.unwrap().length; j++) {
      const entry = entries.unwrap()[j];
      const runeId = new RuneId(entry.block, entry.tx);

      if (result.has(runeId.toKey())) {
        const prev = result.get(runeId.toKey());
        result.set(runeId.toKey(), u128.add(prev, entry.amount));
      } else {
        result.set(runeId.toKey(), entry.amount);
      }
    }
  }

  return result;
}

function _processRune(runeTx: RuneTransaction): void {
  if (runeTx.runeData.isNone()) {
    return;
  }

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
