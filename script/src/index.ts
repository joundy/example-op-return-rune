import { encodeRunestone } from "@magiceden-oss/runestone-lib";
import {
  API,
  Address,
  BElectrsAPI,
  OpReturn,
  P2trAutoUtxo,
  P2trScript,
  P2wpkhAutoUtxo,
  PSBT,
  RegboxAPI,
  Script,
  Wallet,
  BitcoinUTXO,
  Input,
  P2wpkhUtxo,
} from "@east-bitcoin-lib/sdk";

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const regboxApi = new RegboxAPI({
  url: "http://localhost:8080",
});

const bitcoinApi = new BElectrsAPI({
  network: "regtest",
  apiUrl: {
    regtest: "http://localhost:3002",
  },
});

const api = new API({
  network: "regtest",
  bitcoin: bitcoinApi,
});

const wallet = new Wallet({
  network: "regtest",
  mnemonic:
    "chat chat okay post increase install picnic library modify legend soap cube",
});

const balanceWallet = wallet.p2wpkh(0);
const runeWallet1 = wallet.p2wpkh(1);
const runeWallet2 = wallet.p2wpkh(2);
const runeWallet3 = wallet.p2wpkh(3);

async function etching() {
  const runestone = encodeRunestone({
    etching: {
      runeName: "NASIPADANGUGUGAK",
      divisibility: 0,
      symbol: "💸",
      terms: {
        cap: 20n,
        amount: 100n,
        height: {
          start: 100n,
          end: 200n,
        },
      },
    },
  });

  const script = (internalPubkey: Buffer): P2trScript => {
    const runeCommit = Script.compile([
      internalPubkey,
      Script.OP_CHECKSIG,
      Script.OP_FALSE,
      Script.OP_IF,
      runestone.etchingCommitment!,
      Script.OP_ENDIF,
    ]);
    const recovery = Script.compile([internalPubkey, Script.OP_CHECKSIG]);

    return {
      taptree: [
        {
          output: Script.compile(runeCommit),
        },
        {
          output: Script.compile(recovery),
        },
      ],
      redeem: {
        output: runeCommit,
        redeemVersion: 192,
      },
    };
  };

  const p2tr = wallet.p2trScript(0, script);
  console.log({ address: p2tr.address });

  await regboxApi.getFaucet(p2tr.address, 0.1);
  await regboxApi.generateBlock(6);
  // wait 5 seconds for electrs
  await sleep(5 * 1000);

  const p = new PSBT({
    network: "regtest",
    inputs: [],
    outputs: [
      {
        output: new OpReturn({ buffer: runestone.encodedRunestone }),
        value: 0,
      },
    ],
    feeRate: 1,
    changeOutput: Address.fromString(p2tr.address),
    autoUtxo: {
      api,
      from: new P2trAutoUtxo(p2tr),
    },
  });

  await p.build();
  p.signAllInputs(p2tr.keypair);
  p.finalizeAllInputs();

  await bitcoinApi.brodcastTx(p.toHex(true));
  await regboxApi.generateBlock(1);

  console.log("etching ok");
}

async function mint() {
  console.log({
    balanceWallet: balanceWallet.address,
    runeWallet: runeWallet1.address,
  });

  await regboxApi.getFaucet(balanceWallet.address, 0.1);
  await regboxApi.generateBlock(1);
  // wait 5 seconds for electrs
  await sleep(5 * 1000);

  const runestone = encodeRunestone({
    // please specify the runeId
    mint: {
      block: 118n,
      tx: 1,
    },
    pointer: 2,
  });

  const p = new PSBT({
    network: "regtest",
    inputs: [],
    outputs: [
      {
        output: Address.fromString(runeWallet1.address),
        value: 600,
      },
      {
        output: Address.fromString(runeWallet1.address),
        value: 600,
      },
      {
        // the balance will goes here, the pointer set to index 2
        output: Address.fromString(runeWallet1.address),
        value: 600,
      },
      {
        output: new OpReturn({ buffer: runestone.encodedRunestone }),
        value: 0,
      },
    ],
    feeRate: 1,
    changeOutput: Address.fromString(balanceWallet.address),
    autoUtxo: {
      api,
      from: new P2wpkhAutoUtxo(balanceWallet),
    },
  });

  await p.build();
  p.signAllInputs(balanceWallet.keypair);
  p.finalizeAllInputs();

  await bitcoinApi.brodcastTx(p.toHex(true));
  await regboxApi.generateBlock(1);

  console.log("mint ok");
}

