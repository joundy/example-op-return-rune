import { u128 } from "as-bignum/assembly";
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
    offsetEnd: Option<u64>
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
    turbo: bool
  ) {
    this.divisibility = divisibility;
    this.premine = premine;
    this.rune = rune;
    this.spacers = spacers;
    this.symbol = symbol;
    this.terms = terms;
    this.turbo = turbo;
  }
}
