import { Transaction } from "@east-bitcoin-lib/smartindex-sdk/assembly/sdk";
import { Option } from "./option";
import { Box, decodeHex } from "./utils";
import { scriptParse } from "./utils/script";

const OP_13 = "93";

export class Vout {
  txHash: string;
  index: u32;
  spender: string;
  asmScripts: string[];
  pkScript: string;

  constructor(
    txHash: string,
    index: u32,
    spender: string,
    asmScripts: string[],
    pkScript: string,
  ) {
    this.txHash = txHash;
    this.index = index;
    this.spender = spender;
    this.asmScripts = asmScripts;
    this.pkScript = pkScript;
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
  runeData: Option<ArrayBuffer>;

  constructor(blockHeight: u64, index: u32, vins: Vin[], vouts: Vout[]) {
    this.blockHeight = blockHeight;
    this.index = index;
    this.vins = vins;
    this.vouts = vouts;

    this.runeIndex = Option.None(<u32>0);
    this.runeData = Option.None(changetype<ArrayBuffer>(0));

    for (let i = 0; i < this.vouts.length; i++) {
      const vout = this.vouts[i];

      // if (index === 1) {
      //   consoleLog("=== VOUT ===");
      //   consoleLog(`txHash: ${vout.txHash}`);
      //   consoleLog(`index: ${vout.index}`);
      //   consoleLog(`pkScript: ${vout.pkScript}`);
      //   consoleLog(`spender: ${vout.spender}`);
      //   consoleLog("=== END VOUT ===");
      // }

      // HACK
      // - TODO: proper parse rune/script data
      if (
        vout.asmScripts.length === 3 &&
        vout.asmScripts[0] === "OP_RETURN" &&
        vout.asmScripts[1] === OP_13
      ) {
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
            utxo.pkScript,
          ),
        );
      }
    }

    vouts.sort((a, b) => a.index - b.index);
    vins.sort((a, b) => a.index - b.index);
    return new RuneTransaction(blockHeight, index, vins, vouts);
  }
}
