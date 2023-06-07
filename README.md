# discord-notifier
This will listen to Discord WS Gateway events and notify on new message events from a Discord Forum channel. This does not support the general text channel type.

## Configurations
A config.json and token.json file with following elements should be added to the working directory.
```json
{
    "GW_TOKEN":"<DIscord BOT token>",
    "CHANNEL_ID":"<Discord chanel ID>",
    "ALERT1_MINS": 360,
    "ALERT2_MINS": 960,
    "ALERT3_MINS": 3,
    "ALERT_INTERVAL_MINS": 1, 
    "ALERT_CHAT_WEBHOOK" : "<Alert chat webhook URL",
    "ESCALATION_CHAT_WEBHOOK" : "<Escalation chat webhook url>",
    "MAIL_RECEIVER":"<Escalation mail recever's mail address>"
}
```
### Discord configuration
1. Get the desired Discord Forum's channel id and specify the CHANNEL_ID config.
2. Create a Discord chat bot and add to the server you wish to receive messages.
