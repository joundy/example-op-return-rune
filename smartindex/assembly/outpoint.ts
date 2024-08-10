import { u128 } from "as-bignum/assembly";

export class Outpoint {
  runeBlock: u64;
  runeTx: u32;
  rune: string;

  txHash: string;
  vout: u32;

  address: string;
  amount: u128;

  constructor(
    runeBlock: u64,
    runeTx: u32,
    rune: string,
    txHash: string,
    vout: u32,
    address: string,
    amount: u128,
  ) {
    this.runeBlock = runeBlock;
    this.runeTx = runeTx;
    this.rune = rune;
    this.txHash = txHash;
    this.vout = vout;
    this.address = address;
    this.amount = amount;
  }
}
