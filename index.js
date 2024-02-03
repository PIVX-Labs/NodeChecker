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
async function checkExplorer(domain, type, block){
    //check if we are looking for a block or just over all info about the block on an explorer
    if(typeof block == 'undefined'){
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
        }else if(type == "CRYPTOSCOPE"){
            bestBlockData.newestBlock = JSON.parse(await NET.get(domain + '/api/getblockcount/')).blockcount
            //wait 5 seconds to abide by there recommendation on how often we should call
            await setTimeout(function(){},5000)
            let preStriping = await NET.get(domain + '/api/getblockhash/?index=' + bestBlockData.newestBlock)
            bestBlockData.newestBlockHash = preStriping.replace(/['"]+/g, "")
        }

        return bestBlockData
    }else{
        //use the blockid to get the hash value
        let bestBlockData = {}
        if(type == "TREZOR"){
            let res = JSON.parse(await NET.get(domain + '/api/v2/block-index/' + block,));
            bestBlockData.newestBlockHash = res.blockHash
        }else if(type == "CRYPTOID"){
            let preStriping = await NET.get(domain + '/api.dws?q=getblockhash&height=' + block)
            bestBlockData.newestBlockHash = preStriping.replace(/['"]+/g, "")
        }else if(type == "CRYPTOSCOPE"){
            let res = JSON.parse(await NET.get(domain + '/api/getblockhash/?index=' + block))
            bestBlockData.newestBlockHash = res.hash
        }

        return bestBlockData
    }
}

async function compareToExplorer(){
    //Make another array that holds the explorer information
    let explorerUrlData = [
        {
            variableName:"ChainzData",
            url:"https://chainz.cryptoid.info/pivx",
            type:"CRYPTOID",
        },
        {
            variableName:"zkbitcoinData",
            url:"https://zkbitcoin.com",
            type:"TREZOR",
        },
        {
            variableName:"cryptoscope",
            url:"https://pivx.cryptoscope.io",
            type:"CRYPTOSCOPE",
        },
    ]


    //Grab data from explorers
    let ChainzData = await checkExplorer('https://chainz.cryptoid.info/pivx', "CRYPTOID")
    let zkbitcoinData = await checkExplorer('https://zkbitcoin.com', "TREZOR")
    let cryptoscope = await checkExplorer('https://pivx.cryptoscope.io', "CRYPTOSCOPE")
    let networkFork = false;


    //name the explorers to make it easier in the future
    ChainzData.name = "ChainzData"
    zkbitcoinData.name = "zkbitcoinData"
    cryptoscope.name = 'cryptoscope'


    let allExplorers = [ChainzData,zkbitcoinData,cryptoscope]

    //Creates a new object, finds the matches and lists how many match together
    let result = allExplorers.reduce( (acc, o) => (acc[o.newestBlock] = (acc[o.newestBlock] || 0)+1, acc), {} );
    //find how many is the most matches
    const max = Math.max.apply(null, Object.values(result));
    //find index of that how many is the most matches
    var index = Math.max.apply(null, Object.keys(result));

    console.log(result)
    console.log("================")
    console.log(max);
    console.log("================")
    console.log(index)

    //Figure out if there are multiple matching large instance if so we have a serious fork on the network
    if(!Array.isArray(index)){
        console.log("The block that matches the most explorers is: " + index + " and is matched by " + max + " explorers")
    }else{
        networkFork = true;
        console.log("Big ass fork")
    }

    //Check what our node says compared to the network
    //let localNodeBlockcount = await cRPC.call('getblockcount');
    //TODO: remove this is only for testing
    let localNodeBlockcount = 4241732
    console.log(localNodeBlockcount)
    //check if there are large network-wide issues
    if(!networkFork){
        if(localNodeBlockcount == index){
            console.log("we good")
        }else{
            console.log("we not so good")
            //check if the localNode is less then the index (might be slower then the explorer)
            if(localNodeBlockcount < index){
                console.log("less")
                //lets check the explorers to see if the blockhash is correct
                //figure out which explorers have more then the localNodeBlockcount
                for(let i=0; i<allExplorers.length;i++){
                    //grab localNodeBlockHash
                    let localNodeBlockHash = await cRPC.call('getblockhash', localNodeBlockcount);
                    //check if the explorer's block is newer then localNodeBlock
                    if(allExplorers[i].newestBlock >= localNodeBlockcount){
                        //send a request for the blockhash we have
                        let urlCallInfo = explorerUrlData.find((element) => element.variableName == allExplorers[i].name)
                        console.log(urlCallInfo)
                        
                        let blockhashreturn = await checkExplorer(urlCallInfo.url, urlCallInfo.type, localNodeBlockcount)
                        console.log(blockhashreturn)

                        //check if the hash agrees with our localNode's hash
                        console.log(localNodeBlockHash)
                        if(localNodeBlockHash == blockhashreturn.newestBlockHash){
                            console.log("we good again")
                        }else{
                            console.log("we not so good anymore")
                        }

                    }
                }
            }else if(localNodeBlockcount > index){
                console.log("more")
                //Possibly a slow explorer
            }else{
                console.log("something weird do be going on")
                //Something really done did broke
            }
        }
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