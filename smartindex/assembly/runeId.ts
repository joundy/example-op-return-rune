import { u128 } from "as-bignum/assembly";

export type Rune = u128;

export class RuneId {
  block: u64;
  tx: u32;

  constructor(block: u64, tx: u32) {
    this.block = block;
    this.tx = tx;
  }
}
