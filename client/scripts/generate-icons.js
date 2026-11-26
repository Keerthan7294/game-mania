import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function makeIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#0ea5e9');
  grad.addColorStop(1, '#2563eb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Rounded rect background
  ctx.fillStyle = '#0f172a';
  const pad = size * 0.12;
  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, size * 0.15);
  ctx.fill();

  // Game controller icon
  ctx.fillStyle = '#f8fafc';
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.22;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // D-pad cross
  ctx.fillStyle = '#0f172a';
  const cs = size * 0.08;
  ctx.fillRect(cx - cs, cy - cs * 2.5, cs * 2, cs * 5);
  ctx.fillRect(cx - cs * 2.5, cy - cs, cs * 5, cs * 2);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const outDir = path.join(__dirname, '../public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

makeIcon(192).createPNGStream().pipe(fs.createWriteStream(path.join(outDir, 'icon-192.png')));
makeIcon(512).createPNGStream().pipe(fs.createWriteStream(path.join(outDir, 'icon-512.png')));

console.log('Icons generated in', outDir);
