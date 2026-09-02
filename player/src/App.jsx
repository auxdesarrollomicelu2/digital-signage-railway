import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';

const params = new URLSearchParams(globalThis.location.search);
const DEVICE_ID = params.get('deviceId') || params.get('device') || 'screen-001';

// Auto-detección de protocolo según HTTPS (Railway) vs HTTP (Azure/Local)
const isSecure = globalThis.location.protocol === 'https:';
const wsProtocol = isSecure ? 'wss:' : 'ws:';
const httpProtocol = isSecure ? 'https:' : 'http:';

// Detección automática de ambiente
const currentHost = globalThis.location.hostname;
const isRailway = currentHost.includes('railway.app');
const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

// Configuración por ambiente
let API_HOST, MQTT_HOST, API_PORT, MQTT_PORT, MQTT_PATH;

if (isRailway) {
  // Railway: usar hostnames específicos de cada servicio
  API_HOST = 'digital-signage-railway-production.up.railway.app';
  MQTT_HOST = 'emqx-production-8f50.up.railway.app';
  API_PORT = ''; // Railway usa puertos estándar (80/443)
  MQTT_PORT = '';
  MQTT_PATH = '/mqtt';
} else if (isLocalhost) {
  // Desarrollo local
  API_HOST = params.get('host') || 'localhost';
  MQTT_HOST = params.get('mqtt_host') || 'localhost';
  API_PORT = params.get('api_port') || '3000';
  MQTT_PORT = params.get('mqtt_port') || '8083';
  MQTT_PATH = params.get('mqtt_path') || '/mqtt';
} else {
  // Azure u otro (usa parámetros o defaults)
  API_HOST = params.get('host') || currentHost;
  MQTT_HOST = params.get('mqtt_host') || params.get('host') || currentHost;
  API_PORT = params.get('api_port') || '3000';
  MQTT_PORT = params.get('mqtt_port') || '8083';
  MQTT_PATH = params.get('mqtt_path') || '/mqtt';
}

// Construir URLs
const API_URL = API_PORT 
  ? `${httpProtocol}//${API_HOST}:${API_PORT}` 
  : `${httpProtocol}//${API_HOST}`;
const MQTT_URL = MQTT_PORT
  ? `${wsProtocol}//${MQTT_HOST}:${MQTT_PORT}${MQTT_PATH}`
  : `${wsProtocol}//${MQTT_HOST}${MQTT_PATH}`;
const PLAYLIST_API_URL = `${API_URL}/api/screens/by-device/${encodeURIComponent(DEVICE_ID)}/playlist`;
const PLAYLIST_STORAGE_KEY = `signage:playlist:${DEVICE_ID}`;
const MEDIA_CACHE_NAME = 'signage-media-v2';
const SYNC_INTERVAL_MS = 30000;

