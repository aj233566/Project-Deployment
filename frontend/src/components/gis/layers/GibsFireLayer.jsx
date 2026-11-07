import { WMSTileLayer } from 'react-leaflet';
function recentGibsDate() {
  const d = new Date(Date.now() - 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);              
}
export default function GibsFireLayer({ visible = false }) {
  if (!visible) return null;
  return (
    <WMSTileLayer
      url="https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi"
      layers="VIIRS_SNPP_Thermal_Anomalies_375m_All"
      format="image/png"
      transparent={true}
      version="1.3.0"
      time={recentGibsDate()}
      opacity={0.9}
      zIndex={650}
      attribution="Active fire / thermal anomalies &copy; NASA EOSDIS GIBS (VIIRS SNPP 375m)"
    />
  );
}
