const { exec } = require('child_process');
const _RPC = require('./src/rpc');
const NET = require('./src/net.js');
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
 * Takes two params and returns the block height and the best block hash
 * @param {string} domain 
 * @param {string} type 
 */
async function checkExplorer(domain, type){
    let bestBlockData = {}
    if(type == "TREZOR"){
        let res = JSON.parse(await NET.get(domain + '/api/',));

        bestBlockData.newestBlock = res.backend.blocks
        bestBlockData.newestBlockHash = res.backend.bestBlockHash

    }else if(type == "CRYPTOID"){
        bestBlockData.newestBlock = parseInt(await NET.get(domain + '/api.dws?q=getblockcount'))
        //wait 5 seconds to abide by there recommendation on how often we should call
        await setTimeout(function(){},5000)
        let preStriping = await NET.get(domain + '/api.dws?q=getblockhash&height=' + bestBlockData.newestBlock)
        bestBlockData.newestBlockHash = preStriping.replace(/['"]+/g, "")
    }

    return bestBlockData
}

async function compareToExplorer(){
    //Grab data from explorers

    let ChainzData = await checkExplorer('https://chainz.cryptoid.info/pivx', "CRYPTOID")
    let zkbitcoinData = await checkExplorer('https://zkbitcoin.com', "TREZOR")

    let allExplorers = [ChainzData,zkbitcoinData]
    let matched = []
    let unmatched = []
    //  console.log(zkbitcoinData)
    //  console.log(ChainzData)

    //Validate explorers against each other
    if(zkbitcoinData.newestBlock == ChainzData.newestBlock){
        //The height matches on the explorer
        if(zkbitcoinData.newestBlockHash == ChainzData.newestBlockHash){
            //The hash matches on both explorers
            console.log("Everything is perfect")
        }else{
            //The hash does not match but the height does
            console.log(zkbitcoinData.newestBlockHash)
            console.log(ChainzData.newestBlockHash)
            console.log("Someone is forked")
        }
    }else{
        //The block height doesn't match
        //Figure which ones don't match
        console.log("Someone is forked or slow")
        //console.log(zkbitcoinData)
       // console.log(ChainzData)

        console.log(allExplorers.length)
        for(let i = 0; i < allExplorers.length; i++){
            //console.log(allExplorers[i].newestBlockHash)
            //console.log(allExplorers[i-1])
            if(allExplorers[i] == allExplorers[i-1]){
                //these two don't match
                unmatched.push(allExplorers[i])
                unmatched.push(allExplorers[i-1])
            }else{
                matched.push(allExplorers[i])
                matched.push(allExplorers[i-1])
            }
        }

        console.log(unmatched)
        console.log("Matched:")
        console.log(matched)

    }
}

compareToExplorer()



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