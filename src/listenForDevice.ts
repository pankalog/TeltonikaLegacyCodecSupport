import { Socket } from 'net';
import { ProtocolParser, parseIMEI, Data, GPRS } from 'complete-teltonika-parser';

export function listenForDevice(response: Buffer) : {'Content': ProtocolParser | undefined, 'Imei': string} {
  var imei = undefined;
  const buf = Buffer.from(response);
  // Extract the source and destination IP addresses from the buffer
  
  const packet = response.toString("hex");
  
  if (packet.length === 34) {
    imei = parseIMEI(packet);

    return {'Content': undefined, 'Imei': imei}; 
  }
  else {
    let parsed = new ProtocolParser(packet);
    const dataLength = parsed.Data_Length;
    // console.log("CodecType:", parsed.CodecType);
    
    if (parsed.CodecType == "data sending") {
      // console.log(parsed);
      
      return {'Content': parsed, 'Imei': imei};
      
    }
  }
}




