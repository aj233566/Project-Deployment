export const calculateRiskLevel = (score, thresholds = { critical: 80, high: 65, moderate: 40 }) => {
  if (score >= thresholds.critical) return 'Critical';
  if (score >= thresholds.high) return 'High';
  if (score >= thresholds.moderate) return 'Moderate';
  return 'Low';
};
export const calculatePriorityScore = (area) => {
  const riskWeight = 0.40;
  const popWeight = 0.25;
  const roadWeight = 0.20;
  const resourceWeight = 0.15;
  const riskComponent = area.riskScore || 50;
  const popComponent = Math.min(100, ((area.affectedPopulation || 1000) / 15000) * 100);
  let roadComponent = 20;
  if (area.roadStatus === 'Blocked') roadComponent = 100;
  else if (area.roadStatus === 'Partially Obstructed') roadComponent = 60;
  const teamsCount = area.availableResources?.assignedTeams?.length || 0;
  const ambulanceCount = area.availableResources?.ambulances || 0;
  let resourceDeficit = 50;
  if (teamsCount === 0 || ambulanceCount === 0) resourceDeficit = 95;
  else if (teamsCount >= 2 && ambulanceCount >= 4) resourceDeficit = 25;
  const totalScore = (
    riskComponent * riskWeight +
    popComponent * popWeight +
    roadComponent * roadWeight +
    resourceDeficit * resourceWeight
  );
  return Math.round(totalScore);
};
export const determinePriorityQueue = (priorityScore, riskLevel, roadStatus) => {
  if (riskLevel === 'Critical' || priorityScore >= 75 || roadStatus === 'Blocked') {
    return 'Priority 1';
  }
  if (riskLevel === 'High' || priorityScore >= 55) {
    return 'Priority 2';
  }
  return 'Priority 3';
};
