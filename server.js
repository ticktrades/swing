// server.js
// where your node app starts

// init project

const app = require('./app/app');

// This is to keep the connection alive forever


const http = require('http');
const express = require('express');
const app1 = express();
app1.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});
app1.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);


app();
