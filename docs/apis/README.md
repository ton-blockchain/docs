# APIs

At the moment, two API options are available for interacting with TON:

## 1. TON API

   Client connect directly to lite servers (nodes) using a binary protocol.

   The client downloads keyblocks, the current state of the account and their **Merkle proofs**, which guarantees the validity of the received data.

   Read operations (like get-method calls) are made by launching a local TVM with a downloaded and verified state.

   The client does not need to download the full state of blockchain, it only downloads what is needed for the operation, so it is efficient. Calling local TVM is also lightweight.

   You can connect to public lite servers from the global config ([mainnet](https://ton.org/global-config.json) or [testnet](https://newton-blockchain.github.io/testnet-global.config.json)) or run your own lite server.

   Since it checks Merkle proofs, you can even use untrusted lite servers.

   Read more about Merkle proofs at [TON Whitepaper](https://ton-blockchain.github.io/docs/ton.pdf) 2.3.10, 2.3.11.

   👍 - Ultra secure API with Merkle proofs. 

   👎 - Need more time to figure it out. Not compatible with web frontends (non-HTTP protocol).

  **API reference**

  Requests and responses to the server are described by a TL schema, which allows you to generate a typed interface for a specific programming language.

  [TonLib TL Schema](https://github.com/newton-blockchain/ton/blob/master/tl/generate/scheme/tonlib_api.tl)

   **SDK:**
   
   - [C++ TonLib](https://github.com/newton-blockchain/ton/tree/master/example/cpp)

   - [Golang TonLib wrapper](https://github.com/ton-blockchain/tonlib-go)
   
   - [Java TonLib wrapper (JNI)](https://github.com/ton-blockchain/tonlib-java)
   
   **Examples of using:**

   - [Desktop](https://github.com/newton-blockchain/wallet-desktop), [Android](https://github.com/trm-dev/wallet-android) and [iOS](https://github.com/trm-dev/wallet-ios) standard wallets.


## 2. HTTP API

   Usual HTTP JSON RPC like in most blockchains.

   Clients connect to the [ton-http-api](https://github.com/toncenter/ton-http-api) server, which proxies requests to the lite server (node) using TonLib.

   You can connect to public [toncenter.com](https://toncenter.com) or run your own http-api instance.

   👍 - Habitual. Suitable for a quick start.

   👎 - You cannot fully trust the server's responses (however, as in most other blockchains), since its responses do not contain proofs.

   **API reference**

   [https://toncenter.com/api/v2/](https://toncenter.com/api/v2/)

   **SDK**:

   - [JavaScript TonWeb](https://github.com/toncenter/tonweb)
 
   **Examples of using:**

   - [Standard web wallet](https://github.com/toncenter/ton-wallet)
   
   - [Bridge frontend](https://github.com/ton-blockchain/bridge)