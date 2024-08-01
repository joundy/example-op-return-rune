import { u128 } from "as-bignum/assembly";
import { JSONEncoder } from "assemblyscript-json/assembly";
import { Option } from "./option";

export class Terms {
  amount: Option<u128>;
  cap: Option<u128>;
  heightStart: Option<u64>;
  heightEnd: Option<u64>;
  offsetStart: Option<u64>;
  offsetEnd: Option<u64>;

  constructor(
    amount: Option<u128>,
    cap: Option<u128>,
    heightStart: Option<u64>,
    heightEnd: Option<u64>,
    offsetStart: Option<u64>,
    offsetEnd: Option<u64>,
  ) {
    this.amount = amount;
    this.cap = cap;
    this.heightStart = heightStart;
    this.heightEnd = heightEnd;
    this.offsetStart = offsetStart;
    this.offsetEnd = offsetEnd;
  }
}

export class Etching {
  divisibility: Option<u8>;
  premine: Option<u128>;
  rune: Option<string>;
  spacers: Option<u32>;
  symbol: Option<string>;
  terms: Option<Terms>;
  turbo: bool;

  constructor(
    divisibility: Option<u8>,
    premine: Option<u128>,
    rune: Option<string>,
    spacers: Option<u32>,
    symbol: Option<string>,
    terms: Option<Terms>,
    turbo: bool,
  ) {
    this.divisibility = divisibility;
    this.premine = premine;
    this.rune = rune;
    this.spacers = spacers;
    this.symbol = symbol;
    this.terms = terms;
    this.turbo = turbo;
  }

  inspectJson(): string {
    const encoder = new JSONEncoder();
    encoder.pushObject("etching");

    if (this.divisibility.isSome) {
      encoder.setInteger("divisibility", this.divisibility.some);
    } else {
      encoder.setNull("divisibility");
    }

    if (this.premine.isSome) {
      encoder.setString("premine", this.premine.some.toString());
    } else {
      encoder.setNull("premine");
    }

    if (this.rune.isSome) {
      encoder.setString("rune", this.rune.some);
    } else {
      encoder.setNull("rune");
    }

    if (this.spacers.isSome) {
      encoder.setInteger("spacers", this.spacers.some);
    } else {
      encoder.setNull("spacers");
    }

    if (this.symbol.isSome) {
      encoder.setString("symbol", this.symbol.some);
    } else {
      encoder.setNull("symbol");
    }

    if (this.terms.isSome) {
      encoder.pushObject("terms");

      if (this.terms.some.amount.isSome) {
        encoder.setString("amount", this.terms.some.amount.some.toString());
      } else {
        encoder.setNull("amount");
      }

      if (this.terms.some.cap.isSome) {
        encoder.setString("cap", this.terms.some.cap.some.toString());
      } else {
        encoder.setNull("cap");
      }

      if (this.terms.some.heightStart.isSome) {
        encoder.setInteger("height_start", this.terms.some.heightStart.some);
      } else {
        encoder.setNull("height_start");
      }

      if (this.terms.some.heightEnd.isSome) {
        encoder.setInteger("height_end", this.terms.some.heightEnd.some);
      } else {
        encoder.setNull("height_end");
      }

      if (this.terms.some.offsetStart.isSome) {
        encoder.setInteger("offset_start", this.terms.some.offsetStart.some);
      } else {
        encoder.setNull("offset_start");
      }

      if (this.terms.some.offsetEnd.isSome) {
        encoder.setInteger("offset_end", this.terms.some.offsetEnd.some);
      } else {
        encoder.setNull("offset_end");
      }

      encoder.popObject();
    } else {
      encoder.setNull("terms");
    }

    encoder.setBoolean("turbo_", this.turbo);

    encoder.popObject();
    return encoder.toString();
  }
}
