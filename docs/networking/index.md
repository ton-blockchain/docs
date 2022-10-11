# TON Networking

The TON project uses its own peer-to-peer network protocols.

- **TON Blockchain uses these protocols** to propagate new blocks, send and collect transaction candidates and so on. 

    While the networking demands of single-blockchain projects, such as Bitcoin or Ethereum, can be met quite easily (one essentially needs to construct
    a peer-to-peer overlay network, and propagate all new blocks and
    transaction candidates by a [gossip](https://en.wikipedia.org/wiki/Gossip_protocol) protocol), multi-blockchain projects, such
    as the TON Blockchain, are much more demanding (e.g., one must be able to
    subscribe to updates of only some shardchains, not necessarily all of them).


- **TON ecosystem services (e.g TON Proxy, TON Sites, TON Storage) run on these protocols.**

    Once the more sophisticated network protocols needed
    to support the TON Blockchain are in place, it turns out that they can easily
    be used for purposes not necessarily related to the immediate demands of the
    TON Blockchain, thus providing more possibilities and flexibility for creating
    new services in the TON ecosystem.

## ADNL

Implementation - https://github.com/ton-blockchain/ton/tree/master/adnl.

The cornerstone in the TON networking is the Abstract Datagram Network Layer (ADNL).

This is an overlay, peer-to-peer, unreliable (small-size) datagram protocol running on top of **UDP** in **IPv4** (in future IPv6), with an optional **TCP fallback** if UDP is not available.

Each participant has a 256-bit ADNL address.

The ADNL protocol allows you to send (unreliable) and receive datagrams using only these ADNL addresses. IP addresses and ports are hidden by the ADNL protocol.

An ADNL address essentially equal to a 256-bit ECC public key. This public key can be generated arbitrarily, thus creating as many different network identities as the node likes.
However, one must know the corresponding private key in order to receive (and decrypt) messages intended for such an address.

In fact, the ADNL address is not the public key itself; instead, it is a 256-bit sha256 hash of a serialized TL-object that can describe several types of public keys and addresses depending on its constructor.

Normally each datagram sent is signed by the sender and encrypted so that only the recipient can decrypt the message, and the recipient can verify the integrity by the signature.

Normally, a TON ADNL node will have some “neighbor table”, containing information about
other known nodes, such as their abstract addresses and their
public keys, IP addresses and UDP ports. Then it will gradually
extend this table by using information learned from these known nodes as
answers to special queries, and sometimes prune obsolete records.

ADNL allows you to set up point-to-point channels and tunnels (a chain of proxies).

A TCP-like stream protocol can be built over ADNL.

Read more about ADNL in [TON Whitepaper](https://ton.org/docs/ton.pdf) chapter 3.1.

## Overlay subnetworks

Implementation - https://github.com/ton-blockchain/ton/tree/master/overlay.

In a multi-blockchain system like the TON Blockchain, even full nodes would
normally be interested in obtaining updates (i.e., new blocks) only about
some shardchains. To this end, a special overlay subnetwork are built
inside the TON Network, on top of the ADNL protocol, one
for each shardchain.

Also, overlay subnetworks are used for the operation of TON Storage, TON Proxy, and so on.

In contrast to ADNL, the TON overlay networks usually do not support
sending datagrams to arbitrary other nodes. Instead, some “semipermanent
links” are established between some nodes (called “neighbors” with respect to
the overlay network under consideration), and messages are usually forwarded
along these links (i.e., from a node to one of its neighbors).

Each overlay subnetwork has s 256-bit network identifier usually equal
to sha256 of the description of the overlay network—a TL-serialized object.

Overlay subnetworks can be public or private.

Overlay subnetworks work according to a special [gossip](https://en.wikipedia.org/wiki/Gossip_protocol) protocol.

Read more about ADNL overlay subnetworks in [TON Whitepaper](https://ton.org/docs/ton.pdf) chapter 3.3.

## RLDP

Implementation - https://github.com/ton-blockchain/ton/tree/master/rldp, https://github.com/ton-blockchain/ton/tree/master/rldp2, https://github.com/ton-blockchain/ton/tree/master/rldp-http-proxy.

A reliable arbitrary-size datagram protocol built upon the ADNL, called RLDP,
is used instead of a TCP-like protocol. This reliable datagram protocol can
be employed, for instance, to send RPC queries to remote hosts and receive
answers from them.

## TON DHT

Implementation - https://github.com/ton-blockchain/ton/tree/master/dht, https://github.com/ton-blockchain/ton/tree/master/dht-server.

The Kademlia-like Distributed Hash Table (DHT) plays a crucial role in the networking part of the TON Project, being used to locate other nodes in the network.

The keys of the TON DHT are simply 256-bit integers. In most cases, they are computed as sha256 of a TL-serialized object.

The values assigned to these 256-bit keys are essentially arbitrary byte strings of limited length. The interpretation of
such byte strings is determined by the preimage of the corresponding key; it
is usually known both by the node that looks up the key, and by the node
that stores the key.

In the simplest case, the key represents ADNL address of some node and the value can be its IP address and port.

The key-value mapping of the TON DHT is kept on the DHT nodes.

Each DHT node has a 256-bit DHT address. Unlike an ADNL address, a DHT address should not change too often, otherwise other nodes would be unable to locate the keys they are looking for.

It is expected that the value of key `K` will be stored on `S` Kademlia-nearest nodes to `K`.

Kademlia distance = 256-bit key `XOR` 256-bit DHT node address (has nothing to do with geographic location).

`S` is a small parameter, say, `S = 7`, needed to improve reliability of
the DHT (if we would keep the key only on one node, the nearest one to `K`,
the value of that key would be lost if that only node goes offline).


Any node participating in a DHT usually maintains a Kademlia routing table.

It consists of 256 buckets, numbered from 0 to 255. The `i`-th
bucket will contain information about some known nodes (a fixed number
of “best” nodes, and maybe some extra candidates) that lie at a Kademlia
distance from `2^i` to `2^(i+1) − 1` from the node’s address `a`.

This information includes their DHT addresses, IP addresses and UDP ports, and
some availability information such as the time and the delay of the last ping.

When a Kademlia node learns about any other Kademlia node as a result
of some query, it includes it into a suitable bucket of its routing table, first
as a candidate. Then, if some of the “best” nodes in that bucket fail (e.g., do
not respond to ping queries for a long time), they can be replaced by some
of the candidates. In this way the Kademlia routing table stays populated.


Key-value pairs can be added and updated in TON DHT.

The “update rules” can  be different. In some cases, they simply
permit replacing the old value with the new value, provided the new value
is signed by the owner/creator (the signature must be kept as part of the value, to
be checked later by any other nodes after they obtain the value of this key).
In other cases, the old value somehow affects the new value. For example, it
can contain a sequence number, and the old value is overwritten only if the
new sequence number is larger (to prevent replay attacks).

TON DHT is not only used to store the IP addresses of ADNL nodes, but is also used for other purposes - it can store a list of addresses of nodes storing a specific torrent of TON Storage, a list of addresses of nodes included in an overlay subnetwork, ADNL addresses of TON services or ADNL addresses of accounts of the TON Blockchain, and so on.

Read more about TON DHT in [TON Whitepaper](https://ton.org/docs/ton.pdf) chapter 3.2.