// example outpoints: hash:index => 875321bae9ed3fa9621c829f9ecf2f64414936ade77f64b0467689171b1c8fa5:1
async function getInputsByOutpoints(
  address: string,
  outpoints: {
    hash: string;
    index: number;
  }[],
): Promise<Input[]> {
  const runeWallet1Utxos = await bitcoinApi.getUTXOs(address);
  const utxoMap = new Map(
    runeWallet1Utxos.map((utxo) => {
      return [`${utxo.txid}:${utxo.vout}`, utxo];
    }),
  );

  const utxos: BitcoinUTXO[] = [];
  for (const outpoint of outpoints) {
    const key = `${outpoint.hash}:${outpoint.index}`;
    if (utxoMap.has(key)) {
      utxos.push(utxoMap.get(key)!);
    }
  }

  if (outpoints.length !== utxos.length) {
    throw new Error("errors.outpoints and utxos length doesn't match");
  }

  const inputs = await Promise.all(
    utxos.map(async (utxo) => {
      return {
        utxo: await P2wpkhUtxo.fromBitcoinUTXO(utxo),
        value: utxo.value,
      };
    }),
  );

  return inputs;
}

async function edict() {
  // send the balance from rune wallet 1 to rune wallet 2

  const runestone = encodeRunestone({
    edicts: [
      {
        id: {
          block: 118n,
          tx: 1,
        },
        amount: 90n,
        output: 0,
      },
      {
        id: {
          block: 118n,
          tx: 1,
        },
        amount: 20n,
        output: 1,
      },
      {
        id: {
          block: 118n,
          tx: 1,
        },
        amount: 11n,
        output: 2,
      },
    ],
  });

  // please specify the inputs, the inputs must contain the rune balances
  const runeWallet1Inputs = await getInputsByOutpoints(runeWallet1.address, [
    {
      hash: "8b604ebb0426d24dd947f4bd46bed9d592e62d84aa25e0fa4c4f988edb32e45c",
      index: 0,
    },
  ]);

  await regboxApi.getFaucet(balanceWallet.address, 0.1);
  await regboxApi.generateBlock(1);
  // wait 5 seconds for electrs
  await sleep(5 * 1000);

  const p = new PSBT({
    network: "regtest",
    inputs: runeWallet1Inputs,
    outputs: [
      {
        output: Address.fromString(runeWallet1.address),
        value: 600,
      },
      {
        output: Address.fromString(runeWallet2.address),
        value: 600,
      },
      {
        output: Address.fromString(runeWallet3.address),
        value: 600,
      },
      {
        output: new OpReturn({ buffer: runestone.encodedRunestone }),
        value: 0,
      },
    ],
    feeRate: 1,
    changeOutput: Address.fromString(balanceWallet.address),
    autoUtxo: {
      api,
      from: new P2wpkhAutoUtxo(balanceWallet),
    },
  });

  await p.build();
  // console.log(p.inputs);
  for (let i = 0; i < p.inputs.length; i++) {
    if (i < runeWallet1Inputs.length - 1) {
      p.signInput(i, runeWallet1.keypair);
      continue;
    }
    p.signInput(i, balanceWallet.keypair);
  }

  p.finalizeAllInputs();
  await bitcoinApi.brodcastTx(p.toHex(true));
  await regboxApi.generateBlock(1);

  console.log("edict ok");
}

async function main() {
  // await etching();
  // await mint();
  await edict();
}

main();
