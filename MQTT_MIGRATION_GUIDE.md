# 🔄 Guía de Migración MQTT: Aedes → EMQX

## 📋 Estado Actual

### Producción (VM Azure)
- ✅ **Modo**: Aedes embebido (legacy)
- ✅ **Variables**: `USE_EXTERNAL_MQTT=false` o sin definir
- ✅ **Sin cambios necesarios** - Sigue funcionando igual

### Desarrollo Local
- 🆕 **Modo**: EMQX externo (nuevo)
- 🆕 **Variables**: `USE_EXTERNAL_MQTT=true`
- 🆕 **Servicio**: Container EMQX en docker-compose.dev.yml

---

## 🧪 PRUEBAS LOCALES

### 1. Levantar servicios en modo EMQX

```bash
# Bajar servicios actuales si están corriendo
docker compose -f docker-compose.dev.yml down

# Levantar con EMQX
docker compose -f docker-compose.dev.yml up --build
```

### 2. Verificar logs del backend

```bash
docker compose -f docker-compose.dev.yml logs backend -f
```

**Debe mostrar:**
```
[MQTT] Modo: BROKER EXTERNO (EMQX)
[MQTT] Conectado a broker externo: mqtt://emqx:1883
[MQTT] Suscrito a signage/+/heartbeat
```

### 3. Acceder al Dashboard EMQX

- **URL**: http://localhost:18083
- **Usuario**: admin
- **Password**: AdminDev2024

**Verificar:**
- Dashboard carga correctamente
- Sección "Connections" muestra 1 cliente: `backend_xxxxx`

### 4. Probar Player Web

```bash
# Abrir en navegador
http://localhost:5174/?deviceId=TEST-001
```

**Verificar en DevTools Console:**
- `MQTT Connected` o `WebSocket connected`

**Verificar en EMQX Dashboard → Connections:**
- Debe mostrar 2 clientes:
  - `backend_xxxxx`
  - `TEST-001` (o el deviceId usado)

### 5. Asignar Playlist desde Frontend

```bash
# Abrir dashboard admin
http://localhost

# Login:
# Usuario: versat-team
# Password: Versat-2620
```

**Pasos:**
1. Ir a "Pantallas"
2. Crear pantalla con `device_id: TEST-001`
3. Ir a "Media" → Subir un archivo de prueba
4. Volver a pantalla TEST-001 → Asignar playlist
5. Verificar en player: debe mostrar el contenido

### 6. Verificar mensajes MQTT en Dashboard EMQX

**En EMQX Dashboard:**
1. Ir a "Diagnose" → "WebSocket Client"
2. Click "Connect"
3. En "Subscriptions" agregar: `signage/TEST-001/playlist`
4. Desde frontend, cambiar playlist de la pantalla
5. Debe ver el payload JSON en tiempo real

### 7. Test de Heartbeat

**En EMQX Dashboard:**
1. Suscribirse a: `signage/TEST-001/heartbeat`
2. El player envía heartbeat cada 30 segundos
3. Debe ver mensajes llegando

**En Backend logs:**
```bash
docker compose -f docker-compose.dev.yml logs backend | grep heartbeat
```

Debe mostrar actualizaciones de status.

---

## ✅ CHECKLIST DE VALIDACIÓN

### Funcionalidades Backend
- [ ] Backend inicia correctamente
- [ ] Se conecta a EMQX sin errores
- [ ] Se suscribe a heartbeats correctamente
- [ ] API REST funciona (GET /api/screens)

### Funcionalidades Player
- [ ] Player se conecta vía WebSocket (puerto 8083)
- [ ] Recibe playlist correctamente
- [ ] Envía heartbeats cada 30 segundos
- [ ] Cambia contenido cuando se actualiza playlist

### EMQX Dashboard
- [ ] Dashboard accesible en puerto 18083
- [ ] Muestra clientes conectados
- [ ] Muestra mensajes publicados
- [ ] Métricas en tiempo real funcionan

### Integración Completa
- [ ] Crear pantalla desde frontend
- [ ] Subir media
- [ ] Asignar playlist
- [ ] Verificar reproducción en player
- [ ] Cambiar playlist → verificar actualización

---

## 🔄 CAMBIAR ENTRE MODOS

### Modo EMQX (Desarrollo)

**backend/.env:**
```bash
USE_EXTERNAL_MQTT=true
MQTT_BROKER_URL=mqtt://emqx:1883
```

**O en docker-compose.dev.yml:**
```yaml
backend:
  environment:
    USE_EXTERNAL_MQTT: "true"
    MQTT_BROKER_URL: mqtt://emqx:1883
```

### Modo Aedes (Legacy/Producción)

