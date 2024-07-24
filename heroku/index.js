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

app.post('/facebook', function (req, res) {
  console.log('Facebook request body:', req.body);

  if (!req.isXHubValid()) {
    console.log('Warning - request header X-Hub-Signature not present or invalid');
    res.sendStatus(401);
    return;
  }

  console.log('request header X-Hub-Signature validated');
  // Process the Facebook updates here
  received_updates.unshift(req.body);

  // Extract information from the webhook request
  let entry = req.body.entry[0];
  let changes = entry.changes[0];
  let value = changes.value;
  let message = value.messages[0];

  let phone_number_id = value.metadata.phone_number_id;
  let from = message.from;
  let msg_body = message.text.body;

  let data = JSON.stringify({
    "messaging_product": "whatsapp",
    "to": from,
    "text": {
      "body": "hi"
    }
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://graph.facebook.com/v20.0/393297853866738/messages',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer EAAOwxVUua2ABOZBoEWNVHU4xfuY1HZA9LTbfxK3U6wxfBjGbeR3CycWZAe9ek1C9Fy8dSYdh3ziT3QYIVE2LyAyPxZBZAZCMiELreGZB0RH5vMZANhqRnLtFw3XqjaOoT1zJuiJE05GBDzx2w5HdQnENb4PpyCQ24fkykZBkdbEMQGmAZACiKz0AhXNbFjIjNNZCfWhxx6FG3uAgqxYeZBtAXNCT52PRu8JZBIN5cPAZDZD'
    },
    data: data
  };

  axios(config)
    .then(response => {
      console.log('Message sent successfully');
    })

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
