import { Socket, createServer } from 'net';
import { listenForDevice } from './listenForDevice';
import { randomUUID } from 'crypto';
import { AVL_Data, Data, GPRS, ProtocolParser } from 'complete-teltonika-parser';
import EventEmitter = require('events');


var emitter = new EventEmitter();
export interface ISocketOptions {
	"port": Number;
};

export class UdpServerManager extends EventEmitter {

	public conf: ISocketOptions;
	
	public sockets: { [id: string]: { 'imei': string; 'data': ProtocolParser[]; }; };

	constructor(configuration: ISocketOptions) {
		super();
		this.conf = configuration;
		this.sockets = {};
		this.startServer(this.conf.port);
	}

	sendMqttMessage(imei: string, uuid:string, content: AVL_Data) {
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
				if (deviceData.Content == undefined && deviceData.Imei != undefined) {
					
					this.sockets[uuid] = { 'imei': deviceData.Imei, data: [] };
					var imei_answer = Buffer.alloc(1);
					//change this to 0 (0x00) if this IMEI should be disallowed.
					imei_answer.writeUint8(1);
					sock.write(imei_answer);

					if(deviceData.Imei != undefined){
						this.deviceConnected(deviceData.Imei, uuid);
					}

				} 
				if (deviceData.Content != undefined && deviceData.Imei == undefined) {
					if (deviceData.Imei != undefined) {
						throw new Error("this shouldnt happen");
					} else {
						deviceData.Imei = this.sockets[uuid].imei;
					}
					// Implement codec-checking here

					if (deviceData.Content.CodecType == "data sending") {
						deviceData.Content.Content = deviceData.Content.Content as Data
					} else {
						deviceData.Content.Content = deviceData.Content.Content as GPRS
					}

					if (this.sockets[uuid].imei != undefined && deviceData.Content != undefined) {

						if ('AVL_Datas' in deviceData.Content.Content) {
							// set the type of element to AVL_Data

							deviceData.Content.Content.AVL_Datas.sort((a: AVL_Data, b: AVL_Data) => {return a.Timestamp.getTime() - b.Timestamp.getTime()}).forEach((element: AVL_Data) => {
								this.sendMqttMessage(this.sockets[uuid].imei, uuid, element);
							});
						}
						else{
							// This means that this data is a response to a GPRS command (SMS). This is where you would implement 
							// the logic for handling the response to the command.
						// this.sendMqttMessage(this.sockets[uuid].imei, uuid, deviceData.Content.Content);
						}
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
		server.listen(Number(port), '0.0.0.0', () => {
			console.log('Server is listening on all interfaces');
		});
		console.log('Listening on port:', port);
	}
	deviceDisconnected(imei: string) {
		this.emit("disconnected", imei);
	}
}

export {emitter};
