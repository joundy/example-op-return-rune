import { u128 } from "as-bignum/assembly";
import {
  valueReturn,
  Column,
  ptrToString,
  getResultFromJson,
  getTxUTXOByBlockHeight,
  Table,
} from "@east-bitcoin-lib/smartindex-sdk/assembly";
import { RunestoneParser } from "./runestone";
import { decodeHex } from "./utils";
import { Etching, Terms } from "./etching";
import { Option } from "./option";
import {
  TableSchema,
  getTxsByBlockHeight,
} from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";
import { getTransactionsByBlockHash } from "@east-bitcoin-lib/smartindex-sdk/assembly/env";
import { RuneTransaction } from "./transaction";
import { Outpoint } from "./outpoint";
export { allocate } from "@east-bitcoin-lib/smartindex-sdk/assembly/external";

const stateTable = new Table("state", [
  new Column("id", "int64"),
  new Column("indexed_block_height", "int64"),
]);

const etchings = new Table("etchings", [
  // rune_id
  new Column("rune_block", "string"),
  new Column("rune_tx", "string"),

  // state
  new Column("minted", "string"),
  new Column("burned", "string"),

  // etching data
  new Column("divisibility", "string"),
  new Column("premine", "string"),
  new Column("rune", "string"),
  new Column("spacers", "string"),
  new Column("symbol", "string"),
  new Column("turbo", "string"),
  new Column("terms", "string"),
  new Column("amount", "string"),
  new Column("cap", "string"),
  new Column("height_start", "string"),
  new Column("height_end", "string"),
  new Column("offset_start", "string"),
  new Column("offset_end", "string"),
]);

const outpoints = new Table("outpoints", [
  // rune_id
  new Column("rune_block", "string"),
  new Column("rune_tx", "string"),
  new Column("rune", "string"),

  new Column("tx_hash", "string"),
  new Column("index", "string"),

  new Column("address", "string"),
  new Column("amount", "string"), // token amount/value
]);

function _isEtched(rune: string): bool {
  const selectResult = etchings.select([new Column("rune", rune)]);
  if (getResultFromJson(selectResult, "error", "string").includes("no rows")) {
    return false;
  }

  return true;
}

function _getBurned(rune: string): Option<u128> {
  const selectResult = etchings.select([new Column("rune", rune)]);
  if (!getResultFromJson(selectResult, "error", "string").includes("no rows")) {
    const burned = u128.from(
      getResultFromJson(selectResult, "burned", "string")
    );
    return new Option(burned, true);
  }
  return new Option(u128.from(0), false);
}

function _getMinted(rune: string): Option<u128> {
  const selectResult = etchings.select([new Column("rune", rune)]);
  if (!getResultFromJson(selectResult, "error", "string").includes("no rows")) {
    const minted = u128.from(
      getResultFromJson(selectResult, "minted", "string")
    );
    return new Option(minted, true);
  }
  return new Option(u128.from(0), false);
}

function _setMinted(rune: string, minted: u128): void {
  etchings.update(
    [new Column("rune", rune)],
    [new Column("minted", minted.toString())]
  );
}

function _incBurned(rune: string, inc: u128): void {
  const burned = _getBurned(rune);
  if (!burned.some) {
    return;
  }

  const value = u128.add(burned.some, inc);
  etchings.update(
    [new Column("rune", rune)],
    [new Column("burned", value.toString())]
  );
}

function _insertOutpoint(outpoint: Outpoint): void {
  const insertData: TableSchema = [
    new Column("rune_block", outpoint.runeBlock.toString()),
    new Column("rune_tx", outpoint.runeTx.toString()),
    new Column("rune", outpoint.rune),

    new Column("tx_hash", outpoint.txHash),
    new Column("index", outpoint.index.toString()),

    new Column("address", outpoint.address),
    new Column("amount", outpoint.amount.toString()),
  ];
  outpoints.insert(insertData);
}

