import { u128 } from "as-bignum/assembly";
import { Option } from "./option";
import { outpoints } from "./tables";
import {
  Column,
  JSON,
  consoleLog,
  getResultFromJson,
  selectNative,
} from "@east-bitcoin-lib/smartindex-sdk/assembly";
import {
  TableSchema,
  getContractAddress,
  ptrToString,
  toJsonArray,
} from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";
import { RuneId } from "./runeId";

export class OutpointEntry {
  block: u64;
  tx: u32;

  hash: string;
  vout: u32;

  address: string;
  amount: u128;

  constructor(
    block: u64,
    tx: u32,
    hash: string,
    vout: u32,
    address: string,
    amount: u128,
  ) {
    this.block = block;
    this.tx = tx;
    this.hash = hash;
    this.vout = vout;
    this.address = address;
    this.amount = amount;
  }

  static default(): OutpointEntry {
    return changetype<OutpointEntry>(0);
  }

  static get(hash: string, vout: u32): OutpointEntry[] {
    const outpointEntries: OutpointEntry[] = [];

    const ptr = selectNative(
      `select * from ${getContractAddress()}_outpoints where hash = ? and vout = ?`,
      `["${hash}", "${vout.toString()}"]`,
    );
    const outpointsJson = toJsonArray(ptrToString(ptr));
    if (outpointsJson.valueOf().length === 0) {
      return outpointEntries;
    }

    for (let i = 0; i < outpointsJson.valueOf().length; i++) {
      const outpointJson = outpointsJson.valueOf()[i] as JSON.Obj;

      const block = <u64>parseInt(outpointJson.getString("block")!.valueOf());
      const tx = <u32>parseInt(outpointJson.getString("tx")!.valueOf());
      const amount = u128.from(outpointJson.getString("amount")!.valueOf());
      const address = outpointJson.getString("address")!.valueOf();

      outpointEntries.push(
        new OutpointEntry(block, tx, hash, vout, address, amount),
      );
    }

    return outpointEntries;
  }

  static getOutpointsByRuneId(
    runeId: RuneId,
    address: Option<string>,
  ): OutpointEntry[] {
    const outpointEntries: OutpointEntry[] = [];

    let ptr: i32;
    if (address.isSome()) {
      ptr = selectNative(
        `select * from ${getContractAddress()}_outpoints where block = ? and tx = ? and address = ?`,
        `["${runeId.block.toString()}", "${runeId.tx.toString()}", "${address.unwrap()}"]`,
      );
    } else {
      ptr = selectNative(
        `select * from ${getContractAddress()}_outpoints where block = ? and tx = ?`,
        `["${runeId.block.toString()}", "${runeId.tx.toString()}"]`,
      );
    }

    const outpointsJson = toJsonArray(ptrToString(ptr));
    if (outpointsJson.valueOf().length === 0) {
      return outpointEntries;
    }

    for (let i = 0; i < outpointsJson.valueOf().length; i++) {
      const outpointJson = outpointsJson.valueOf()[i] as JSON.Obj;

      const block = <u64>parseInt(outpointJson.getString("block")!.valueOf());
      const tx = <u32>parseInt(outpointJson.getString("tx")!.valueOf());
      const amount = u128.from(outpointJson.getString("amount")!.valueOf());
      const address = outpointJson.getString("address")!.valueOf();
      const hash = outpointJson.getString("hash")!.valueOf();
      const vout = <u32>parseInt(outpointJson.getString("vout")!.valueOf());

      outpointEntries.push(
        new OutpointEntry(block, tx, hash, vout, address, amount),
      );
    }

    return outpointEntries;
  }

  static delete(hash: string, vout: u32): void {
    outpoints.delete([
      new Column("hash", hash),
      new Column("vout", vout.toString()),
    ]);
  }

  static getBalance(runeId: RuneId, address: string): u128 {
    let amount = u128.Zero;

    consoleLog(`runeId: ${runeId.block.toString()}, ${runeId.tx.toString()}`);

    const ptr = selectNative(
      `select amount from ${getContractAddress()}_outpoints where block = ? and tx = ? and address = ?`,
      `["${runeId.block.toString()}", "${runeId.tx.toString()}", "${address}"]`,
    );
    const outpointsJson = toJsonArray(ptrToString(ptr));
    if (outpointsJson.valueOf().length === 0) {
      return amount;
    }

    for (let i = 0; i < outpointsJson.valueOf().length; i++) {
      const outpointJson = outpointsJson.valueOf()[i] as JSON.Obj;
      const amountStr = outpointJson.getString("amount")!.valueOf();
      amount = u128.add(amount, u128.from(amountStr));
    }

    return amount;
  }

  store(): void {
    const insertData: TableSchema = [
      new Column("block", this.block.toString()),
      new Column("tx", this.tx.toString()),
      new Column("hash", this.hash),
      new Column("vout", this.vout.toString()),
      new Column("address", this.address),
      new Column("amount", this.amount.toString()),
    ];

    outpoints.insert(insertData);
  }

  toJson(): string {
    return `{
      "block": ${this.block},
      "tx": ${this.tx},
      "hash": "${this.hash}",
      "vout": ${this.vout},
      "address": "${this.address}",
      "amount": "${this.amount}"
    }`;
  }
}
