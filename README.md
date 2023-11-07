# Teltonika Telematics Codec to Codec JSON and MQTT

This TypeScript project converts a Teltonika device's UDP connection, that transmits data using Codec 8/8E, into an MQTT connection that transmits data using Codec JSON.

This is used for integrating legacy devices within OpenRemote, the open-source IoT device management platform. In this way, we are able to support all versions of Teltonika devices, regardless of their Codec/Protocol support.

To use, change the variables found within index.ts. If setup properly, OpenRemote will transmit the messages to the OpenRemote MQTT Broker. 

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
