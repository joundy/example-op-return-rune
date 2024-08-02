import { u128 } from "as-bignum/assembly";
import { Option } from "./option";
import { runeEntries } from "./tables";
import {
  Column,
  getResultFromJson,
} from "@east-bitcoin-lib/smartindex-sdk/assembly";
import { TableSchema } from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";

export class RuneEntry {
  block: u64;
  tx: u32;

  minted: u128;
  burned: u128;

  divisibility: Option<u8>;
  premine: Option<u128>;
  rune: Option<string>;
  spacers: Option<u32>;
  symbol: Option<string>;
  turbo: bool;

  terms: bool;
  amount: Option<u128>;
  cap: Option<u128>;
  heightStart: Option<u64>;
  heightEnd: Option<u64>;
  offsetStart: Option<u64>;
  offsetEnd: Option<u64>;

  constructor(
    block: u64,
    tx: u32,
    minted: u128,
    burned: u128,
    divisibility: Option<u8>,
    premine: Option<u128>,
    rune: Option<string>,
    spacers: Option<u32>,
    symbol: Option<string>,
    turbo: bool,
    terms: bool,
    amount: Option<u128>,
    cap: Option<u128>,
    heightStart: Option<u64>,
    heightEnd: Option<u64>,
    offsetStart: Option<u64>,
    offsetEnd: Option<u64>,
  ) {
    this.block = block;
    this.tx = tx;
    this.minted = minted;
    this.burned = burned;

    this.divisibility = divisibility;
    this.premine = premine;
    this.rune = rune;
    this.spacers = spacers;
    this.symbol = symbol;

    this.terms = terms;
    this.turbo = turbo;
    this.amount = amount;
    this.cap = cap;
    this.heightStart = heightStart;
    this.heightEnd = heightEnd;
    this.offsetStart = offsetStart;
    this.offsetEnd = offsetEnd;
  }

  store() {
    // TODO: validate is alreadyn etched or not

    const insertData: TableSchema = [
      new Column("block", this.block.toString()),
      new Column("tx", this.tx.toString()),
      new Column("minted", this.minted.toString()),
      new Column("burned", this.burned.toString()),
    ];

    if (this.divisibility.isSome()) {
      insertData.push(
        new Column("divisibility", this.divisibility.unwrap().toString()),
      );
    }

    if (this.premine.isSome()) {
      insertData.push(new Column("premine", this.premine.unwrap().toString()));
    }

    if (this.rune.isSome()) {
      insertData.push(new Column("rune", this.rune.unwrap()));
    }

    if (this.spacers.isSome()) {
      insertData.push(new Column("spacers", this.spacers.unwrap().toString()));
    }

    if (this.symbol.isSome()) {
      insertData.push(new Column("symbol", this.symbol.unwrap()));
    }

    if (this.turbo) {
      insertData.push(new Column("turbo", "true"));
    }

    if (this.terms) {
      insertData.push(new Column("terms", "true"));

      if (this.amount.isSome()) {
        insertData.push(new Column("amount", this.amount.unwrap().toString()));
      }

      if (this.cap.isSome()) {
        insertData.push(new Column("cap", this.cap.unwrap().toString()));
      }

      if (this.heightStart.isSome()) {
        insertData.push(
          new Column("height_start", this.heightStart.unwrap().toString()),
        );
      }

      if (this.heightEnd.isSome()) {
        insertData.push(
          new Column("height_end", this.heightEnd.unwrap().toString()),
        );
      }

      if (this.offsetStart.isSome()) {
        insertData.push(
          new Column("offset_start", this.offsetStart.unwrap().toString()),
        );
      }

      if (this.offsetEnd.isSome()) {
        insertData.push(
          new Column("offset_end", this.offsetEnd.unwrap().toString()),
        );
      }
    }

    runeEntries.insert(insertData);
  }

  update() { }

  static default() {
    return changetype<RuneEntry>(0);
  }

  static getByRune(_rune: string): Option<RuneEntry> {
    const r = runeEntries.select([new Column("rune", _rune)]);
    if (getResultFromJson(r, "error", "string").includes("no rows")) {
      return Option.None(RuneEntry.default());
    }

    const block = <u64>parseInt(r.getString("block")!.valueOf());
    const tx = <u32>parseInt(r.getString("tx")!.valueOf());
    const minted = u128.from(r.getString("tx")!.valueOf());
    const burned = u128.from(r.getString("tx")!.valueOf());

    const rune: Option<string> = Option.Some(_rune);

    let divisibility: Option<u8> = Option.Some(<u8>0);
    if (r.has("divisibility")) {
      const d = r.getString("divisibility");
      if (d) {
        divisibility = Option.Some(<u8>parseInt(d.valueOf()));
      }
    }

    let premine: Option<u128> = Option.None(u128.from(0));
    if (r.has("premine")) {
      const d = r.getString("premine");
      if (d) {
        premine = Option.Some(u128.fromString(d.valueOf()));
      }
    }

    let spacers: Option<u32> = Option.None(<u32>0);
    if (r.has("spacers")) {
      const d = r.getString("spacers");
      if (d) {
        spacers = Option.Some(<u32>parseInt(d.valueOf()));
      }
    }

    let symbol: Option<string> = Option.None("");
    if (r.has("symbol")) {
      const d = r.getString("symbol");
      if (d) {
        symbol = Option.Some(d.valueOf());
      }
    }

    // TODO: turbo
    const turbo = false;
    let terms = false;

    let amount: Option<u128> = Option.None(u128.from(0));
    let cap: Option<u128> = Option.None(u128.from(0));
    let heightStart: Option<u64> = Option.None(<u64>0);
    let heightEnd: Option<u64> = Option.None(<u64>0);
    let offsetStart: Option<u64> = Option.None(<u64>0);
    let offsetEnd: Option<u64> = Option.None(<u64>0);

    if (r.has("terms")) {
      terms = true;

      if (r.has("amount")) {
        const d = r.getString("amount");
        if (d) {
          amount = Option.Some(u128.from(d.valueOf()));
        }
      }

      if (r.has("cap")) {
        const d = r.getString("cap");
        if (d) {
          cap = Option.Some(u128.from(d.valueOf()));
        }
      }

      if (r.has("height_start")) {
        const d = r.getString("height_start");
        if (d) {
          heightStart = Option.Some(<u64>parseInt(d.valueOf()));
        }
      }

      if (r.has("height_end")) {
        const d = r.getString("height_end");
        if (d) {
          heightEnd = Option.Some(<u64>parseInt(d.valueOf()));
        }
      }

      if (r.has("offset_start")) {
        const d = r.getString("offset_start");
        if (d) {
          offsetStart = Option.Some(<u64>parseInt(d.valueOf()));
        }
      }

      if (r.has("offset_end")) {
        const d = r.getString("offset_end");
        if (d) {
          offsetEnd = Option.Some(<u64>parseInt(d.valueOf()));
        }
      }
    }

    return Option.Some(
      new RuneEntry(
        block,
        tx,
        minted,
        burned,
        divisibility,
        premine,
        rune,
        spacers,
        symbol,
        turbo,
        terms,
        amount,
        cap,
        heightStart,
        heightEnd,
        offsetStart,
        offsetEnd,
      ),
    );
  }
}
