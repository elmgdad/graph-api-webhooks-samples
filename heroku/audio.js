// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');
const axios = require('axios');

/**
 * Calls the Speech-to-Text API on a demo audio file.
 */
async function quickstart() {
    try {
        // Fetch the JSON key file from the URL
        const keyResponse = await axios.get('https://majexexpress.com/key.json');
        const keyJson = keyResponse.data;

        // Creates a client with explicit credentials
        const client = new speech.SpeechClient({
            credentials: keyJson
        });

        // The path to the remote LINEAR16 file stored in Google Cloud Storage
        const gcsUri = 'gs://cloud-samples-data/speech/brooklyn_bridge.raw';

        // The audio file's encoding, sample rate in hertz, and BCP-47 language code
        const audio = {
            uri: gcsUri,
        };
        const config = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en', // Use 'ar' for generic Arabic
        };
        const request = {
            audio: audio,
            config: config,
        };

        // Detects speech in the audio file
        const [recognizeResponse] = await client.recognize(request);
        const transcription = recognizeResponse.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        console.log(`Transcription: ${transcription}`);
    } catch (error) {
        console.error('Error fetching key file or recognizing speech:', error);
    }
}

quickstart();
