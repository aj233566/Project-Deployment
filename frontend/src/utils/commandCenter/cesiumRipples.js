// Arrival animation on the CesiumJS globe, after the reference video: a huge ring and a pale outer ring pulse out from the point,
// a tight focus ring marks it, a dotted arc runs from the previous event with a bright dot travelling along it, and a callout chip
// names what happened. Everything lives in one data source ('fx') and removes itself.
import { arcBetween, calloutFor } from './incidentEvents';
import { SEVERITY_COLOR } from './map3dStyle';
import { ARROW_LOWER, ARROW_PATH, ARROW_TAIL, ARROW_UPPER, GLYPHS, PIN_BOX, PIN_PATH, glyphKey, shade } from './fxMarkup';

const RING_MS = 2200;
const ARC_MS = 1600;
const CALLOUT_MS = 5500;
const BIG_RADIUS_M = 22000;


const imageCache = new Map();
const canvasImage = (key, size, draw, height = size) => {
  if (imageCache.has(key)) return imageCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = height;
  draw(canvas.getContext('2d'), size);
  imageCache.set(key, canvas);
  return canvas;
};
// The glossy location pin and the two-tone navigation arrow, drawn on a canvas from the same paths and shading the DOM maps use
// (see fxMarkup.js). The pin canvas is the 56 x 70 pin box at twice the size, so the tip sits PIN_TIP_FROM_BOTTOM pixels above its bottom edge.
const PIN_K = 2;
const PIN_TIP_FROM_BOTTOM = (PIN_BOX.height - PIN_BOX.tipY) * PIN_K;
const pinImage = (css, glyph) => canvasImage(`pin-${css}-${glyph}`, PIN_BOX.width * PIN_K, (ctx) => {
  const key = GLYPHS[glyph] ? glyph : 'dot';
  ctx.scale(PIN_K, PIN_K);
  // soft shadow on the ground
  const shadow = ctx.createRadialGradient(PIN_BOX.tipX, PIN_BOX.tipY, 0, PIN_BOX.tipX, PIN_BOX.tipY, 14);
  shadow.addColorStop(0, 'rgba(0,0,0,0.5)'); shadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.translate(PIN_BOX.tipX, PIN_BOX.tipY); ctx.scale(1, 0.3); ctx.translate(-PIN_BOX.tipX, -PIN_BOX.tipY);
  ctx.fillStyle = shadow; ctx.beginPath(); ctx.arc(PIN_BOX.tipX, PIN_BOX.tipY, 14, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(2, 2); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const body = ctx.createLinearGradient(5, 3, 47, 57);
  body.addColorStop(0, shade(css, 0.4)); body.addColorStop(0.5, css); body.addColorStop(1, shade(css, -0.4));
  const pin = new Path2D(PIN_PATH);
  ctx.fillStyle = body; ctx.fill(pin); ctx.strokeStyle = shade(css, -0.55); ctx.lineWidth = 2; ctx.stroke(pin);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(11.5, 16); ctx.quadraticCurveTo(15, 6, 28, 6.3); ctx.stroke();
  const badge = ctx.createRadialGradient(21.5, 17, 1, 26, 24, 15);
  badge.addColorStop(0, '#ffffff'); badge.addColorStop(1, '#cfdae6');
  ctx.fillStyle = badge; ctx.beginPath(); ctx.arc(26, 24, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = shade(css, -0.35); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save(); ctx.translate(16.5, 14.5); ctx.scale(0.8, 0.8);
  ctx.strokeStyle = shade(css, -0.5); ctx.fillStyle = shade(css, -0.5); ctx.lineWidth = 2.4;
  for (const d of GLYPHS[key]) { const g = new Path2D(d); if (key === 'dot') ctx.fill(g); else ctx.stroke(g); }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.beginPath(); ctx.ellipse(21.5, 17.5, 4.5, 2.2, -0.44, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}, PIN_BOX.height * PIN_K);
const arrowImage = (css) => canvasImage(`arrow-${css}`, 96, (ctx, n) => {
  const k = n / 48;
  ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const tail = new Path2D(ARROW_TAIL);
  ctx.strokeStyle = 'rgba(16,29,41,0.55)'; ctx.lineWidth = 8; ctx.stroke(tail);
  ctx.strokeStyle = css; ctx.lineWidth = 3; ctx.stroke(tail);
  ctx.fillStyle = shade(css, 0.35); ctx.fill(new Path2D(ARROW_UPPER));
  ctx.fillStyle = shade(css, -0.3); ctx.fill(new Path2D(ARROW_LOWER));
  const head = new Path2D(ARROW_PATH);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.stroke(head);
  ctx.strokeStyle = 'rgba(16,29,41,0.4)'; ctx.lineWidth = 0.8; ctx.stroke(head);
});
const easeOut = (t) => 1 - (1 - Math.min(Math.max(t, 0), 1)) ** 3;

const lastCallout = new WeakMap();

const metresToDegrees = (metres, lat) => ({ lat: metres / 111320, lng: metres / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.05)) });

export function playGlobeRipple(Cesium, viewer, source, event, coords, previous) {
  if (!source || viewer.isDestroyed()) return;
  const callout = calloutFor(event);
  const css = SEVERITY_COLOR[callout.severity] || '#f87171';
  const color = Cesium.Color.fromCssColorString(css);
  const start = performance.now();
  // Smaller shapes on a narrow screen, so the effect stays in proportion on a phone.
  const width = viewer.canvas?.clientWidth || 1200;
  const fxScale = width < 600 ? 0.42 : width < 900 ? 0.52 : 0.62;
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const progress = (delay = 0, length = RING_MS) => Math.min(Math.max((performance.now() - start - delay) / length, 0), 1);
  const created = [];
  const add = (entity) => { created.push(entity); return source.entities.add(entity); };

  const ringPositions = (radiusM) => {
    const d = metresToDegrees(radiusM, coords.lat);
    const flat = [];
    for (let i = 0; i <= 72; i += 1) {
      const a = (i / 72) * Math.PI * 2;
      flat.push(coords.lng + d.lng * Math.cos(a), coords.lat + d.lat * Math.sin(a));
    }
    return Cesium.Cartesian3.fromDegreesArray(flat);
  };
  const ring = (delay, widthPx, alphaScale, radiusScale, tint) => add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => ringPositions(300 + progress(delay) * BIG_RADIUS_M * radiusScale), false),
      width: widthPx,
      clampToGround: true,
      material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(() => {
        const p = progress(delay);
        return (tint || color).withAlpha(p > 0 && p < 1 ? (1 - p) * alphaScale : 0);
      }, false)),
    },
  });

  if (!reduced) {
    ring(0, 4, 0.9, 1, color);
    ring(350, 3, 0.55, 0.6, color);

    // The location pin, with a small symbol for the kind of incident. It drops onto the place and fades after about 3 s.
    add({
      position: Cesium.Cartesian3.fromDegrees(coords.lng, coords.lat),
      billboard: {
        image: pinImage(css, glyphKey(event.incident)),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: fxScale,
        pixelOffset: new Cesium.CallbackProperty(() => new Cesium.Cartesian2(0, PIN_TIP_FROM_BOTTOM * fxScale - 22 * fxScale * (1 - easeOut(progress(0, 3300) / 0.14))), false),
        color: new Cesium.CallbackProperty(() => {
          const p = progress(0, 3300);
          return Cesium.Color.WHITE.withAlpha(p < 0.14 ? p / 0.14 : p > 0.82 ? Math.max(0, 1 - (p - 0.82) / 0.18) : 1);
        }, false),
      },
    });

    // The dotted arc from the previous event, and a bright dot that travels along it.
    if (previous && (previous.lng !== coords.lng || previous.lat !== coords.lat)) {
      const arc = arcBetween([previous.lng, previous.lat], [coords.lng, coords.lat], 40);
      const cartesians = Cesium.Cartesian3.fromDegreesArray(arc.flat());
      add({
        polyline: {
          positions: cartesians, width: 2.5, clampToGround: true,
          material: new Cesium.PolylineDashMaterialProperty({ color: color.withAlpha(0.9), dashLength: 18 }),
        },
      });
      // The navigation arrow travels along the connector and faces along it.
      const indexNow = () => Math.min(Math.floor(progress(0, ARC_MS) * (arc.length - 1)), arc.length - 1);
      const lifted = arc.map(([lng, lat]) => Cesium.Cartesian3.fromDegrees(lng, lat, 60));
      let heading = 0;
      add({
        position: new Cesium.CallbackProperty(() => lifted[indexNow()], false),
        billboard: {
          image: arrowImage(css),
          scale: fxScale * 0.8,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          rotation: new Cesium.CallbackProperty(() => {
            const i = indexNow();
            const here = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, lifted[i]);
            const next = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, lifted[Math.min(i + 1, lifted.length - 1)]);
            if (here && next && (here.x !== next.x || here.y !== next.y)) heading = Math.atan2(next.y - here.y, next.x - here.x);
            return -heading;
          }, false),
        },
      });
    }
  }

  // One callout at a time: the previous chip goes when the next one arrives, as in the video.
  const old = lastCallout.get(viewer);
  if (old && source.entities.contains(old)) source.entities.remove(old);
  const label = source.entities.add({
    position: Cesium.Cartesian3.fromDegrees(coords.lng, coords.lat),
    label: {
      text: `▲  ${callout.tag} · ${callout.title}\n${callout.place}`,
      font: '600 20px sans-serif',
      fillColor: Cesium.Color.WHITE,
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString('#2a0a10').withAlpha(0.94),
      backgroundPadding: new Cesium.Cartesian2(12, 8),
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(26, -22),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  lastCallout.set(viewer, label);

  // The globe renders only when asked (request render mode), so ask while the animation runs.
  const tick = window.setInterval(() => { if (!viewer.isDestroyed()) viewer.scene.requestRender(); }, 40);
  window.setTimeout(() => {
    created.forEach((entity) => { if (source.entities.contains(entity)) source.entities.remove(entity); });
  }, RING_MS + 600);
  window.setTimeout(() => {
    window.clearInterval(tick);
    if (!viewer.isDestroyed()) {
      if (source.entities.contains(label)) source.entities.remove(label);
      viewer.scene.requestRender();
    }
  }, CALLOUT_MS);
}
