# Despliegue EMQX en Railway - Guía Completa

## Arquitectura Final

```
Railway Project: digital-signage
│
├─ Service 1: Backend (Node.js)
│  - Express API
│  - Conecta a EMQX interno
│  - PostgreSQL Railway
│
├─ Service 2: Frontend (React)
│  - Nginx static
│
└─ Service 3: EMQX Broker ⭐ NUEVO
   - Broker MQTT
   - Dashboard web
   - Puerto 1883 (interno Railway)
   - Puerto 18083 (Dashboard público)
```

---

## Paso 1: Crear Servicio EMQX en Railway

### Opción A: Desde Railway Dashboard

1. Ir a tu proyecto en Railway
2. Click **"New Service"**
3. Seleccionar **"Docker Image"**
4. Ingresar imagen: `emqx/emqx:5.8.3`
5. Nombre del servicio: `digital-signage-emqx`

### Opción B: Usando Dockerfile (Recomendado para configuración custom)

Crear archivo `emqx/Dockerfile`:

```dockerfile
FROM emqx/emqx:5.8.3

# Configuración básica
ENV EMQX_NODE_NAME=emqx@127.0.0.1
ENV EMQX_CLUSTER__DISCOVERY=static
ENV EMQX_LISTENER__TCP__DEFAULT=0.0.0.0:1883
ENV EMQX_LISTENER__WS__DEFAULT=0.0.0.0:8083
ENV EMQX_DASHBOARD__DEFAULT_USERNAME=admin
ENV EMQX_DASHBOARD__DEFAULT_PASSWORD=digital-signage-2024

# Dashboard en puerto 18083
ENV EMQX_DASHBOARD__LISTENERS__HTTP__BIND=18083

# Logs
ENV EMQX_LOG__CONSOLE__LEVEL=info

EXPOSE 1883 8083 18083

CMD ["/usr/bin/docker-entrypoint.sh"]
```

Luego en Railway:
1. New Service → GitHub Repo
2. Root Directory: `/emqx`
3. Railway detectará el Dockerfile automáticamente

---

## Paso 2: Configurar Variables de Entorno EMQX

En Railway Dashboard → Service EMQX → Variables:

```env
# Nodo EMQX
EMQX_NODE_NAME=emqx@emqx-service
EMQX_NODE_COOKIE=emqx-secret-cookie-change-me

# Listeners
EMQX_LISTENER__TCP__DEFAULT=0.0.0.0:1883
EMQX_LISTENER__WS__DEFAULT=0.0.0.0:8083

# Dashboard
EMQX_DASHBOARD__DEFAULT_USERNAME=admin
EMQX_DASHBOARD__DEFAULT_PASSWORD=TU_PASSWORD_SEGURO_AQUI

# Logging
EMQX_LOG__CONSOLE__LEVEL=info
EMQX_LOG__FILE__ENABLE=false

# Auth (opcional - para seguridad adicional)
EMQX_AUTH__USER__1__USERNAME=digital-signage
EMQX_AUTH__USER__1__PASSWORD=mqtt-password-seguro
```

---

## Paso 3: Exponer Puertos en Railway

Railway necesita saber qué puertos exponer:

1. En Service EMQX → Settings → Networking
2. Agregar puertos:
   - **1883** (MQTT TCP) - Interno Railway
   - **8083** (WebSocket) - Interno Railway  
   - **18083** (Dashboard HTTP) - Público

**Nota importante**: Railway genera URLs públicas para servicios web. El puerto 18083 será accesible vía:
```
https://digital-signage-emqx.up.railway.app
```

El puerto 1883 solo será accesible internamente entre servicios Railway usando:
```
mqtt://digital-signage-emqx.railway.internal:1883
```

---

## Paso 4: Configurar Backend para EMQX

Actualizar `backend/.env` (o variables en Railway):

```env
# MQTT Configuration
USE_EXTERNAL_MQTT=true

# URL interna de Railway (servicio a servicio)
MQTT_BROKER_URL=mqtt://digital-signage-emqx.railway.internal:1883

# Si configuraste autenticación
MQTT_USERNAME=digital-signage
MQTT_PASSWORD=mqtt-password-seguro

# Puertos
MQTT_TCP_PORT=1883
MQTT_WS_PORT=8083
```

---

## Paso 5: Actualizar Código MQTT del Backend

Verificar que `backend/src/services/mqtt.js` soporte autenticación:

```javascript
function setupExternalBroker() {
  const url = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  
  const options = {
    clientId: `backend-${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
  };

  // Agregar autenticación si está configurada
  if (process.env.MQTT_USERNAME) {
    options.username = process.env.MQTT_USERNAME;
    options.password = process.env.MQTT_PASSWORD;
  }

  mqttClient = mqtt.connect(url, options);
  
  mqttClient.on('connect', () => {
    console.log('[MQTT] Conectado a broker externo:', url);
    mqttClient.subscribe('signage/+/heartbeat', (err) => {
      if (!err) console.log('[MQTT] Suscrito a heartbeat');
    });
  });

  mqttClient.on('error', (err) => {
    console.error('[MQTT] Error:', err.message);
  });

  mqttClient.on('message', handleHeartbeat);
}
```

---

## Paso 6: Configurar TV Boxes (Player) para EMQX

Los TV Boxes necesitan conectarse al broker MQTT. Tienes 2 opciones:

### Opción A: WebSocket (Recomendado para internet público)

Actualizar `player/src/App.jsx`:

```javascript
const MQTT_URL = import.meta.env.VITE_MQTT_URL || 'wss://digital-signage-emqx.up.railway.app:8083/mqtt';

