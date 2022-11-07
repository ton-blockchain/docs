# Crosschain bridges

Decentralized crosschain bridges operate on the TON Blockchain, allowing you to transfer assets from the TON Blockchain to other blockchains and vice versa.

## Toncoin bridge

The Toncoin bridge allows you to transfer Toncoins between TON Blockchain and the Ethereum blockchain, as well as between the TON Blockchain and the BNB Smart Chain.

The bridge is managed by decentralized oracles.

Bridge frontend is hosted on https://ton.org/bridge (Mainnet) and https://ton.org/bridge?testnet=true (Testnet).

[Bridge frontend source code](https://github.com/ton-blockchain/bridge)


### TON-Ethereum smart contracts source codes

[FunC (TON side)](https://github.com/ton-blockchain/bridge-func)

[Solidity (Ethereum side)](https://github.com/ton-blockchain/bridge-solidity/tree/eth_mainnet)


### TON-BNB Smart Chain smart contracts source codes

[FunC (TON side)](https://github.com/ton-blockchain/bridge-func/tree/bsc)

[Solidity (BSC side)](https://github.com/ton-blockchain/bridge-solidity/tree/bsc_mainnet)


### Network Configs

Actual bridge smart contracts addresses and oracles addresses you can get by inspecting the corresponding network config:

TON-Ethereum - [#71](https://github.com/ton-blockchain/ton/blob/35d17249e6b54d67a5781ebf26e4ee98e56c1e50/crypto/block/block.tlb#L738).

TON-BSC - [#72](https://github.com/ton-blockchain/ton/blob/35d17249e6b54d67a5781ebf26e4ee98e56c1e50/crypto/block/block.tlb#L739).

[List of current bridge smart contract addresses](/crosschain/bridge-addresses.md) 

### Documentation

[How the bridge works](https://github.com/ton-blockchain/TIPs/issues/24)

## Crosschain roadmap

https://t.me/tonblockchain/146