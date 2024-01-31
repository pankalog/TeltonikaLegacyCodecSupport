# Teltonika Telematics Codec to Codec JSON and MQTT

This TypeScript project converts a Teltonika device's UDP connection, that transmits data using Codec 8/8E, into an MQTT connection that transmits data using Codec JSON.

This is used for integrating legacy devices within OpenRemote, the open-source IoT device management platform. In this way, we are able to support all versions of Teltonika devices, regardless of their Codec/Protocol support.

To use, change the variables found within index.ts. If setup properly, OpenRemote will transmit the messages to the OpenRemote MQTT Broker. 

# Quickstart
Download the ``docker-compose.yml`` file:
```bash
wget https://github.com/pankalog/TeltonikaLegacyCodecSupport/blob/main/docker-compose.yml
```

And run the server:
```bash
docker-compose -p teltonika-server up -d
```
## Customization, environment variables
To set your own environment variables, download the example `.env` file:
```bash
wget https://github.com/pankalog/TeltonikaLegacyCodecSupport/blob/main/.env
```
And edit the file to match your specific server settings.

# Description

To allow support of all devices within OpenRemote, a new server has been developed. When the server receives properly-formatted and sequenced data, according to **Teltonika's Codec 8 and 8E** documentation, the server will then connect with a unique MQTT client ID to the specified MQTT broker, sending the contents of the UDP Codec 8 payload formatted in the same way as a [Codec JSON](https://wiki.teltonika-gps.com/view/Codec_JSON), MQTT payload message.

In this way, this server serves as an adapter between older devices with no support for MQTT and/or Codec JSON to the more recent transmission protocol and codec, assuring maximum compatibility of OpenRemote with the entirety of the product-line of Teltonika Telematics.

# Format

The server allows for Teltonika devices to connect using Codec 8 and 8E protocols. Any data that is sent to the server is sent via MQTT to any server and topic the user selects in Teltonika's [Codec JSON](https://wiki.teltonika-gps.com/view/Codec_JSON) format. Different devices use different UUIDs as the client ID. 

# How it works

The index file is the main developer interface for the server. The UDPServerManager is an EventEmitter, and the events emitted are where the MQTT messages are constructed and sent to the MQTT broker. 

Here is a description of what each `UdpServerManager` event is:

* `message`: `imei, uuid, content` :  When a `message` event is emitted, the device with `imei` and `uuid` has sent a data packet, which is of type `ProtocolParser`. Using that class, you can check the metadata of the packet to ensure it contains data the user requires. 

* `connected`: `imei, uuid`: A device with the `imei` has connected, and it has been assigned with `uuid`. Used for creating a connection to the MQTT broker using the `uuid` as a client ID

* `disconnected`: `imei`: The device with `imei` has disconnected. 

# Libraries

* [`complete-teltonika-parser`](https://github.com/TimeLord2010/TeltonikaParser): used to parse Teltonika payloads and conduct all necessary checks and data parsing from the devices.

* [`mqtt`](https://github.com/mqttjs/MQTT.js): MQTT.js used for interfacing to the MQTT broker

* [`moment`](https://github.com/moment/moment): Used for timestamp manipulation, for correct payload formatting 

* [`net`](https://github.com/sleeplessinc/net): Used for creating the UDPServer

* `crypto`: Used for generating UUIDs.

* `events`: Used for extending the EventEmitter

## Features

1. Compatibility is based solely on npm package `complete-teltonika-parser`, the base of this package
2. Allows for any type of MQTT(s) connection to be established
3. Allows for UDP connection by the device to the application
4. Allows multiple devices to be connected by managing WS states
5. Raises events in UdpServerManager; for now, these events are fired when a device is connected, sends a message, and disconnects.

## To-Do

1. Safe device connect/disconnect
2. Bidirectional communication to/from the device, including SMS messages
3. MQTT state watch
4. Implement more events
5. Check multi-device support
