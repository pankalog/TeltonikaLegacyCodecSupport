import { GPRS, ProtocolParser, Data, AVL_Data } from 'complete-teltonika-parser';
import { UdpServerManager } from './UdpServerManager';
import {readFileSync} from 'fs';
import {IClientOptions, IConnackPacket, MqttClient, connect} from 'mqtt';
import moment = require('moment');



const options = {
  protocol: 'mqtt',
  host: 'localhost',
  port: 1883,
  clientId: "xd"
//   ca: [readFileSync('/path/to/ca.crt')],
//   cert: readFileSync('/path/to/client.crt'),
//   key: readFileSync('/path/to/client.key'),
};

const client: MqttClient = connect(options as IClientOptions);

interface mqttOptions  {
	"realm": string,
	"teltonika_keyword": string,
	"dataTopic": string,
	"commandTopic": string
}

var opts = {
	realm: "master",
	teltonika_keyword: "teltonika",
	dataTopic: "data",
	commandTopic: "commands"
} as mqttOptions

var conf = {
	"port": 5002,
	"api":"",
}

const dataTopic = (opts: mqttOptions, imei) =>{
	return (`${opts.realm}/${options.clientId}/${opts.teltonika_keyword}/${imei}/${opts.dataTopic}`)
}
const commandTopic = (opts: mqttOptions, imei) =>{
	return (`${opts.realm}/${options.clientId}/${opts.teltonika_keyword}/${imei}/${opts.commandTopic}`)
}


const server = new UdpServerManager(conf);
server.on("message", (imei: string, content: ProtocolParser) => {
	console.log(imei);
	console.log(content);
	//if it is data
	if((content.Content as Data).AVL_Datas !== undefined){
		let avlData : AVL_Data[] = (content.Content as Data).AVL_Datas;

		avlData.forEach(message => {
			var mqttMsg = processAvlData(message);
			client.publish(dataTopic(opts, imei), JSON.stringify(mqttMsg));
		});
	}
})
server.on("connected", (imei: string) => {
	console.log(`Device with IMEI ${imei} connected`)
});

server.on("disconnected", (imei: string) => {
	console.log(`Device with IMEI ${imei} connected`)
});


function processAvlData(avlData: AVL_Data){

	var params: {[avlid: number | string]: number | string} = avlData.IOelement.Elements;

	params["latlng"] = `${avlData.GPSelement.Latitude},${avlData.GPSelement.Longitude}`;
	params["ts"] = moment(avlData.Timestamp).valueOf();
	params["alt"] =`${avlData.GPSelement.Altitude}`
	params["ang"] =`${avlData.GPSelement.Angle}`
	params["sat"] =`${avlData.GPSelement.Satellites}`
	params["sp"] =`${avlData.GPSelement.Speed}`;


	// for (let key in avlData.IOelement.Elements) {
	// 	if (avlData.IOelement.Elements.hasOwnProperty(key)) {
	// 		let value = avlData.IOelement.Elements[key];
	// 		// Using type assertion if needed
	// 		if (typeof value === 'number') {
	// 			para
	// 		} else {
	// 			// Here, TypeScript knows value is a string
	// 		}
	// 		console.log(`Key: ${key}, Value: ${value}`);
	// 	}
	// }
	var x = params.toString();

	return {"state":{"reported":params}};
}
