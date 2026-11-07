import { memo } from 'react';
import { Tooltip } from 'react-leaflet';
import GisMarker from '../GisMarker';
import MapPopup from '../MapPopup';
function ResourceLayer({
  resources = [],
  visible = true,
  selectedResourceId = null,
  onSelectResource
}) {
  if (!visible) return null;
  const validResources = Array.isArray(resources)
    ? resources.filter(
        (res) =>
          res &&
          res.location &&
          typeof res.location.lat === 'number' &&
          !isNaN(res.location.lat) &&
          typeof res.location.lng === 'number' &&
          !isNaN(res.location.lng)
      )
    : [];
  return (
    <>
      {validResources.map((resource) => {
        const isSelected = selectedResourceId === resource.id;
        const position = [resource.location.lat, resource.location.lng];
        return (
          <GisMarker
            key={resource.id}
            kind="resource"
            resourceType={resource.type}
            status={resource.status}
            position={position}
            isSelected={isSelected}
            onClick={onSelectResource ? () => onSelectResource(resource) : undefined}
          >
            {isSelected ? (
              <Tooltip
                permanent
                direction="top"
                offset={[0, -18]}
                className="gis-tactical-label-permanent restored-label"
              >
                <span>[{resource.id}] {resource.name.toUpperCase()} (ACTIVE TARGET)</span>
              </Tooltip>
            ) : (
              <Tooltip direction="top" offset={[0, -18]} className="gis-tactical-tooltip-contextual">
                <span>{resource.id}: {resource.name} [{resource.status}]</span>
              </Tooltip>
            )}

            <MapPopup
              title={resource.name}
              type={`Emergency Resource (${resource.type})`}
              severity={resource.status === 'Deployed' ? 'High' : 'Operational'}
              status={resource.status}
              location={resource.location}
              description={resource.equipment ? `Equipment: ${resource.equipment}` : null}
              metrics={[
                { label: 'Resource ID', value: resource.id },
                { label: 'Personnel', value: resource.personnelCount ? `${resource.personnelCount} Responders` : 'N/A' },
                {
                  label: 'Assignment',
                  value: resource.assignedIncidentId ? `Assigned to ${resource.assignedIncidentId}` : 'Standby / Unassigned'
                }
              ]}
            />
          </GisMarker>
        );
      })}
    </>
  );
}
export default memo(ResourceLayer);
