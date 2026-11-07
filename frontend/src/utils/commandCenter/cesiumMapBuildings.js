import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';
import { ThreeDManager } from 'maplibre-gl-three';
import * as THREE from 'three';
import { CESIUM_OSM_BUILDINGS_LAYER_ID } from './map3dStyle';

export { CESIUM_OSM_BUILDINGS_LAYER_ID };

export const CESIUM_OSM_BUILDINGS_ASSET_ID = 96188;

function styleBuildingModel(scene) {
  scene.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material?.color instanceof THREE.Color)) continue;
      // Keep Cesium's per-material and vertex colours: painting every roof the
      // same pale grey makes dense city blocks look like oversized white blobs.
      // A restrained tint darkens the buildings enough to read against imagery
      // while preserving the source's variation and the tile's real geometry.
      material.color.multiply(new THREE.Color('#aebbc5'));
      material.roughness = 0.92;
      material.metalness = 0;
      material.needsUpdate = true;
    }
  });
}

// Mount Cesium's streamed OSM 3D Tiles in MapLibre's existing WebGL scene.
export function mountCesiumOsmBuildings(map, apiToken, onStatus = () => {}) {
  let disposed = false;
  let manager = null;
  let layer = null;
  let tiles = null;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    map.off('remove', cleanup);
    if (tiles) {
      tiles.removeEventListener('load-root-tileset', handleRootLoaded);
      tiles.removeEventListener('load-model', handleModelLoaded);
      tiles.removeEventListener('load-error', handleLoadError);
    }
    if (layer && map.getLayer(CESIUM_OSM_BUILDINGS_LAYER_ID)) map.removeLayer(CESIUM_OSM_BUILDINGS_LAYER_ID);
    if (manager && !manager.isDestroyed()) manager.destroy();
  };

  const handleRootLoaded = () => {
    if (!disposed) onStatus('ready');
  };
  const handleModelLoaded = ({ scene }) => {
    if (!disposed && scene) styleBuildingModel(scene);
  };
  const handleLoadError = (event) => {
    if (!disposed && !event.tile) {
      onStatus('error', event.error);
      cleanup();
    }
  };

  map.on('remove', cleanup);
  onStatus('loading');

  void (async () => {
    try {
      manager = new ThreeDManager();
      await manager.init();
      if (disposed) {
        if (!manager.isDestroyed()) manager.destroy();
        return;
      }

      layer = manager.createLayer({
        id: CESIUM_OSM_BUILDINGS_LAYER_ID,
        separatorBefore: false,
        separatorAfter: false,
      });
      const asset = await layer.load3dTiles({
        tilesetUrl: `https://api.cesium.com/v1/assets/${CESIUM_OSM_BUILDINGS_ASSET_ID}/endpoint`,
      });
      if (disposed) return;

      tiles = asset.getTilesRenderer();
      tiles.addEventListener('load-root-tileset', handleRootLoaded);
      tiles.addEventListener('load-model', handleModelLoaded);
      tiles.addEventListener('load-error', handleLoadError);
      tiles.registerPlugin(new CesiumIonAuthPlugin({
        apiToken,
        assetId: CESIUM_OSM_BUILDINGS_ASSET_ID,
        autoRefreshToken: true,
      }));
      map.addLayer(layer, 'buildings-flat');
      onStatus('streaming');
    } catch (error) {
      if (!disposed) {
        onStatus('error', error);
        cleanup();
      }
    }
  })();

  return cleanup;
}
