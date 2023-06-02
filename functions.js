const { google } = require("googleapis");
const ENV = require("./config.json");
const email = require("./gmail.js");

// Alert time levels in minutes. 
let l0 = ENV.ALERT1_MINS;
let l1 = ENV.ALERT2_MINS;
let l2 = ENV.ALERT3_MINS;
const alertWebhook = ENV.ALERT_CHAT_WEBHOOK;
const escalationWebhook = ENV.ESCALATION_CHAT_WEBHOOK;
const discordWebUrl = 'https://discord.com/channels/' + ENV.CHANNEL_ID;

const noReplyMap = new Map();

function handleMessageCreateEvent(message){
    const { author, id, channel_id, timestamp } = message;
    console.debug("Received message: " + id + " from user: " + author.username);
    if (id == channel_id) {
        noReplyMap.set(id, {timestamp: timestamp, author: author.username, level: 0, id: id});
    } else {
        noReplyMap.delete(channel_id);
    }
}

function sendAlerts(){
    console.debug("Sending periodic alerts.");
    let now = new Date();

    for (const [key, msg] of noReplyMap.entries()) {
        const timestamp = new Date(msg.timestamp);
        let delay = now.getTime() - timestamp.getTime();
        if ((delay >= l2*60*1000) && msg.level == 2) {
            msg.delay = delay;
            sendChatAlert(msg, escalationWebhook);
            // We no longer need to send alerts for this msg
            noReplyMap.delete(key);
        } else if ((delay >= l1*60*1000) && msg.level == 1) {
            msg.delay = delay;
            email.sendMail(msg);
            msg.level = 2;
            noReplyMap.set(key,msg);
        } else if ((delay >= l0*60*1000) && msg.level == 0) {
            msg.delay = delay;
            sendChatAlert(msg, alertWebhook);
            msg.level = 1;
            noReplyMap.set(key,msg);
        }
    }
}

const getChatMessage = (msg) => {
    return 'New Discord message from user: ' + msg.author + ', has not been answered for: ' + Math.floor(msg.delay/60/60/1000) + 
        ' hours.\n'+ 'Link: ' + discordWebUrl + '/' + msg.id;
}

const sendChatAlert = (msg, webhookURL) => {
    console.debug("Sending chat alert for message: " + msg.id);
    const data = JSON.stringify({
        'text': getChatMessage(msg),
      });
      let resp;
      fetch(webhookURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: data,
      }).then((response) => {
        resp = response;
      });
      return resp;
}

module.exports = { 
    handleMessageCreateEvent,
    sendAlerts
};