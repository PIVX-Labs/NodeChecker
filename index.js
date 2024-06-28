const { exec } = require('child_process');
const _RPC = require('./src/rpc');
const NET = require('./src/net.js');
const nodemailer = require('nodemailer');
const os = require('os')

// Required to unzip files
var yauzl = require("yauzl");

require('dotenv').config()

// TODO:Check if this node is supposed to be running the panel

// set hostname
const hostname = os.hostname();

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
        // await cRPC.call('invalidateblock', '0000000000000442c69a293eb0713ceb04b2545a443affca4c77d7c3ac866cde');
        const arrPeers = (await cRPC.call('getpeerinfo')).filter(a => a.startingheight > minBlockHeight);
        console.log('=== Healthy-ish Addnode List for users and alternative nodes ===');
        for (const cPeer of arrPeers) {
            console.log('addnode ' + cPeer.addr + ' add');
            console.log('addnode ' + cPeer.addr + ' onetry');
        }
    }
}, 60000);

async function sendEmailNotification(error){
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SEC, // Use `true` for port 465, `false` for all other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      
    // send mail with defined transport object
    const info = await transporter.sendMail({
        from: process.env.SMTP_USER, // sender address
        to: process.env.SMTP_RECEIVER, // list of receivers
        // TODO: create a node identifier either by ip or hostname or both 
        subject: "NODE MESSAGE " + process.env.NODE_NAME, // Subject line
        text: "NODE ERROR \n" + error, // plain text body
        html: "<b>NODE ERROR</b><br>" + error, // html body
    });
    
    console.log("Message sent: %s", info.messageId);
    
    info.catch(console.error);
}

async function checkDaemonVersion(){

    // First run an RPC call to get the version we are using currently
    let localDaemonVersion = await(cRPC.call('getinfo'))
    // Trezor check
    let zkbitcoinDaemonVersion = JSON.parse(await NET.get('https://zkbitcoin.com' + '/api/'))

    if(localDaemonVersion.version != zkbitcoinDaemonVersion.backend.version){
        console.log("Possibly a bad daemon version Local doesn't match remote: zkbitcoin")
        // If any of the explorers don't match trigger a github check to figure out the newest github version
        let githubReleaseInfo = JSON.parse(await NET.get('https://api.github.com/repos/PIVX-Project/PIVX/releases/latest'))
        // The tag name is almost never a string
        // Remove the version from the tag
        let githubDaemonVersion = (githubReleaseInfo.name).replace('v','')
        // Modify the localDaemon hardcoded version to match the github shortened version
        if((localDaemonVersion.version.toString()).replace(/0/g,'') != (githubDaemonVersion.toString()).replaceAll('.','')){
            console.log("Local Daemon possibly not up to date")
        }else{
            console.log("Local Daemon and github remote daemon version up to date")
        }
    }
}

/**
 * Takes two params and returns the block height and the best block hash
 * @param {string} domain 
 * @param {string} type 
 */
