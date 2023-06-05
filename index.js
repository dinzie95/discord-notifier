const WebSocket = require("ws");
const fetch = import('node-fetch');
const ENV = require("./config.json");
const funcs = require("./functions.js");

const baseUrl = "wss://gateway.discord.gg";

let url = baseUrl, sessionId = "";
let taskInterval = 0;;
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

const resume = () => {
    const resumePayload = {
        op: 6,
        d: {
            token: ENV.GW_TOKEN,
            sessionId,
            seq
        }
        
    }
    ws.send(JSON.stringify(resumePayload));
};

const   initWebsocket = () => {
    if (ws && ws.readystate !== 3) {
        console.log("closing Ws connection");
        ws.close();
    }

    console.log("Connecting to Discord gateway...");
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
        if(wasReady){
            console.log("Gateway connection closed, trying to reconenct.");
        }

        setTimeout(() => {
            initWebsocket();
        }, 2500)
    });

    ws.on("message", function incoming (data) {
        let p = JSON.parse(data);
        const {t,op, d, s} = p;
        console.log('opcode: ' + op);
        switch (op) {
            case 10:
                const { heartbeat_interval } = d;
                interval = heartbeat_interval;
                wasReady = true;

                if (url === baseUrl) {
                    ws.send(JSON.stringify(payload))
                }
                heartbeat(interval);
                break;
            case 0:
                seq = s;
                break;
            case 7:
                console.log("Discord gateway connection require a resume.")
                resume();
                break;
            case 9:
                if (d) {
                    console.log("Discord gateway connection require a resume.")
                    resume();
                } else {
                    console.log("Discord gateway connection require a new identify.")
                    url = baseUrl;
                    ws.close();
                }
                break;
        }

        switch (t) {
            case "READY":
                console.log("Discord gateway connection is ready!");
                url = d.resume_gateway_url;
                sessionId = d.sesson_id;
                if (taskInterval == 0) {
                    task = setInterval(funcs.sendAlerts, ENV.ALERT_INTERVAL_MINS*60*1000);
                }
                break;
            case "RESUMED":
                console.log("Discord gateway conenction resumed!");
                break;
            case "MESSAGE_CREATE":
                funcs.handleMessageCreateEvent(d);      
                break;
        }
    })
}

console.log("Starting Discord integration.");
initWebsocket();