import { CESIUM_BASE_URL } from './photorealRoute';

// CesiumJS is large (about 1.7 MB), so it is not bundled: it loads from a CDN the first time the 3D globe tab opens.
let pending = null;

export function loadCesium() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Cesium needs a browser.'));
  if (window.Cesium) return Promise.resolve(window.Cesium);
  if (pending) return pending;
  window.CESIUM_BASE_URL = CESIUM_BASE_URL;
  pending = new Promise((resolve, reject) => {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = `${CESIUM_BASE_URL}Widgets/widgets.css`;
    document.head.appendChild(style);
    const script = document.createElement('script');
    script.src = `${CESIUM_BASE_URL}Cesium.js`;
    script.async = true;
    script.onload = () => (window.Cesium ? resolve(window.Cesium) : reject(new Error('Cesium loaded but is not available.')));
    script.onerror = () => { pending = null; reject(new Error('Could not load CesiumJS from the CDN.')); };
    document.head.appendChild(script);
  });
  return pending;
}
