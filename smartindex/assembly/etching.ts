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

  static default(): Terms {
    return changetype<Terms>(0);
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

  static default(): Etching {
    return changetype<Etching>(0);
  }

  inspectJson(): string {
    const encoder = new JSONEncoder();
    encoder.pushObject("etching");

    if (this.divisibility.isSome()) {
      encoder.setInteger("divisibility", this.divisibility.unwrap());
    } else {
      encoder.setNull("divisibility");
    }

    if (this.premine.isSome()) {
      encoder.setString("premine", this.premine.unwrap().toString());
    } else {
      encoder.setNull("premine");
    }

    if (this.rune.isSome()) {
      encoder.setString("rune", this.rune.unwrap());
    } else {
      encoder.setNull("rune");
    }

    if (this.spacers.isSome()) {
      encoder.setInteger("spacers", this.spacers.unwrap());
    } else {
      encoder.setNull("spacers");
    }

    if (this.symbol.isSome()) {
      encoder.setString("symbol", this.symbol.unwrap());
    } else {
      encoder.setNull("symbol");
    }

    if (this.terms.isSome()) {
      encoder.pushObject("terms");

      if (this.terms.unwrap().amount.isSome()) {
        encoder.setString(
          "amount",
          this.terms.unwrap().amount.unwrap().toString(),
        );
      } else {
        encoder.setNull("amount");
      }

      if (this.terms.unwrap().cap.isSome()) {
        encoder.setString("cap", this.terms.unwrap().cap.unwrap().toString());
      } else {
        encoder.setNull("cap");
      }

      if (this.terms.unwrap().heightStart.isSome()) {
        encoder.setInteger(
          "height_start",
          this.terms.unwrap().heightStart.unwrap(),
        );
      } else {
        encoder.setNull("height_start");
      }

      if (this.terms.unwrap().heightEnd.isSome()) {
        encoder.setInteger(
          "height_end",
          this.terms.unwrap().heightEnd.unwrap(),
        );
      } else {
        encoder.setNull("height_end");
      }

      if (this.terms.unwrap().offsetStart.isSome()) {
        encoder.setInteger(
          "offset_start",
          this.terms.unwrap().offsetStart.unwrap(),
        );
      } else {
        encoder.setNull("offset_start");
      }

      if (this.terms.unwrap().offsetEnd.isSome()) {
        encoder.setInteger(
          "offset_end",
          this.terms.unwrap().offsetEnd.unwrap(),
        );
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
