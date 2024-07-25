"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@east-bitcoin-lib/sdk");
const opReturn_1 = require("@east-bitcoin-lib/sdk/dist/addresses/opReturn");
const bitcoinaApi = new sdk_1.BElectrsAPI({
    network: "regtest",
    apiUrl: {
        regtest: "http://localhost:3002",
    },
});
const api = new sdk_1.API({
    network: "regtest",
    bitcoin: bitcoinaApi,
    ord: new sdk_1.OrdAPI({ network: "regtest" }), // dummy
});
const wallet = new sdk_1.Wallet({
    network: "regtest",
    mnemonic: "final chat okay post increase install picnic library modify legend soap cube",
});
async function transferCoin() { }
async function issueNewCoin(coinName, totalSupply) {
    const opReturnOutput = new opReturn_1.OpReturn({
        dataScripts: [sdk_1.Script.encodeUTF8(`i_${coinName}_${totalSupply}`)],
    });
    const p2wpkh = wallet.p2wpkh(0);
    const p = new sdk_1.PSBT({
        network: "regtest",
        inputs: [],
        outputs: [
            {
                output: opReturnOutput,
                value: 0,
            },
        ],
        feeRate: 1,
        changeOutput: sdk_1.Address.fromString(p2wpkh.address),
        autoUtxo: {
            api,
            from: new sdk_1.P2wpkhAutoUtxo(p2wpkh),
        },
    });
    await p.build();
    const psbt = p.toPSBT();
    psbt.signAllInputs(p2wpkh.keypair);
    const hex = psbt.finalizeAllInputs().extractTransaction().toHex();
    const broadCastResult = await api.bitcoin.brodcastTx(hex);
    console.log("IssueNewCoin", { hex, broadCastResult });
    // mine here
}
issueNewCoin("EAST", "10000");
