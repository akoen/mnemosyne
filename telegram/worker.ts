// Third party dependencies
import { Telegraf, Router, Markup} from "telegraf";

// Internal dependencies
import {Command, PromptToAsk } from "./config.js";

const userConfig: { [key: string]: Command } = require("./lifesheet.json");

import cron from "node-cron";
import { argv0 } from "process";

// Initialize Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Initialize postgres connection
var Client = require("pg").Client;
var connectionString = process.env.DATABASE_URL;
var pgClient = new Client({
    connectionString: connectionString
});

pgClient.connect(function (err, client, done) {
    console.log(err);
    console.log(done);
});
console.log("Successfully connected to Postgres");

pgClient.query("SELECT NOW()", function (err, res) {
    console.log(err, res);
});

// State
var currentlyAskedPromptObject: PromptToAsk = null;
var currentlyAskedPromptMessageId: number = null; // The Telegram message ID reference
let currentlyAskedPromptQueue: Array<PromptToAsk> = []; // keep track of all the prompts about to be asked

initBot();

function roundNumberExactly(number, decimals) {
  return (
    Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals)
  ).toFixed(decimals);
}

function getButtonText(number) {
  let emojiNumber = {
    "0": "0️⃣",
    "1": "1️⃣",
    "2": "2️⃣",
    "3": "3️⃣",
    "4": "4️⃣",
    "5": "5️⃣"
  }[number];

  if (currentlyAskedPromptObject.buttons == null) {
    // Assign default values
    currentlyAskedPromptObject.buttons = {
      "0": "Terrible",
      "1": "Bad",
      "2": "Okay",
      "3": "Good",
      "4": "Great",
      "5": "Excellent"
    };
  }

  return emojiNumber + " " + currentlyAskedPromptObject.buttons[number];
}

