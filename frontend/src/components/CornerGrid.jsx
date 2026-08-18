import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

const SIZE = 640;
const COLS = 10;
const CELL = SIZE / COLS;

const BASE_MAX_PULSES = 3;
const HOVER_MAX_PULSES = 7;
const BASE_SPAWN_MIN = 900;
const BASE_SPAWN_MAX = 1900;
const HOVER_SPAWN_MIN = 220;
const HOVER_SPAWN_MAX = 620;

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// Detalle decorativo de identidad: cuadrícula grande pegada al borde derecho
export default function CornerGrid() {
  const { T } = useTheme();
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const hoverRef = useRef(false);

  useEffect(() => {
    function handleMove(e) {
      const el = boxRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      hoverRef.current = inside;
    }
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const lineCount = COLS + 1;
    const positions = Array.from({ length: lineCount }, (_, i) => i * CELL);

    const state = { pulses: [], spawnTimer: randRange(200, 800), intensity: 0, lastTime: null };

    function spawnPulse(intensity) {
      const orientation = Math.random() < 0.5 ? 'v' : 'h';
      const fixed = positions[Math.floor(Math.random() * lineCount)];
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = randRange(85, 175) * (1 + intensity * 0.25);
      const tail = randRange(65, 130);
      state.pulses.push({
        orientation, fixed, dir,
        pos: dir === 1 ? -tail : SIZE + tail,
        speed, tail, fadeIn: 0,
      });
    }

    let raf;
    function frame(ts) {
      if (state.lastTime == null) state.lastTime = ts;
      const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;

      const targetIntensity = hoverRef.current ? 1 : 0;
      state.intensity += (targetIntensity - state.intensity) * Math.min(dt * 2.2, 1);

      const maxPulses = Math.round(BASE_MAX_PULSES + (HOVER_MAX_PULSES - BASE_MAX_PULSES) * state.intensity);
      state.spawnTimer -= dt * 1000;
      if (state.spawnTimer <= 0 && state.pulses.length < maxPulses) {
        spawnPulse(state.intensity);
        const min = BASE_SPAWN_MIN - (BASE_SPAWN_MIN - HOVER_SPAWN_MIN) * state.intensity;
        const max = BASE_SPAWN_MAX - (BASE_SPAWN_MAX - HOVER_SPAWN_MAX) * state.intensity;
        state.spawnTimer = randRange(min, max);
      }

      state.pulses = state.pulses.filter((p) => {
        p.pos += p.dir * p.speed * dt;
        p.fadeIn = Math.min(1, p.fadeIn + dt * 3);
        return p.dir === 1 ? p.pos - p.tail < SIZE + p.tail : p.pos + p.tail > -p.tail;
      });

      ctx.clearRect(0, 0, SIZE, SIZE);

      ctx.save();
      ctx.strokeStyle = T.primary;
      ctx.globalAlpha = 0.07 + state.intensity * 0.03;
      ctx.lineWidth = 1;
      positions.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p, 0); ctx.lineTo(p, SIZE);
        ctx.moveTo(0, p); ctx.lineTo(SIZE, p);
        ctx.stroke();
      });
      ctx.restore();

      state.pulses.forEach((p) => {
        const tailStart = p.pos - p.dir * p.tail;
        const headClamped = Math.max(0, Math.min(SIZE, p.pos));
        const tailClamped = Math.max(0, Math.min(SIZE, tailStart));

        const x1 = p.orientation === 'v' ? p.fixed : tailClamped;
        const y1 = p.orientation === 'v' ? tailClamped : p.fixed;
        const x2 = p.orientation === 'v' ? p.fixed : headClamped;
        const y2 = p.orientation === 'v' ? headClamped : p.fixed;

        ctx.save();
        ctx.globalAlpha = p.fadeIn * (0.7 + state.intensity * 0.3);

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, T.primary);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.shadowColor = T.primary;
        ctx.shadowBlur = 7 + state.intensity * 4;
        ctx.fillStyle = T.primary;
        ctx.beginPath();
        ctx.arc(x2, y2, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [T]);

  return (
    <div
      ref={boxRef}
      style={{
        position: 'absolute', right: -105, bottom: 0, width: SIZE, height: SIZE,
        maxWidth: '64vw', maxHeight: '68vh', pointerEvents: 'none',
        maskImage: 'radial-gradient(135% 135% at 100% 100%, black 58%, transparent 96%)',
        WebkitMaskImage: 'radial-gradient(135% 135% at 100% 100%, black 58%, transparent 96%)',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
