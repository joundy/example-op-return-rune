import { Column, Table } from "@east-bitcoin-lib/smartindex-sdk/assembly";

export const stateTable = new Table("state", [
  new Column("id", "int64"),
  new Column("indexed_block_height", "int64"),
]);

export const runeEntries = new Table("rune_entries", [
  // rune_id
  new Column("block", "string"),
  new Column("tx", "string"),

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

export const outpoints = new Table("outpoints", [
  new Column("block", "string"),
  new Column("tx", "string"),

  new Column("hash", "string"),
  new Column("vout", "string"),

  new Column("address", "string"),
  new Column("amount", "string"),
]);
