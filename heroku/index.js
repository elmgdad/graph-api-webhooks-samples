/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var xhub = require('express-x-hub');
const axios = require("axios");

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));

app.use(xhub({ algorithm: 'sha1', secret: process.env.APP_SECRET }));
app.use(bodyParser.json());

var token = process.env.TOKEN || 'token';
var received_updates = [];

app.get('/', function (req, res) {
  console.log(req);
  res.send('main <pre>' + JSON.stringify(received_updates, null, 2) + '</pre>');
});

app.get(['/facebook', '/instagram'], function (req, res) {
  if (
    req.query['hub.mode'] == 'subscribe' &&
    req.query['hub.verify_token'] == token
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

app.post('/facebook', async function (req, res) {
  console.log('Facebook request body:', req.body);

  if (!req.isXHubValid()) {
    console.log('Warning - request header X-Hub-Signature not present or invalid');
    res.sendStatus(401);
    return;
  }

  console.log('request header X-Hub-Signature validated');
  // Process the Facebook updates here
  received_updates.unshift(req.body);

  let body_param = req.body;
  if (body_param.entry[0].changes[0].value.messages[0].type == "audio") {
    let audio = body_param.entry[0].changes[0].value.messages[0].audio;
    let audioId = body_param.entry[0].changes[0].value.messages[0].audio.id;

    let response = await axios({
      method: "GET",
      url: "https://graph.facebook.com/v19.0/" + audioId,

      headers: {
        "Content-Type": "application/json",
        'Authorization': 'Bearer ' + process.env.APP_TOKEN
      }

    });

    let response_audio = await axios({
      method: "GET",
      url: response.data.url,
      headers: {
        "Content-Type": "application/json",
        'Authorization': 'Bearer ' + process.env.APP_TOKEN
      }
    });
    received_updates.unshift(response_audio);
  } else if (body_param.entry[0].changes[0].value.messages[0].type == "text") {
    // Extract information from the webhook request
    let entry = req.body.entry[0];
    let changes = entry.changes[0];
    let value = changes.value;
    let message = value.messages[0];
    let phone_number_id = value.metadata.phone_number_id;
    let from = message.from;
    let msg_body = message.text.body;
    // response to user message
    let data = JSON.stringify({
      "messaging_product": "whatsapp",
      "to": from,
      "text": {
        "body": "your message has been received : " + msg_body
      }
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://graph.facebook.com/v20.0/393297853866738/messages',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.APP_TOKEN
      },
      data: data
    };

    axios(config)
      .then(response => {
        console.log('Message sent successfully');
      })
  }





  res.sendStatus(200);
});

app.post('/instagram', function (req, res) {
  console.log('Instagram request body:');
  console.log(req.body);
  // Process the Instagram updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.listen();