// function printGraph(
//   metric,
//   ctx,
//   numberOfRecentValuesToPrint,
//   additionalValue,
//   skipImage
// ) {
//   client.query(
//     {
//       text:
//         "SELECT * FROM raw_data WHERE metric = $1 ORDER BY timestamp DESC LIMIT 300",
//       values: [metric]
//     },
//     (err, res) => {
//       console.log(res);
//       if (err) {
//         console.error(err);
//         ctx.reply(err);
//         return;
//       }
//
//       let rows = res.rows;
//       console.log("Rows: " + rows.length);
//
//       let allValues = [];
//       let allTimes = [];
//       let rawText = [];
//       let minimum = 10000;
//       let maximum = 0;
//       for (let i = 0; i < rows.length; i++) {
//         let time = moment(Number(rows[i].timestamp));
//         let value = Number(rows[i].value);
//         allValues.unshift(value);
//         allTimes.unshift(time.format("MM-DD"));
//
//         if (i < numberOfRecentValuesToPrint - 1) {
//           rawText.unshift(time.format("YYYY-MM-DD") + ": " + value.toFixed(2));
//         }
//
//         if (value < minimum) {
//           minimum = value;
//         }
//         if (value > maximum) {
//           maximum = value;
//         }
//       }
//
//       if (additionalValue) {
//         allValues.push(additionalValue);
//         allTimes.push(moment());
//
//         rawText.push(
//           moment().format("YYYY-MM-DD") +
//             ": " +
//             Number(additionalValue).toFixed(2)
//         );
//       }
//
//       // Print the raw values
//       if (numberOfRecentValuesToPrint > 2) {
//         ctx.reply(
//           rawText.join("\n") + "\nMinimum: " + minimum + "\nMaximum: " + maximum
//         );
//       }
//
//       // Generate the graph
//       if (!skipImage) {
//         minimum -= 2;
//         maximum += 2;
//
//         let url =
//           "https://chart.googleapis.com/chart?cht=lc&chd=t:" +
//           allValues.join(",") +
//           "&chs=800x350&chl=" +
//           allTimes.join("%7C") +
//           "&chtt=" +
//           metric +
//           "&chf=bg,s,e0e0e0&chco=000000,0000FF&chma=30,30,30,30&chds=" +
//           minimum +
//           "," +
//           maximum;
//         console.log(url);
//         ctx.replyWithPhoto({
//           url: url
//         });
//       }
//
//       if (numberOfRecentValuesToPrint > 0) {
//         // Now render the week/month/quarter/year average
//         //
//
//         const now = Date.now()
//
//         const periods = {
//           week: 7*24*60*60*1000,
//           month: 30*24*60*60*1000,
//           quarter: 90*24*60*60*1000,
//           year: 365*24*60*60*1000,
//           all: now
//         }
//
//         let queryToUse = "SELECT";
//
//         for(const [periodName, period] of Object.entries(periods)) {
//           const timestamp = Math.floor((now - period) / 1000)
//           queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE timestamp > ${timestamp} AND metric='${metric}') as ${metric}${periodName},`;
//           queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE id != (SELECT id FROM raw_data WHERE metric='${metric}' ORDER BY id DESC LIMIT 1) AND timestamp > ${timestamp} AND metric='${metric}') as ${metric}{periodName}.`;
//         }
//         // const weekTimestamp =
//         //   moment()
//         //     .subtract(7, "days")
//         //     .unix() * 1000;
//         // const monthTimestamp =
//         //   moment()
//         //     .subtract(30, "days")
//         //     .unix() * 1000;
//         // const quarterTimestamp =
//         //   moment()
//         //     .subtract(90, "days")
//         //     .unix() * 1000;
//         // const yearTimestamp =
//         //   moment()
//         //     .subtract(365, "days")
//         //     .unix() * 1000;
//
//         // let athTimestamp = moment("2019-04-12").unix() * 1000;
//         //
//         // if (metric == "mood") {
//         //   athTimestamp = moment("2018-02-01").unix() * 1000;
//         // }
//         // // After values
//         // queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE timestamp > ${weekTimestamp} AND metric='${metric}') as ${metric}Week,`;
//         // queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE timestamp > ${monthTimestamp} AND metric='${metric}') as ${metric}Month,`;
//         // queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE timestamp > ${quarterTimestamp} AND metric='${metric}') as ${metric}Quarter,`;
//         // queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE timestamp > ${yearTimestamp} AND metric='${metric}') as ${metric}Year,`;
//         // queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE timestamp > ${athTimestamp} AND metric='${metric}') as ${metric}AllTime,`;
//         //
//         // // Before values
//         // queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE id != (SELECT id FROM raw_data WHERE metric='${metric}' ORDER BY id DESC LIMIT 1) AND timestamp > ${weekTimestamp} AND metric='${metric}') as ${metric}WeekOld,`;
//         // queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE id != (SELECT id FROM raw_data WHERE metric='${metric}' ORDER BY id DESC LIMIT 1) AND timestamp > ${monthTimestamp} AND metric='${metric}') as ${metric}MonthOld,`;
//         // queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE id != (SELECT id FROM raw_data WHERE metric='${metric}' ORDER BY id DESC LIMIT 1) AND timestamp > ${quarterTimestamp} AND metric='${metric}') as ${metric}QuarterOld,`;
//         // queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE id != (SELECT id FROM raw_data WHERE metric='${metric}' ORDER BY id DESC LIMIT 1) AND timestamp > ${yearTimestamp} AND metric='${metric}') as ${metric}YearOld,`;
//         // queryToUse += `(SELECT ROUND(AVG(value::numeric), 4) FROM raw_data WHERE id != (SELECT id FROM raw_data WHERE metric='${metric}' ORDER BY id DESC LIMIT 1) AND timestamp > ${athTimestamp} AND metric='${metric}') as ${metric}AllTimeOld`;
//
//         console.log(queryToUse);
//
//         client.query(
//           {
//             text: queryToUse
//           },
//           (err, res) => {
//             const rows = ["week", "month", "quarter", "year", "all"];
//             let c = res.rows[0];
//             console.log(c);
//             let finalText = ["Moving averages for " + metric];
//             for (let i = 0; i < rows.length; i++) {
//               let newValue = c[metric.toLowerCase() + rows[i]];
//               let oldValue = c[metric.toLowerCase() + rows[i] + "old"];
//
//               finalText.push(
//                 roundNumberExactly(newValue, 2) +
//                   " - " +
//                   rows[i] +
//                   " (" +
//                   (newValue - oldValue > 0 ? "+" : "") +
//                   roundNumberExactly(newValue - oldValue, 2) +
//                   ")"
//               );
//             }
//             ctx.reply(finalText.join("\n"));
//           }
//         );
//       }
//     }
//   );
// }

