# Overview

High-level language FunC is used to program smart contracts on TON.

FunC is a domain-specific C-like statically typed language. 

FunC programs are compiled into Fift assembler code, which generates corresponding bytecode for the TVM (TON Virtual Machine). Further this bytecode (actually a tree of cells, like any other data in TON Blockchain) can be used for creating a smart contract in the blockchain or can be run on a local instance of TVM.

## Compiler

**FunC compiler binaries** for Windows, MacOS (Intel), Ubuntu can be downloaded from [TON Auto Builds](https://github.com/ton-blockchain/ton/actions?query=branch%3Amaster+is%3Acompleted).

[FunC compiler source code](https://github.com/ton-blockchain/ton/tree/master/crypto/func) (read [how to compile](/compile.md#FunC) FunC compiler from sources).

## Documentation

Start [here](func/types).

FunC documentation initially written by [@akifoq](https://github.com/akifoq).

## Toolkit

- Development and Testing
    * [toncli](https://github.com/disintar/toncli) - Comfy CLI to build, deploy and test FunC contracts
    * [ton-contract-executor](https://github.com/Naltox/ton-contract-executor) - Library for running contracts locally
    * [tonstarter-contracts](https://github.com/ton-defi-org/tonstarter-contracts) - All-in-one templates to build, deploy and test (by ton.js) FunC contracts
    * [MyLocalTON](/nodes/local-ton.md) - Run your private TON blockchain

- IDE plugins
    * [TON IDEA plugin](https://plugins.jetbrains.com/plugin/18541-ton-development)
    * [FunC Sublime Text plugin](https://github.com/savva425/func_plugin_sublimetext3)
    * [VS Code plugin](https://marketplace.visualstudio.com/items?itemName=tonwhales.func-vscode)

- [Testnet](/testnet/)

## Tutorials


* [Learn FunC in Y Minutes](https://learnxinyminutes.com/docs/func/) by **@romanovichim**.

* [10 FunC Lessons](https://github.com/romanovichim/TonFunClessons_Eng) by **@romanovichim** using **toncli** and **toncli** tests v1.

* [10 уроков FunC](https://github.com/romanovichim/TonFunClessons_ru) от **@romanovichim**, используя **toncli** и **toncli**-тесты v1.

* [TON Hello World: part 1](https://society.ton.org/ton-hello-world-step-by-step-guide-for-writing-your-first-smart-contract-in-func): Step by step guide for writing your first smart contract in FunC by **TON Society** using **ton.js**.

* [TON Hello World: part 2](https://society.ton.org/ton-hello-world-guide-for-writing-first-smart-contract-in-func-part-2): The second part of the guide by **TON Society** about testing and debugging.

* [FunC Quiz](https://t.me/toncontests/60) by **Vadim** - Good for selfcheck. It will take 10–15 minutes. The questions are mainly about FunС with a few general questions about TON.

* [FunC тест](https://t.me/toncontests/58?comment=14888) от **Vadim** - FunC Quiz на русском.

## Contests

Participating in [contests](https://t.me/toncontests) is a great way to learn FunC.

Also, for learning purposes, you can study past contests:

* TON Smart Challenge #2 (suitable for getting started):
    [Contest Page](https://ton.org/ton-smart-challenge-2),
    [Tasks](https://github.com/ton-blockchain/func-contest2),
    [Solutions](https://github.com/ton-blockchain/func-contest2-solutions),
    [Tests](https://github.com/ton-blockchain/func-contest2-tests).

* TON Smart Challenge #1 (suitable for beginners):
  [Contest Page](https://ton.org/contest),
  [Tasks](https://github.com/ton-blockchain/func-contest1),
  [Solutions](https://github.com/ton-blockchain/func-contest1-solutions),
  [Tests](https://github.com/ton-blockchain/func-contest1-tests).

## Standard Smart Contracts

Standard basic smart contracts like wallets, elector (manages validation on TON), multi-signature wallet, etc. can be a reference when studying.

[Standard smart contracts](https://github.com/ton-blockchain/ton/tree/master/crypto/smartcont)

## Smart Contract Guidelines

Smart contracts on FunC must comply with the common [guidelines](https://ton.org/docs/#/howto/smart-contract-guidelines).
