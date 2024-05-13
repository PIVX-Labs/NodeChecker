//This will be used to manage multiple nodes that are all running the NodeChecker script
//A master panel or command and control system depending on how you want to call it.
//This is only the panel and only is used when the system is set up to run the admin panel


//We will be using express js in order to host the api and mongodb for the database

const express = require("express")
const { MongoClient } = require("mongodb");
const app = express()
const port = 3000

//MONGODB
const uri = "mongodb://localhost:27017/";
const client = new MongoClient(uri);
async function run() {
  try {
    const database = client.db('NodeChecker');
    const Nodes = database.collection('Nodes');
    const query = { host: 'user' };
    const NodesResponse = await Nodes.findOne(query);
    console.log(NodesResponse);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.put('/nodeUpdate', async (req, res)=>{

})


app.post('/newNode', async (req, res)=>{
  //Here we will register the node into our database
  const nodeInfo = {
    host : req.post.host,
    ip : req.headers['x-forwarded-for'] || req.socket.remoteAddress, //This is good incase there are multiple servers with the same hostname
    pivxNodeVersion : req.post.pivxNodeVersion,
    blockCount : req.post.blockCount,
    NodeCheckerVersion : req.post.NodeCheckerVersion
  }
})


//Updates information and one off requests
app.get('/checkOnline', async (req,res)=>{
  //This should always respond with true or 1 just as a signal that the server is online
  //if anything else is sent it will just respond with nothing
  res.send('true')
})

app.post('/unknownErrorOccurred', async (req,res)=>{

  //We are going log it into its own collection linked to the hostname and ip address 

})

app.post('/KnownErrorOccurred', async (req,res)=>{
  //We are going to log the error into its own collection and link it to the hostname and ip address
})

app.put('/blockCount', async (req,res)=>{
  //This will update the blockcount on in the main node collection based on the hostname and ip address
})

app.put('/daemonUpdateAvailable', async (req, res)=>{
  //This will change a flag on the main node collection based on the hostname and ip address
})

app.put('/reportLoad', async (req, res)=>{
  //This will update the values we have for load in the main node collection
})



app.get('/', (req, res) => {
  res.send('This system is in development!')
})

app.listen(port, () => {
  console.log(`Node Checker admin panel is listening on port ${port}`)
})