function triggerNextPromptFromQueue(ctx) {
  // let keyboard = Extra.markup(m => m.removeKeyboard()); // default keyboard
  let keyboard;
  keyboard = Markup.removeKeyboard();
  let promptAppendix = "";

  currentlyAskedPromptObject = currentlyAskedPromptQueue.shift();

  if (currentlyAskedPromptObject == null) {
    ctx.reply("All done for now, let's do this 💪", keyboard);
    // Finished
    currentlyAskedPromptMessageId = null;
    return;
  }

  if (currentlyAskedPromptObject.prompt == null) {
    console.error("No text defined for");
    console.error(currentlyAskedPromptObject);
  }

  if (currentlyAskedPromptObject.format == "header") {
    // This is information only, just print and go to the next one
    ctx
      .reply(currentlyAskedPromptObject.prompt, keyboard)
      .then(({ message_id }) => {
        triggerNextPromptFromQueue(ctx);
      });
    return;
  }

  // Looks like Telegram has some limitations:
  // - No way to use `force_reply` together with a custom keyboard (https://github.com/KrauseFx/FxLifeSheet/issues/5)
  // - No way to update existing messages together with a custom keyboard https://core.telegram.org/bots/api#updating-messages

  if (currentlyAskedPromptObject.format == "range") {
    let allButtons = [
      [getButtonText("5")],
      [getButtonText("4")],
      [getButtonText("3")],
      [getButtonText("2")],
      [getButtonText("1")],
      [getButtonText("0")]
    ];
    shuffleArray(allButtons);
    keyboard = Markup.keyboard(allButtons)
      .oneTime()
  } else if (currentlyAskedPromptObject.format == "boolean") {
    keyboard = Markup.keyboard([["1: Yes"], ["0: No"]])
      .oneTime()
  } else if (currentlyAskedPromptObject.format == "text") {
    // use the default keyboard we set here anyway
    promptAppendix +=
      "You can use a Bear note, and then paste the deep link to the note here";
  } else if (currentlyAskedPromptObject.format == "location") {
    keyboard = Markup.keyboard([Markup.button.locationRequest("📡 Send location")])
  }

  promptAppendix = currentlyAskedPromptQueue.length + " more question";
  if (currentlyAskedPromptQueue.length != 1) {
    promptAppendix += "s";
  }
  if (currentlyAskedPromptQueue.length == 0) {
    promptAppendix = "last question";
  }

  let prompt =
    currentlyAskedPromptObject.prompt + " (" + promptAppendix + ")";

  ctx.reply(prompt, keyboard).then(({ message_id }) => {
    currentlyAskedPromptMessageId = message_id;
  });

  if (
    currentlyAskedPromptObject.format == "number" ||
    currentlyAskedPromptObject.format == "range" ||
    currentlyAskedPromptObject.format == "boolean"
  ) {
    // To show the graph before, as it takes a while to load
    // printGraph(currentlyAskedPromptObject.metric, ctx, 0, null, false);
  }
}

