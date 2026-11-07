// Building rendering for the CesiumJS globe: styling of Cesium OSM Buildings, sun shadows, and the Overture pilot layer.
import { PILOTS, PILOT_SOURCE, buildInstances, pilotForPosition } from './pilotBuildings';

const PILOT_HALF_DEG = 0.015;
const NEAR_GROUND_M = 6000;
const SHADOW_BELOW_M = 4500;
// 16:00 India time: a low sun from the west that throws readable shadows.
const SHADOW_TIME = '2026-10-30T10:30:00Z';

// Colours by how the height is known: recorded OSM heights use pale blue-grey, floors use mid grey, and unknown heights
// use light grey so every footprint stays visible against the satellite imagery.
export function osmBuildingStyle(Cesium) {
  const recorded = "${feature['height']} !== undefined";
  const tall = "${feature['cesium#estimatedHeight']}";
  return new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        [`${recorded} && ${tall} > 60`, "color('#f7f9fb')"],
        [`${recorded} && ${tall} > 25`, "color('#e1e7ed')"],
        [recorded, "color('#cbd4dd')"],
        ["${feature['building:levels']} !== undefined", "color('#bdc7d1')"],
        ['true', "color('#dce2e8')"],
      ],
    },
  });
}

// Real sun shadows, switched on only when the camera is close (shadow maps are expensive over a whole country).
export function setupShadows(Cesium, viewer, osmTileset) {
  const { scene } = viewer;
  viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(SHADOW_TIME);
  viewer.clock.shouldAnimate = false;
  viewer.shadowMap.softShadows = true;
  viewer.shadowMap.size = 2048;
  viewer.shadowMap.darkness = 0.5;
  viewer.shadowMap.maximumDistance = 6000;
  if (osmTileset) osmTileset.shadows = Cesium.ShadowMode.ENABLED;
  viewer.camera.percentageChanged = 0.05;
  const update = () => {
    const near = viewer.camera.positionCartographic.height < SHADOW_BELOW_M;
    if (viewer.shadows !== near) viewer.shadows = near;
    scene.requestRender();
  };
  viewer.camera.changed.addEventListener(update);
  update();
  return () => viewer.camera.changed.removeEventListener(update);
}

// Loads each pilot area's Overture buildings when the camera comes near, draws them as one batched primitive, and hides
// Cesium OSM Buildings inside the area when Overture is the better source there (see PILOT_SOURCE).
export function createPilotManager({ Cesium, viewer, osmTileset, onChange }) {
  const layers = new Map();
  const loading = new Set();
  let activeKey = null;
  let disposed = false;

  const clipBox = (pilot) => {
    const [lng, lat] = pilot.center;
    const h = PILOT_HALF_DEG;
    return new Cesium.ClippingPolygon({ positions: Cesium.Cartesian3.fromDegreesArray([lng - h, lat - h, lng + h, lat - h, lng + h, lat + h, lng - h, lat + h]) });
  };

  const apply = (key) => {
    const layer = layers.get(key);
    if (!layer) return;
    layer.primitive.show = layer.source === 'overture';
    if (osmTileset) {
      osmTileset.clippingPolygons = layer.source === 'overture' ? new Cesium.ClippingPolygonCollection({ polygons: [clipBox(layer.pilot)] }) : undefined;
    }
    viewer.scene.requestRender();
    onChange({ pilot: { key, name: layer.pilot.name, source: layer.source, counts: layer.counts, chosen: PILOT_SOURCE[key] } });
  };

  async function load(pilot) {
    if (loading.has(pilot.key) || layers.has(pilot.key)) return;
    loading.add(pilot.key);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/buildings/${pilot.key}.json`);
      if (!response.ok) throw new Error(`data file missing (${response.status})`);
      const { instances, counts } = buildInstances(await response.json());
      const [lng, lat] = pilot.center;
      const [sample] = await Cesium.sampleTerrainMostDetailed(viewer.scene.terrainProvider, [Cesium.Cartographic.fromDegrees(lng, lat)]);
      const ground = Number.isFinite(sample?.height) ? sample.height : 0;
      const geometryInstances = instances.map((b) => {
        const flat = b.ring.slice(0, -1).flatMap(([x, y]) => [x, y]);
        return new Cesium.GeometryInstance({
          geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(flat)),
            height: ground + b.base,
            extrudedHeight: ground + b.top,
            vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
          }),
          attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromBytes(b.color[0], b.color[1], b.color[2], 255)) },
        });
      });
      if (disposed) return;
      const primitive = new Cesium.Primitive({
        geometryInstances,
        appearance: new Cesium.PerInstanceColorAppearance({ closed: true, translucent: false }),
        asynchronous: true,
        shadows: Cesium.ShadowMode.ENABLED,
      });
      viewer.scene.primitives.add(primitive);
      layers.set(pilot.key, { pilot, primitive, counts: { ...counts, total: instances.length }, source: PILOT_SOURCE[pilot.key] || 'osm' });
      apply(pilot.key);
    } catch (error) {
      onChange({ pilotError: `${pilot.name}: ${error.message}` });
    } finally {
      loading.delete(pilot.key);
    }
  }

  const check = () => {
    const position = viewer.camera.positionCartographic;
    const pilot = position.height < NEAR_GROUND_M
      ? pilotForPosition(Cesium.Math.toDegrees(position.longitude), Cesium.Math.toDegrees(position.latitude))
      : null;
    if ((pilot?.key || null) === activeKey) return;
    activeKey = pilot?.key || null;
    if (!pilot) { onChange({ pilot: null }); return; }
    if (layers.has(pilot.key)) apply(pilot.key); else void load(pilot);
  };
  viewer.camera.changed.addEventListener(check);
  viewer.camera.moveEnd.addEventListener(check);

  return {
    check,
    // Switch the open pilot area between Overture and Cesium OSM Buildings, to compare them on the same streets.
    toggleSource() {
      const layer = layers.get(activeKey);
      if (!layer) return;
      layer.source = layer.source === 'overture' ? 'osm' : 'overture';
      apply(activeKey);
    },
    dispose() {
      disposed = true;
      viewer.camera.changed.removeEventListener(check);
      viewer.camera.moveEnd.removeEventListener(check);
      for (const { primitive } of layers.values()) if (!viewer.isDestroyed()) viewer.scene.primitives.remove(primitive);
      if (osmTileset && !osmTileset.isDestroyed()) osmTileset.clippingPolygons = undefined;
    },
  };
}

export { PILOTS };