export default function App() {
  const [activePlaylist, setActivePlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [connected, setConnected] = useState(false);
  const [fade, setFade] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [activeSlot, setActiveSlot] = useState('A');

  const clientRef = useRef(null);
  const timerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const syncRef = useRef(null);
  const retryVideoRef = useRef(null);
  const videoARef = useRef(null);
  const videoBRef = useRef(null);
  const playlistSigRef = useRef('');
  const mediaBlobMapRef = useRef(new Map());

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const makePlaylistSignature = useCallback((items) => {
    if (!Array.isArray(items)) return '[]';
    return JSON.stringify(
      items.map((item) => ({
        id: item?.id ?? null,
        url: item?.url ?? '',
        mime_type: item?.mime_type ?? '',
        duration: item?.duration ?? 10,
        position: item?.position ?? 0,
      }))
    );
  }, []);

  const resolveMediaUrl = useCallback((item) => {
    const rawUrl = item?.url || '';
    if (!rawUrl) return '';
    
    // Si ya es una URL completa de Cloudflare R2 o cualquier HTTPS, mantenerla intacta
    if (rawUrl.startsWith('https://')) return rawUrl;
    if (rawUrl.startsWith('http://')) return rawUrl;
    
    // Si es una ruta relativa local (/uploads/...), convertir a URL completa del backend
    if (rawUrl.startsWith('/uploads/')) return `${API_URL}${rawUrl}`;
    
    // Cualquier otro caso relativo, agregar API_URL
    return `${API_URL}${rawUrl}`;
  }, []);

  // Devuelve el blob URL local si está pre-descargado, o la URL remota como fallback.
  const getPlaybackUrl = useCallback((item) => {
    const remoteUrl = resolveMediaUrl(item);
    if (!remoteUrl) return '';
    return mediaBlobMapRef.current.get(remoteUrl) ?? remoteUrl;
  }, [resolveMediaUrl]);

  const isVideoMedia = useCallback((item) => {
    const mime = String(item?.mime_type || '').toLowerCase();
    if (mime.startsWith('video/')) return true;
    return /\.(mp4|webm|ogg|ogv|mov|m4v|avi|mkv|mpeg|mpg|wmv|3gp|flv|ts)(\?|$)/i.test(String(item?.url || '').toLowerCase());
  }, []);

  const persistPlaylist = useCallback((items) => {
    try {
      localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify({ items, updatedAt: Date.now() }));
    } catch (err) {
      console.warn('[Player] No se pudo guardar playlist localmente:', err);
    }
  }, []);

  const readPersistedPlaylist = useCallback(() => {
    try {
      const raw = localStorage.getItem(PLAYLIST_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.items) ? parsed.items : [];
    } catch {
      return [];
    }
  }, []);

  // ─── Descarga individual ──────────────────────────────────────────────────

  const downloadItem = useCallback(async (item) => {
    const remoteUrl = resolveMediaUrl(item);
    if (!remoteUrl) return [remoteUrl, remoteUrl];

    // Ya está en memoria
    const inMemory = mediaBlobMapRef.current.get(remoteUrl);
    if (inMemory) return [remoteUrl, inMemory];

    // Pre-decodifica imágenes en memoria para que al mostrarse rendericen en un frame
    const predecode = (blobUrl, mimeType) => {
      if (String(mimeType).startsWith('image/')) {
        return new Promise((res) => {
          const img = new Image();
          img.onload = res;
          img.onerror = res;
          img.src = blobUrl;
        });
      }
      return Promise.resolve();
    };

    // Intentar red → blob + guardar en Cache API
    try {
      const resp = await fetch(remoteUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        if ('caches' in globalThis) {
          const cache = await caches.open(MEDIA_CACHE_NAME);
          await cache.put(remoteUrl, new Response(blob.slice(), { headers: { 'Content-Type': blob.type } }));
        }
        const blobUrl = URL.createObjectURL(blob);
        await predecode(blobUrl, blob.type);
        return [remoteUrl, blobUrl];
      }
    } catch { /* sin red, intentar cache */ }

    // Fallback: Cache API guardada previamente
    if ('caches' in globalThis) {
      try {
        const cache = await caches.open(MEDIA_CACHE_NAME);
        const cached = await cache.match(remoteUrl);
        if (cached) {
          const blob = await cached.blob();
          const blobUrl = URL.createObjectURL(blob);
          await predecode(blobUrl, blob.type);
          return [remoteUrl, blobUrl];
        }
      } catch { /* ignorar */ }
    }

    // Último fallback: URL remota (bufferiza en tiempo real)
    console.warn('[Player] Sin caché para:', remoteUrl, '— usando URL remota');
    return [remoteUrl, remoteUrl];
  }, [resolveMediaUrl]);

  // ─── Descarga toda la playlist y luego la activa ──────────────────────────

  const downloadAndActivate = useCallback(async (items, source) => {
    if (!Array.isArray(items)) return;
    
    if (items.length === 0) {
      console.log(`[Player] Playlist vacía recibida desde ${source} - limpiando contenido`);
      
      for (const [url, blobUrl] of mediaBlobMapRef.current) {
        if (String(blobUrl).startsWith('blob:')) {
          URL.revokeObjectURL(blobUrl);
        }
      }
      
      mediaBlobMapRef.current = new Map();
      persistPlaylist([]);
      setActivePlaylist([]);
      setCurrentIndex(0);
      setDownloadProgress(null);
      
      console.log(`[Player] Contenido limpiado - mostrando pantalla de espera`);
      return;
    }

    console.log(`[Player] Descargando playlist (${source}): ${items.length} ítems`);
    setDownloadProgress({ done: 0, total: items.length });

    const newBlobMap = new Map();
    let doneCount = 0;
    // 3 workers en paralelo — cada uno procesa su "franja" de items
    // Worker 0: items 0, 3, 6 | Worker 1: items 1, 4, 7 | Worker 2: items 2, 5
    const CONCURRENCY = 3;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, items.length) }, (_, w) =>
        (async () => {
          for (let i = w; i < items.length; i += CONCURRENCY) {
            const [remoteUrl, blobUrl] = await downloadItem(items[i]);
            if (remoteUrl) newBlobMap.set(remoteUrl, blobUrl);
            doneCount += 1;
            setDownloadProgress({ done: doneCount, total: items.length });
          }
        })()
      )
    );

    // Liberar blobs que ya no están en la nueva playlist
    for (const [url, blobUrl] of mediaBlobMapRef.current) {
      if (!newBlobMap.has(url) && String(blobUrl).startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    }

    // Limpiar Cache API de recursos obsoletos
    if ('caches' in globalThis) {
      try {
        const keep = new Set(newBlobMap.keys());
        const cache = await caches.open(MEDIA_CACHE_NAME);
        const keys = await cache.keys();
        await Promise.all(keys.filter((r) => !keep.has(r.url)).map((r) => cache.delete(r)));
      } catch { /* ignorar */ }
    }

    mediaBlobMapRef.current = newBlobMap;
    persistPlaylist(items);

    // Activar la nueva playlist de golpe — todo está listo localmente
    setActivePlaylist(items);
    setCurrentIndex(0);
    setDownloadProgress(null);

    console.log(`[Player] Playlist activa (${source}): ${items.length} ítems listos localmente`);
  }, [downloadItem, persistPlaylist]);

  // ─── Dedup + encolar descarga ─────────────────────────────────────────────

  const applyPlaylist = useCallback((items, source = 'unknown') => {
    if (!Array.isArray(items)) return;
    const nextSig = makePlaylistSignature(items);
    if (nextSig === playlistSigRef.current) return;
    playlistSigRef.current = nextSig;
    downloadAndActivate(items, source);
  }, [makePlaylistSignature, downloadAndActivate]);

  const syncPlaylistFromApi = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const resp = await fetch(PLAYLIST_API_URL, { cache: 'no-store' });
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data?.items)) applyPlaylist(data.items, 'api-sync');
    } catch (err) {
      console.warn('[Player] Error sincronizando playlist por API:', err);
    }
  }, [applyPlaylist]);

  // ─── Arranque: cargar playlist persistida ────────────────────────────────

  useEffect(() => {
    const persisted = readPersistedPlaylist();
    if (persisted.length > 0) applyPlaylist(persisted, 'local-storage');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── MQTT + intervalo de sync ─────────────────────────────────────────────

  useEffect(() => {
    console.log('[Player] Endpoints', { DEVICE_ID, API_URL, MQTT_URL });
    console.log('[Player] Detección de protocolo:', { 
      isSecure, 
      wsProtocol, 
      httpProtocol,
      pageProtocol: globalThis.location.protocol 
    });

    const client = mqtt.connect(MQTT_URL, {
      clientId: `player-${DEVICE_ID}-${Date.now()}`,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      keepalive: 60,
    });
    clientRef.current = client;

    client.on('connect', () => {
      console.log('[Player] Conectado a MQTT');
      setConnected(true);
      client.subscribe(`signage/${DEVICE_ID}/playlist`, { qos: 1 });
      client.subscribe(`signage/${DEVICE_ID}/command`, { qos: 1 });
      syncPlaylistFromApi();
      
      const apkVersion = globalThis.AndroidInterface?.getApkVersion?.() || 1;
      const screenWidth = Math.round(window.screen.width * (window.devicePixelRatio || 1));
      const screenHeight = Math.round(window.screen.height * (window.devicePixelRatio || 1));
      
      client.publish(
        `signage/${DEVICE_ID}/heartbeat`, 
        JSON.stringify({ 
          timestamp: Date.now(), 
          status: 'connected',
          apk_version: apkVersion,
          screen_width: screenWidth,
          screen_height: screenHeight
        })
      );
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (topic.endsWith('/playlist') && Array.isArray(data?.items)) {
          applyPlaylist(data.items, 'mqtt');
        }
        
        if (topic.endsWith('/command') && data.type === 'refresh') {
          playlistSigRef.current = '';
          syncPlaylistFromApi();
        }

        if (topic.endsWith('/command') && data.type === 'reload') globalThis.location.reload();
        
        // Handler para actualización de APK (solo Android)
        if (topic.endsWith('/command') && data.type === 'update_apk') {
          if (globalThis.AndroidInterface?.downloadAndInstallAPK) {
            globalThis.AndroidInterface.downloadAndInstallAPK(data.download_url, data.sha256, data.version_name);
            console.log('[Player] Comando de actualización APK enviado a Android:', data.version_name);
          }
        }
      } catch (err) {
        console.error('[Player] Error parsing message:', err);
      }
    });

    client.on('close', () => setConnected(false));
    client.on('reconnect', () => console.log('[Player] Reconectando MQTT...'));
    client.on('offline', () => console.warn('[Player] MQTT offline'));
    client.on('error', (err) => console.error('[Player] MQTT error:', err));

    heartbeatRef.current = setInterval(() => {
      if (client.connected) {
        const apkVersion = globalThis.AndroidInterface?.getApkVersion?.() || 1;
        const screenWidth = Math.round(window.screen.width * (window.devicePixelRatio || 1));
        const screenHeight = Math.round(window.screen.height * (window.devicePixelRatio || 1));
        
        client.publish(
          `signage/${DEVICE_ID}/heartbeat`, 
          JSON.stringify({ 
            timestamp: Date.now(), 
            status: 'playing',
            apk_version: apkVersion,
            screen_width: screenWidth,
            screen_height: screenHeight
          })
        );
      }
    }, 30000);

    syncRef.current = setInterval(syncPlaylistFromApi, SYNC_INTERVAL_MS);

    return () => {
      clearInterval(heartbeatRef.current);
      clearInterval(syncRef.current);
      client.end();
    };
  }, [applyPlaylist, syncPlaylistFromApi]);

  // ─── online / offline ─────────────────────────────────────────────────────

  useEffect(() => {
    function handleOnline() {
      setConnected(true);
      syncPlaylistFromApi();
      try { clientRef.current?.reconnect?.(); } catch { /* ignorar */ }
    }
    function handleOffline() { setConnected(false); }
    globalThis.addEventListener('online', handleOnline);
    globalThis.addEventListener('offline', handleOffline);
    return () => {
      globalThis.removeEventListener('online', handleOnline);
      globalThis.removeEventListener('offline', handleOffline);
    };
  }, [syncPlaylistFromApi]);

  // ─── Cleanup blob URLs al desmontar ──────────────────────────────────────

  useEffect(() => {
    return () => {
      if (retryVideoRef.current) clearTimeout(retryVideoRef.current);
      for (const blobUrl of mediaBlobMapRef.current.values()) {
        if (String(blobUrl).startsWith('blob:')) URL.revokeObjectURL(blobUrl);
      }
    };
  }, []);

  // ─── Valores derivados (ANTES de los hooks que los usan) ────────────────
  const currentMedia = activePlaylist.length > 0 ? activePlaylist[currentIndex] : null;
  const currentPlaybackUrl = currentMedia ? getPlaybackUrl(currentMedia) : '';
  const currentIsVideo = currentMedia ? isVideoMedia(currentMedia) : false;

  const nextIdx = activePlaylist.length > 1 ? (currentIndex + 1) % activePlaylist.length : -1;
  const nextMedia = nextIdx >= 0 ? activePlaylist[nextIdx] : null;
  const nextPlaybackUrl = nextMedia ? getPlaybackUrl(nextMedia) : '';
  const nextIsVideo = nextMedia ? isVideoMedia(nextMedia) : false;

  // ─── Double-buffer: cargar video actual en slot activo ─────────────────
  useEffect(() => {
    const v = (activeSlot === 'A' ? videoARef : videoBRef).current;
    if (!v) return;
    if (!currentIsVideo || !currentPlaybackUrl) {
      v.pause();
      v.removeAttribute('src');
      v.load();
      return;
    }
    if (v.getAttribute('src') !== currentPlaybackUrl) {
      v.src = currentPlaybackUrl;
      v.load();
    }
    v.play().catch(() => {});
  }, [currentIndex, currentPlaybackUrl, currentIsVideo, activeSlot]);

  // ─── Double-buffer: pre-cargar siguiente video en slot inactivo ────────
  useEffect(() => {
    const v = (activeSlot === 'A' ? videoBRef : videoARef).current;
    if (!v) return;
    if (!nextIsVideo || !nextPlaybackUrl || activePlaylist.length <= 1) {
      v.pause();
      v.removeAttribute('src');
      v.load();
      return;
    }
    if (v.getAttribute('src') !== nextPlaybackUrl) {
      v.src = nextPlaybackUrl;
      v.load();
    }
  }, [currentIndex, nextPlaybackUrl, nextIsVideo, activePlaylist.length, activeSlot]);

  // ─── Avance de slides ─────────────────────────────────────────────────
  const advanceSlide = useCallback(() => {
    if (nextIsVideo) {
      setActiveSlot((s) => (s === 'A' ? 'B' : 'A'));
      setCurrentIndex((prev) => (prev + 1) % activePlaylist.length);
    } else {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activePlaylist.length);
        setFade(true);
      }, 300);
    }
  }, [activePlaylist.length, nextIsVideo]);

  useEffect(() => {
    if (activePlaylist.length <= 1) return;
    if (currentIsVideo) return;
    const duration = (currentMedia?.duration || 10) * 1000;
    timerRef.current = setTimeout(advanceSlide, duration);
    return () => clearTimeout(timerRef.current);
  }, [currentIndex, activePlaylist, currentMedia, currentIsVideo, advanceSlide]);

  useEffect(() => {
    if (activePlaylist.length === 1) setFade(true);
  }, [activePlaylist]);

  // ─── Render: esperando contenido ─────────────────────────────────────────

  if (activePlaylist.length === 0) {
    return (
      <div style={styles.waiting}>
        <div style={styles.sweepEffect} />
        <div style={styles.gridPattern} />
        <div style={styles.waitingContent}>
          {/* Anillos concéntricos animados */}
          <div style={styles.pulseContainer}>
            <div style={{ 
              ...styles.pulseRing, 
              backgroundColor: connected ? '#22e6ac' : '#e2554f',
              animationDelay: '0s' 
            }} />
            <div style={{ 
              ...styles.pulseRing, 
              backgroundColor: connected ? '#22e6ac' : '#e2554f',
              animationDelay: '0.4s' 
            }} />
            <div style={{ 
              ...styles.pulseRing, 
              backgroundColor: connected ? '#22e6ac' : '#e2554f',
              animationDelay: '0.8s' 
            }} />
            <div style={{
              ...styles.pulseDot,
              backgroundColor: connected ? '#22e6ac' : '#e2554f'
            }} />
          </div>

          {/* Título y subtítulo */}
          <h1 style={styles.title}>Digital Signage Versat</h1>
          <p style={styles.subtitle}>
            {(() => {
              if (downloadProgress) return 'Descargando contenido...';
              if (connected) return 'En cuanto se asigne una lista de reproducción, empezará a mostrarse aquí';
              return 'Estableciendo conexión con el servidor...';
            })()}
          </p>

          {/* Metadata row */}
          <div style={styles.metadataRow}>
            <span style={{ 
              ...styles.statusDot, 
              backgroundColor: connected ? '#22e6ac' : '#e2554f' 
            }} />
            <span style={styles.metadataText}>
              {connected ? 'Conectado' : 'Conectando'}
            </span>
            <span style={styles.metadataSeparator}>·</span>
            <span style={styles.metadataText}>{DEVICE_ID}</span>
          </div>

          {/* Barra de progreso cuando descarga */}
          {downloadProgress && (
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div style={{
                  ...styles.progressFill,
                  width: `${(downloadProgress.done / downloadProgress.total) * 100}%`
                }} />
              </div>
              <span style={styles.progressText}>
                {downloadProgress.done} / {downloadProgress.total}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Render: reproduciendo ────────────────────────────────────────────────

  return (
    <div style={styles.player}>
      {downloadProgress && (
        <div style={styles.downloadBadge}>
          ↓ {downloadProgress.done}/{downloadProgress.total}
        </div>
      )}

      {/* Slot A — video persistente. display:none cuando no está activo evita que la
          superficie de hardware de Android se dibuje por debajo de las imágenes. */}
      <video
        ref={videoARef}
        style={{ ...styles.slide, zIndex: 2, display: currentIsVideo && activeSlot === 'A' ? 'block' : 'none' }}
        muted
        playsInline
        preload="auto"
        loop={activePlaylist.length === 1 && currentIsVideo}
        onEnded={() => {
          if (activeSlot !== 'A' || activePlaylist.length <= 1) return;
          advanceSlide();
        }}
        onError={() => {
          if (activeSlot !== 'A') return;
          console.error('[Player] Error video slot A');
          if (retryVideoRef.current) clearTimeout(retryVideoRef.current);
          retryVideoRef.current = setTimeout(async () => {
            if (!currentMedia) return;
            const [remoteUrl, blobUrl] = await downloadItem(currentMedia);
            if (remoteUrl) {
              mediaBlobMapRef.current.set(remoteUrl, blobUrl);
              const v = videoARef.current;
              if (v) { v.src = blobUrl || remoteUrl; v.load(); v.play().catch(() => {}); }
            }
          }, 2000);
        }}
      />

      {/* Slot B — video persistente */}
      <video
        ref={videoBRef}
        style={{ ...styles.slide, zIndex: 2, display: currentIsVideo && activeSlot === 'B' ? 'block' : 'none' }}
        muted
        playsInline
        preload="auto"
        loop={activePlaylist.length === 1 && currentIsVideo}
        onEnded={() => {
          if (activeSlot !== 'B' || activePlaylist.length <= 1) return;
          advanceSlide();
        }}
        onError={() => {
          if (activeSlot !== 'B') return;
          console.error('[Player] Error video slot B');
          if (retryVideoRef.current) clearTimeout(retryVideoRef.current);
          retryVideoRef.current = setTimeout(async () => {
            if (!currentMedia) return;
            const [remoteUrl, blobUrl] = await downloadItem(currentMedia);
            if (remoteUrl) {
              mediaBlobMapRef.current.set(remoteUrl, blobUrl);
              const v = videoBRef.current;
              if (v) { v.src = blobUrl || remoteUrl; v.load(); v.play().catch(() => {}); }
            }
          }, 2000);
        }}
      />

      {/* Capa de imagen — z-index 3 se superpone encima de ambos videos */}
      {!currentIsVideo && currentPlaybackUrl && (
        <img
          key={`${currentMedia?.id}-${currentIndex}`}
          src={currentPlaybackUrl}
          alt=""
          style={{ ...styles.slide, zIndex: 3, opacity: fade ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}
          onError={() => console.error('[Player] Error imagen:', currentPlaybackUrl)}
        />
      )}
    </div>
  );
}

const styles = {
  waiting: {
    width: '100vw',
    height: '100vh',
    background: '#06090a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    isolation: 'isolate',
  },
  gridPattern: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px',
    pointerEvents: 'none',
  },
  sweepEffect: {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 0,
    padding: '1px',
    pointerEvents: 'none',
    zIndex: 1,
    background: 'conic-gradient(from var(--sweep-angle, 0deg), transparent 0%, transparent 80%, rgba(34, 230, 172, 0.15) 88%, rgba(34, 230, 172, 0.25) 91%, rgba(34, 230, 172, 0.15) 94%, transparent 100%)',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    opacity: 0.5,
    animation: 'sweepSpin 8s linear infinite',
  },
  waitingContent: {
    textAlign: 'center',
    color: '#f2f6f5',
    position: 'relative',
    zIndex: 1,
  },
  pulseContainer: {
    position: 'relative',
    width: '280px',
    height: '280px',
    margin: '0 auto 48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    opacity: 0.2,
    animation: 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  pulseDot: {
    position: 'relative',
    zIndex: 2,
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    filter: 'drop-shadow(0 0 24px currentColor)',
  },
  title: {
    fontSize: '48px',
    fontWeight: '800',
    marginBottom: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    letterSpacing: '-0.02em',
    color: '#f2f6f5',
  },
  subtitle: {
    fontSize: '16px',
    color: '#7c8f8d',
    fontFamily: 'system-ui, sans-serif',
    marginBottom: '40px',
    maxWidth: '480px',
    margin: '0 auto 40px',
    lineHeight: '1.6',
  },
  metadataRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#7c8f8d',
    marginBottom: '24px',
  },
  metadataText: {
    color: '#7c8f8d',
  },
  metadataSeparator: {
    color: '#2a3335',
    fontSize: '16px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor',
  },
  progressContainer: {
    width: '320px',
    margin: '0 auto',
  },
  progressBar: {
    width: '100%',
    height: '3px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #22e6ac 0%, #1bc494 100%)',
    transition: 'width 0.3s ease',
    boxShadow: '0 0 8px #22e6ac',
  },
  progressText: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#7c8f8d',
  },
  player: {
    width: '100vw',
    height: '100vh',
    background: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  slide: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    background: '#000',
  },
  downloadBadge: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    background: 'rgba(0,0,0,0.5)',
    color: '#94a3b8',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    zIndex: 10,
  },
};
