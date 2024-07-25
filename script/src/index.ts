import {
  API,
  Address,
  BElectrsAPI,
  OrdAPI,
  P2wpkhAutoUtxo,
  PSBT,
  Script,
  Wallet,
} from "@east-bitcoin-lib/sdk";
import { OpReturn } from "@east-bitcoin-lib/sdk/dist/addresses/opReturn";

const bitcoinaApi = new BElectrsAPI({
  network: "regtest",
  apiUrl: {
    regtest: "https://blockstream-electrs-api.regnet.btc.eastlayer.io"
  },
});

const api = new API({
  network: "regtest",
  bitcoin: bitcoinaApi,
  ord: new OrdAPI({ network: "regtest" }), // dummy
});

const wallet = new Wallet({
  network: "regtest",
  mnemonic:
    "final chat okay post increase install picnic library modify legend soap cube",
});

async function transferCoin(coinName: string, amount: string) {
  const opReturnOutput = new OpReturn({
    dataScripts: [Script.encodeUTF8(`COINt${coinName}_${amount}`)],
  });

  const p2wpkh = wallet.p2wpkh(0);
  console.log(Address.fromString(p2wpkh.address));

  const p = new PSBT({
    network: "regtest",
    inputs: [],
    outputs: [
      {
        output: opReturnOutput,
        value: 0,
      },
      {
        output: Address.fromString("2N8ruoh7CGSycEnSx1nhi9C2UVYdUf89T7C"),
        value: 546,
      },
    ],
    feeRate: 1,
    changeOutput: Address.fromString(p2wpkh.address),
    autoUtxo: {
      api,
      from: new P2wpkhAutoUtxo(p2wpkh),
    },
  });

  await p.build();
  const psbt = p.toPSBT();

  psbt.signAllInputs(p2wpkh.keypair);
  const hex = psbt.finalizeAllInputs().extractTransaction().toHex();
  const broadCastResult = await api.bitcoin.brodcastTx(hex);
  console.log("TransferNewCoin", { hex, broadCastResult });
}

async function issueNewCoin(coinName: string, totalSupply: string) {
  const opReturnOutput = new OpReturn({
    dataScripts: [Script.encodeUTF8(`COINi${coinName}_${totalSupply}`)],
  });

  const p2wpkh = wallet.p2wpkh(0);
  console.log(Address.fromString(p2wpkh.address));

  const p = new PSBT({
    network: "regtest",
    inputs: [],
    outputs: [
      {
        output: opReturnOutput,
        value: 0,
      },
    ],
    feeRate: 1,
    changeOutput: Address.fromString(p2wpkh.address),
    autoUtxo: {
      api,
      from: new P2wpkhAutoUtxo(p2wpkh),
    },
  });

  await p.build();
  const psbt = p.toPSBT();

  psbt.signAllInputs(p2wpkh.keypair);
  const hex = psbt.finalizeAllInputs().extractTransaction().toHex();
  const broadCastResult = await api.bitcoin.brodcastTx(hex);
  console.log("IssueNewCoin", { hex, broadCastResult });
}

// issueNewCoin("TEST", "10000");
transferCoin("TEST", "10");
