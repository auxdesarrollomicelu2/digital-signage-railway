const mqtt = require('mqtt');

let client = null;
let aedesInstance = null;

function setupMQTT() {
  const useExternalBroker = process.env.USE_EXTERNAL_MQTT === 'true';
  
  if (useExternalBroker) {
    console.log('[MQTT] Modo: BROKER EXTERNO (EMQX)');
    return setupExternalBroker();
  } else {
    console.log('[MQTT] Modo: BROKER EMBEBIDO (Aedes - Legacy)');
    return setupEmbeddedBroker();
  }
}

function setupExternalBroker() {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://emqx:1883';
  
  client = mqtt.connect(brokerUrl, {
    clientId: `backend_${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  });

  client.on('connect', () => {
    console.log(`[MQTT] Conectado a broker externo: ${brokerUrl}`);
    client.subscribe('signage/+/heartbeat', { qos: 1 }, (err) => {
      if (err) {
        console.error('[MQTT] Error en suscripción:', err);
      } else {
        console.log('[MQTT] Suscrito a signage/+/heartbeat');
      }
    });
  });

  client.on('message', (topic, message) => {
    const match = topic.match(/^signage\/(.+)\/heartbeat$/);
    if (match) {
      handleHeartbeat(match[1]);
    }
  });

  client.on('error', (err) => {
    console.error('[MQTT] Error de conexión:', err.message);
  });

  client.on('offline', () => {
    console.warn('[MQTT] Desconectado del broker');
  });

  client.on('reconnect', () => {
    console.log('[MQTT] Reconectando al broker...');
  });

  return client;
}

function setupEmbeddedBroker() {
  const Aedes = require('aedes');
  const { createServer: createTcpServer } = require('net');
  const http = require('http');
  const ws = require('websocket-stream');

  aedesInstance = Aedes();

  const tcpPort = parseInt(process.env.MQTT_TCP_PORT || '1883');
  const tcpServer = createTcpServer(aedesInstance.handle);
  tcpServer.listen(tcpPort, () => {
    console.log(`[MQTT] TCP broker en puerto ${tcpPort}`);
  });

  const wsPort = parseInt(process.env.MQTT_WS_PORT || '8083');
  const wsHttpServer = http.createServer();
  ws.createServer({ server: wsHttpServer }, aedesInstance.handle);
  wsHttpServer.listen(wsPort, () => {
    console.log(`[MQTT] WebSocket en puerto ${wsPort}`);
  });

  client = mqtt.connect(`mqtt://localhost:${tcpPort}`);

  client.on('connect', () => {
    console.log('[MQTT] Cliente interno conectado');
    client.subscribe('signage/+/heartbeat');
  });

  client.on('message', (topic, message) => {
    const match = topic.match(/^signage\/(.+)\/heartbeat$/);
    if (match) {
      handleHeartbeat(match[1]);
    }
  });

  aedesInstance.on('client', (c) => {
    console.log(`[MQTT] Cliente conectado: ${c.id}`);
  });

  aedesInstance.on('clientDisconnect', (c) => {
    console.log(`[MQTT] Cliente desconectado: ${c.id}`);
  });

  return aedesInstance;
}

async function handleHeartbeat(deviceId) {
  try {
    const { Screen } = require('../models');
    await Screen.update(
      { status: 'online', last_heartbeat: new Date() },
      { where: { device_id: deviceId } }
    );
  } catch (err) {
    console.error('[MQTT] Error heartbeat:', err.message);
  }
}

function publishPlaylist(deviceId, playlist) {
  const n = playlist && Array.isArray(playlist.items) ? playlist.items.length : 0;
  if (client && client.connected) {
    client.publish(
      `signage/${deviceId}/playlist`,
      JSON.stringify(playlist),
      { qos: 1, retain: true }
    );
    console.log(`[MQTT] Playlist publicado para ${deviceId} (${n} items)`);
    if (n === 0) {
      console.warn('[MQTT] Playlist vacío: el player seguirá en "Esperando contenido"');
    }
  } else {
    console.warn('[MQTT] No se pudo publicar playlist: cliente interno no conectado');
  }
}

function publishCommand(deviceId, command) {
  if (client && client.connected) {
    client.publish(
      `signage/${deviceId}/command`,
      JSON.stringify(command),
      { qos: 1 }
    );
    console.log(`[MQTT] Comando enviado a ${deviceId}:`, command);
  }
}

module.exports = { setupMQTT, publishPlaylist, publishCommand };
