const { exec } = require('child_process');
const _RPC = require('./src/rpc');
require('dotenv').config()

// Prep the RPC daemon
const cRPC = new _RPC(process.env.WALLET_USER, process.env.WALLET_PASSWORD, '127.0.0.1', process.env.WALLET_PORT);

// Just an auto-handled RPC lock: don't touch.
let fLocked = false;

// MUST-HAVE: a minimum "healthy" block height peers MUST have, or get booted
const minBlockHeight = 4230608;

// Every 2.5s, scan for "bad" peers and boot 'em
setInterval(async () => {
    if (!fLocked) {
        const arrPeers = await cRPC.call('getpeerinfo');
        for (const cPeer of arrPeers) {
            if (cPeer.startingheight <= minBlockHeight) {
                // Disconnect the lazy (possibly forked) bastard
                await cRPC.call('disconnectnode', cPeer.addr);
                console.log('Disconnected peer id: ' + cPeer.id + ' address: '+ cPeer.addr + ' at block ' + cPeer.startingheight.toLocaleString('en-gb'));
            }
        }
    }
}, 2500);
 
// Every 1m, create a "good" addnode list, and optionally invalidate some bad blocks here to help with "steering" your chain tip
setInterval(async () => {
    if (!fLocked) {
        // Optional: uncomment and edit to invalidate known-bad blocks, helps prevent forks mid-sync
        //await cRPC.call('invalidateblock', '0000000000000442c69a293eb0713ceb04b2545a443affca4c77d7c3ac866cde');
        const arrPeers = (await cRPC.call('getpeerinfo')).filter(a => a.startingheight > minBlockHeight);
        console.log('=== Healthy-ish Addnode List for users and alternative nodes ===');
        for (const cPeer of arrPeers) {
            console.log('addnode ' + cPeer.addr + ' add');
            console.log('addnode ' + cPeer.addr + ' onetry');
        }
    }
}, 60000);

/**
 * This will restart the daemon
 */
async function restart() {
    fLocked = true;
    console.log('Restart time! - Disconnecting peers...');
    try {await cRPC.call('setnetworkactive', false);} catch(e){}
    setTimeout(async () => {
        console.log('Stopping daemon...');
        try {await cRPC.call('stop');} catch(e){}
        setTimeout(async () => {
            let directoryConcat = process.env.DAEMON_DIRECTORY + "/pivxd -daemon"
            console.log('Starting daemon...');
            exec(directoryConcat, (error, stdout, stderr) => {
                if (error) console.error(`exec error: ${error}`);
                console.log(`stdout: ${stdout}`);
                console.error(`stderr: ${stderr}`);
                fLocked = false;
            });
        }, 60000 * 2);
    }, 15000);
}

// Optional in case of wallet memleaks: Restart the daemon every 15m
if(process.env.RESTART_WALLET == "t"){
    console.log("restarting wallet every 15 minutes")
    setInterval(restart, 60000 * 15);
}