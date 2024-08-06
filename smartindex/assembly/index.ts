import {
  valueReturn,
  Column,
  ptrToString,
  getResultFromJson,
  consoleLog,
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
export { allocate } from "@east-bitcoin-lib/smartindex-sdk/assembly/external";

class Minted {
  rune: RuneId;
  count: u128;

  constructor(rune: RuneId, count: u128) {
    this.rune = rune;
    this.count = count;
  }

  static default(): Minted {
    return changetype<Minted>(0);
  }
}

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
  minted: Option<Minted>;
  burned: Option<Burned>;

  constructor(
    runeTx: RuneTransaction,

    unallocated: Map<RuneId, u128>,
    allocated: Array<Map<RuneId, u128>>,
    minted: Option<Minted>,
    burned: Option<Burned>,
  ) {
    this.runeTx = runeTx;

    this.unallocated = unallocated;
    this.allocated = allocated;
    this.minted = minted;
    this.burned = burned;
  }

  static default(): RuneUpdater {
    return changetype<RuneUpdater>(0);
  }

  static index(runeTx: RuneTransaction): Option<RuneUpdater> {
    const unallocated = _unallocated(runeTx.vins);
    const allocated = [];
    const minted = Option.None(Minted.default());
    const burned = Option.None(Burned.default());

    const runeData = runeTx.runeData;
    if (!runeData.isSome()) {
      return Option.None(RuneUpdater.default());
    }

    const artifact = RunestoneParser.dechiper(decodeHex(runeData.unwrap()));

    if (artifact instanceof Cenotaph) {
      // TODO:
      throw new Error("errors.cenotaph");
    }

    const runestone = artifact as Runestone;
    consoleLog(runestone.etching.unwrap().rune.unwrap());

    return Option.None(RuneUpdater.default());
  }

  commit(): void {
    // TODO: commit transaction
  }
}

function _unallocated(vins: Vin[]): Map<RuneId, u128> {
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
  const runeUpdater = RuneUpdater.index(runeTx);
  if (runeUpdater.isSome()) {
    runeUpdater.unwrap().commit();
  }
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
