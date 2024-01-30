#!/bin/bash
if [ -e .env ]
then
    echo "Environment varibles already created"
else
    file=".env"
    read -p "RPC wallet Port: " rpcPort
    echo "WALLET_PORT="$rpcPort > $file
    read -p "RPC wallet user: " rpcUser
    echo "WALLET_USER="$rpcUser >> $file
    read -p "RPC wallet Password: " rpcPassword
    echo "WALLET_PASSWORD="$rpcPassword >> $file
    read -p "Restart Wallet every 15 minutes?: (Y/n) " restartWallet
    case $restartWallet in 
        [yY]) echo "RESTART_WALLET=t" >> $file;
            read -p "Path to daemon" daemonDirectory;
            echo "DAEMON_DIRECTORY="$daemonDirectory >>$file;;
        [nN]) echo "RESTART_WALLET=f">> $file;;
        *) echo "invalid response defaulting to false";;
    esac
    cat $file
fi


node index.js