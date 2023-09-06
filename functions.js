
const { google } = require("googleapis");
const ENV = require("./config.json");
const email = require("./gmail.js");
const { Console } = require("console");


// Alert time levels in minutes. 
let l0 = ENV.ALERT1_MINS;
//let l1 = ENV.ALERT2_MINS;
let l2 = ENV.ALERT2_MINS;
const alertWebhook = ENV.ALERT_CHAT_WEBHOOK;
const alertThread = ENV.ALERT_CHAT_THREAD_NAME;
const escalationWebhook = ENV.ESCALATION_CHAT_WEBHOOK;
const escalationThread = ENV.ESCALATION_CHAT_THREAD_NAME;
const discordWebUrl = 'https://discord.com/channels';
const debug = ENV.DEBUG ? ENV.DEBUG : false;

const noReplyMap = new Map();

async function handleMessageCreateEvent(message){
console.log(message);
    const { author, id, channel_id, timestamp } = message;
    if (debug) {
        console.debug("Received message: " + id + " from user: " + author.username);
    }
    
    if (id == channel_id) {
        let {parent_id, guild_id} = await getChannelInfo(channel_id);
        if (debug) {
            console.debug("Channel: " + channel_id + " is a thread of parent channel: " 
            + parent_id + " in guild: " + guild_id);
        }
        // this check is required to filter the events from the channel of interest
       if (parent_id == ENV.CHANNEL_ID) {
            noReplyMap.set(id, {timestamp: timestamp, author: author.username, level: 0, id: id, 
            guild_id: guild_id});
        }
        
    } else {
        noReplyMap.delete(channel_id);
    }
}

function handleMessageDeleteEvent(message){
    const { author, id, channel_id, timestamp } = message;
    if (debug) {
        console.debug(JSON.stringify(message));
        console.debug("Received Thread delete event for channel ID: " + id);
    }
    noReplyMap.delete(id);
}

function getChannelInfo(channel_id) {
    const https = require("https");
    let result;
    const options = {
    hostname: 'discord.com',
    // port: 443,
    path: '/api/channels/'+ channel_id,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bot ' + ENV.GW_TOKEN
    }
    }

    return new Promise ((resolve, reject) => https
    .get('https://discord.com/api/channels/' + channel_id, options, res => {
        let body = "";
        res.on("data", (chunk) => {
            body += chunk;
        });
        res.on("end", () => {
            resolve(JSON.parse(body));
        });
    })
    .on("error", err => {
        console.log("Error: " + err.message);
        reject(err)
    }));

}

function sendAlerts(){
    if (debug) {
        console.debug("Sending periodic alerts.");
    }
    let now = new Date();

    for (const [key, msg] of noReplyMap.entries()) {
        const timestamp = new Date(msg.timestamp);
        let delay = now.getTime() - timestamp.getTime();

//        Not using the below flow as Email sending module is not used ATM

//        if ((delay >= l2*60*1000) && msg.level == 2) {
//            if (debug) {
//                console.debug("Sending escalation alert for message: " + msg.id);
//            }
//            msg.delay = delay;
//            sendChatAlert(msg, escalationWebhook, escalationThread);
//            // We no longer need to send alerts for this msg
//            noReplyMap.delete(key);
//        }
//        else if ((delay >= l1*60*1000) && msg.level == 1) {
//            if (debug) {
//                console.debug("Sending Email alert for message: " + msg.id);
//            }
//            msg.delay = delay;
//            email.sendMail(msg);
//            msg.level = 2;
//            noReplyMap.set(key,msg);
//        }
//        else if ((delay >= l0*60*1000) && msg.level == 0) {
//            msg.delay = delay;
//            if (debug) {
//                console.debug("Sending chat alert for message: " + msg.id);
//            }
//            sendChatAlert(msg, alertWebhook, alertThread);
//            msg.level = 1;
//            noReplyMap.set(key,msg);
//        }

        if ((delay >= l2*60*1000) && msg.level == 1) {
            if (debug) {
                console.debug("Sending escalation alert for message: " + msg.id);
            }
            msg.delay = delay;
            sendChatAlert(msg, escalationWebhook, escalationThread);
            // We no longer need to send alerts for this msg
            noReplyMap.delete(key);
        }
        else if ((delay >= l0*60*1000) && msg.level == 0) {
            msg.delay = delay;
            if (debug) {
                console.debug("Sending chat alert for message: " + msg.id);
            }
            sendChatAlert(msg, alertWebhook, alertThread);
            msg.level = 1;
            noReplyMap.set(key,msg);
        }
    }
}

const getChatMessage = (msg, threadName) => {
const data =
{
    "cards": [
        {
            "header": {
                "title": "HELP-ASGARDEO",
                "imageUrl": "https://icon-library.com/images/discord-icon-color/discord-icon-color-23.jpg",
                "imageAltText": "Avatar for Notification"
            },
            "sections": [
                {
                    "widgets": [

                        {
                            "keyValue": {
                                "topLabel": "Description",
                                "content": "Discord Query"
                            }
                        },
                        {
                            "keyValue": {
                                "topLabel": "Initiated By",
                                "content": msg.author
                            }
                        }
                    ]
                },
                {
                    "widgets": [
                        {
                            "buttons": [
                                {
                                    "textButton": {
                                        "text": " Open in Discord ",
                                        "onClick": {
                                            "openLink": {
                                                "url": discordWebUrl + '/' + msg.guild_id + '/' + ENV.CHANNEL_ID + '/threads/' + msg.id
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ],
    "thread": {
//        "name": "spaces/AAAAxS-6BjM/threads/g36pE-fHIIU"
          "name": threadName

    }

    };
return data;
}



const sendChatAlert = (msg, webhookURL, threadName) => {
console.log(msg);
    const data = JSON.stringify(getChatMessage(msg,threadName));
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
    handleMessageDeleteEvent,
    sendAlerts
};