// Taken from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function insertNewValue(parsedUserValue, ctx, metric, format, fakeDate = null) {
  console.log("Inserting value '" + parsedUserValue + "' for metric " + metric);

  let dateToAdd;
  if (fakeDate) {
    dateToAdd = fakeDate;
  } else {
    dateToAdd = ctx.update.message.date;
  }
  let prompt = null;
  if (currentlyAskedPromptObject) {
    prompt = currentlyAskedPromptObject.prompt;
  }

  let row = {
    time: dateToAdd,
    time_imported: dateToAdd,
    metric: metric,
    format: format,
    prompt: prompt,
    value: parsedUserValue,
    source: "telegram",
  };

  pgClient.query(
    {
      text:
        "INSERT INTO raw_data (" +
        Object.keys(row).join(",") +
        ") VALUES (to_timestamp($1), to_timestamp($2), $3, $4, $5, $6, $7)",
      values: Object.values(row)
    },
    (err, res) => {
      console.log(res);
      if (err) {
        ctx.reply("Error saving value: " + err);
        console.log(err.stack);
      } else {
      }
    }
  );

  if (ctx) {
    // we don't use this for location sending as we have many values for that, so that's when `ctx` is nil
    // Show that we saved the value
    // Currently the Telegram API doens't support updating of messages that have a custom keyboard
    // for no good reason, as mentioned here https://github.com/TelegramBots/telegram.bot/issues/176
    //
    // Bad Request: Message can't be edited
    //
    // Please note, that it is currently only possible to edit messages without reply_markup or with inline keyboards
    // ctx.telegram.editMessageText(
    //   ctx.update.message.chat.id,
    //   currentlyAskedPromptMessageId,
    //   null,
    //   "✅ " + lastPromptAskedDupe + " ✅"
    // );
  }
}

function parseUserInput(ctx, text = null) {
  if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
    console.error("Invalid user " + ctx.update.message.from.username);
    return;
  }

  if (currentlyAskedPromptMessageId == null) {
    ctx
      .reply(
        "Sorry, I forgot the question I asked, this usually means it took too long for you to respond, please trigger the question again by running the `/` command"
      )
      .then(({ message_id }) => {
        sendAvailableCommands(ctx);
      });
    return;
  }

  // user replied with a value
  let userValue;
  if (text != null) {
    userValue = text;
  } else {
    userValue = ctx.match[1];
  }

  let parsedUserValue = null;

  if (currentlyAskedPromptObject.format != "text") {
    // First, see if it starts with emoji number, for which we have to do custom
    // parsing instead
    if (
      currentlyAskedPromptObject.format == "range" ||
      currentlyAskedPromptObject.format == "boolean"
    ) {
      let tryToParseNumber = parseInt(userValue[0]);
      if (!isNaN(tryToParseNumber)) {
        parsedUserValue = tryToParseNumber;
      } else {
        ctx.reply(
          "Sorry, looks like your input is invalid, please enter a valid number from the selection",
          { reply_to_message_id: ctx.update.message.message_id }
        );
      }
    }

    if (parsedUserValue == null) {
      // parse the int/float, support both ints and floats
      userValue = userValue.match(/^(\d+(\.\d+)?)$/);
      if (userValue == null) {
        ctx.reply(
          "Sorry, looks like you entered an invalid number, please try again",
          { reply_to_message_id: ctx.update.message.message_id }
        );
        return;
      }
      parsedUserValue = userValue[1];
    }
  } else {
    parsedUserValue = userValue; // raw value is fine
  }

  if (currentlyAskedPromptObject.format == "range") {
    // ensure the input is 0-6
    if (parsedUserValue < 0 || parsedUserValue > 6) {
      ctx.reply(
        "Please enter a value from 0 to 6",
        { reply_to_message_id: ctx.update.message.message_id }
      );
      return;
    }
  }

  if (
    currentlyAskedPromptObject.format == "number" ||
    currentlyAskedPromptObject.format == "range" ||
    currentlyAskedPromptObject.format == "boolean"
  ) {
    // To show potential streaks and the history
    // printGraph(currentlyAskedPromptObject.metric, ctx, 2, parsedUserValue, true);
  }

  console.log(
    "Got a new value: " +
      parsedUserValue +
      " for metric " +
      currentlyAskedPromptObject.metric
  );

  if (
    currentlyAskedPromptObject.replies &&
    currentlyAskedPromptObject.replies[parsedUserValue]
  ) {
    // Check if there is a custom reply, and if, use that
    ctx.reply(
      currentlyAskedPromptObject.replies[parsedUserValue],
      { reply_to_message_id: ctx.update.message.message_id }
    );
  }

  insertNewValue(
    parsedUserValue,
    ctx,
    currentlyAskedPromptObject.metric,
    currentlyAskedPromptObject.format
  );

  setTimeout(function() {
    triggerNextPromptFromQueue(ctx);
  }, 50); // timeout just to make sure the order is right
}