**backend/.env:**
```bash
USE_EXTERNAL_MQTT=false
MQTT_TCP_PORT=1883
MQTT_WS_PORT=8083
```

**O simplemente omitir `USE_EXTERNAL_MQTT` (default = false)**

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Error: "Cannot connect to EMQX"

**Verificar:**
```bash
# Ver estado de EMQX
docker compose -f docker-compose.dev.yml ps emqx

# Ver logs
docker compose -f docker-compose.dev.yml logs emqx -f
```

**Solución:**
```bash
# Reiniciar EMQX
docker compose -f docker-compose.dev.yml restart emqx

# O reconstruir
docker compose -f docker-compose.dev.yml up --build emqx
```

### Error: "Player no se conecta"

**Verificar puertos:**
```bash
# Verificar que puerto 8083 esté abierto
netstat -an | grep 8083

# O en Windows PowerShell
netstat -an | Select-String 8083
```

**Verificar en EMQX Dashboard:**
- Ir a "Management" → "Listeners"
- Verificar que `ws:8083` esté habilitado

### Error: "Heartbeat no funciona"

**Verificar suscripción:**
```bash
# Ver logs del backend
docker compose -f docker-compose.dev.yml logs backend | grep "Suscrito"
```

**Debe mostrar:**
```
[MQTT] Suscrito a signage/+/heartbeat
```

### Players no reciben playlist actualizado

**Verificar retain flag:**
- Los mensajes de playlist usan `retain: true`
- Al conectarse, el player debe recibir el último mensaje

**En EMQX Dashboard:**
- Ir a "Retained Messages"
- Buscar: `signage/{deviceId}/playlist`
- Debe existir el mensaje

---

## 📦 PREPARACIÓN PARA PRODUCCIÓN (Azure Container Apps)

### Cuando esté listo para migrar Azure:

**1. Actualizar docker-compose.yml:**
```yaml
services:
  emqx:
    image: emqx/emqx:5.8.3
    environment:
      EMQX_DASHBOARD__DEFAULT_PASSWORD: ${EMQX_ADMIN_PASSWORD}
    # ... resto de configuración

  backend:
    environment:
      USE_EXTERNAL_MQTT: "true"
      MQTT_BROKER_URL: mqtt://emqx:1883
```

**2. NO exponer puerto 18083 públicamente:**
```yaml
emqx:
  ports:
    - "1883:1883"   # MQTT TCP
    - "8083:8083"   # MQTT WebSocket
    # NO exponer 18083 (dashboard) - solo interno
```

**3. Usar contraseñas fuertes:**
```bash
# En .env producción
EMQX_ADMIN_PASSWORD=TuPasswordSegura123!@#
```

---

## 📊 COMPARACIÓN DE RENDIMIENTO

### Conexiones Simultáneas
| Métrica | Aedes | EMQX |
|---------|-------|------|
| Conexiones | ~100-200 | 100,000+ |
| Memoria base | ~50MB | ~200-500MB |
| Persistencia | RAM | Disco + Cluster |
| Monitoreo | Logs | Dashboard UI |

### Prueba de Carga (Opcional)

```bash
# Instalar herramienta
npm install -g mqttx-cli

# Simular 100 clientes
mqttx bench conn -h localhost -p 8083 --protocol ws -c 100

# Publicar mensajes
mqttx bench pub -h localhost -p 8083 --protocol ws -c 10 -t "signage/test/playlist" -m '{"test":true}'
```

---

## ✅ CONFIRMACIÓN FINAL

Antes de considerar la migración completa:

- [ ] Todas las pruebas locales pasan
- [ ] Dashboard EMQX funciona correctamente
- [ ] Players se conectan sin problemas
- [ ] Playlists se actualizan correctamente
- [ ] Heartbeats funcionan
- [ ] No hay regresiones en funcionalidad
- [ ] Documentación actualizada
- [ ] Plan de rollback preparado

---

## 🔙 ROLLBACK (si algo falla)

### En Desarrollo Local:

```bash
# 1. Detener servicios
docker compose -f docker-compose.dev.yml down

# 2. Cambiar a modo Aedes
# En backend/.env:
USE_EXTERNAL_MQTT=false

# 3. Comentar servicio emqx en docker-compose.dev.yml
# O usar docker-compose viejo

# 4. Levantar
docker compose -f docker-compose.dev.yml up --build
```

### En Producción:

**NO ES NECESARIO** - Producción actual sigue usando Aedes sin cambios.

---

## 📞 SOPORTE

Si encuentras problemas:
1. Revisar logs: `docker compose -f docker-compose.dev.yml logs`
2. Verificar variables de ambiente
3. Revisar EMQX Dashboard para diagnóstico
4. Verificar network entre containers
