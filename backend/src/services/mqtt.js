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

function setupMQTTPublisher() {
  const useExternalBroker = process.env.USE_EXTERNAL_MQTT === 'true';
  const brokerUrl = useExternalBroker
    ? (process.env.MQTT_BROKER_URL || 'mqtt://emqx:1883')
    : `mqtt://localhost:${parseInt(process.env.MQTT_TCP_PORT || '1883')}`;

  client = mqtt.connect(brokerUrl, {
    clientId: `worker_${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  });

  client.on('connect', () => console.log(`[MQTT] Publicador conectado: ${brokerUrl}`));
  client.on('error', (err) => console.error('[MQTT] Error del publicador:', err.message));
  client.on('offline', () => console.warn('[MQTT] Publicador desconectado'));
  client.on('reconnect', () => console.log('[MQTT] Publicador reconectando...'));

  return client;
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
      try {
        const payload = JSON.parse(message.toString());
        handleHeartbeat(match[1], payload);
      } catch (err) {
        // Si no es JSON, usar formato legacy (sin datos adicionales)
        handleHeartbeat(match[1]);
      }
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
      try {
        const payload = JSON.parse(message.toString());
        handleHeartbeat(match[1], payload);
      } catch (err) {
        // Si no es JSON, usar formato legacy (sin datos adicionales)
        handleHeartbeat(match[1]);
      }
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

async function handleHeartbeat(deviceId, payload = {}) {
  try {
    const { Screen } = require('../models');
    const updateData = { 
      status: 'online', 
      last_heartbeat: new Date() 
    };
    
    // DEBUG: Log del heartbeat recibido
    console.log(`[MQTT] ❤️  Heartbeat de ${deviceId}:`, {
      screen_width: payload.screen_width || 'N/A',
      screen_height: payload.screen_height || 'N/A',
      apk_version: payload.apk_version || 'N/A'
    });
    
    if (payload.apk_version && typeof payload.apk_version === 'number') {
      updateData.current_apk_version = payload.apk_version;
    }
    
    if (payload.screen_width && payload.screen_height) {
      const reportedWidth = parseInt(payload.screen_width, 10);
      const reportedHeight = parseInt(payload.screen_height, 10);
      
      if (reportedWidth >= 1280 && reportedWidth <= 7680 &&
          reportedHeight >= 720 && reportedHeight <= 4320) {
        
        const screen = await Screen.findOne({ where: { device_id: deviceId } });
        
        if (screen) {
          const currentWidth = screen.width || 1920;
          const currentHeight = screen.height || 1080;
          const widthDiff = Math.abs(reportedWidth - currentWidth) / currentWidth;
          const heightDiff = Math.abs(reportedHeight - currentHeight) / currentHeight;
          
          if (widthDiff > 0.05 || heightDiff > 0.05) {
            updateData.width = reportedWidth;
            updateData.height = reportedHeight;
            console.log(`[MQTT] Resolución actualizada para ${deviceId}: ${reportedWidth}x${reportedHeight}`);
          }
        }
      }
    }
    
    await Screen.update(updateData, { where: { device_id: deviceId } });
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

function getInternalClient() {
  return client;
}

module.exports = { setupMQTT, setupMQTTPublisher, publishPlaylist, publishCommand, getInternalClient };
