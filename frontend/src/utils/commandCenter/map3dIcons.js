// Map icons drawn on a canvas at run time: a dark disc with a glowing ring and a white symbol.
// Names match the `icon-image` values in map3dStyle.js: warn-<severity>, cyclone, flood, quake.

const SIZE = 64;
const SEVERITY_COLOR = { critical: '#f87171', high: '#fb923c', medium: '#facc15', low: '#4ade80' };

function disc(ctx, color) {
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(4, 11, 23, 0.92)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function glyph(ctx, kind, color) {
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const c = SIZE / 2;
  if (kind === 'warn') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(c, 17);
    ctx.lineTo(c + 15, 44);
    ctx.lineTo(c - 15, 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#04101e';
    ctx.fillRect(c - 1.8, 26, 3.6, 10);
    ctx.beginPath();
    ctx.arc(c, 40.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'safe') {
    ctx.beginPath();
    ctx.moveTo(c, 17);
    ctx.lineTo(c + 13, 23);
    ctx.lineTo(c + 13, 34);
    ctx.quadraticCurveTo(c + 13, 43, c, 48);
    ctx.quadraticCurveTo(c - 13, 43, c - 13, 34);
    ctx.lineTo(c - 13, 23);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c - 6, 33);
    ctx.lineTo(c - 1, 38);
    ctx.lineTo(c + 7, 27);
    ctx.stroke();
  } else if (kind === 'cyclone') {
    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 3.2; t += 0.15) {
      const r = 2 + t * 2.7;
      const x = c + r * Math.cos(t);
      const y = c + r * Math.sin(t);
      if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (kind === 'flood') {
    for (const y of [24, 33, 42]) {
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.bezierCurveTo(22, y - 6, 28, y + 6, 32, y);
      ctx.bezierCurveTo(36, y - 6, 42, y + 6, 49, y);
      ctx.stroke();
    }
  } else if (kind === 'fire') {
    ctx.beginPath();
    ctx.moveTo(c, 14);
    ctx.quadraticCurveTo(c + 4, 24, c + 12, 30);
    ctx.quadraticCurveTo(c + 18, 40, c + 8, 47);
    ctx.quadraticCurveTo(c, 51, c - 8, 47);
    ctx.quadraticCurveTo(c - 18, 40, c - 8, 28);
    ctx.quadraticCurveTo(c - 4, 33, c - 2, 36);
    ctx.quadraticCurveTo(c - 4, 24, c, 14);
    ctx.stroke();
  } else if (kind === 'volcano') {
    ctx.beginPath();
    ctx.moveTo(14, 46);
    ctx.lineTo(25, 28);
    ctx.lineTo(39, 28);
    ctx.lineTo(50, 46);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(27, 22); ctx.lineTo(25, 15);
    ctx.moveTo(32, 21); ctx.lineTo(32, 13);
    ctx.moveTo(37, 22); ctx.lineTo(39, 15);
    ctx.stroke();
  } else if (kind === 'storm') {
    ctx.beginPath();
    ctx.moveTo(36, 13);
    ctx.lineTo(22, 34);
    ctx.lineTo(31, 34);
    ctx.lineTo(26, 51);
    ctx.lineTo(43, 28);
    ctx.lineTo(33, 28);
    ctx.closePath();
    ctx.stroke();
  } else if (kind === 'snow') {
    ctx.beginPath();
    for (let a = 0; a < 3; a += 1) {
      const t = (a * Math.PI) / 3;
      ctx.moveTo(c - 17 * Math.cos(t), c - 17 * Math.sin(t));
      ctx.lineTo(c + 17 * Math.cos(t), c + 17 * Math.sin(t));
    }
    ctx.stroke();
  } else if (kind === 'heat') {
    ctx.beginPath();
    ctx.arc(c, c, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let a = 0; a < 8; a += 1) {
      const t = (a * Math.PI) / 4;
      ctx.moveTo(c + 13 * Math.cos(t), c + 13 * Math.sin(t));
      ctx.lineTo(c + 19 * Math.cos(t), c + 19 * Math.sin(t));
    }
    ctx.stroke();
  } else if (kind === 'dust') {
    for (const [x, y] of [[20, 24], [32, 20], [44, 26], [24, 36], [38, 38], [30, 46], [46, 44]]) {
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'event') {
    ctx.beginPath();
    ctx.moveTo(c, 16);
    ctx.lineTo(c, 36);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, 44, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'quake') {
    ctx.beginPath();
    ctx.moveTo(13, 34);
    ctx.lineTo(23, 34);
    ctx.lineTo(28, 20);
    ctx.lineTo(35, 46);
    ctx.lineTo(40, 30);
    ctx.lineTo(51, 30);
    ctx.stroke();
  }
}

// Natural-event symbols (NASA EONET): icon name on the map, drawing, ring colour.
const EVENT_ICONS = [
  ['ev-fire', 'fire', '#fb923c'],
  ['ev-volcano', 'volcano', '#f87171'],
  ['ev-storm', 'storm', '#facc15'],
  ['ev-snow', 'snow', '#bae6fd'],
  ['ev-heat', 'heat', '#f97316'],
  ['ev-dust', 'dust', '#d6b98a'],
  ['ev-event', 'event', '#e2e8f0'],
];

function draw(kind, ringColor, glyphColor) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  disc(ctx, ringColor);
  glyph(ctx, kind, glyphColor || ringColor);
  return ctx.getImageData(0, 0, SIZE, SIZE);
}

// Adds every icon to a MapLibre map (pixelRatio 2, so they show at 32 px).
export function addMapIcons(map) {
  for (const [severity, color] of Object.entries(SEVERITY_COLOR)) {
    map.addImage(`warn-${severity}`, draw('warn', color, color), { pixelRatio: 2 });
  }
  map.addImage('safe', draw('safe', '#4ade80'), { pixelRatio: 2 });
  map.addImage('cyclone', draw('cyclone', '#f87171'), { pixelRatio: 2 });
  map.addImage('flood', draw('flood', '#38bdf8'), { pixelRatio: 2 });
  map.addImage('quake', draw('quake', '#a78bfa'), { pixelRatio: 2 });
  for (const [name, kind, color] of EVENT_ICONS) map.addImage(name, draw(kind, color), { pixelRatio: 2 });
}
