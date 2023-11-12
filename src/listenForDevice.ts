import { ProtocolParser, parseIMEI, Data, GPRS } from 'complete-teltonika-parser';

export function listenForDevice(response: Buffer) : {'Content': ProtocolParser | undefined, 'Imei': string | undefined} {
    var imei = undefined;
    const packet = response.toString("hex");
    var processedPacket = processPacket(packet)
    return {'Content': processedPacket.dataPacket, 'Imei': processedPacket.imei};
}

function processPacket (packet: string): { imei: string; dataPacket?: undefined; } | { dataPacket: ProtocolParser; imei?: undefined; }  {
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