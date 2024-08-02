import { u128 } from "as-bignum/assembly";
import { Field } from "./field";
import { Flag } from "./flag";
import {
  fieldToName,
  readULEB128ToU128,
  Box,
  getFieldValue,
  getFieldValueU128,
  getFlag,
  getMint,
} from "./utils";
import { Edict } from "./edicts";
import { Option } from "./option";
import { Flaw } from "./flaws";
import { Artifact, Cenotaph, Runestone } from "./artifact";
import { Etching, Terms } from "./etching";

export class RunestoneParser {
  fields: Map<u64, Array<u128>>;
  edictsRaw: Array<StaticArray<u128>>;

  flaws: Flaw[] = [];

  constructor(
    fields: Map<u64, Array<u128>>,
    edictsRaw: Array<StaticArray<u128>>,
  ) {
    this.fields = fields;
    this.edictsRaw = edictsRaw;
  }

  // TODO: validate flaws
  static dechiper(buffer: ArrayBuffer): Artifact {
    const input = Box.from(buffer);

    const fields = new Map<u64, Array<u128>>();
    const edictsRaw = new Array<StaticArray<u128>>(0);

    while (input.len > 0) {
      const fieldKeyHeap = u128.from(0);
      const size = readULEB128ToU128(input, fieldKeyHeap);
      if (size === usize.MAX_VALUE) return Cenotaph.flaw(Flaw.VARINT);

      input.shrinkFront(size);

      const fieldKey = fieldKeyHeap.lo;
      // 0 is for body
      // TODO:
      // - flaw: TRAILING_INTEGERS
      // - flaw: EDICT_RUNE_ID
      // - flaw: EDICT_OUTPUT
      if (fieldKey === Field.BODY) {
        while (input.len > 0) {
          const edict = new StaticArray<u128>(4);
          for (let i = 0; i < 4; i++) {
            const edictInt = u128.from(0);
            const size = readULEB128ToU128(input, edictInt);
            if (usize.MAX_VALUE === size) return Cenotaph.flaw(Flaw.VARINT);
            input.shrinkFront(size);
            edict[i] = edictInt;
          }
          edictsRaw.push(edict);
        }
      } else {
        const value = u128.from(0);
        const size = readULEB128ToU128(input, value);
        if (usize.MAX_VALUE === size) return Cenotaph.flaw(Flaw.VARINT);
        input.shrinkFront(size);
        let field: Array<u128> = changetype<Array<u128>>(0);
        if (!fields.has(fieldKey)) {
          field = new Array<u128>(0);
          fields.set(fieldKey, field);
        } else {
          field = fields.get(fieldKey);
        }
        field.push(value);
      }
    }

    let etching = Option.None(Etching.default());
    if (getFlag(fields, Flag.ETCHING)) {
      const divisibility = getFieldValue<u8>(fields, Field.DIVISIBILITY);
      const premine = getFieldValueU128(fields, Field.PREMINE);
      let rune = Option.None("");
      const runeValue = getFieldValueU128(fields, Field.RUNE);
      if (runeValue.isSome()) {
        rune = Option.Some(fieldToName(runeValue.unwrap()));
      }
      const spacers = getFieldValue<u32>(fields, Field.SPACERS);
      let symbol = Option.None("");
      const symbolValue = getFieldValue<u32>(fields, Field.SYMBOL);
      if (symbolValue.isSome()) {
        symbol = Option.Some(String.fromCodePoint(symbolValue.unwrap()));
      }
      // TODO: turbo
      let turbo = false;

      let terms = Option.None(changetype<Terms>(0));
      if (getFlag(fields, Flag.TERMS)) {
        const amount = getFieldValueU128(fields, Field.AMOUNT);
        const cap = getFieldValueU128(fields, Field.CAP);
        const heightStart = getFieldValue<u64>(fields, Field.HEIGHTSTART);
        const heightEnd = getFieldValue<u64>(fields, Field.HEIGHTEND);
        const offsetStart = getFieldValue<u64>(fields, Field.OFFSETSTART);
        const offsetEnd = getFieldValue<u64>(fields, Field.OFFSETEND);

        terms = Option.Some(
          new Terms(
            amount,
            cap,
            heightStart,
            heightEnd,
            offsetStart,
            offsetEnd,
          ),
        );
      }

      etching = Option.Some(
        new Etching(divisibility, premine, rune, spacers, symbol, terms, turbo),
      );
    }

    const edicts = Edict.fromDeltaSeries(edictsRaw);
    const mint = getMint(fields);
    const pointer = getFieldValue<u32>(fields, Field.POINTER);

    return new Runestone(edicts, etching, mint, pointer);
  }
}
