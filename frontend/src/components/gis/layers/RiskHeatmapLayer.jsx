import { memo } from 'react';
import { Circle, Tooltip } from 'react-leaflet';
function RiskHeatmapLayer({
  nodes = [],
  visible = true,
  onSelectNode
}) {
  if (!visible || !Array.isArray(nodes) || nodes.length === 0) {
    return null;
  }
  const getHeatmapColor = (intensity) => {
    if (intensity >= 0.80) return '#D64545';            
    if (intensity >= 0.60) return '#DF6D38';        
    if (intensity >= 0.35) return '#C9A227';           
    return '#3D8B63';                                      
  };
  return (
    <>
      {nodes.map((node) => {
        const color = getHeatmapColor(node.intensity);
        const fillOpacity = node.isPeriphery
          ? Math.max(0.12, node.intensity * 0.28)
          : Math.max(0.20, node.intensity * 0.42);
        return (
          <Circle
            key={node.id}
            center={[node.lat, node.lng]}
            radius={node.radiusMeters || 1200}
            pane="gisRiskPane"
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: fillOpacity,
              weight: node.isPeriphery ? 0.8 : 1.5,
              opacity: node.isPeriphery ? 0.35 : 0.65,
              dashArray: node.isPeriphery ? '4, 6' : undefined,
              interactive: !node.isPeriphery                                          
            }}
            eventHandlers={
              onSelectNode && !node.isPeriphery
                ? { click: () => onSelectNode(node) }
                : undefined
            }
          >
            {!node.isPeriphery && (
              <Tooltip sticky className="gis-tactical-tooltip-contextual">
                <span>
                  RISK INDEX: {node.name} [{Number.isFinite(node.intensity) ? node.intensity.toFixed(2) : "UNAVAILABLE"} / 1.00]
                </span>
              </Tooltip>
            )}
          </Circle>
        );
      })}
    </>
  );
}
export default memo(RiskHeatmapLayer);
