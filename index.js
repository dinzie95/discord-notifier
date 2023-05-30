// import WebSocket from "ws";
const WebSocket = require("ws");
const ENV = require("./config.json");
// import ENV from "./config.json" assert {type : 'json'};

const baseUrl = "wss://gateway.discord.gg";
let url = baseUrl, sessionId = "";

let ws;
let interval = 0, seq = -1;

let payload = {
    op : 2,
    d : {
        token : ENV.GW_TOKEN,
          intents : 33280,
        //  intents : 512,
         properties : {
            os : "mac",
            browser : "chrome",
            device : "chrome"
         }
    }

}

const heartbeat = (ms) => {
    return setInterval(() => {
        ws.send(JSON.stringify({op : 1, d : null}))
    }, ms);
};

const initWebsocket = () => {
    if (ws && ws.readystate !== 3) {
        console.log("closing Ws connection");
        ws.close();
    }

    let wasReady = false;
    ws = new WebSocket(url + "/?v=10&encoding=json");

    ws.on("open", function open(){
        if (url !== baseUrl) {
            const resumePayload = {
                op: 6,
                d: {
                    token: ENV.GW_TOKEN,
                    sessionId,
                    seq
                }
                
            }
            ws.send(JSON.stringify(resumePayload));
        }
    });

    ws.on("error", function error(e) {
        console.log(e);
    });

    ws.on("close", function close() {
        if(wasReady) console.log("Gateway connection closed, trying to reconenct")

        setTimeout(() => {
            initWebsocket();
        }, 2500)
    });

    ws.on("message", function incoming (data) {
        let p = JSON.parse(data);
        const {t,op, d, s} = p;

        switch (op) {
            case 10:
                const { heartbeat_interval } = d;
                interval = heartbeat_interval;
                wasReady = true;

                if (url === baseUrl) {
                    ws.send(JSON.stringify(payload))
                }
                heartbeat(interval);
                // } else {
                //     heartbeat(interval);
                // }
                break;
            case 0:
                seq = s;
                break;
        }
        console.log("message Type:" + t);
        switch (t) {
            case "READY":
                console.log("Discord gateway connection is ready!");
                url = d.resume_gateway_url;
                sessionId = d.sesson_id;
                break;
            case "RESUMED":
                console.log("Discord gateway conenction resumed!");
                break;
            case "MESSAGE_CREATE":
                console.log(JSON.stringify(d));
                let isNewMessage = (d.referenced_message == null && !d.hasOwnProperty("position"));
                if (isNewMessage) {
                    let author = d.author.username;
                    console.log(`New question by : ${author}`);
                }
                // console.log(">>>>>>>>>>>> new message, send notfication");
                // let author = d.author.username;
                // let content = d.content;
                // let msg_channel_id = d.channel_id;
                
                break;
        }
    })
}

initWebsocket();