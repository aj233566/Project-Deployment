import React, { memo, useMemo } from "react";
import { Circle, CircleMarker, Polyline, Tooltip } from "react-leaflet";
const SEARCH_RADIUS_KM = 5;
const MAX_ROADS = 2;
const MAX_HOSPITALS = 3;
const MAX_SHELTERS = 3;
const MAX_VILLAGES = 3;
const MAX_RESOURCES = 3;
function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const lat1 = Number(a.lat);
  const lng1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lng2 = Number(b.lng);
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return Infinity;
  }
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const aValue =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) *
      Math.cos(p2) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(
    Math.sqrt(aValue),
    Math.sqrt(1 - aValue)
  );
  return R * c;
}
function locationOf(item) {
  if (!item?.location) return null;
  const lat = Number(item.location.lat);
  const lng = Number(item.location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}
function findNearbyPoints(items, incidentLocation, limit) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const location = locationOf(item);
      if (!location) {
        return null;
      }
      const distance = distanceKm(
        incidentLocation,
        location
      );
      return {
        item,
        location,
        distanceKm: distance,
      };
    })
    .filter(
      (entry) =>
        entry &&
        Number.isFinite(entry.distanceKm) &&
        entry.distanceKm <= SEARCH_RADIUS_KM
    )
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
function findNearbyRoads(roads, incidentLocation, limit) {
  return (Array.isArray(roads) ? roads : [])
    .map((road) => {
      const coordinates = Array.isArray(road.coordinates)
        ? road.coordinates
        : [];
      const validPoints = coordinates
        .map((point) => {
          if (!Array.isArray(point) || point.length < 2) {
            return null;
          }
          const lat = Number(point[0]);
          const lng = Number(point[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }
          return { lat, lng };
        })
        .filter(Boolean);
      if (validPoints.length === 0) {
        return null;
      }
      const distances = validPoints.map((point) =>
        distanceKm(incidentLocation, point)
      );
      const nearestDistance = Math.min(...distances);
      return {
        road,
        distanceKm: nearestDistance,
      };
    })
    .filter(
      (entry) =>
        entry &&
        Number.isFinite(entry.distanceKm) &&
        entry.distanceKm <= SEARCH_RADIUS_KM
    )
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
function formatDistance(distance) {
  if (!Number.isFinite(distance)) {
    return "—";
  }
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
}
function featureName(item, fallback) {
  return (
    item?.name ||
    item?.title ||
    item?.location?.address ||
    fallback
  );
}
function statusColor(status) {
  const value = String(status || "").toLowerCase();
  if (
    value.includes("blocked") ||
    value.includes("closed") ||
    value.includes("isolated")
  ) {
    return "#F0555A";
  }
  if (
    value.includes("restricted") ||
    value.includes("warning")
  ) {
    return "#E6B92E";
  }
  return "#34C77B";
}
function IncidentResponseLayer({
  incident = null,
  roads = [],
  hospitals = [],
  shelters = [],
  villages = [],
  resources = [],
  visible = true,
}) {
  const incidentLocation = useMemo(() => {
    return locationOf(incident);
  }, [incident]);
  const nearby = useMemo(() => {
    if (!incidentLocation) {
      return {
        roads: [],
        hospitals: [],
        shelters: [],
        villages: [],
        resources: [],
      };
    }
    return {
      roads: findNearbyRoads(
        roads,
        incidentLocation,
        MAX_ROADS
      ),
      hospitals: findNearbyPoints(
        hospitals,
        incidentLocation,
        MAX_HOSPITALS
      ),
      shelters: findNearbyPoints(
        shelters,
        incidentLocation,
        MAX_SHELTERS
      ),
      villages: findNearbyPoints(
        villages,
        incidentLocation,
        MAX_VILLAGES
      ),
      resources: findNearbyPoints(
        resources,
        incidentLocation,
        MAX_RESOURCES
      ),
    };
  }, [
    incidentLocation,
    roads,
    hospitals,
    shelters,
    villages,
    resources,
  ]);
  if (!visible || !incidentLocation) {
    return null;
  }
  const incidentPosition = [
    incidentLocation.lat,
    incidentLocation.lng,
  ];
  return (
    <>
      <Circle
        center={incidentPosition}
        radius={SEARCH_RADIUS_KM * 1000}
        pathOptions={{
          color: "#F0555A",
          weight: 1.5,
          opacity: 0.55,
          fillOpacity: 0.035,
          dashArray: "8 8",
        }}
      >
        <Tooltip sticky>
          <strong>INCIDENT RESPONSE AREA</strong>
          <br />
          Searching nearby roads, hospitals, shelters,
          villages and resources.
        </Tooltip>
      </Circle>

      {nearby.roads.map(({ road, distanceKm }) => {
        const coordinates = (road.coordinates || [])
          .map((point) => [
            Number(point[0]),
            Number(point[1]),
          ])
          .filter(
            (point) =>
              Number.isFinite(point[0]) &&
              Number.isFinite(point[1])
          );
        if (coordinates.length < 2) {
          return null;
        }
        const roadColor = statusColor(road.status);
        return (
          <React.Fragment key={`response-road-${road.id}`}>
            <Polyline
              positions={coordinates}
              pathOptions={{
                color: "#FFFFFF",
                weight: 8,
                opacity: 0.45,
              }}
            />

            <Polyline
              positions={coordinates}
              pathOptions={{
                color: roadColor,
                weight: 4,
                opacity: 1,
                dashArray:
                  String(road.status || "").toLowerCase() ===
                  "blocked"
                    ? "10 7"
                    : undefined,
              }}
            >
              <Tooltip sticky>
                <strong>🛣 NEARBY ROAD</strong>
                <br />
                {featureName(road, "Road")}
                <br />
                Distance: {formatDistance(distanceKm)}
                <br />
                Status: {road.status || "Unknown"}
              </Tooltip>
            </Polyline>
          </React.Fragment>
        );
      })}

      {nearby.hospitals.map(
        ({ item, location, distanceKm }, index) => (
          <CircleMarker
            key={`response-hospital-${item.id || index}`}
            center={[location.lat, location.lng]}
            radius={9}
            pathOptions={{
              color: "#FFFFFF",
              weight: 2,
              fillColor: "#4DA3FF",
              fillOpacity: 0.95,
            }}
          >
            <Tooltip sticky direction="right" className="gis-tactical-tooltip-contextual">
              <strong>🏥 HOSPITAL</strong>
              <br />
              {featureName(item, "Hospital")}
              <br />
              <span>
                {formatDistance(distanceKm)} from incident
              </span>
              {item.availableBeds != null ? (
                <>
                  <br />
                  Beds available: {item.availableBeds}
                </>
              ) : null}
            </Tooltip>
          </CircleMarker>
        )
      )}

      {nearby.shelters.map(
        ({ item, location, distanceKm }, index) => (
          <CircleMarker
            key={`response-shelter-${item.id || index}`}
            center={[location.lat, location.lng]}
            radius={9}
            pathOptions={{
              color: "#FFFFFF",
              weight: 2,
              fillColor: "#34C77B",
              fillOpacity: 0.95,
            }}
          >
            <Tooltip sticky direction="right" className="gis-tactical-tooltip-contextual">
              <strong>🛟 SHELTER</strong>
              <br />
              {featureName(item, "Relief Shelter")}
              <br />
              <span>
                {formatDistance(distanceKm)} from incident
              </span>
              {item.totalCapacity != null ? (
                <>
                  <br />
                  Capacity: {item.totalCapacity}
                </>
              ) : null}
            </Tooltip>
          </CircleMarker>
        )
      )}

      {nearby.villages.map(
        ({ item, location, distanceKm }, index) => (
          <CircleMarker
            key={`response-village-${item.id || index}`}
            center={[location.lat, location.lng]}
            radius={7}
            pathOptions={{
              color: "#FFFFFF",
              weight: 1.5,
              fillColor: "#E6B92E",
              fillOpacity: 0.95,
            }}
          >
            <Tooltip sticky direction="right" className="gis-tactical-tooltip-contextual">
              <strong>🏘 VILLAGE</strong>
              <br />
              {featureName(item, "Village")}
              <br />
              {formatDistance(distanceKm)} from incident
              {item.population != null ? (
                <>
                  <br />
                  Population: {item.population}
                </>
              ) : null}
              {item.connectivityStatus ? (
                <>
                  <br />
                  Access: {item.connectivityStatus}
                </>
              ) : null}
            </Tooltip>
          </CircleMarker>
        )
      )}

      {nearby.resources.map(
        ({ item, location, distanceKm }, index) => (
          <CircleMarker
            key={`response-resource-${item.id || index}`}
            center={[location.lat, location.lng]}
            radius={8}
            pathOptions={{
              color: "#FFFFFF",
              weight: 2,
              fillColor: "#B58CFF",
              fillOpacity: 0.95,
            }}
          >
            <Tooltip sticky direction="right" className="gis-tactical-tooltip-contextual">
              <strong>🚑 RESPONSE RESOURCE</strong>
              <br />
              {featureName(item, "Response Unit")}
              <br />
              {formatDistance(distanceKm)} from incident
              {item.status ? (
                <>
                  <br />
                  Status: {item.status}
                </>
              ) : null}
            </Tooltip>
          </CircleMarker>
        )
      )}
    </>
  );
}
export default memo(IncidentResponseLayer);
