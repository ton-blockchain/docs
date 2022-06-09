# TON Storage
TON Storage. An example of such a service is given by TON Storage. In its simplest form, it allows users to store files off-chain, by keeping on-chain only a hash of the file to be stored, and possibly a smart contract where some other parties agree to keep the file in question for a given period of time for a pre-negotiated fee. In fact, the file may be subdivided into chunks of some small size (e.g., 1 kilobyte), augmented by an erasure code such as a Reed-Solomon or a fountain code,a Merkle tree hash may be onstructed for the augmented sequence of chunks, and this Merkle tree hash might be published in the smart contract instead of or along with the usual hash of the file. This is somewhat reminiscent of the way files are stored in a torrent.[Quoted from chapter 4.1.7 of the ton white paper.]

## Compile storage-cli

Prepare the compilation environment and related kits.

```bash
sudo apt-get update
sudo apt-get install git build-essential git make cmake clang libgflags-dev zlib1g-dev libssl-dev libreadline-dev libmicrohttpd-dev pkg-config libgsl-dev python3 python3-dev python3-pip
```

Download the ton repo, then you can find the original code for `storage-cli` at `~/ton/storage`.

```bash
cd ~/
git clone https://github.com/ton-blockchain/ton.git

cd ~/ton
# This allows you to download the full reference repo.
git submodule update --init

# If you are using Ubuntu 22.04 then you need
cd ~/ton/third-party/abseil-cpp/
git checkout 20211102.0
````

Start compiling storage-cli, it will take some time.

```bash
# Create a folder to store the compiled programs.
mkdir  ~/ton-bin
cd ~/ton-bin

# Set the environment variables that will be used when compiling.
export CC=$(which clang)
export CXX=$(which clang++)
export CCACHE_DISABLE=1

# Initialize compilation
cmake ~/ton -DCMAKE_BUILD_TYPE=Release -Wno-dev

# Start compiling storage-cli
cmake --build . --target storage-cli
```
Congratulations, if you've finished this part, you've got an executable `storage-cli`. The location is `~/ton-bin/storage/storage-cli`


## Prepare the global.config.json file
In order to quickly connect to the ton blockchain network. The community has prepared a host list so that you can quickly participate in the ton blockchain network.
```
wget -P ~/ton-bin https://ton-blockchain.github.io/global.config.json
wget -P ~/ton-bin https://ton-blockchain.github.io/testnet-global.config.json
```
Of course, if you want a more stable liteserver to use, you can also build a validator yourself. You can refer to [run node](../nodes/run-node.md). Here your `config.json` path will be in `/usr/bin/ton/local.config.json`.

## `storage-cli` executable startup parameters
You can view command descriptions with the `storage-cli -h` command.

```bash
$ ~/ton-bin/storage/storage-cli -h
experimental cli for ton storage. Options:
  -h, --help           prints_help
  -v, --verbosity<arg> set verbosity level
  -V, --version        shows storage-cli build information
  -C, --config<arg>    set ton config
  -D, --db<arg>        root for dbs
  -I, --ip<arg>        set ip:port
  -E, --execute<arg>   execute one command
  -d, --dir<arg>       working directory
```

## Commands in the `storage-cli` interactive terminal
`storage-cli` command, can directly enter the interactive command.

```bash
$ ~/ton-bin/storage/storage-cli
> help
  help	This help
  create <dir/file>	Create torrent from a directory
  info <id>	Print info about loaded torrent
  load <file>	Load torrent file in memory
  save <id> <file>	Save torrent file
  start <id>	Start torrent downloading/uploading
  seed <id>	Start torrent uploading
  download <id>	Start torrent and stop when it is completed
  stop <id>	Stop torrent downloading
  pause <id>	Pause active torrent downloading
  resume <id>	Resume active torrent downloading
  priority <id> <file_id> <priority>	Set file priority(0..254) by file_id, use file_id=* to set priority for all files
  exit	Exit
  quit	Exit
```
If you want to leave the dialog, type `control+c`.

## Start the `storage-cli` interactive terminal
Prepare a working directory for `storage-cli`.

```bash
mkdir ~/storage-cli
cd ~/storage-cli
```

Now let's start `storage-cli`

``` bash
# Prepare your own public IP
IP="$(curl ifconfig.me)"

# Expected to be connected to the mainnet
~/ton-bin/storage/storage-cli -C ~/ton-bin/global.config.json -I $IP:8734

# Expected to be connected to the testnet
~/ton-bin/storage/storage-cli -C ~/ton-bin/testnet-global.config.json -I $IP:8734

# Expected to be connected to your own local.config.json
~/ton-bin/storage/storage-cli -C /usr/bin/ton/local.config.json -I $IP:8734
```

If you see this message, it means that you have 1) successfully started `storage-cli` 2) successfully created some keys `adnl` , `key.pub` , `keyring` , `overlays` in `/ storage-cli/dht-db` 3) Successfully entered the ton blockchain network.
```bash
> [ 1][t 0][2022-06-09 09:46:36.376420472][storage-cli.cpp:361][!console]	Create 8vVmesnTE6TswG7uBXMvSe4lfgWbwgdlA9nrf6/kEj4=
  [ 3][t 0][2022-06-09 09:46:36.378388505][storage-cli.cpp:355][!keyring]	New key was saved
```

## Create seeds

Prepare the file you want to share, let me call it `demofile` and store it in `~/storage-cli`.


### Load file.
`creat` command of `storage-cli`

Let `storage-cli` load the `demofile` where you expect to generate seeds.`storage-cli` will number the load files one by one. If it is the first file load, it will be numbered `#0` there.

Enter the `storage-cli` interactive terminal. 
```bash
> [ 1][t 0][2022-06-09 10:13:55.339924096][storage-cli.cpp:361][!console]	Create TrMmDDxOd+YN3NOw/TIaOHCLbaF06D1ZFYYPsdgMnA4=
  create demofile
  [ 3][t 0][2022-06-09 10:14:01.702386019][TorrentCreator.cpp:82][!console]	Add file demofile ~/storage-cli/demofile
  Torrent #0 created
```

### Generate seeds
With the `save` command of `storage-cli`, we first specify the number, and then specify the name of the generated seed.

Enter the `storage-cli` interactive terminal. 
```bash 
> save 0 demoseed
  Torrent #0 saved
```
Then you will find the `demofile` seed `demoseed` in the `~/storage-cli` path. Ok now you can share the seed `demoseed` with your friends.


### Start sharing.

seed `<id>`	Start torrent uploading

```
> load demoseed
  Torrent #0 created
> seed 0
  Torrent #0 started
  Torrent #0 completed
```

start `<id>`	Start torrent downloading/uploading
```bash
> load demoseed
  Torrent #0 created
> start 0
  Torrent #0 started
  Torrent #0 completed
```

ps. By the way, because ton storage is similar in architecture to torrent. So you cannot close your `storage-cli` when you are the only torrent.


## Download files via seeds
In the above steps you learned how to create seeds. Now you have received a seed. 
Please put the seed in the `~/storage-cli` path.

Enter the `storage-cli` interactive terminal. 
At this point, the `storage-cli` interactive terminal loads the seed `demoseed` . and marked as #0.
```bash
> load demoseed
  Torrent #0 created
> start 0
```
If all goes well, you can see the `demofile` in the `~/storage-cli` path.



## Check the status of the file or torrent.

In the `storage-cli` interactive terminal, you can view the status of the seed/file through the `info` command.
```bash
> info 0
  Node 1 1	0B/s	outq 0
  #0 demofile	100%%  5309B/5309B	 priority=1
```