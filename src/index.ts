import {
  GPRS,
  ProtocolParser,
  Data,
  AVL_Data,
} from "complete-teltonika-parser";
import { UdpServerManager } from "./UdpServerManager";
import { readFileSync } from "fs";
import { IClientOptions, IConnackPacket, MqttClient, connect } from "mqtt";
import moment = require("moment");
// import dotenv
import * as dotenv from 'dotenv';
let out = dotenv.config({ path: process.cwd()+'/.env' });

interface orOptions {
  realm: string;
  teltonika_keyword: string;
  dataTopic: string;
  commandTopic: string;
}

const dataTopic = (opts: orOptions, uuid: string, imei: string) => {
  return `${opts.realm}/${uuid}/${opts.teltonika_keyword}/${imei}/${opts.dataTopic}`;
};
const commandTopic = (opts: orOptions, uuid: string, imei: string) => {
  return `${opts.realm}/${uuid}/${opts.teltonika_keyword}/${imei}/${opts.commandTopic}`;
};

var clients: { [imei: string]: { client: MqttClient } } = {};

var opts = {
  orOpts: {
	realm: process.env.orOpts__realm!,
	teltonika_keyword: process.env.orOpts__teltonika_keyword!,
	dataTopic: process.env.orOpts__dataTopic!,
	commandTopic: process.env.orOpts__commandTopic!,
  } as orOptions,
  mqttOptions: {
	host: process.env.mqttOptions__host!,
	port: parseInt(process.env.mqttOptions__port!),
    protocol: process.env.mqttOptions__protocol!
  },
  udp_options: {
	port: parseInt(process.env.udpServerOptions__port!)
  }
};

if (typeof opts.udp_options.port !== 'number') throw new Error("UDP port not defined, check env file");

const server = new UdpServerManager(opts.udp_options);
server.on("message", (imei: string, uuid: string, content: AVL_Data) => {
  console.log(`${imei}\t${content.Timestamp.toDateString()}\t${content.IOelement.ElementCount}`);
  var mqttMsg = processAvlData(content);
  if(!clients[imei].client.connected) {
    console.log(`Error connecting to MQTT broker. Message: ${process.env.mqttOptions__host!}:${process.env.mqttOptions__port!}\t\t${JSON.stringify(mqttMsg)}`)
    return
  }
  clients[imei].client.publish(
    dataTopic(opts.orOpts, uuid, imei),
    JSON.stringify(mqttMsg)
  );
});
server.on("connected", (imei: string, uuid: string) => {
  console.log(`CONNECT: Device with IMEI ${imei} connected`);
  const clientOptions: IClientOptions = opts.mqttOptions as IClientOptions;
  clientOptions["clientId"] = uuid;
  const client: MqttClient = connect(clientOptions as IClientOptions);
  client.subscribe(commandTopic(opts.orOpts, uuid, imei));
  client.subscribe(dataTopic(opts.orOpts, uuid, imei));
  clients[imei] = { client: client };
});

server.on("disconnected", (imei: string) => {
  console.log(`DISCONNECT: Device with IMEI ${imei} disconnected`);
  clients[imei].client.end();
  delete clients[imei];
});

function processAvlData(avlData: AVL_Data) {
  var params: { [avlid: number | string]: number | string } =
    avlData.IOelement.Elements;

  var parsedParams: { [avlid: number | string]: number | string } = {};

  parsedParams["latlng"] = `${avlData.GPSelement.Latitude},${avlData.GPSelement.Longitude}`;
  parsedParams["ts"] = moment(avlData.Timestamp).valueOf();
  parsedParams["alt"] = `${avlData.GPSelement.Altitude}`;
  parsedParams["ang"] = `${avlData.GPSelement.Angle}`;
  parsedParams["sat"] = `${avlData.GPSelement.Satellites}`;
  parsedParams["sp"] = `${avlData.GPSelement.Speed}`;
  parsedParams["evt"] = `${avlData.IOelement.EventID != undefined ? avlData.IOelement.EventID : 0}`;

  //ISSUE: The parser parses the axis data incorrectly, resulting in an integer overflow
  //TODO: Investigate potential fixes
  for (let key in params) {
    parsedParams[key] = params[key];
  }

  return { state: { reported: parsedParams } };
}

function extractValue(x: string) {
  var y: number | string = parseInt(x, 16);
  if (y > Number.MAX_SAFE_INTEGER) {
    y = BigInt(`0x${x}`).toString();
  }
  return y;
}
