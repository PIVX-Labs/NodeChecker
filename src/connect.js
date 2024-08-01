//This script will be used to connect to an admin panel
const NET = require('./src/net.js');
require('dotenv').config()

//Functions for each of the requests and data updates that could be sent

async function checkOnline(){
    //Send a get request to check if the admin page is online and responding
    await NET.get(process.env.ADMIN_PANEL_URL + '/checkOnline')
}

//Mainly error reporting
async function unknownErrorOccurred(hostname, error){
    //Send a post to the server with the error and hostname
    await NET.post(process.env.ADMIN_PANEL_URL + '/unknownErrorOccurred', body)

}

async function knownErrorOccurred(hostname, error){
    //Send a post to the server with the error and hostname
    await NET.post(process.env.ADMIN_PANEL_URL + '/KnownErrorOccurred',body)

}

async function blockcount(hostname, blockLocal,blockRemote){
    //Send a put to the server listing the block count for the local and remote
    await NET.put(process.env.ADMIN_PANEL_URL + '/blockCount',body)
}

async function daemonUpdateAvailable(hostname, localVersion, remoteVersion){
    //Send a put to the server triggering a flag that the daemon "should" be updated based on github
    await NET.put(process.env.ADMIN_PANEL_URL + '/daemonUpdateAvailable',body)
}

//Underlying hardware
async function reportLoad(){
    //send a put to the server updating the server load
    await NET.put(process.env.ADMIN_PANEL_URL + '/reportLoad',body)
}