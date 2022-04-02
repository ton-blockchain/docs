# Actors chains
## Single actor
*We use here and below terms 'smart contract', 'account' and 'actor' interchangably for describing an entity on blockchain.*

Lets consider one smart contract. In TON it is a _thing_, that has propeties like `address`, `code`, `data`, `balance` and some others. In other words it is an object which has some _storage_ and _behavior_.
That behaviour is as follows:
* something happens (most common situation contract gets a message)
* contract handles that event in accordance to it's own properites by execution it's `code` in TON Virtual Machine.
* contract modifies it's own properties (`code`, `data` and others)
* contract optionally generates ougoing messages
* contract falls asleep till next event

Combination of that steps is called **transaction**. It is important that events are handled one by one, thus _transactions_ are strictly ordered and can not interrupt each other.

This behavior pattern is well known and called Actor.

Sequence of _transactions_ `Tx1 -> Tx2 -> Tx3 -> ....` may be called **chain**. And in considered case it is called **AccountChain** to emphasize that it is _chain_ of a single account transactions.

Now, since nodes which process transactions need from time to time coordinate state of smart contract (to reach a _consensus_ about the state) those _transactions_ are batched.
`[Tx1 -> Tx2] -> [Tx3 -> Tx4 -> Tx5] -> [] -> [Tx6]`
Batching does not intervene into sequencing, each transaction still has only one prev tx and at most one next tx, but now this sequence is cut into the **blocks**. 

It is also expedient to include a queues of incoming and outgoing messages to _blocks_. In that case _block_ will contain full set of information which determine and describe what happened to the smart contract during that block.

## Shards
Now lets consider many accounts. We can get a few _AccountChains_ and store them together, such set of _AccountChains_ is called **ShardChain**. The same way we can cut **ShardChain** into the **ShardBlocks**, that are aggregation of individual _AccountBlocks_.


Note that since _ShardChain_ consist of easily distinguished _AccountChains_ we can easily split them. That way if we have 1 _ShardChain_ which describe events that happen with 1 million accounts and there are too much transactions per second for being processed and stored by one node, we just divide (or **split**) that chain to two smaller _ShardChains_ with each chain accounting for half million of accounts and each chain processed on separate subset of nodes.

Analogously, if some shards became too unocupied they can be **merged** into one bigger shard.

There are obviously two limiting cases: when shard contains only one account (and thus can not be split further) and when shard contains all accounts.

Accounts can interact with each other by sending messages. There is a special mechanism of routing which move messages from ougoing queues to corresponding incoming queues and ensures that 1) all messages will be delivered 2) messages will be delivered consequently (the message sent earlier will reach destination earlier).

_Side note:_ to make splitting and merging deterministic, aggregation of accountchains into shards is based on bit-representation of account addresses. That way all accounts in shardchain will have exactly the same binary prefix (for instance all addresses will starts with `0b00101`).

## Blockchain
Aggregation of all shards which contain all accounts behaving by one set of rules is called a **Blockchain**.

In TON there can be many sets of rules and thus many blockchains which operate simultaneously and can interact with each other by sending messages crosschain the same way how accounts of one chain interacts with each other.

### Masterchain
There is necessity of synchronisation of message routing and transaction execution. In other words nodes in the network need a way to fix some 'point' in multichain state and reach a consensus about that state. In TON for that purpose a special chain **MasterChain** is used. Blocks of _masterchain_ contains additional information (latest block hashes) about all other chains in the system, thus any observer unambigously determine state of all multichain system at some masterchain block.
