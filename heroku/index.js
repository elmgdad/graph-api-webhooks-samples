var bodyParser = require("body-parser");
var express = require("express");
var app = express();
var xhub = require("express-x-hub");
const axios = require("axios");
const FormData = require('form-data');

app.set("port", process.env.PORT || 8080);
app.use(xhub({ algorithm: "sha1", secret: process.env.APP_SECRET }));
app.use(bodyParser.json());
let data = new FormData();

var token = process.env.TOKEN || "token";
var received_updates = [];

app.get("/", function (req, res) {
  console.log(req);
  res.send("main <pre>" + JSON.stringify(received_updates, null, 2) + "</pre>");
});

app.get(["/facebook", "/instagram"], function (req, res) {
  if (
    req.query["hub.mode"] == "subscribe" &&
    req.query["hub.verify_token"] == token
  ) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(400);
  }
});

app.post("/facebook", async function (req, res) {
  console.log("Facebook request body:", req.body);

  if (!req.isXHubValid()) {
    console.log(
      "Warning - request header X-Hub-Signature not present or invalid"
    );
    res.sendStatus(401);
    return;
  }

  // Process the Facebook updates here
  received_updates.unshift(req.body);

  let body_param = req.body;
  if (body_param.entry[0].changes[0].value.messages[0].type == "audio") {
    let from = body_param.entry[0].changes[0].value.messages[0].from;
    let audioId = body_param.entry[0].changes[0].value.messages[0].audio.id;
    let msgId = body_param.entry[0].changes[0].value.messages[0].id;

    try {

      data.append('audio_id', audioId);
      data.append('from_number', from);
      data.append('access_token', process.env.APP_TOKEN);
      data.append('msg_id', msgId);

      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'http://34.18.3.148:8082/transcribe',
        headers: {
          'Authorization': "Bearer " + process.env.APP_TOKEN,
          ...data.getHeaders()
        },
        data: data
      };

      axios.request(config)
        .then((response) => {
          console.log(JSON.stringify(response.data));
        })
        .catch((error) => {
          console.log(error);
        });


      res.sendStatus(200);

    } catch (error) {
      console.error("Error processing audio:", error);
      res.sendStatus(500);
    }
  } else if (body_param.entry[0].changes[0].value.messages[0].type == "text") {
    // Extract information from the webhook request
    let entry = req.body.entry[0];
    let changes = entry.changes[0];
    let value = changes.value;
    let message = value.messages[0];
    let from = message.from;
    let msg_body = message.text.body;
    // response to user message
    let data = JSON.stringify({
      messaging_product: "whatsapp",
      to: "96680701918",
      text: {
        body: "your message has been received : " + msg_body,
      },
    });

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://graph.facebook.com/v20.0/393297853866738/messages",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.APP_TOKEN,
      },
      data: data,
    };

    axios(config)
      .then((response) => {
        console.log("Message sent successfully");
        res.sendStatus(200);
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        res.sendStatus(500);
      });
  } else {
    res.sendStatus(400);
  }
});

app.post("/instagram", function (req, res) {
  console.log("Instagram request body:");
  console.log(req.body);
  // Process the Instagram updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.listen(app.get("port"), function () {
  console.log("Node app is running on port", app.get("port"));
});
