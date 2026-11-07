import { memo } from 'react';
import { Tooltip } from 'react-leaflet';
import GisMarker from '../GisMarker';
import MapPopup from '../MapPopup';
import { shouldShowLabel, PRIORITY_WEIGHTS } from '../../../utils/gis/overlayPriority';
function FacilityLayer({
  hospitals = [],
  shelters = [],
  visibleHospitals = true,
  visibleShelters = true,
  selectedFacilityId = null,
  onSelectFacility,
  hudMode = 'tactical'
}) {
  return (
    <>
      {visibleHospitals &&
        hospitals.map((hospital) => {
          if (!hospital.location
            || !Number.isFinite(hospital.location.lat)
            || !Number.isFinite(hospital.location.lng)) return null;
          const isSelected = selectedFacilityId === hospital.id;
          const isAccessBlocked = (hospital.roadAccess || '').toLowerCase() === 'blocked';
          const isAccessOpen = (hospital.roadAccess || '').toLowerCase() === 'open';
          const roadAccess = hospital.roadAccess || 'Not recorded';
          const availableBeds = Number.isFinite(hospital.availableBeds)
            ? String(hospital.availableBeds)
            : 'Unavailable';
          const position = [hospital.location.lat, hospital.location.lng];
          const priority = isAccessBlocked
            ? PRIORITY_WEIGHTS.FACILITY_ALERT
            : PRIORITY_WEIGHTS.ROUTINE_FACILITY;
          const showLabel = shouldShowLabel(priority, hudMode, isSelected);
          return (
            <GisMarker
              key={hospital.id}
              kind="hospital"
              position={position}
              severity={isAccessBlocked ? 'Critical' : 'Unknown'}
              isSelected={isSelected}
              onClick={onSelectFacility ? () => onSelectFacility(hospital) : undefined}
            >
              {showLabel && isSelected ? (
                <Tooltip
                  permanent
                  direction="left"
                  offset={[-16, 0]}
                  className={`gis-tactical-label-permanent ${isAccessBlocked ? 'blocked-road-label' : 'facility-label'}`}
                >
                  <span>[{hospital.id}] {isAccessBlocked ? 'ACCESS BLOCKED' : isAccessOpen ? 'ACCESS OPEN' : 'ACCESS UNKNOWN'}</span>
                </Tooltip>
              ) : (
                <Tooltip direction="left" offset={[-14, 0]} className="gis-tactical-tooltip-contextual">
                  <span>[{hospital.id}] {hospital.name} ({availableBeds} beds)</span>
                </Tooltip>
              )}

              <MapPopup
                title={hospital.name}
                type="Medical Facility"
                severity={isAccessBlocked ? 'Critical' : 'Unknown'}
                status={hospital.status || 'Not recorded'}
                location={hospital.location}
                metrics={[
                  { label: 'Facility ID', value: hospital.id },
                  { label: 'Road Access', value: roadAccess },
                  { label: 'Available Beds', value: availableBeds }
                ]}
              />
            </GisMarker>
          );
        })}

      {visibleShelters &&
        shelters.map((shelter) => {
          if (!shelter.location
            || !Number.isFinite(shelter.location.lat)
            || !Number.isFinite(shelter.location.lng)) return null;
          const isSelected = selectedFacilityId === shelter.id;
          const occupancy = Number.isFinite(shelter.occupancy) ? String(shelter.occupancy) : 'Unavailable';
          const capacity = Number.isFinite(shelter.capacity) ? String(shelter.capacity) : 'Unavailable';
          const position = [shelter.location.lat, shelter.location.lng];
          return (
            <GisMarker
              key={shelter.id}
              kind="shelter"
              position={position}
              severity="Unknown"
              isSelected={isSelected}
              onClick={onSelectFacility ? () => onSelectFacility(shelter) : undefined}
            >
              <Tooltip direction="top" offset={[0, -18]} className="gis-tactical-tooltip-contextual">
                <span>[{shelter.id}] {shelter.name} ({occupancy}/{capacity})</span>
              </Tooltip>

              <MapPopup
                title={shelter.name}
                type="Relief Shelter"
                severity="Unknown"
                status={shelter.status || 'Not recorded'}
                location={shelter.location}
                metrics={[
                  { label: 'Shelter ID', value: shelter.id },
                  { label: 'Capacity', value: `${occupancy} / ${capacity}` }
                ]}
              />
            </GisMarker>
          );
        })}
    </>
  );
}
export default memo(FacilityLayer);
