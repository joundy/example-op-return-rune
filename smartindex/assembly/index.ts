import {
  valueReturn,
  Column,
  ptrToString,
  getResultFromJson,
  consoleLog,
} from "@east-bitcoin-lib/smartindex-sdk/assembly";
import { getTxsByBlockHeight } from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";
import { RuneTransaction } from "./transaction";
import { outpoints, runeEntries, stateTable } from "./tables";
import { RunestoneParser } from "./runestone";
import { decodeHex } from "./utils";
import { Cenotaph, Runestone } from "./artifact";
export { allocate } from "@east-bitcoin-lib/smartindex-sdk/assembly/external";

function _processRune(runeTx: RuneTransaction): void {
  const runeData = runeTx.runeData;
  if (!runeData.isSome()) {
    return;
  }

  const artifact = RunestoneParser.dechiper(decodeHex(runeData.unwrap()));

  if (artifact instanceof Cenotaph) {
    // TODO:
    throw new Error("errors.cenotaph");
  }

  const runestone = artifact as Runestone;
  consoleLog(runestone.etching.unwrap().rune.unwrap());
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
