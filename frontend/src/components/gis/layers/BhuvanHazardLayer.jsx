import { WMSTileLayer } from 'react-leaflet';
const BHUVAN_WMS = 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms';
const BHUVAN_LAYER = 'india3';                                              
export default function BhuvanHazardLayer({ visible = false }) {
  if (!visible) return null;
  return (
    <WMSTileLayer
      url={BHUVAN_WMS}
      layers={BHUVAN_LAYER}
      format="image/png"
      transparent={true}
      version="1.1.1"
      opacity={0.75}
      zIndex={640}
      attribution="&copy; ISRO / NRSC Bhuvan"
    />
  );
}
