"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var telegraf_1 = require("telegraf");
var userConfig = require("./lifesheet.json");
var node_cron_1 = __importDefault(require("node-cron"));
var bot = new telegraf_1.Telegraf(process.env.TELEGRAM_BOT_TOKEN);
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
    pgClient.query({
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
        ctx.reply("\n\n/skip\n/report\n\n/" + Object.keys(userConfig).join("\n/"));
    });
}
function validateUser(ctx) {
    if (ctx.update.message.from.username != process.env.TELEGRAM_USER_ID) {
        console.error("Invalid user " + ctx.update.message.from.username);
        return false;
    }
    return true;
}
function handleSurvey(command, ctx) {
    var matchingCommandObject = userConfig[command];
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
}
function initBot() {
    console.log("Launching up Telegram bot...");
    bot.hears(/^([^\/].*)$/, function (ctx) {
        parseUserInput(ctx);
    });
    bot.hears("/skip", function (ctx) {
        if (!validateUser(ctx))
            return;
        console.log("user is skipping this question");
        ctx.reply("Okay, skipping question. If you see yourself skipping a question too often, maybe it's time to rephrase or remove it");
        triggerNextPromptFromQueue(ctx);
    });
    bot.hears("/skip_all", function (ctx) {
        if (!validateUser(ctx))
            return;
        currentlyAskedPromptQueue = [];
        triggerNextPromptFromQueue(ctx);
        ctx.reply("Okay, removing all questions that are currently in the queue");
    });
    bot.hears(/\/track (\w+)/, function (ctx) {
        if (!validateUser(ctx))
            return;
        var toTrack = ctx.match[1];
        console.log("User wants to track a specific value, without the whole survey: " +
            toTrack);
        var promptToAsk = null;
        Object.keys(userConfig).forEach(function (metric) {
            var survey = userConfig[metric];
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
        if (!validateUser(ctx))
            return;
        var metric = ctx.match[1];
        console.log("User wants to graph a specific value " + metric);
    });
    bot.on("location", function (ctx) {
        if (!validateUser(ctx))
            return;
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
        if (!validateUser(ctx))
            return;
        var command = ctx.match[1];
        handleSurvey(command, ctx);
    });
    bot.action(/\/(\w+)/, function (ctx) {
        var command = ctx.match[1];
        handleSurvey(command, ctx);
    });
    bot.start(function (ctx) { return ctx.reply("Welcome to FxLifeSheet"); });
    bot.help(function (ctx) {
        return ctx.reply("No in-bot help right now, for now please visit https://github.com/KrauseFx/FxLifeSheet");
    });
    bot.on("sticker", function (ctx) { return ctx.reply("Sorry, I don't support stickers"); });
    bot.hears("hi", function (ctx) { return ctx.reply("Hey there"); });
    bot.launch();
}
var _loop_1 = function (commandName, command) {
    node_cron_1.default.schedule(command.schedule, function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log("Reminding user to run /".concat(commandName, " again..."));
            if (process.env.TELEGRAM_CHAT_ID == null) {
                console.error("Please set the `TELEGRAM_CHAT_ID` ENV variable");
            }
            bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, "Hey, it's time to run /".concat(commandName, " again!"), telegraf_1.Markup.inlineKeyboard([
                telegraf_1.Markup.button.callback('Run now', '/' + commandName),
            ]));
            return [2];
        });
    }); });
};
for (var _i = 0, _a = Object.entries(userConfig); _i < _a.length; _i++) {
    var _b = _a[_i], commandName = _b[0], command = _b[1];
    _loop_1(commandName, command);
}
//# sourceMappingURL=worker.js.map