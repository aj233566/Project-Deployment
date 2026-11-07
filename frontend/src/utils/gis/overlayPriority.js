export const PRIORITY_WEIGHTS = {
  CRITICAL_INCIDENT: 100,
  BLOCKED_ROAD: 90,
  PRIMARY_ROUTE: 75,
  FACILITY_ALERT: 70,
  SIMULATION_TARGET: 65,
  SELECTED_ENTITY: 60,
  ISOLATED_VILLAGE: 50,
  WARNING_INCIDENT: 45,
  ROUTINE_RESOURCE: 40,
  ROUTINE_FACILITY: 30,
  ROUTINE_ROAD: 20
};
export function shouldShowLabel(priority, hudMode = 'tactical', isSelected = false, isHovered = false) {
  if (isSelected || isHovered) return true;
  if (hudMode === 'minimal') {
    return priority >= 95;
  }
  if (hudMode === 'operator') {
    return priority >= 85;
  }
  return priority >= 90;
}
