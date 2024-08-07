import { u128 } from "as-bignum/assembly";
import { Network, RESERVED_RUNE, SUBSIDY_HALVING_INTERVAL } from "./constants";
import { RuneId } from "./runeId";

const STEPS: u128[] = [
  u128.from("0"),
  u128.from("26"),
  u128.from("702"),
  u128.from("18278"),
  u128.from("475254"),
  u128.from("12356630"),
  u128.from("321272406"),
  u128.from("8353082582"),
  u128.from("217180147158"),
  u128.from("5646683826134"),
  u128.from("146813779479510"),
  u128.from("3817158266467286"),
  u128.from("99246114928149462n"),
];

function first_rune_height(network: Network): u32 {
  return (
    SUBSIDY_HALVING_INTERVAL *
    (network == Network.Mainnet ? 4 : network == Network.Testnet ? 12 : 0)
  );
}

export class Rune {
  value: u128;

  constructor(value: u128) {
    this.value = value;
  }

  static minimumAtHeight(chain: Network, height: u32): Rune {
    const offset: u32 = height + <u32>1;
    const INTERVAL: u32 = SUBSIDY_HALVING_INTERVAL / <u32>12;

    const start: u32 = first_rune_height(chain);
    const end: u32 = start + SUBSIDY_HALVING_INTERVAL;

    if (offset < start) {
      return new Rune(STEPS[12]);
    }
    if (offset >= end) {
      return new Rune(u128.Zero);
    }

    const progress = offset - start;
    const length = u32(
      12 - u128.div(u128.from(progress), u128.from(INTERVAL)).toU32(),
    );
    const endValue = STEPS[length - 1];
    const startValue = STEPS[length];
    const remainder = u128.from(progress % INTERVAL);

    const diff = u128.sub(startValue, endValue);
    const interpolation = u128.div(
      u128.mul(diff, remainder),
      u128.from(INTERVAL),
    );

    return new Rune(u128.sub(startValue, interpolation));
  }

  static fromString(str: string): Rune {
    let number = u128.from(0);

    for (let i = 0; i < str.length; i += 1) {
      const c = str.charAt(i);
      if (i > 0) {
        number = u128.add(number, u128.from(1));
      }
      number = u128.mul(number, u128.from(26));
      if (c >= "A" && c <= "Z") {
        number = u128.add(
          number,
          u128.from(c.charCodeAt(0) - "A".charCodeAt(0)),
        );
      } else {
        throw new Error(`Invalid character in rune name: ${c}`);
      }
    }

    return new Rune(number);
  }

  static default(): Rune {
    return new Rune(u128.from(0));
  }

  isReserved(): bool {
    return u128.ge(this.value, RESERVED_RUNE);
  }

  static reserved(runeId: RuneId): Rune {
    const block = u128.from(runeId.block);
    const tx = u128.from(runeId.tx);
    const reserve = u128.or(u128.shl(block, 32), tx);
    return new Rune(u128.add(RESERVED_RUNE, reserve));
  }

  commitBuffer(): ArrayBuffer {
    let number = this.value;
    const arr: u32[] = [];

    while (u128.gt(u128.shr(number, 8), u128.from(0))) {
      arr.push(u128.and(number, u128.from(255)).toU32());
      number = u128.shr(number, 8);
    }

    arr.push(number.toU32());

    let u8array = new Uint8Array(arr.length);
    u8array.set(arr);

    return u8array.buffer;
  }

  toString(): string {
    let _value = this.value;

    _value = u128.add(_value, u128.from(1));
    let str = "";
    while (u128.gt(_value, u128.from(0))) {
      const index = u128
        .rem(u128.sub(_value, u128.from(1)), u128.from(26))
        .toU32();
      str += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(index);

      _value = u128.div(u128.sub(_value, u128.from(1)), u128.from(26));
    }

    return str.split("").reverse().join("");
  }

  toValue(): u128 {
    return this.value;
  }
}