const mqttOptions = {
  clientId: `player-${deviceId}-${Date.now()}`,
  clean: true,
  reconnectPeriod: 5000,
  username: 'digital-signage', // Si configuraste auth
  password: 'mqtt-password-seguro'
};
```

### Opción B: TCP directo (Solo para redes privadas/VPN)

Si los TV Boxes están en la misma red privada o VPN:

```javascript
const MQTT_URL = 'mqtt://digital-signage-emqx.railway.internal:1883';
```

---

## Paso 7: Variables de Entorno en Railway por Servicio

### Backend Service:
```env
USE_EXTERNAL_MQTT=true
MQTT_BROKER_URL=mqtt://digital-signage-emqx.railway.internal:1883
MQTT_USERNAME=digital-signage
MQTT_PASSWORD=mqtt-password-seguro
DATABASE_URL=postgresql://...
JWT_SECRET=...
CLOUDFLARE_R2_ENDPOINT_URL=...
```

### EMQX Service:
```env
EMQX_NODE_NAME=emqx@emqx-service
EMQX_DASHBOARD__DEFAULT_USERNAME=admin
EMQX_DASHBOARD__DEFAULT_PASSWORD=tu-password-seguro
EMQX_AUTH__USER__1__USERNAME=digital-signage
EMQX_AUTH__USER__1__PASSWORD=mqtt-password-seguro
```

### Frontend Service:
```env
VITE_API_URL=https://tu-backend.up.railway.app/api
VITE_MQTT_URL=wss://digital-signage-emqx.up.railway.app:8083/mqtt
```

---

## Paso 8: Verificar Conexión

### 1. Acceder al Dashboard EMQX:
```
https://digital-signage-emqx.up.railway.app
Usuario: admin
Password: tu-password-seguro
```

### 2. Verificar en Dashboard:
- **Overview** → Ver estadísticas de conexiones
- **Clients** → Ver TV Boxes conectados
- **Subscriptions** → Ver topics suscritos
- **Metrics** → Mensajes publicados/recibidos

### 3. Logs del Backend:
```bash
railway logs --service backend
```

Deberías ver:
```
[MQTT] Modo: BROKER EXTERNO
[MQTT] Conectado a broker externo: mqtt://digital-signage-emqx.railway.internal:1883
[MQTT] Suscrito a heartbeat
```

---

## Consideraciones de Seguridad

### 1. Usar SSL/TLS para WebSocket:
Railway automáticamente provee SSL, usa `wss://` en lugar de `ws://`

### 2. Autenticación MQTT:
Siempre configura usuario/password en producción

### 3. ACL (Access Control Lists):
Configurar permisos por topic en EMQX Dashboard:
```
# Backend puede publicar/suscribir a todo
backend → signage/#

# Players solo pueden publicar heartbeat y suscribirse a su device_id
player → signage/{device_id}/heartbeat (publish)
player → signage/{device_id}/command (subscribe)
```

### 4. Rate Limiting:
EMQX permite configurar límites de mensajes por conexión

---

## Monitoreo y Escalabilidad

### Métricas Clave en EMQX Dashboard:

1. **Connections**: Número de TV Boxes conectados
2. **Messages In/Out**: Throughput de mensajes
3. **Subscriptions**: Topics activos
4. **Memory Usage**: Consumo de recursos

### Escalado:

Si necesitas más capacidad:
- Railway permite aumentar recursos del servicio EMQX
- EMQX soporta clustering (múltiples nodos)
- Puedes migrar a EMQX Cloud si creces mucho

---

## Troubleshooting

### Backend no conecta a EMQX:
```bash
# Verificar DNS interno Railway
railway logs --service backend | grep MQTT
```

### TV Boxes no conectan:
1. Verificar URL WebSocket en Player
2. Verificar credenciales MQTT
3. Revisar logs en EMQX Dashboard → Logs

### Dashboard EMQX no accesible:
1. Verificar puerto 18083 expuesto en Railway
2. Verificar variables de entorno EMQX_DASHBOARD
3. Revisar logs: `railway logs --service digital-signage-emqx`

---

## Costos Estimados Railway

- **Backend**: ~$5/mes (Starter plan)
- **Frontend**: ~$0-5/mes (static files, bajo consumo)
- **EMQX**: ~$10-20/mes (depende de conexiones simultáneas)
- **PostgreSQL**: Incluido en Railway

**Total estimado**: $15-30/mes para producción pequeña-mediana

---

## Alternativa: EMQX Cloud (SaaS)

Si prefieres no gestionar EMQX tú mismo:

1. Crear cuenta en https://www.emqx.com/en/cloud
2. Plan Gratuito: 100 conexiones, 1M mensajes/mes
3. Obtener URL de conexión
4. Configurar en backend:

```env
USE_EXTERNAL_MQTT=true
MQTT_BROKER_URL=mqtt://tu-cluster.emqxcloud.com:1883
MQTT_USERNAME=tu-usuario-emqx-cloud
MQTT_PASSWORD=tu-password-emqx-cloud
```

**Ventajas**:
- ✅ Cero mantenimiento
- ✅ Alta disponibilidad (99.99% uptime)
- ✅ Dashboard empresarial
- ✅ Soporte técnico

**Desventajas**:
- ❌ Costos más altos a escala
- ❌ Vendor lock-in

---

## Conclusión

Para tu caso, recomiendo:

1. **Desarrollo local**: EMQX en Docker (`USE_EXTERNAL_MQTT=true`)
2. **Producción Railway**: EMQX como servicio separado en Railway
3. **Escalado futuro**: Migrar a EMQX Cloud si creces mucho

Esta arquitectura te da:
- ✅ Escalabilidad para miles de pantallas
- ✅ Dashboard para monitoreo
- ✅ Bajo costo inicial
- ✅ Fácil mantenimiento
