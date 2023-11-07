import { Socket, createServer } from 'net';
import { listenForDevice } from './listenForDevice';
import { randomUUID } from 'crypto';
import { ProtocolParser } from 'complete-teltonika-parser';
import EventEmitter = require('events');

var emitter = new EventEmitter();


export class UdpServerManager extends EventEmitter {
	conf: {
		"port": Number;
		"api": String;
	};
	sockets: { [id: string]: { 'imei': string; 'data': ProtocolParser[]; }; };

	constructor(configuration) {
		super();
		this.conf = configuration;
		this.sockets = {};
		this.startServer(this.conf.port);
	}

	sendMqttMessage(imei: string, content: ProtocolParser) {
		// console.log("decode, emit MQTT message event so that it can be handled");
		this.emit("message", imei, content);
	}
	deviceConnected(Imei: string) {
		this.emit("connected", Imei);
	}

	startServer(port: Number) {
		const server = createServer();

		server.on('connection', (sock: Socket) => {
			
			var uuid = randomUUID();
			console.log(`New Teltonika device connected with IMEI ${uuid}`);
			sock.on("data", (response: Buffer) => {
				let deviceData = listenForDevice(response);
				

				if (deviceData.Content == undefined) {
					// console.log(deviceData);
					this.sockets[uuid] = { 'imei': deviceData.Imei, data: [] };
					var imei_answer = Buffer.alloc(1);
					//change this to 0 (0x00) if this IMEI should be disallowed.
					imei_answer.writeUint8(1);
					sock.write(imei_answer);

					if(deviceData.Imei != undefined){
						this.deviceConnected(deviceData.Imei);
					}

				} else {
					if (deviceData.Imei != undefined) {
						throw new Error("this shouldnt happen");
					} else {
						deviceData.Imei = this.sockets[uuid].imei;
					}

					if (this.sockets[uuid].imei != undefined && deviceData.Content != undefined) {
						this.sendMqttMessage(this.sockets[uuid].imei, deviceData.Content);
					}
					this.sockets[uuid].data.push(deviceData.Content);

					const dataReceivedPacket = Buffer.alloc(4);
					dataReceivedPacket.writeUInt32BE(deviceData.Content.Quantity1);
					sock.write(dataReceivedPacket);
				}

				// console.log(this.sockets);
			});

			sock.on('close', (err: Boolean) => {
				if(this.sockets[uuid] == undefined) return; 
				this.deviceDisconnected(this.sockets[uuid].imei)
				delete this.sockets[uuid];
			});
			sock.on("error", (err) => {
				console.log("Caught flash policy server socket error: ")
				console.log(err.name)
				delete this.sockets[uuid];
				// for some reason it goes back to close, make sure to handle this
			});
		});
		server.listen(5002);
		console.log('Listening on port:', port);
	}
	deviceDisconnected(imei: string) {
		this.emit("disconnected", imei);
	}
	
}

export {emitter};
