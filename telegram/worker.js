"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var telegraf_1 = require("telegraf");
var config = require("./config.js");
var bot = new telegraf_1.Telegraf(process.env.TELEGRAM_BOT_TOKEN);
var Client = require("pg").Client;
var connectionString = process.env.DATABASE_URL;
var client = new Client({
    connectionString: connectionString
});
client.connect(function (err, client, done) {
    console.log(err);
    console.log(done);
});
console.log("Successfully connected to Postgres");
client.query("SELECT NOW()", function (err, res) {
    console.log(err, res);
});
var currentlyAskedPromptObject = null;
var currentlyAskedPromptMessageId = null;
var currentlyAskedPromptQueue = [];
initBot();
function roundNumberExactly(number, decimals) {
    return (Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
}
function getButtonText(number) {
    var emojiNumber = {
        "0": "0️⃣",
        "1": "1️⃣",
        "2": "2️⃣",
        "3": "3️⃣",
        "4": "4️⃣",
        "5": "5️⃣"
    }[number];
    if (currentlyAskedPromptObject.buttons == null) {
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
function triggerNextPromptFromQueue(ctx) {
    var keyboard;
    keyboard = telegraf_1.Markup.removeKeyboard();
    var promptAppendix = "";
    currentlyAskedPromptObject = currentlyAskedPromptQueue.shift();
    if (currentlyAskedPromptObject == null) {
        ctx.reply("All done for now, let's do this 💪", keyboard);
        currentlyAskedPromptMessageId = null;
        return;
    }
    if (currentlyAskedPromptObject.prompt == null) {
        console.error("No text defined for");
        console.error(currentlyAskedPromptObject);
    }
    if (currentlyAskedPromptObject.format == "header") {
        ctx
            .reply(currentlyAskedPromptObject.prompt, keyboard)
            .then(function (_a) {
            var message_id = _a.message_id;
            triggerNextPromptFromQueue(ctx);
        });
        return;
    }
    if (currentlyAskedPromptObject.format == "range") {
        var allButtons = [
            [getButtonText("5")],
            [getButtonText("4")],
            [getButtonText("3")],
            [getButtonText("2")],
            [getButtonText("1")],
            [getButtonText("0")]
        ];
        shuffleArray(allButtons);
        keyboard = telegraf_1.Markup.keyboard(allButtons)
            .oneTime();
    }
    else if (currentlyAskedPromptObject.format == "boolean") {
        keyboard = telegraf_1.Markup.keyboard([["1: Yes"], ["0: No"]])
            .oneTime();
    }
    else if (currentlyAskedPromptObject.format == "text") {
        promptAppendix +=
            "You can use a Bear note, and then paste the deep link to the note here";
    }
    else if (currentlyAskedPromptObject.format == "location") {
        keyboard = telegraf_1.Markup.keyboard([telegraf_1.Markup.button.locationRequest("📡 Send location")]);
    }
    promptAppendix = currentlyAskedPromptQueue.length + " more question";
    if (currentlyAskedPromptQueue.length != 1) {
        promptAppendix += "s";
    }
    if (currentlyAskedPromptQueue.length == 0) {
        promptAppendix = "last question";
    }
    var prompt = currentlyAskedPromptObject.prompt + " (" + promptAppendix + ")";
    ctx.reply(prompt, keyboard).then(function (_a) {
        var message_id = _a.message_id;
        currentlyAskedPromptMessageId = message_id;
    });
    if (currentlyAskedPromptObject.format == "number" ||
        currentlyAskedPromptObject.format == "range" ||
        currentlyAskedPromptObject.format == "boolean") {
    }
}
function shuffleArray(array) {
    var _a;
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [array[j], array[i]], array[i] = _a[0], array[j] = _a[1];
    }
}
function insertNewValue(parsedUserValue, ctx, metric, format, fakeDate) {
    if (fakeDate === void 0) { fakeDate = null; }
    console.log("Inserting value '" + parsedUserValue + "' for metric " + metric);
    var dateToAdd;
    if (fakeDate) {
        dateToAdd = fakeDate;
    }
    else {
        dateToAdd = ctx.update.message.date;
    }
    var prompt = null;
    if (currentlyAskedPromptObject) {
        prompt = currentlyAskedPromptObject.prompt;
    }
    var row = {
        time: dateToAdd,
        time_imported: dateToAdd,
        metric: metric,
        format: format,
        prompt: prompt,
        value: parsedUserValue,
        source: "telegram",
    };
    client.query({
        text: "INSERT INTO raw_data (" +
            Object.keys(row).join(",") +
            ") VALUES (to_timestamp($1), to_timestamp($2), $3, $4, $5, $6, $7)",
        values: Object.values(row)
    }, function (err, res) {
        console.log(res);
        if (err) {
            ctx.reply("Error saving value: " + err);
            console.log(err.stack);
        }
        else {
        }
    });
    if (ctx) {
    }
}
function parseUserInput(ctx, text) {
    if (text === void 0) { text = null; }
    if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
        console.error("Invalid user " + ctx.update.message.from.username);
        return;
    }
    if (currentlyAskedPromptMessageId == null) {
        ctx
            .reply("Sorry, I forgot the question I asked, this usually means it took too long for you to respond, please trigger the question again by running the `/` command")
            .then(function (_a) {
            var message_id = _a.message_id;
            sendAvailableCommands(ctx);
        });
        return;
    }
    var userValue;
    if (text != null) {
        userValue = text;
    }
    else {
        userValue = ctx.match[1];
    }
    var parsedUserValue = null;
    if (currentlyAskedPromptObject.format != "text") {
        if (currentlyAskedPromptObject.format == "range" ||
            currentlyAskedPromptObject.format == "boolean") {
            var tryToParseNumber = parseInt(userValue[0]);
            if (!isNaN(tryToParseNumber)) {
                parsedUserValue = tryToParseNumber;
            }
            else {
                ctx.reply("Sorry, looks like your input is invalid, please enter a valid number from the selection", { reply_to_message_id: ctx.update.message.message_id });
            }
        }
        if (parsedUserValue == null) {
            userValue = userValue.match(/^(\d+(\.\d+)?)$/);
            if (userValue == null) {
                ctx.reply("Sorry, looks like you entered an invalid number, please try again", { reply_to_message_id: ctx.update.message.message_id });
                return;
            }
            parsedUserValue = userValue[1];
        }
    }
    else {
        parsedUserValue = userValue;
    }
    if (currentlyAskedPromptObject.format == "range") {
        if (parsedUserValue < 0 || parsedUserValue > 6) {
            ctx.reply("Please enter a value from 0 to 6", { reply_to_message_id: ctx.update.message.message_id });
            return;
        }
    }
    if (currentlyAskedPromptObject.format == "number" ||
        currentlyAskedPromptObject.format == "range" ||
        currentlyAskedPromptObject.format == "boolean") {
    }
    console.log("Got a new value: " +
        parsedUserValue +
        " for metric " +
        currentlyAskedPromptObject.metric);
    if (currentlyAskedPromptObject.replies &&
        currentlyAskedPromptObject.replies[parsedUserValue]) {
        ctx.reply(currentlyAskedPromptObject.replies[parsedUserValue], { reply_to_message_id: ctx.update.message.message_id });
    }
    insertNewValue(parsedUserValue, ctx, currentlyAskedPromptObject.metric, currentlyAskedPromptObject.format);
    setTimeout(function () {
        triggerNextPromptFromQueue(ctx);
    }, 50);
}
function sendAvailableCommands(ctx) {
    ctx.reply("Available commands:").then(function (_a) {
        var message_id = _a.message_id;
        ctx.reply("\n\n/skip\n/report\n\n/" + Object.keys(config.userConfig).join("\n/"));
    });
}
function initBot() {
    console.log("Launching up Telegram bot...");
    bot.hears(/^([^\/].*)$/, function (ctx) {
        parseUserInput(ctx);
    });
    bot.hears("/skip", function (ctx) {
        if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
            console.error("Invalid user " + ctx.update.message.from.username);
            return;
        }
        console.log("user is skipping this question");
        ctx.reply("Okay, skipping question. If you see yourself skipping a question too often, maybe it's time to rephrase or remove it");
        triggerNextPromptFromQueue(ctx);
    });
    bot.hears("/skip_all", function (ctx) {
        if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
            return;
        }
        currentlyAskedPromptQueue = [];
        triggerNextPromptFromQueue(ctx);
        ctx.reply("Okay, removing all questions that are currently in the queue");
    });
    bot.hears(/\/track (\w+)/, function (ctx) {
        if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
            console.error("Invalid user " + ctx.update.message.from.username);
            return;
        }
        var toTrack = ctx.match[1];
        console.log("User wants to track a specific value, without the whole survey: " +
            toTrack);
        var promptToAsk = null;
        Object.keys(config.userConfig).forEach(function (metric) {
            var survey = config.userConfig[metric];
            for (var i = 0; i < survey.prompts.length; i++) {
                var currentPrompt = survey.prompts[i];
                if (currentPrompt.metric == toTrack) {
                    promptToAsk = currentPrompt;
                    return;
                }
            }
        });
        if (promptToAsk) {
            currentlyAskedPromptQueue = currentlyAskedPromptQueue.concat(promptToAsk);
            triggerNextPromptFromQueue(ctx);
        }
        else {
            ctx.reply("Sorry, I couldn't find the metric `" +
                toTrack +
                "`, please make sure it's not mispelled");
        }
    });
    bot.hears(/\/graph (\w+)/, function (ctx) {
        if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
            return;
        }
        var metric = ctx.match[1];
        console.log("User wants to graph a specific value " + metric);
    });
    bot.on("location", function (ctx) {
        if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
            return;
        }
        if (currentlyAskedPromptMessageId == null) {
            ctx
                .reply("Sorry, I forgot the question I asked, this usually means it took too long for you to respond, please trigger the question again by running the `/` command")
                .then(function (_a) {
                var message_id = _a.message_id;
                sendAvailableCommands(ctx);
            });
            return;
        }
        var location = ctx.update.message.location;
        var lat = location.latitude;
        var lng = location.longitude;
        insertNewValue(lat, ctx, "locationLat", "number");
        insertNewValue(lng, ctx, "locationLng", "number");
        triggerNextPromptFromQueue(ctx);
    });
    bot.hears(/\/(\w+)/, function (ctx) {
        if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
            return;
        }
        var command = ctx.match[1];
        var matchingCommandObject = config.userConfig[command];
        if (matchingCommandObject && matchingCommandObject.prompts) {
            console.log("User wants to run: " + command);
            if (currentlyAskedPromptQueue.length > 0 &&
                currentlyAskedPromptMessageId) {
                ctx.reply("^ Okay, but please answer my previous question also, thanks ^", { reply_to_message_id: currentlyAskedPromptMessageId });
            }
            currentlyAskedPromptQueue = currentlyAskedPromptQueue.concat(matchingCommandObject.prompts.slice(0));
            if (currentlyAskedPromptObject == null) {
                triggerNextPromptFromQueue(ctx);
            }
        }
        else {
            ctx
                .reply("Sorry, I don't know how to run `/" + command)
                .then(function (_a) {
                var message_id = _a.message_id;
                sendAvailableCommands(ctx);
            });
        }
    });
    bot.start(function (ctx) { return ctx.reply("Welcome to FxLifeSheet"); });
    bot.help(function (ctx) {
        return ctx.reply("No in-bot help right now, for now please visit https://github.com/KrauseFx/FxLifeSheet");
    });
    bot.on("sticker", function (ctx) { return ctx.reply("Sorry, I don't support stickers"); });
    bot.hears("hi", function (ctx) { return ctx.reply("Hey there"); });
    bot.launch();
}
//# sourceMappingURL=worker.js.map