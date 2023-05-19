declare var require: any;

var needle = require("needle");

// Interfaces
interface Command {
  description: String;
  schedule: String;
  prompts: [PromptToAsk];
}

interface PromptToAsk {
  metric: String;
  prompt: String;
  format: String;
  buttons: { [key: string]: String };
  replies: { [key: string]: String };
}

let url = process.env.QUESTIONS_JSON_URL;
if (url) {
  console.log("Loading remote JSON config...");
  needle.get(url, function(error, response, body) {
    let userConfig: { [key: string]: Command } = body;
    console.log("Successfully loaded remote user config");
    module.exports.userConfig = userConfig;
  });
} else {
  let userConfig: { [key: string]: Command } = require("./questions.json");
  console.log("Successfully loaded user config");
  module.exports.userConfig = userConfig;
}

export { Command, PromptToAsk };
