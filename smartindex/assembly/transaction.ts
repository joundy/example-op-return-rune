import { Transaction } from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";
import { Option } from "./option";

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
  toString(): string {
    let vinsStr = this.vins.map<string>((vin: Vin) => `Vin(txHash: ${vin.txHash}, index: ${vin.index})`).join(", ");
    let voutsStr = this.vouts.map<string>((vout: Vout) => `Vout(txHash: ${vout.txHash}, index: ${vout.index}, spender: ${vout.spender}, asmScripts: [${vout.asmScripts.join(", ")}])`).join(", ");
    return `RuneTransaction(blockHeight: ${this.blockHeight}, index: ${this.index}, vins: [${vinsStr}], vouts: [${voutsStr}])`;
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

  constructor(blockHeight: u64, index: u32, vins: Vin[], vouts: Vout[]) {
    this.blockHeight = blockHeight;
    this.index = index;
    this.vins = vins;
    this.vouts = vouts;
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

      if (utxo.spendingTxHash) {
        vins.push(
          new Vin(utxo.spendingTxHash, <u32>parseInt(utxo.spendingTxIndex)),
        );
      }

      if (utxo.fundingTxHash) {
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

  runeIndex(): Option<u32> {
    for (let i = 0; i < this.vouts.length; i++) {
      const vout = this.vouts[i];

      if (
        vout.asmScripts.length > 3 &&
        vout.asmScripts[0] === "OP_RETURN" &&
        vout.asmScripts[1] === OP_13
      ) {
        return Option.Some(<u32>i);
      }
    }
    return Option.None(<u32>0);
  }
}
