import { u128 } from "as-bignum/assembly";
import { Option } from "./option";
import { runeEntries } from "./tables";
import {
  Column,
  consoleLog,
  getResultFromJson,
} from "@east-bitcoin-lib/smartindex-sdk/assembly";
import { TableSchema } from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";
import { Obj } from "assemblyscript-json/assembly/JSON";
import { Rune } from "./rune";
import { RuneId } from "./runeId";
import { Etching } from "./etching";

export class RuneEntry {
  block: u64;
  tx: u32;

  minted: u128;
  burned: u128;

  divisibility: Option<u8>;
  premine: Option<u128>;
  rune: Option<Rune>;
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
    rune: Option<Rune>,
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

  // TODO: error
  // MintError::Cap(cap) => write!(f, "limited to {cap} mints"),
  // MintError::End(end) => write!(f, "mint ended on block {end}"),
  // MintError::Start(start) => write!(f, "mint starts on block {start}"),
  // MintError::Unmintable => write!(f, "not mintable"),
  mintable(height: u64): Option<u128> {
    if (!this.terms) {
      return Option.None(u128.from(0));
    }

    let startRelative: Option<u64> = Option.None(<u64>0);
    if (this.offsetStart.isSome()) {
      startRelative = Option.Some(
        <u64>(this.offsetStart.unwrap() + this.block),
      );
    }
    const startAbsolute: Option<u64> = this.heightStart;

    let start: Option<u64> = Option.None(<u64>0);
    if (startRelative.isSome() || startAbsolute.isSome()) {
      start = Option.Some(
        <u64>(
          Math.max(
            startRelative.isNone() ? -1 : f64(startRelative.unwrap()),
            startAbsolute.isNone() ? -1 : f64(startAbsolute.unwrap()),
          )
        ),
      );
    }

    if (start.isSome()) {
      if (height < start.unwrap()) {
        return Option.None(u128.from(0));
      }
    }

    let endRelative: Option<u64> = Option.None(<u64>0);
    if (this.offsetEnd.isSome()) {
      endRelative = Option.Some(<u64>(this.offsetEnd.unwrap() + this.block));
    }
    const endAbsolute: Option<u64> = this.heightEnd;
    let end: Option<u64> = Option.None(<u64>0);
    if (endRelative.isSome() || endAbsolute.isSome()) {
      end = Option.Some(
        <u64>(
          Math.max(
            endRelative.isNone() ? -1 : f64(endRelative.unwrap()),
            endAbsolute.isNone() ? -1 : f64(endAbsolute.unwrap()),
          )
        ),
      );
    }

    if (end.isSome()) {
      if (height >= end.unwrap()) {
        return Option.None(u128.from(0));
      }
    }

    const cap = this.cap.unwrapOr(u128.from(0));

    if (this.minted >= cap) {
      return Option.None(u128.from(0));
    }

    return Option.Some(this.amount.unwrapOr(u128.from(0)));
  }

  store(): void {
    // TODO: validate is already etched or not
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
      insertData.push(new Column("rune", this.rune.unwrap().value.toString()));
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

  static incMinted(block: u64, tx: u32): Option<u128> {
    const r = runeEntries.select([
      new Column("block", block.toString()),
      new Column("tx", tx.toString()),
    ]);
    if (getResultFromJson(r, "error", "string").includes("no rows")) {
      return Option.None(u128.from(0));
    }

    const minted = u128.from(r.getString("minted")!.valueOf());
    const increased = u128.add(minted, u128.from(1));

    // consoleLog(`INC MINTED: ${increased.toString()}`);

    runeEntries.update(
      [new Column("block", block.toString()), new Column("tx", tx.toString())],
      [new Column("minted", increased.toString())],
    );

    return Option.Some(increased);
  }

  static incBurned(block: u64, tx: u32): Option<u128> {
    const r = runeEntries.select([
      new Column("block", block.toString()),
      new Column("tx", tx.toString()),
    ]);
    if (getResultFromJson(r, "error", "string").includes("no rows")) {
      return Option.None(u128.from(0));
    }

    const burned = u128.from(r.getString("burned")!.valueOf());
    const increased = u128.add(burned, u128.from(1));

    runeEntries.update(
      [new Column("block", block.toString()), new Column("tx", tx.toString())],
      [new Column("burned", increased.toString())],
    );

    return Option.Some(increased);
  }

  static fromEtching(block: u64, tx: u32, etching: Etching): RuneEntry {
    const minted = u128.from(0);
    const burned = u128.from(0);

    let isTerms = false;
    let amount = Option.None(u128.from(0));
    let cap = Option.None(u128.from(0));
    let heightStart = Option.None(<u64>0);
    let heightEnd = Option.None(<u64>0);
    let offsetStart = Option.None(<u64>0);
    let offsetEnd = Option.None(<u64>0);

    if (etching.terms.isSome()) {
      isTerms = true;

      const terms = etching.terms.unwrap();

      amount = terms.amount;
      cap = terms.cap;
      heightStart = terms.heightStart;
      heightEnd = terms.heightEnd;
      offsetStart = terms.offsetStart;
      offsetEnd = terms.offsetEnd;
    }

    return new RuneEntry(
      block,
      tx,
      minted,
      burned,
      etching.divisibility,
      etching.premine,
      etching.rune,
      etching.spacers,
      etching.symbol,
      etching.turbo,
      isTerms,
      amount,
      cap,
      heightStart,
      heightEnd,
      offsetStart,
      offsetEnd,
    );
  }

  static default(): RuneEntry {
    return changetype<RuneEntry>(0);
  }

  static decodeRuneEntry(r: Obj): Option<RuneEntry> {
    const block = <u64>parseInt(r.getString("block")!.valueOf());
    const tx = <u32>parseInt(r.getString("tx")!.valueOf());
    const minted = u128.from(r.getString("minted")!.valueOf());
    const burned = u128.from(r.getString("burned")!.valueOf());

    let rune: Option<Rune> = Option.None(Rune.default());
    if (r.has("rune")) {
      const d = r.getString("rune");
      if (d) {
        rune = Option.Some(new Rune(u128.from(d.valueOf())));
      }
    }

    let divisibility: Option<u8> = Option.None(<u8>0);
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

  static getByRune(rune: Rune): Option<RuneEntry> {
    const r = runeEntries.select([new Column("rune", rune.value.toString())]);
    if (getResultFromJson(r, "error", "string").includes("no rows")) {
      return Option.None(RuneEntry.default());
    }

    return this.decodeRuneEntry(r);
  }

  static getByRuneId(runeId: RuneId): Option<RuneEntry> {
    const r = runeEntries.select([
      new Column("block", runeId.block.toString()),
      new Column("tx", runeId.tx.toString()),
    ]);
    if (getResultFromJson(r, "error", "string").includes("no rows")) {
      return Option.None(RuneEntry.default());
    }

    return this.decodeRuneEntry(r);
  }
}
