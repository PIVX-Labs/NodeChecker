//This will be used to manage multiple nodes that are all running the NodeChecker script
//A master panel or command and control system depending on how you want to call it.
//This is only the panel and only is used when the system is set up to run the admin panel


//We will be using express js in order to host the api and mongodb for the database

import express from 'express'
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('This system is in development!')
})

app.listen(port, () => {
  console.log(`Node Checker admin panel is listening on port ${port}`)
})