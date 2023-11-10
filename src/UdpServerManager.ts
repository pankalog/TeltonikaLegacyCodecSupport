import { Socket, createServer } from 'net';
import { listenForDevice } from './listenForDevice';
import { randomUUID } from 'crypto';
import { Data, GPRS, ProtocolParser } from 'complete-teltonika-parser';
import EventEmitter = require('events');

var emitter = new EventEmitter();


export class UdpServerManager extends EventEmitter {
	conf: {
		"port": Number;
		"api": String;
	};
	public sockets: { [id: string]: { 'imei': string; 'data': ProtocolParser[]; }; };

	constructor(configuration) {
		super();
		this.conf = configuration;
		this.sockets = {};
		this.startServer(this.conf.port);
	}

	sendMqttMessage(imei: string, uuid:string, content: ProtocolParser) {
		this.emit("message", imei, uuid, content);
	}
	deviceConnected(imei: string, uuid: string) {
		this.emit("connected", imei, uuid);
	}

	startServer(port: Number) {
		const server = createServer();

		server.on('connection', (sock: Socket) => {
			
			var uuid = randomUUID();
			console.log(`New Teltonika device connected with UUID ${uuid}`);
			sock.on("data", (data: Buffer) => {
				let deviceData = listenForDevice(data);
				if (deviceData.Content == undefined) {
					
					this.sockets[uuid] = { 'imei': deviceData.Imei, data: [] };
					var imei_answer = Buffer.alloc(1);
					//change this to 0 (0x00) if this IMEI should be disallowed.
					imei_answer.writeUint8(1);
					sock.write(imei_answer);

					if(deviceData.Imei != undefined){
						this.deviceConnected(deviceData.Imei, uuid);
					}

				} else {
					if (deviceData.Imei != undefined) {
						throw new Error("this shouldnt happen");
					} else {
						deviceData.Imei = this.sockets[uuid].imei;
					}
					if (deviceData.Content.CodecType == "data sending") {
						deviceData.Content.Content = deviceData.Content.Content as Data
					} else {
						deviceData.Content.Content = deviceData.Content.Content as GPRS
					}

					if (this.sockets[uuid].imei != undefined && deviceData.Content != undefined) {
						this.sendMqttMessage(this.sockets[uuid].imei, uuid, deviceData.Content);
					}
					//TODO: Remove this when done with developing 
					// this.sockets[uuid].data.push(deviceData.Content);

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
