# Governance contracts

In TON consesus critical parameters of node operation related to TVM, catchain, fees and chain topology, as well as how those parameters are stored and updated, are controlled by a set of special smart-contracts (in contrast to old-fashon and inflexible way of hardcoding of those params adopted by blockchains of previous generations). That way TON implements comprehensive and transparent on-chain governance. The set of special contracts itself is governed parameter and currently includes Elector, Config and DNS contract and in the future will be extended by extra-currency Minter and others.

## Elector
Elector smart-contract controls the way how rounds of validation change each other, who get the duty to validate blockchain and how reward for validation whould distributed. If you a looking for practical side of becoming a validator and interaction with elector check [validator instrucitons](/nodes/run-node.md).

Elector store data of yet not withdrawn TONs in `credits` _dict_, new applcations in `elect` _dict_ and info about previous elections in _past_elections_ dict (the latter store inside _complaints_ about validator misbehaving and _frozen_ - stakes of validator for already finished rounds which are withheld for `stake_held_for`(ConfigParam 15)). 
Elector contract has 3 purposes:
 - Process applications for the election of validators
 - Conduct elections
 - Process validator misbehaving reports
 - Distribute validation reward

### Processing applications
To create application, future validator need to form special message which contain corresponding params (ADNL address, public key, `max_factor`, etc), attach it to some sum of TON (called stake) and send to Elector. In turn, Elector checks those params, and either register application or immediately return stake back to the sender. Note, that applications are only accepted from addresses in masterchain.
### Conducting elections
Elector is a special smart-contract and contracts have option to be forcedly invoked on the begining and end of each block (so called Tick and Tock transactions). Elector, indeed is invoked on each block and checks whether it is the time to conduct new election.

General concept of election process is to consider all applications, in particular their TON amount and `max_factor` (the maximal ratio of validation work this applicant is agreed to do in comparisson to the weakest validator), and set weights to each validator proportinal to TON amount but in a such way that all `max_factor` conditions are met.

Technically it is implemented the following way:
1. Elector takes all applications with stake amount above current network minimum `min_stake` (ConfigParam 17).
2. sort them by stake in descending order
3. if there are more participants than the maximum number of validators (`max_validators` ConfigParam 16) - discard the tail of the list
4. cycle `i` from `1` to `N` (remaining number of participants)
  - take the first `i` element from the list (sorted in descending order)
  - Assume that _i_-th candidate will be the last accepted (and thus has the lowest weight) calculate an effective stake (`true_stake` in code) with respect to `max_factor`. In other words effective stake of _j_-th (`j<i`) applicant is calculated as `min(stake[i]*max_factor[j], stake[j])`.
  - Calculate total effective stake (TES) of participants from 1 to _i_-th. If this TES is higher than previous known maximal TES - consider it as current best weight configuration.
5. Get current best configuration, in other words weight configuration which utilizes maximal stake, and send it to config contract to be a new validator set.
6. Put all unused stake, such as stakes from applicants which do not become validators and excesses (if any) `stake[j]-min(stake[i]*max_factor[j], stake[j])` to `credits` table from where it can be request by applicants

That way, if we have 9 candidates with 100k and a factor of 2.7 and one participant with 10k, then this participant will not be elected: without him, an effective stake would be 900k, and with him only  9 * 27k + 10k = 253k. In contrast, if we have 1 candidate with 100k and a factor of 2.7 and nine participant with 10k they are all became a validator, however the first candidate will only stake 10*2.7 = 27k TONs and excess equal to 73k will be put to `credits`.

Note, that there are some limitations (obviously controlled by governance parameter) on resulting validation set, in particular `min_validators`, `max_validators` (ConfigParam 16), `min_stake`, `max_stake`, `min_total_stake`, `max_stake_factor` (ConfigParam 17). If there is no way to met those conditions with current applications, elections are postponed.

### Process of validator misbehaving reports

