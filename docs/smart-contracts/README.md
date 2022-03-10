# TON smart contracts overview

## TVM

TON smart contracts are executed on their own TON Virtual Machine (TVM).

TVM is built on the stack principle, which makes it efficient and easy to implement.

[Bird's-eye overview](/smart-contracts/tvm_overview.md)

[TVM specification](https://ton-blockchain.github.io/docs/tvm.pdf)

[TVM C++ implementation](https://github.com/newton-blockchain/ton/tree/master/crypto/vm)

## FunC

High-level language FunC is used to program smart contracts on TON.

[FunC documentation](https://ton.org/docs/#/func/overview.md)

[FunC compiler](https://github.com/newton-blockchain/ton/tree/master/crypto/func)

**Toolkit**

[TON IDEA plugin](https://plugins.jetbrains.com/plugin/18541-ton-development)

[FunC Sublime Text plugin](https://github.com/savva425/func_plugin_sublimetext3)

## Standard Smart Contracts

Standard basic smart contracts like wallets, elector (manages validation on TON), multi-signature wallet, etc. can be a reference when studying.

[Standard smart contracts](https://github.com/newton-blockchain/ton/tree/master/crypto/smartcont)

## Smart Contract Guidelines

TON allows you to do anything, but product smart contracts must be followed [smart contract guidelines](https://ton.org/docs/#/howto/smart-contract-guidelines). 

## Fift

Messages to smart contracts are binary data. To construct such messages, you can use one of the [SDKs](https://ton.org/docs/#/apis/) **or** the special programming language Fift.

Since Fift is close to TVM opcodes, it also helps to know the limits of your brain.

[Fift documentation](https://ton-blockchain.github.io/docs/fiftbase.pdf)

[Fift scripts for standard smart contracts](https://github.com/newton-blockchain/ton/tree/master/crypto/smartcont)

[Fift compiler](https://github.com/newton-blockchain/ton/tree/master/crypto/fift)


## FAQ

- **Is TVM compatible with EVM?**

   TVM cannot be compatible with the Ethereum Virtual Machine (EVM) because the TON has a different modern architecture (TON asynchronous, Ethereum synchronous).

- **Is it possible to write on Solidity for TON?**

   No, you can't write on Solidity for TON. 

   But if you add asynchronous messages to Solidity syntax and the ability to interact with data at a low level, then you get FunC. FunC has a familiar syntax similar to most modern programming languages and is designed specifically for TON.