function sendAvailableCommands(ctx) {
  ctx.reply("Available commands:").then(({ message_id }) => {
    ctx.reply(
      "\n\n/skip\n/report\n\n/" + Object.keys(userConfig).join("\n/")
    );
  });
}

// function saveLastRun(command) {
//   pgClient.query(
//     {
//       text:
//         "insert into last_run (command, last_run) VALUES ($1, $2) on conflict (command) do update set last_run = $2",
//       values: [command, moment().valueOf()]
//     },
//     (err, res) => {
//       console.log(res);
//       if (err) {
//         console.log(err.stack);
//       } else {
//         console.log("Stored timestamp of last run for " + command);
//       }
//     }
//   );
// }
//

function validateUser(ctx) {
  if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
    console.error("Invalid user " + ctx.update.message.from.username);
    return false;
  }
  return true;
}

function handleSurvey(command, ctx) {
    let matchingCommandObject = userConfig[command];

    if (matchingCommandObject && matchingCommandObject.prompts) {
      console.log("User wants to run: " + command);
      if (
        currentlyAskedPromptQueue.length > 0 &&
        currentlyAskedPromptMessageId
      ) {
        // Happens when the user triggers another survey, without having completed the first one yet
        ctx.reply(
          "^ Okay, but please answer my previous question also, thanks ^",
          { reply_to_message_id: currentlyAskedPromptMessageId }
        );
      }

      currentlyAskedPromptQueue = currentlyAskedPromptQueue.concat(
        matchingCommandObject.prompts.slice(0)
      ); // slice is a poor human's .clone basically

      if (currentlyAskedPromptObject == null) {
        triggerNextPromptFromQueue(ctx);
      }
    } else {
      ctx
        .reply("Sorry, I don't know how to run `/" + command)
        .then(({ message_id }) => {
          sendAvailableCommands(ctx);
        });
    }
}