function _getEtching(_rune: string): Option<Etching> {
  const r = etchings.select([new Column("rune", _rune)]);
  if (getResultFromJson(r, "error", "string").includes("no rows")) {
    return new Option(changetype<Etching>(0), false);
  }

  const rune: Option<string> = new Option(_rune, true);

  let divisibility: Option<u8> = new Option(0, false);
  if (r.has("divisibility")) {
    const d = r.getString("divisibility");
    if (d) {
      divisibility = new Option(<u8>parseInt(d.valueOf()), true);
    }
  }

  let premine: Option<u128> = new Option(u128.from(0), false);
  if (r.has("premine")) {
    const d = r.getString("premine");
    if (d) {
      premine = new Option(u128.fromString(d.valueOf()), true);
    }
  }

  let spacers: Option<u32> = new Option(0, false);
  if (r.has("spacers")) {
    const d = r.getString("spacers");
    if (d) {
      spacers = new Option(<u32>parseInt(d.valueOf()), true);
    }
  }

  let symbol: Option<string> = new Option("", false);
  if (r.has("symbol")) {
    const d = r.getString("symbol");
    if (d) {
      symbol = new Option(d.valueOf(), true);
    }
  }

  let terms: Option<Terms> = new Option(changetype<Terms>(0), false);
  if (r.has("terms")) {
    const d = r.getString("terms");
    if (d) {
      if (d.valueOf() === "true") {
        let amount: Option<u128> = new Option(u128.from(0), false);
        if (r.has("amount")) {
          const d = r.getString("amount");
          if (d) {
            amount = new Option(u128.from(d.valueOf()), true);
          }
        }

        let cap: Option<u128> = new Option(u128.from(0), false);
        if (r.has("cap")) {
          const d = r.getString("cap");
          if (d) {
            cap = new Option(u128.from(d.valueOf()), true);
          }
        }

        let heightStart: Option<u64> = new Option(0, false);
        if (r.has("height_start")) {
          const d = r.getString("height_start");
          if (d) {
            heightStart = new Option(<u64>parseInt(d.valueOf()), true);
          }
        }

        let heigthEnd: Option<u64> = new Option(0, false);
        if (r.has("height_end")) {
          const d = r.getString("height_end");
          if (d) {
            heigthEnd = new Option(<u64>parseInt(d.valueOf()), true);
          }
        }

        let offsetStart: Option<u64> = new Option(0, false);
        if (r.has("offset_start")) {
          const d = r.getString("offset_start");
          if (d) {
            offsetStart = new Option(<u64>parseInt(d.valueOf()), true);
          }
        }

        let offsetEnd: Option<u64> = new Option(0, false);
        if (r.has("offset_end")) {
          const d = r.getString("offset_end");
          if (d) {
            offsetEnd = new Option(<u64>parseInt(d.valueOf()), true);
          }
        }

        terms = new Option(
          new Terms(
            amount,
            cap,
            heightStart,
            heigthEnd,
            offsetStart,
            offsetEnd
          ),
          true
        );
      }
    }
  }

  let turbo: bool = false;
  if (r.has("turbo")) {
    const d = r.getString("turbo");
    if (d) {
      if (d.valueOf() === "true") {
        turbo = true;
      }
    }
  }

  return new Option(
    new Etching(divisibility, premine, rune, spacers, symbol, terms, turbo),
    true
  );
}

