## Pivx node checker

This tool is used to help the stablity of pivx nodes. It removes misbehaving peers, restarts the daemon periodically, gives a list of good peers so you can add them to other nodes, and much more.

### Single node Installation
1. Download and install the latest pivx daemon
2. Go into the .pivx folder that was created when that daemon was run and create a pivx.conf that file will need to include the following:
```
rpcuser={userHere}
rpcpassword={passwordHere}
rpcport={portHere}
rpcbind=127.0.0.1
```
(The default port for pivx is 51470)
3. `chmod +x install.sh`
4. `./install.sh`
5. `Input the same information as was in your pivx.conf file`
6. Done!

### Running the program
The program will automatically run but if you need to restart it or change settings just run
`./install.sh`
again


### Multi node Installation with admin panel
This is a work in progress and should be treated as a dev only feature