import { u128 } from "as-bignum/assembly";

export const SUBSIDY_HALVING_INTERVAL: u32 = 210_000;
export const RESERVED_RUNE: u128 = u128.from(
  "6402364363415443603228541259936211926",
);

export enum Network {
  Mainnet,
  Testnet,
  Signet,
  Regtest,
}