Each validator from time to time is randomly assigned to create new block (of validator failed in a few seconds this duty is passed to the next validator). The frequency of such assignments are determined by validator's weight. So, anyone can get the blocks of previous validation round and check whether expected number of generated blocks are near the real number of blocks. Statistically significant deviation (when number of generated block are less than expected) means validator misbehaving. In TON it is relatively easy to create proof of misbehaving. Elector contract accepts such proof with suggested fine from anyone who is ready to pay for it's storage and registers complaint. Then, every validators of current round check complaint and if it is correct and suggested fine corresponds to severity of misbehaving - vote for it. Upon getting more than 2/3 of votes with respect to weight, complaint is getting accepted and fine withheld from `frozen` dict of corresponding element of `past_elections`.

### Distribution of validation reward
The same way as with checking whether it is time to conduct new elections, Elector on each block checks whether it is time to release funds from `frozen` for stored `past_elections`. At corresponding block, Elector distributes accumulated during corresponding validation round earnings (gas fees and block creation rewards) to validators of that round proportional to validator weights. After that stakes with rewards are added to `credits` table and election gets remove from `past_elections`.


## Config
Config smart-contract controls TON config parameters. It's logic determines who and under what conditions have permission to change some of those parameters. It also implements proposal/voting mechanism and validator set rolling updates.

### Validator set rolling updates
Once Config contract gets special message from Elector contract which notify about new validator set being elected, Config puts new validator set to ConfigParam 36 (next validators). Then, on each block during TickTock transactions, Config checks whether it is time to apply new validator set (the time `utime_since` is embedded in validator set itself), and move previous set from ConfigParam 34 (current validators) to ConfigParam32 (previous validators) and set from ConfigParam 36 to ConfigParam 34.

### Proposal/voting mechanism
Anyone who is ready to pay the storage fee for storing proposal may propose a change of one or more config parameters by sending corresponding message to Config contract. In turn, any validator in current set may vote for this proposal by signing approval message with it's private key (note that corresponding public key is stored in ConfigParam 34). On gaining or not gaining 3/4 of votes (with respect to validators' weight) proposal win or lose round. Upon winning critical number of rounds (`min_wins` ConfigParam 11) proposal is become accepted, upon loosing critical number of round (`max_losses` ConfigParam 11) it gets discarded.
Note that some of parameters are considered critical (the set of critical parameters is itself a config parameter ConfigParam 10) and thus requires more rounds to be accepted.

A config param indexes `-999`, `-1000`, `-1001` are reserved for voting for emergency update mechanism and updating of the code of config and elector. When proposal with corresponding indexes gains enough amount of votes in enough number of rounds corresponding emergency key, code of config contract or code of elector contract gets updated.

#### Emergency update
Validators may vote to assign a special public key to be able to update config params when it can not be done by voting mechanism. This is temporary measure which is necessary during active development of the network. It is expected, as the network matures, this measure will be phased out. As soon as it’s developed and tested, the key will be transferred to a multisignature solution. And once the network has proven its stability the emergency mechanism will be complete discarding.
Validators indeed had voted to assign that key hold by TON Foundation in July 2021 (masterchain block `12958364`). Note, that such key can only be used to speed up config updates. It has no ability to interfere with code, storage and balances of any contract in any chain.

History of emergency updates:
  -  17th April 2022 the number of applications to election grew big enough that election could not be conducted under gas-limits at that moment. In particular elections required more than 10 million of gas, while block `soft_limit` and `hard_limit` were set to `10m` and `20m`  (ConfigParam 22), `special_gas_limit` and `block_gas_limit` were set to `10m` and `10m` correspondingly (ConfigParam 20). That way new validators can not be set and, due to reaching block gas limit, transactions which process internal messages in masterchain could not be included to the block. In turn, that leads to inability for voting for config updates (it was impossible to win required number of rounds since current round was unable to finish). Emergency key was used to update ConfigParam 22 `soft_limit` to 22m and `hard_limit` to 25m (on block `19880281`) and ConfigParam 20 `special_gas_limit` to 20m and `block_gas_limit` to 22m (on block `19880300`). As a result, election were successfully conducted the next block consuming `10 001 444` gas. Total postponement of elections were about 6 hours, functionality of basechain was not affected.