async function checkExplorer(domain, type, block){
    // check if we are looking for a block or just over all info about the block on an explorer
    if(typeof block == 'undefined'){
        let bestBlockData = {}
        if(type == "TREZOR"){
            let res = JSON.parse(await NET.get(domain + '/api/',));

            bestBlockData.newestBlock = res.backend.blocks
            bestBlockData.newestBlockHash = res.backend.bestBlockHash

        }else if(type == "CRYPTOID"){
            bestBlockData.newestBlock = parseInt(await NET.get(domain + '/api.dws?q=getblockcount'))
            // wait 5 seconds to abide by their recommendation on how often we should call
            await setTimeout(function(){},5000)
            let preStriping = await NET.get(domain + '/api.dws?q=getblockhash&height=' + bestBlockData.newestBlock)
            bestBlockData.newestBlockHash = preStriping.replace(/['"]+/g, "")
        }else if(type == "CRYPTOSCOPE"){
            bestBlockData.newestBlock = JSON.parse(await NET.get(domain + '/api/getblockcount/')).blockcount
            // wait 5 seconds to abide by there recommendation on how often we should call
            await setTimeout(function(){},5000)
            let preStriping = await NET.get(domain + '/api/getblockhash/?index=' + bestBlockData.newestBlock)
            bestBlockData.newestBlockHash = preStriping.replace(/['"]+/g, "")
        }

        return bestBlockData
    }else{
        // use the blockid to get the hash value
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
    // Make another array that holds the explorer information
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

    // Grab data from explorers
    let ChainzData = await checkExplorer('https://chainz.cryptoid.info/pivx', "CRYPTOID")
    let zkbitcoinData = await checkExplorer('https://zkbitcoin.com', "TREZOR")
    let cryptoscope = await checkExplorer('https://pivx.cryptoscope.io', "CRYPTOSCOPE")
    let networkFork = false;

    // Name the explorers to make it easier in the future
    ChainzData.name = "ChainzData"
    zkbitcoinData.name = "zkbitcoinData"
    cryptoscope.name = 'cryptoscope'

    let allExplorers = [ChainzData,zkbitcoinData,cryptoscope]

    // Creates a new object, finds the matches and lists how many match together
    let result = allExplorers.reduce( (acc, o) => (acc[o.newestBlock] = (acc[o.newestBlock] || 0)+1, acc), {} );
    // Find how many is the most matches
    const max = Math.max.apply(null, Object.values(result));
    // Find index of that how many is the most matches
    var index = Math.max.apply(null, Object.keys(result));

    // Figure out if there are multiple matching large instance if so we have a serious fork on the network
    if(!Array.isArray(index)){
        console.log("The block that matches the most explorers is: " + index + " and is matched by " + max + " explorers")
    }else{
        networkFork = true;
        console.log("Big ass fork")
    }

    // Check what our node says compared to the network
    let localNodeBlockcount = await cRPC.call('getblockcount');
    console.log(localNodeBlockcount)
    // check if there are large network-wide issues
    if(!networkFork){
        if(localNodeBlockcount == index){
            console.log("Local node block count matches remote block count")
        }else{
            console.log("Local node block count does not match remote node block count")
            // check if the localNode is less then the index (might be slower then the explorer)
            if(localNodeBlockcount < index){
                console.log("Local node has less blocks then remotes")
                // figure out which explorers have more then the localNodeBlockcount
                for(let i=0; i<allExplorers.length;i++){
                    // grab localNodeBlockHash
                    let localNodeBlockHash = await cRPC.call('getblockhash', localNodeBlockcount);
                    // check if the explorer's block is newer then localNodeBlock
                    if(allExplorers[i].newestBlock >= localNodeBlockcount){
                        // send a request for the blockhash we have
                        let urlCallInfo = explorerUrlData.find((element) => element.variableName == allExplorers[i].name)
                        let blockhashreturn = await checkExplorer(urlCallInfo.url, urlCallInfo.type, localNodeBlockcount)
                        // check if the hash agrees with our localNode's hash
                        console.log(localNodeBlockHash)
                        if(localNodeBlockHash == blockhashreturn.newestBlockHash){
                            console.log("Hash matches")
                        }else{
                            console.log("Hash does not match")
                        }

                    }
                }
            }else if(localNodeBlockcount > index){
                console.log("Local node Has more blocks then remote")
                // Possibly a slow explorer
            }else{
                console.log("Unhandled exception:0001")
            }
        }
    }

    //TODO: check if the bootstrap setting is true and try and fix it by bootstrapping and unzipping
    //bootstrap();

}


async function bootstrap(){
    if(process.env.BOOTSTRAP == 't' || process.env.BOOTSTRAP_FORK == 't'){
        // Download from toolbox.pivx.org
        var http = require('http');
        var fs = require('fs');
        
        var download = function(url, dest, cb) {
          var file = fs.createWriteStream(dest);
          var request = http.get(url, function(response) {
            response.pipe(file);
            file.on('finish', function() {
              file.close(cb);  // close() is async, call cb after close completes.
            });
          }).on('error', function(err) { // Handle errors
            fs.unlink(dest); // Delete the file async. (But we don't check the result)
            if (cb) cb(err.message);
          });
        };
    
    
        // Shutdown wallet when done downloading
        try {await cRPC.call('setnetworkactive', false);} catch(e){}
        try {await cRPC.call('stop');} catch(e){}
    
        // remove data folders: blocks, chainstate, sporks, zerocoin, and files banlist.dat, peers.dat
        fs.unlink('banlist.dat', (err) => {
        if (err) throw err;
        console.log('banlist.txt was deleted');
        }); 
        fs.unlink('peers.dat', (err) => {
            if (err) throw err;
            console.log('peers.txt was deleted');
        }); 
        fs.rmdir('blocks', (err) => {
        if (err) throw err;
            console.log('blocks was deleted');
        }); 
        fs.rmdir('chainstate', (err) => {
        if (err) throw err;
            console.log('blocks was deleted');
        }); 
        fs.rmdir('sporks', (err) => {
        if (err) throw err;
            console.log('blocks was deleted');
        }); 
        fs.rmdir('zerocoin', (err) => {
        if (err) throw err;
            console.log('blocks was deleted');
        }); 
    
        // unzip the bootstrap
        yauzl.open("PIVXsnapshotLatest.zip", {lazyEntries: true}, function(err, zipFile) {
            if (err) throw err;
            zipFile.readEntry();
            zipFile.on("entry", function(entry) {
              if (/\/$/.test(entry.fileName)) {
                // Directory file names end with '/'.
                // Note that entries for directories themselves are optional.
                // An entry's fileName implicitly requires its parent directories to exist.
                zipFile.readEntry();
              } else {
                // file entry
                zipFile.openReadStream(entry, function(err, readStream) {
                  if (err) throw err;
                  readStream.on("end", function() {
                    zipFile.readEntry();
                  });
                  readStream.pipe(somewhere);
                });
              }
            });
          });
    
        // remove the bootstrap
        fs.unlink('PIVXsnapshotLatest.zip', (err) => {
            if (err) throw err;
                console.log('PIVXsnapshotLatest.zip was deleted');
            }); 
        // start the wallet
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
        }
}

console.log("Starting PIVX Node Checker on " + hostname + "...")

// We need to check the Daemon version to make sure that it is the correct version that is being used on the network/github etc
// And give a warning if it isn't
// loop this check every two minutes (a block is on avg a minute on pivx)
async function checkAgainstExternalSources(){
        checkDaemonVersion()
        compareToExplorer()
}
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

// Loops------
// check against external sources every five minutes for wallet updates and block comparison
setInterval(checkAgainstExternalSources, 60000 * 5);

// Optional in case of wallet memleaks: Restart the daemon every 15m
if(process.env.RESTART_WALLET == "t"){
    console.log("restarting wallet every 15 minutes")
    setInterval(restart, 60000 * 15);
}