function initBot() {
  console.log("Launching up Telegram bot...");

  // parse numeric/text inputs
  // `^([^\/].*)$` matches everything that doens't start with /
  // This will enable us to get any user inputs, including longer texts
  bot.hears(/^([^\/].*)$/, ctx => {
    parseUserInput(ctx);
  });

  // As we get no benefit of using `bot.command` to add commands, we might as well use
  // regexes, which then allows us to let the user's JSON define the available commands

  //
  // parse one-off commands:
  //
  // Those have to be above the regex match
  bot.hears("/skip", ctx => {
    if(!validateUser(ctx)) return;

    console.log("user is skipping this question");
    ctx.reply(
      "Okay, skipping question. If you see yourself skipping a question too often, maybe it's time to rephrase or remove it"
    );
    triggerNextPromptFromQueue(ctx);
  });

  bot.hears("/skip_all", ctx => {
    if(!validateUser(ctx)) return;

    currentlyAskedPromptQueue = [];
    triggerNextPromptFromQueue(ctx);
    ctx.reply("Okay, removing all questions that are currently in the queue");
  });

  bot.hears(/\/track (\w+)/, ctx => {
    if(!validateUser(ctx)) return;

    let toTrack = ctx.match[1];
    console.log(
      "User wants to track a specific value, without the whole survey: " +
        toTrack
    );

    let promptToAsk: PromptToAsk = null;

    Object.keys(userConfig).forEach(function(metric) {
      var survey = userConfig[metric];
      for (let i = 0; i < survey.prompts.length; i++) {
        let currentPrompt = survey.prompts[i];
        if (currentPrompt.metric == toTrack) {
          promptToAsk = currentPrompt;
          return;
        }
      }
    });

    if (promptToAsk) {
      currentlyAskedPromptQueue = currentlyAskedPromptQueue.concat(
        promptToAsk
      );
      triggerNextPromptFromQueue(ctx);
    } else {
      ctx.reply(
        "Sorry, I couldn't find the metric `" +
          toTrack +
          "`, please make sure it's not mispelled"
      );
    }
  });

  bot.hears(/\/graph (\w+)/, ctx => {
    if(!validateUser(ctx)) return;

    let metric = ctx.match[1];
    console.log("User wants to graph a specific value " + metric);

    // printGraph(metric, ctx, 100, null, false);
  });

  bot.on("location", ctx => {
    if(!validateUser(ctx)) return;

    if (currentlyAskedPromptMessageId == null) {
      ctx
        .reply(
          "Sorry, I forgot the question I asked, this usually means it took too long for you to respond, please trigger the question again by running the `/` command"
        )
        .then(({ message_id }) => {
          sendAvailableCommands(ctx);
        });
      return;
    }
    let location = ctx.update.message.location;
    let lat = location.latitude;
    let lng = location.longitude;

    insertNewValue(lat, ctx, "locationLat", "number");
    insertNewValue(lng, ctx, "locationLng", "number");
    triggerNextPromptFromQueue(ctx);
  });

  // parse commands to start a survey
  bot.hears(/\/(\w+)/, ctx => {
    if(!validateUser(ctx)) return;

    // user entered a command to start the survey
    let command = ctx.match[1];
    handleSurvey(command, ctx);
  });

  bot.action(/\/(\w+)/, ctx => {
    let command = ctx.match[1];
    handleSurvey(command, ctx);
  });

  bot.start(ctx => ctx.reply("Welcome to FxLifeSheet"));
  // bot.on(["voice", "video_note"], ctx => {
  //   if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
  //     return;
  //   }
  //   let message = ctx.message || ctx.update.channel_post;
  //   let voice =
  //     message.voice || message.document || message.audio || message.video_note;
  //   let fileId = voice.file_id;
  //   let transcribingMessageId = null;

  //   console.log("Received voice with file ID '" + fileId + "'");
  //   ctx
  //     .reply(
  //       "🦄 Received message, transcribing now...",
  //       Extra.inReplyTo(ctx.message.message_id)
  //     )
  //     .then(({ message_id }) => {
  //       transcribingMessageId = message_id;
  //     });

  //   let transcribeURL = "https://bubbles-transcribe.herokuapp.com/transcribe";
  //   transcribeURL += "?file_id=" + fileId;
  //   transcribeURL += "&language=en-US";
  //   transcribeURL += "&telegram_token=" + process.env.TELEGRAM_BOT_TOKEN;

  //   needle.get(transcribeURL, function(error, response, body) {
  //     if (error) {
  //       console.error(error);
  //       ctx.reply("Error: " + error, Extra.inReplyTo(ctx.message.message_id));
  //     }
  //     let text = JSON.parse(body)["text"];

  //     ctx.telegram.editMessageText(
  //       ctx.update.message.chat.id,
  //       transcribingMessageId,
  //       null,
  //       text
  //     );

  //     if (text != null && text.length > 5) {
  //       parseUserInput(ctx, text);
  //     }
  //   });
  // });

  bot.help(ctx =>
    ctx.reply(
      "No in-bot help right now, for now please visit https://github.com/KrauseFx/FxLifeSheet"
    )
  );
  bot.on("sticker", ctx => ctx.reply("Sorry, I don't support stickers"));
  bot.hears("hi", ctx => ctx.reply("Hey there"));

  // bot.on(callbackQuery("data"), ctx => {
  //   console.log("hi", ctx.callbackQuery);
  //   handleSurvey(ctx.callbackQuery.data, ctx);
  // });

  // has to be last
  bot.launch();
}

for(const [commandName, command] of Object.entries(userConfig)) {
  cron.schedule(command.schedule, async () => {
    console.log(`Reminding user to run /${commandName} again...`);
    if (process.env.TELEGRAM_CHAT_ID == null) {
      console.error("Please set the `TELEGRAM_CHAT_ID` ENV variable");
    }

    bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID,
        `Hey, it's time to run /${commandName} again!`,
        Markup.inlineKeyboard([
        Markup.button.callback('Run now', '/' + commandName),
      ])
      );
  })
}
