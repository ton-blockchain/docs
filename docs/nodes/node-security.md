# Node/Validator Security

This document outlines basic tips on how to secure your TON node / validator.

This document assumes that your node operates under Ubuntu OS with **[mytonctrl](https://github.com/ton-blockchain/mytonctrl)** open source tool developed by TON Foundation.

Basic concepts however can be applied to other scenarios.

## Backup
We strongly advise that you regularly backup following files and directories to ensure that you can restore your node / validator functionality in case of data loss:

* Node config files: `/var/ton-work/db/config*`
* Node private keys: `/var/ton-work/db/keyring`
* Node public keys : `/var/ton-work/keys`
* Mytonctrl configuration and node wallets: `/home/$INSTALLATION_USER/.local/share` where $INSTALLATION_USER is user who initialized mytonctrl install process.

## Network Security
TON Nodes and especially TON Validators are high value assets that should be protected against external threats, one of the first steps you should take is make your node as invisible as possible, this means locking down all network connections. On a validator node only UDP Port used for node operations should be exposed to the internet.

### Tools
We will use **[ufw](https://help.ubuntu.com/community/UFW)** firewall interface as well as **[jq](https://github.com/stedolan/jq)** JSON command line processor.

### Management Networks
As a node operator you need to retain full control and access to machine, in order to do this you need at least one fixed IP address or range.

We also advise to setup a small "jumpstation" VPS with fixed IP Address that can be used by you to access your locked down machine(s) if you do not have fixed IP at home/office or to add alternative way to access secured machines should you lose your primary IP address.

### Steps
Install ufw and jq:

    sudo apt install -y ufw jq

Basic lockdown of ufw ruleset:

    sudo ufw default deny incoming; sudo ufw default allow outgoing

Disable automated ICMP echo request accept:

    sudo sed -i 's/-A ufw-before-input -p icmp --icmp-type echo-request -j ACCEPT/#-A ufw-before-input -p icmp --icmp-type echo-request -j ACCEPT/g' /etc/ufw/before.rules

Enable all access from management network(s), repeat following command for each management network / address:

    sudo ufw insert 1 allow from <MANAGEMENT_NETWORK>

Expose node / validator UDP port to public:

    sudo ufw allow proto udp from any to any port `sudo jq -r '.addrs[0].port' /var/ton-work/db/config.json`

Enable ufw firewall

    sudo ufw enable

<mark>Important: before enabling firewall, please do doublecheck that you added correct management addresses!!</mark>

Check definitions

    sudo ufw status numbered

#### Checking status:
To check firewall status use following command:

    sudo ufw status numbered

Here is example output of locked down node with two manegement networks / addresses:

```
Status: active

     To                         Action      From
     --                         ------      ----
[ 1] Anywhere                   ALLOW IN    <MANAGEMENT_NETWORK_A>/28
[ 2] Anywhere                   ALLOW IN    <MANAGEMENT_NETWORK_B>/32
[ 3] <NODE_PORT>/udp            ALLOW IN    Anywhere
[ 4] <NODE_PORT>/udp (v6)       ALLOW IN    Anywhere (v6)
```


