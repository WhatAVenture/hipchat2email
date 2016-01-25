// config
var sslKey = './ssl/server.key';
var sslCert = './ssl/server.crt';
var sslCa = ['./ssl/domainvalidationsecureserverca.crt', './ssl/addtrustca.crt', './ssl/addtrustexternalcaroot.crt'];

var config = require('./config.json');
var app = createApp();
var emailServer = connectToEmailServer();
var lastMessages = [];
var addon = createAddon();


addon.webhook('room_message', /^[\s\S]*$/, function *() {
    var msg = this.message["message"];

    var hasAttachment = !(this.message.file == null);
    var attachment = hasAttachment ? this.message.file["name"] + " (" + this.message.file["url"] + ")" : "";
    var attachmentText = hasAttachment ? "\n\n" + config["texts"]["attachmentText"].replace("[text]", attachment) : "";
    
    if (/^\/help$/.test(msg)) {
        yield this.roomClient.sendNotification(config["texts"]["help"]);
    } else if (/^\/hello$/.test(msg)) {
        yield this.roomClient.sendNotification(config["texts"]["hello"].replace("[name]", this.sender.name));
    } else if (/^[\s\S]*#task[\s\S]*$/.test(msg)) {
        var userMentioned = IsUserMentioned(this.message);
        if (userMentioned) msg = msg.replace("@" + this.message.mentions[0].mention_name, "").trim();
        var useLastMessages = /^#task$/.test(msg);
        var lastMessagesSpecified = /^#task \d+$/.test(msg);
        var numLastMessages = lastMessagesSpecified ? /^#task (\d+)$/.exec(msg)[1] : 1;

        var text = msg.replace(/#task\s*$/, "") + attachmentText;

        if (useLastMessages || lastMessagesSpecified) {
            if (lastMessages[this.room.name] == undefined) {
                yield this.roomClient.sendNotification(config["texts"]["noLastMessage"]);
                return;
            }
            text = lastMessages[this.room.name].slice(0, numLastMessages).reverse().join("\n\n")
        }
        text = text.trim();
        sendMail(userMentioned, text, this, this.message, this.sender);
    } else {
        if (undefined == lastMessages[this.room.name]) lastMessages[this.room.name] = [];
        lastMessages[this.room.name].unshift(msg + " (" + this.sender.mention_name + ")" + attachmentText);
        lastMessages[this.room.name] = lastMessages[this.room.name].slice(0,5);
    }
});

var https = require('https');
var secureServer = https.createServer(buildSslOptions(), app.callback()).listen('3000', function(){
  console.log("Secure Express server listening on port 3000");
});

function createApp() {
    var ack = require('ac-koa').require('hipchat');
    var pkg = require('./package.json');
    return ack(pkg);
}

function createAddon() {
    var addon = app.addon()
        .hipchat()
        .allowRoom(true)
        .allowGlobal(true)
        .scopes('send_notification');
    return addon;
}

function IsUserMentioned(message) {
    return message.mentions[0] != null &&
        message.mentions[0].mention_name != "all" &&
        message.mentions[0].mention_name != "here" &&
        message.mentions[0].mention_name != "hipchat";
}

function sendMail(userMentioned, text, context, message, sender) {
    var targetName = userMentioned ? message.mentions[0].name : sender.name;
    var targetMail = targetName.split(" ")[0].toLowerCase() + config["trello"]["mailPrefix"];
    var targetMentionName = userMentioned ? message.mentions[0].mention_name : sender.mention_name;
    var taskAddedBy = sender.mention_name;

    emailServer.send({
        text: config["texts"]["taskText"].replace("[addedBy]", taskAddedBy),
        from: targetMail,
        to: targetMail,
        subject: text
    }, function (err, message) {
        var sendingText = config["texts"]["sending"].replace("[name]", targetMentionName) + " ";
        if (err != null) {
            context.roomClient.sendNotification(
                sendingText + config["texts"]["error"]
            );
        } else {
            var textPreview = (text.length > config["numCharactersForTaskPreview"]) ?
            text.substring(0, config["numCharactersForTaskPreview"]) + "..." :
                text;
            context.roomClient.sendNotification(
                sendingText + config["texts"]["success"].replace("[text]", textPreview).replace("[email]", targetMail)
            );
        }
        console.log(err || message);
    });
}

function buildSslOptions() {
    fs = require('fs');
    ca = [];
    for (var i = 0; i < sslCa.length; ++i) {
        ca.push(fs.readFileSync(sslCa[i]));
    }

    return sslOptions = {
      key: fs.readFileSync(sslKey),
      cert: fs.readFileSync(sslCert),
      ca: ca,
      requestCert: true,
      rejectUnauthorized: false
    };
}

function connectToEmailServer() {
    var email = require('emailjs');
    return email.server.connect({
        user:     config["email"]["user"], 
        password: config["email"]["password"], 
        host:     config["email"]["host"], 
        tls:      {ciphers: config["email"]["tls"]}
    });
}