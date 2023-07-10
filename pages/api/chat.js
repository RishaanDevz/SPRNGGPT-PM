import { Configuration, OpenAIApi } from "openai";
import axios from "axios";
import cheerio from "cheerio";
import { SsmlBuilder } from "ssml-builder";

const AKID = process.env['AKID']
const SAKID = process.env['SAKID']
const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: AKID,
  secretAccessKey: SAKID,
  region: 'us-east-1'
});

const Polly = new AWS.Polly();
const OPENAI_API_KEY = process.env['OPENAI_API_KEY']
const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const fetchData = async () => {
  const result = await axios.get("https://test-threepoint.glitch.me/");
  return cheerio.load(result.data);
};

const extractData = ($) => {
  const data = [];
  $("body").each((index, element) => {
    data.push($(element).text());
  });
  return data.join(" ");
};

export default async function(req, res) {
  const $ = await fetchData();
  const content = extractData($);
  const completion = await openai.createChatCompletion({
    // Replace `gpt-4` with `gpt-3.5-turbo` if you don't have early access to GPT-4
    model: "gpt-3.5-turbo-0613",
    messages: [{ "role": "system", "content": `
  You are Valerie, an Artificial Intelligence designed  to help visitors on the SPRNGPOD backend site. You make some small talk, you are friendly THE SPELLING OF SPRNGPOD IS "SPRNGPOD" and stays the same as I have specified. You speak as if you are speaking on behalf of SPRNGPOD. Think of yourself like a spokesperson. use this data to teach them about SPRNGPOD Backend: ${content}`}].concat(req.body.messages), 
    temperature:0
  });

  const responseText = completion.data.choices[0].message.content;

const params = {
  OutputFormat: "mp3",
  Text: `<speak>${responseText.replace(/SPRNGPOD/g, "SPRINGPOD")}</speak>`,
  TextType: "ssml",
  VoiceId: "Amy",
  Engine: "neural",
};




  try {
    const audioResponse = await Polly.synthesizeSpeech(params).promise();
    const audioBase64 = audioResponse.AudioStream.toString('base64');
    const audioDataUri = `data:audio/mp3;base64,${audioBase64}`;

    res.status(200).json({
      result: completion.data.choices[0].message,
      audioUrl: audioDataUri
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
}


