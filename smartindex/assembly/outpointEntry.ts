import { u128 } from "as-bignum/assembly";
import { Option } from "./option";
import { outpoints } from "./tables";
import {
  Column,
  getResultFromJson,
} from "@east-bitcoin-lib/smartindex-sdk/assembly";
import { TableSchema } from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";

export class OutpointEntry {
  block: u64;
  tx: u32;

  hash: string;
  index: u32;

  address: string;
  amount: u128;

  constructor(
    block: u64,
    tx: u32,
    hash: string,
    index: u32,
    address: string,
    amount: u128,
  ) {
    this.block = block;
    this.tx = tx;
    this.hash = hash;
    this.index = index;
    this.address = address;
    this.amount = amount;
  }

  static default(): OutpointEntry {
    return changetype<OutpointEntry>(0);
  }

  static get(hash: string, index: u32): Option<OutpointEntry[]> {
    // TODO: multiple rows
    //
    const r = outpoints.select([
      new Column("hash", hash),
      new Column("index", index.toString()),
    ]);
    if (getResultFromJson(r, "error", "string").includes("no rows")) {
      return Option.None([OutpointEntry.default()]);
    }

    const block = <u64>parseInt(r.getString("block")!.valueOf());
    const tx = <u32>parseInt(r.getString("tx")!.valueOf());
    const amount = u128.from(r.getString("amount")!.valueOf());
    const address = r.getString("address")!.valueOf();

    return Option.Some([
      new OutpointEntry(block, tx, hash, index, address, amount),
    ]);
  }

  static delete(hash: string, index: u32): void {
    outpoints.delete([
      new Column("hash", hash),
      new Column("index", index.toString()),
    ]);
  }

  store(): void {
    const insertData: TableSchema = [
      new Column("block", this.block.toString()),
      new Column("tx", this.tx.toString()),
      new Column("hash", this.hash),
      new Column("index", this.index.toString()),
      new Column("address", this.address),
      new Column("amount", this.amount.toString()),
    ];

    outpoints.insert(insertData);
  }
}
