//This script will be used to connect to an admin panel
const NET = require('./src/net.js');
require('dotenv').config()

//Functions for each of the requests and data updates that could be sent

async function checkOnline(){
    //Send a get request to check if the admin page is online and responding
}

//Mainly error reporting
async function unknownErrorOccurred(hostname, error){
    //Send a post to the server with the error and hostname

}

async function knownErrorOccurred(hostname, error){
    //Send a post to the server with the error and hostname

}

async function blockcount(hostname, blockLocal,blockRemote){
    //Send a put to the server listing the block count for the local and remote

}

async function daemonUpdateAvailable(hostname, localVersion, remoteVersion){
    //Send a put to the server triggering a flag that the daemon "should" be updated based on github

}

//Underlying hardware
async function reportLoad(){
    //send a put to the server updating the server load

}