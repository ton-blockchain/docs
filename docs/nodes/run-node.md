# Running your own Full Node/Validator

Use the [mytonctrl](https://github.com/ton-blockchain/mytonctrl) to install and manage your own node.

**Mytonctrl** is an open source tool developed by the TON Foundation. It is reliable and tested, most of the TON nodes use mytonctrl.

## Installation

Download and run installation script.

Ubuntu:
```bash
wget https://raw.githubusercontent.com/ton-blockchain/mytonctrl/master/scripts/install.sh
sudo bash install.sh -m full        
```

Debian:
```bash
wget https://raw.githubusercontent.com/ton-blockchain/mytonctrl/master/scripts/install.sh
su root -c 'bash install.sh -m full'
```

Installation description:

https://github.com/ton-blockchain/mytonctrl/blob/master/docs/en/manual-ubuntu.md


## Become a validator

If you just want a full node as an endpoint then skip everything about the validator. In this case, you do not need to send coins.

If you want to become a validator then just send the Toncoins to your wallet. 

Mytonctrl will automatically start participating in validation from the next election.

Description:

https://github.com/ton-blockchain/mytonctrl/blob/master/docs/en/manual-ubuntu.md