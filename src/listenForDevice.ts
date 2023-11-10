import { ProtocolParser, parseIMEI, Data, GPRS } from 'complete-teltonika-parser';

export function listenForDevice(response: Buffer) : {'Content': ProtocolParser | undefined, 'Imei': string} {
    var imei = undefined;
    const packet = response.toString("hex");
    var processedPacket = processPacket(packet)
    return {'Content': processedPacket.dataPacket, 'Imei': processedPacket.imei};
}

function processPacket (packet) {
    if (packet.length == 34) {
        return {
            imei: parseIMEI(packet)
        }
    } else {
        return { 
            dataPacket: new ProtocolParser(packet)
        }
    }
}