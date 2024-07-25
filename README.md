# About Eastlayer

Eastlayer is a decentralized data layer for Bitcoin. Eastlayer offers smart indexes, where developers can easily deploy custom indexing logic to process data from Bitcoin. Developers can write smart indexes with AssemblyScript and deploy it directly into Eastlayer, making the development and deployment of custom indexes seamlessly.

Eastlayer is an app-chain with BFT+ consensus, where each proposed block includes Bitcoin latest hash to maintain the guarantee of data integrity between Eastlayer and Bitcoin network. This approach also makes Eastlayer able to handle Bitcoin reorganization.

# Example of Eastlayer's Smart Index (Coin using OP_RETURN)

Using the Smart Index, anyone has the ability to create their own metaprotocol and have it indexed in a decentralized manner. This means that developers can design and implement unique protocols that suit their specific needs, and these protocols will be indexed without relying on a central authority.

This project is an example of Smart Index that implements a simplified coin metaprotocol. You can find the Smart Index code on `smartindex/` and the script to execute transaction on bitcoin on `script/`.

### OP_RETURN specification

```
Data in the marker output        Description
-------------------------        -------------------------
0x6a                             The OP_RETURN opcode.
0x43 0x4f 0x49 0x4e              The protocol signature "COIN"
0x69 | 0x74                      Issue (0x69) or Transfer (0x74) action
<TOKEN_NAME>                     Token name string
0x5f                             Protocol delimiter
<AMOUNT>                         Token amount in string
```

For example, if you want to create a coin named "DOG" with total supply 10000 you can set your script as `OP_RETURN COINiDOG_10000`. Then, to transfer 100 of that token do `OP_RETURN COINtDOG_100`, the token will be received by the address on the other outpoint.
