import { u128 } from "as-bignum/assembly";
import { Box } from "./box";
import { Option } from "../option";
import { Field } from "../field";
import { RuneId } from "../runeId";

export function readULEB128ToU128(buf: Box, to: u128): usize {
  const slice = buf.sliceFrom(0);
  let shift: i32 = 0;
  let result: u128 = u128.from(0);
  let byte: u8 = 0;
  if (slice.len === 0) {
    return 0;
  }
  while (true) {
    byte = load<u8>(slice.start);
    if (slice.len === 0) return usize.MAX_VALUE;
    slice.shrinkFront(1);

    //@ts-ignore
    result |= u128.from(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  to.hi = result.hi;
  to.lo = result.lo;
  return slice.start - buf.start;
}

export function fieldToU128(data: Array<u128>): u128 {
  if (data.length === 0) return u128.from(0);
  return data[0];
}

export function getFieldValue<T>(
  fields: Map<u64, Array<u128>>,
  field: u8,
): Option<T> {
  if (!fields.has(field)) {
    return Option.None<T>(<T>0);
  }
  const value = <T>fields.get(field)[0].lo;
  return Option.Some<T>(value);
}

export function getFieldValueU128(
  fields: Map<u64, Array<u128>>,
  field: u8,
): Option<u128> {
  if (!fields.has(field)) {
    return Option.None(u128.from(0));
  }
  const value = fields.get(field)[0];
  return Option.Some(value);
}

export function getFlag(fields: Map<u64, Array<u128>>, position: u64): bool {
  if (!fields.has(Field.FLAGS)) return false;
  const flags = fieldToU128(fields.get(Field.FLAGS));
  //@ts-ignore
  return !u128.and(flags, u128.from(1) << (<i32>position)).isZero();
}

export function getMint(fields: Map<u64, Array<u128>>): Option<RuneId> {
  if (!fields.has(Field.MINT)) {
    return Option.None(RuneId.default());
  }

  const mint = fields.get(Field.MINT);
  if (mint.length < 2) {
    // skip if the runeId is not valid
    return Option.None(RuneId.default());
  }
  const block = <u64>mint[0].lo;
  const tx = <u32>mint[1].lo;

  return Option.Some(new RuneId(block, tx));
}

export * from "./box";
export * from "./hex";
