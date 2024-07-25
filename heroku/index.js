var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var xhub = require('express-x-hub');
const axios = require("axios");


app.set('port', (process.env.PORT || 8080));

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

    try {
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
        responseType: 'stream',
        headers: {
          "Content-Type": "application/json",
          'Authorization': 'Bearer ' + process.env.APP_TOKEN
        }
      });

      let webhock = await axios({
        method: "POST",
        url: 'https://majexexpress.com/operation/webhook',
        headers: {
          "Content-Type": "application/json",

        },
        data : JSON.stringify(req.body)
      });
      
   /*   let audioFilePath = path.join(__dirname, 'audio.ogg');
      let writer = fs.createWriteStream(audioFilePath);
      response_audio.data.pipe(writer);

      writer.on('finish', async () => {
        const audioBytes = fs.readFileSync(audioFilePath).toString('base64');

        const audioRequest = {
          audio: {
            content: audioBytes,
          },
          config: {
            encoding: 'OGG_OPUS',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
          },
        };

        const [transcriptionResponse] = await client.recognize(audioRequest);
        const transcription = transcriptionResponse.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        
        console.log('Transcription:', transcription);

        // Send response with transcription
        res.json({
          message: "Audio received and transcribed",
          transcription: transcription
        });

        // Clean up the audio file
        fs.unlink(audioFilePath, (err) => {
          if (err) {
            console.error('Error deleting audio file:', err);
          }
        });
      });

      writer.on('error', (error) => {
        console.error('Error writing audio file:', error);
        res.sendStatus(500);
      });*/
      
    } catch (error) {
      console.error('Error processing audio:', error);
      res.sendStatus(500);
    }

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
        res.sendStatus(200);
      })
      .catch(error => {
        console.error('Error sending message:', error);
        res.sendStatus(500);
      });
  } else {
    res.sendStatus(400);
  }
});

app.post('/instagram', function (req, res) {
  console.log('Instagram request body:');
  console.log(req.body);
  // Process the Instagram updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
