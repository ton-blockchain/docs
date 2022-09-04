# Toncoin

Native cryptocurrency of the TON Blockchain is [Toncoin](https://ton.org/toncoin).

Transaction fees, gas payments (i.e., smart-contract message processing fees) and persistent storage payments are collected in Toncoins.

Toncoin is used to make deposits required to become a blockchain validator.

## Extra-currencies

TON blockchain supports up to 2^32 built-in extra currencies. 

Extra currencies amounts can be stored on each blockchain account (as hashmap of currency ID and amount), as well as sent to other accounts in a native way (in an internal message from one smart contract to another, you can specify a hashmap of extra currencies amounts in addition to Toncoin amount).

However, extra currencies can only be stored and transferred (like Toncoin) and do not have their own arbitrary code and functionality.

Note that if there are a large number of extra currencies created, the accounts will "swell" because they need to store them.

Thus, for most tasks, [jettons](/defi/tokens.md#Jettons) are more suitable than extra currencies.

At the moment, no extra currency has been created in the TON blockchain - TON blockchain has full support for extra currencies by accounts and messages, but the minter system contract for their creation has not been made.