function _processEtching(block: u64, tx: u32, etching: Etching): void {
  if (etching.rune.isSome && _isEtched(etching.rune.some)) {
    return;
  }

  const insertData: TableSchema = [
    new Column("rune_block", block.toString()),
    new Column("rune_tx", tx.toString()),
  ];

  if (etching.divisibility.isSome) {
    insertData.push(
      new Column("divisibility", etching.divisibility.some.toString())
    );
  }
  if (etching.premine.isSome) {
    insertData.push(new Column("premine", etching.premine.some.toString()));
  }
  if (etching.rune.isSome) {
    insertData.push(new Column("rune", etching.rune.some));
  }
  if (etching.spacers.isSome) {
    insertData.push(new Column("spacers", etching.spacers.some.toString()));
  }
  if (etching.symbol.isSome) {
    insertData.push(new Column("symbol", etching.symbol.some));
  }
  if (etching.turbo) {
    insertData.push(new Column("turbo", etching.turbo.toString()));
  }

  if (!etching.terms.isSome) {
    return;
  }
  insertData.push(new Column("terms", "true"));

  if (etching.terms.some.amount.isSome) {
    insertData.push(
      new Column("amount", etching.terms.some.amount.some.toString())
    );
  }
  if (etching.terms.some.cap.isSome) {
    insertData.push(new Column("cap", etching.terms.some.cap.some.toString()));
  }

  if (etching.terms.some.heightStart.isSome) {
    insertData.push(
      new Column("height_start", etching.terms.some.heightStart.some.toString())
    );
  }
  if (etching.terms.some.heightEnd.isSome) {
    insertData.push(
      new Column("height_end", etching.terms.some.heightEnd.some.toString())
    );
  }
  if (etching.terms.some.offsetStart.isSome) {
    insertData.push(
      new Column("offset_start", etching.terms.some.offsetStart.some.toString())
    );
  }
  if (etching.terms.some.offsetEnd.isSome) {
    insertData.push(
      new Column("offset_end", etching.terms.some.offsetEnd.some.toString())
    );
  }
  etchings.insert(insertData);
}

function _processMint(
  blockHeight: u64,
  index: u32,
  rune: string,
  toAddress: string
): void {
  const etching = _getEtching(rune);
  if (!etching.isSome) {
    return;
  }
  if (!etching.some.terms.isSome) {
    return;
  }
  if (!etching.some.terms.some.amount.isSome) {
    return;
  }
  const amount = etching.some.terms.some.amount.some;

  const currentMintTotal = _getMinted(rune).some;
  const totalMint = u128.add(currentMintTotal, u128.from(1));

  // cap checking
  if (etching.some.terms.some.cap.isSome) {
    if (u128.gt(totalMint, etching.some.terms.some.cap.some)) {
      return;
    }
  }

  _setMinted(rune, totalMint);

  // TODO validate offset and height
}

function _processRune(runeTx: RuneTransaction): void {
  const runeIndex = runeTx.runeIndex();
  if (!runeIndex.isSome) {
    return;
  }
  const rune = runeTx.runeData(runeIndex.some);

  // TODO: validate rune commit
  if (rune.isEtching()) {
    let terms: Option<Terms> = new Option(changetype<Terms>(0), false);
    if (rune.isTerms()) {
      terms = new Option(
        new Terms(
          rune.getAmount(),
          rune.getCap(),
          rune.getHeightStart(),
          rune.getHeightEnd(),
          rune.getOffsetStart(),
          rune.getOffsetEnd()
        ),
        true
      );
    }

    // TODO: turbo?
    const turbo = false;
    const etch = new Etching(
      rune.getDivisibility(),
      rune.getPremine(),
      rune.getRune(),
      rune.getSpacers(),
      rune.getSymbol(),
      terms,
      turbo
    );

    _processEtching(runeTx.blockHeight, runeTx.index, etch);
  }

  // TODO: handle mint
  if (rune.isMint()) {
  }
}

export function init(): void {
  stateTable.init("indexed_block_height");
  stateTable.insert([
    new Column("id", "0"),
    new Column("indexed_block_height", "0"),
  ]);

  etchings.init("");
  outpoints.init("");
}

export function getIndexedBlock(): void {
  const latestBlock: string = getResultFromJson(
    stateTable.select([new Column("id", "0")]),
    "indexed_block_height",
    "string"
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
      [new Column("indexed_block_height", i.toString())]
    );
  }
}

export function getEtching(rune_ptr: i32): void {
  const rune = ptrToString(rune_ptr);
  const etching = _getEtching(rune);
  if (etching.isSome) {
    valueReturn(etching.some.inspectJson());
    return;
  }

  valueReturn("not_found");
}
