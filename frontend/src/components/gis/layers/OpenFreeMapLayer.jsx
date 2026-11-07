import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
void maplibregl;
export default function OpenFreeMapLayer({
  visible = false,
  styleUrl = "https://tiles.openfreemap.org/styles/liberty",
  onStatusChange = () => {},
}) {
  const map = useMap();
  useEffect(() => {
    if (!visible) return undefined;
    if (!map.getPane("ofmPane")) {
      map.createPane("ofmPane");
      map.getPane("ofmPane").style.zIndex = 250;
    }
    let glLayer;
    try {
      onStatusChange({ state: 'loading' });
      glLayer = L.maplibreGL({
        style: styleUrl,
        interactive: false,
        pane: "ofmPane",
      });
      glLayer.addTo(map);
      const cont =
        (glLayer.getContainer && glLayer.getContainer()) || glLayer._container;
      const pane = map.getPane("ofmPane");
      if (cont && pane && cont.parentElement !== pane) pane.appendChild(cont);
      const gl =
        (glLayer.getMaplibreMap && glLayer.getMaplibreMap()) || glLayer._glMap;
      if (gl) {
        const markReady = () => onStatusChange({ state: 'ready' });
        const markError = () => onStatusChange({ state: 'error' });
        gl.once?.('load', markReady);
        gl.once?.('error', markError);
        [80, 300, 800].forEach((ms) =>
          setTimeout(() => {
            try {
              gl.resize();
            } catch { void 0; }
          }, ms),
        );
      }
    } catch (e) {
      console.warn("[OpenFreeMap] layer failed to init:", e);
      onStatusChange({ state: 'error' });
      return undefined;
    }
    return () => {
      try {
        map.removeLayer(glLayer);
      } catch { void 0; }
    };
  }, [visible, map, styleUrl, onStatusChange]);
  return null;
}
