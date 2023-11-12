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
import env from "./../env.json";

let opts = env.fleet;

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

const server = new UdpServerManager(opts.udpServerOptions);
server.on("message", (imei: string, uuid: string, content: ProtocolParser) => {
  // console.log(imei);
  console.log(content);
  //if it is data
  if ((content.Content as Data).AVL_Datas !== undefined) {
    let avlData: AVL_Data[] = (content.Content as Data).AVL_Datas;

    avlData.forEach((message) => {
      var mqttMsg = processAvlData(message);
      clients[imei].client.publish(
        dataTopic(opts.orOpts, uuid, imei),
        JSON.stringify(mqttMsg)
      );
    });
  }
});
server.on("connected", (imei: string, uuid: string) => {
  console.log(`Device with IMEI ${imei} connected`);
  const clientOptions: IClientOptions = opts.mqttOptions as IClientOptions;
  clientOptions["clientId"] = uuid;
  const client: MqttClient = connect(clientOptions as IClientOptions);
  clients[imei] = { client: client };
});

server.on("disconnected", (imei: string) => {
  console.log(`Device with IMEI ${imei} connected`);
  delete clients[imei];
});

function processAvlData(avlData: AVL_Data) {
  var params: { [avlid: number | string]: number | string } =
    avlData.IOelement.Elements;

  var parsedParams: { [avlid: number | string]: number | string } = {};

  parsedParams[
    "latlng"
  ] = `${avlData.GPSelement.Latitude},${avlData.GPSelement.Longitude}`;
  parsedParams["ts"] = moment(avlData.Timestamp).valueOf();
  parsedParams["alt"] = `${avlData.GPSelement.Altitude}`;
  parsedParams["ang"] = `${avlData.GPSelement.Angle}`;
  parsedParams["sat"] = `${avlData.GPSelement.Satellites}`;
  parsedParams["sp"] = `${avlData.GPSelement.Speed}`;

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
