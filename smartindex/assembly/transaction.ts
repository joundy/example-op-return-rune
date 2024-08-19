import { Option } from "./option";
import { Box, decodeHex } from "./utils";
import { scriptParse } from "./utils/script";
import { TransactionV1 } from "@east-bitcoin-lib/smartindex-sdk/assembly/types";

const OP_RETURN_HEX = "6a";
const OP_13_HEX = "5d";

export class RuneTransaction {
  height: u64;
  index: u32;
  transaction: TransactionV1;

  runeIndex: Option<u32>;
  runeData: Option<ArrayBuffer>;

  constructor(height: u64, index: u32, transaction: TransactionV1) {
    this.transaction = transaction;
    this.height = height;
    this.index = index;

    this.runeIndex = Option.None(<u32>0);
    this.runeData = Option.None(changetype<ArrayBuffer>(0));

    for (let i = 0; i < this.transaction.vouts.length; i++) {
      const vout = this.transaction.vouts[i];

      if (vout.pkScript.startsWith(`${OP_RETURN_HEX}${OP_13_HEX}`)) {
        const scripts = scriptParse(Box.from(decodeHex(vout.pkScript))).slice(
          2,
        );
        const payload = Box.concat(scripts);

        this.runeIndex = Option.Some(<u32>i);
        this.runeData = Option.Some(payload);

        break;
      }
    }
  }

  isVoutOpReturn(index: u32): bool {
    return this.transaction.vouts[index].pkScript.startsWith(OP_RETURN_HEX);
  }
}
