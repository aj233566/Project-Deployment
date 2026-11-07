import { getStoredUser, getToken } from "../context/session.js";
export { getLoginPath } from "./loginRouting.js";
export function getDashboardPath(user = getStoredUser()) {
  if (!getToken() || !user) return "/login";
  if (user.role === "admin") return "/admin";
  if (user.role === "authority" && user.authorityStatus === "verified") {
    return "/dashboard/authority";
  }
  if (user.role === "citizen") return "/dashboard/citizen";
  return "/login";
}
export function getIncidentsPath(user = getStoredUser()) {
  return user?.role === "citizen" ? "/citizen/incidents" : "/incidents";
}
export function getResourcesPath(user = getStoredUser()) {
  return user?.role === "citizen" ? "/emergency-resources" : "/resources";
}
export function getAuthorityNavigationGroups(user = getStoredUser()) {
  if (user?.role !== "authority") return [];
  return [
    { label: "Command Center", to: getDashboardPath(user) },
    {
      label: "Incident",
      links: [
        { label: "Incidents", to: "/incidents" },
        { label: "Report Incident", to: "/report-incident" },
      ],
    },
    { label: "Weather", to: "/weather" },
    {
      label: "Notification",
      links: [
        { label: "Alerts", to: "/alerts" },
        { label: "Notifications", to: "/notifications" },
      ],
    },
    {
      label: "Emergency Resource",
      links: [
        { label: "Emergency Resources", to: "/emergency-resources" },
        { label: "Resources", to: "/resources" },
        { label: "Habitations", to: "/habitations" },
        { label: "Relocation Sites", to: "/relocation-sites" },
        { label: "Emergency", to: "/emergency" },
      ],
    },
  ];
}
export function getCitizenNavigationGroups(user = getStoredUser()) {
  if (user?.role !== "citizen") return [];
  return [
    { label: "Dashboard", to: getDashboardPath(user) },
    { label: "Weather", to: "/weather" },
    {
      label: "Incident",
      links: [
        { label: "My Incidents", to: "/citizen/incidents" },
        { label: "Report Incident", to: "/report-incident" },
      ],
    },
    {
      label: "Emergency Resources",
      links: [
        { label: "Emergency Resources", to: "/emergency-resources" },
        { label: "Habitations", to: "/habitations" },
        { label: "Relocation Sites", to: "/relocation-sites" },
      ],
    },
  ];
}
export function getNavigationLinks(user = getStoredUser()) {
  const common = [
    { label: "Dashboard", to: getDashboardPath(user) },
    { label: "Weather", to: "/weather" },
    { label: "Habitations", to: "/habitations" },
    { label: "Relocation Sites", to: "/relocation-sites" },
    { label: "Emergency Resources", to: "/emergency-resources" },
  ];
  if (user?.role === "citizen") {
    return [
      common[0],
      { label: "My Incidents", to: "/citizen/incidents" },
      { label: "Report Incident", to: "/report-incident" },
      ...common.slice(1),
    ];
  }
  const authorityLinks = [
    common[0],
    { label: "Overview", to: "/operations-overview" },
    { label: "Incidents", to: "/incidents" },
    ...(user?.role === "authority" ? [{ label: "Report Incident", to: "/report-incident" }] : []),
    { label: "Alerts", to: "/alerts" },
    { label: "Emergency", to: "/emergency" },
    { label: "Notifications", to: "/notifications" },
    ...common.slice(2, 4),
    { label: "Resources", to: "/resources" },
    common[1],
    common[4],
  ];
  return authorityLinks;
}
