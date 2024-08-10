import { Transaction } from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";
import { Option } from "./option";
import { consoleLog } from "@east-bitcoin-lib/smartindex-sdk/assembly";
import { u128 } from "as-bignum/assembly";
import { hexStringBigToLittle } from "./utils";

const OP_13 = "93";

export class Vout {
  txHash: string;
  index: u32;
  spender: string;
  asmScripts: string[];

  constructor(
    txHash: string,
    index: u32,
    spender: string,
    asmScripts: string[],
  ) {
    this.txHash = txHash;
    this.index = index;
    this.spender = spender;
    this.asmScripts = asmScripts;
  }
}

export class Vin {
  txHash: string;
  index: u32;

  constructor(txHash: string, index: u32) {
    this.txHash = txHash;
    this.index = index;
  }
}

export class RuneTransaction {
  blockHeight: u64;
  index: u32;

  vins: Vin[];
  vouts: Vout[];

  runeIndex: Option<u32>;
  runeData: Option<string>;

  constructor(blockHeight: u64, index: u32, vins: Vin[], vouts: Vout[]) {
    this.blockHeight = blockHeight;
    this.index = index;
    this.vins = vins;
    this.vouts = vouts;

    this.runeIndex = Option.None(<u32>0);
    this.runeData = Option.None("");

    for (let i = 0; i < this.vouts.length; i++) {
      const vout = this.vouts[i];

      if (
        vout.asmScripts.length === 3 &&
        vout.asmScripts[0] === "OP_RETURN" &&
        vout.asmScripts[1] === OP_13
      ) {
        let data = vout.asmScripts[2];

        consoleLog("DATAAA");
        consoleLog(data);
        // hacky trick, convert big endian to little endian
        if (!data.startsWith("0")) {
          const hex = u128.from(data).lo.toString(16).toString();
          data = hexStringBigToLittle(hex);
        }

        this.runeIndex = Option.Some(<u32>i);
        this.runeData = Option.Some(data);
        break;
      }
    }
  }

  static fromTransaction(
    blockHeight: u64,
    index: u32,
    transaction: Transaction,
  ): RuneTransaction {
    const vins: Vin[] = [];
    const vouts: Vout[] = [];

    for (let i = 0; i < transaction.utxos.length; i++) {
      const utxo = transaction.utxos[i];

      if (utxo.spendingTxHash === transaction.hash) {
        vins.push(
          new Vin(utxo.fundingTxHash, <u32>parseInt(utxo.fundingTxIndex)),
        );
      }

      if (utxo.fundingTxHash === transaction.hash) {
        vouts.push(
          new Vout(
            utxo.fundingTxHash,
            <u32>parseInt(utxo.fundingTxIndex),
            utxo.spender,
            utxo.pkAsmScripts,
          ),
        );
      }
    }

    return new RuneTransaction(blockHeight, index, vins, vouts);
  }
}
