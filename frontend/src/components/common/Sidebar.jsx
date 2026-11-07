import { NavLink } from "react-router-dom";
import { useAlerts } from "../../context/useAlerts";
import { getDashboardPath } from "../../utils/navigation";
import {
  LayoutDashboard,
  Flame,
  Bell,
  MapPinned,
  TentTree,
} from "lucide-react";
export const Sidebar = ({ isOpen, onClose }) => {
  const { notifications = [], emergencyAreas = [] } = useAlerts();
  const unreadNotifsCount = notifications.filter(
    (notification) => !notification.read,
  ).length;
  const p1Count = emergencyAreas.filter(
    (area) => String(area.priorityQueue || "").toLowerCase() === "priority 1",
  ).length;
  const handleNavigation = () => {
    if (onClose) {
      onClose();
    }
  };
  const getNavClass = ({ isActive }) =>
    `sidebar-nav-link ${isActive ? "active" : ""}`;
  return (
    <>
      <div
        className={`mobile-sidebar-overlay ${isOpen ? "show" : ""}`}
        onClick={handleNavigation}
        aria-hidden={!isOpen}
      />

      <aside
        className={`ops-sidebar ${isOpen ? "open" : ""}`}
        aria-label="Authority navigation"
      >
        <nav className="sidebar-nav-container">

          <NavLink
            to={getDashboardPath()}
            end
            className={getNavClass}
            onClick={handleNavigation}
          >
            <div className="nav-left">
              <LayoutDashboard size={17} className="nav-icon" />

              <span>Back to Dashboard</span>
            </div>
          </NavLink>




          <NavLink
            to="/emergency"
            className={getNavClass}
            onClick={handleNavigation}
          >
            <div className="nav-left">
              <Flame size={17} className="nav-icon" />

              <span>Emergency</span>
            </div>

            {p1Count > 0 && (
              <span
                className="nav-badge-count"
                style={{
                  backgroundColor: "var(--high-risk)",
                }}
                title={`${p1Count} Priority 1 Zones`}
                aria-label={`${p1Count} Priority 1 zones`}
              >
                {p1Count}
              </span>
            )}
          </NavLink>


          <NavLink
            to="/notifications"
            className={getNavClass}
            onClick={handleNavigation}
          >
            <div className="nav-left">
              <Bell size={17} className="nav-icon" />

              <span>Notifications</span>
            </div>

            {unreadNotifsCount > 0 && (
              <span
                className="nav-badge-count"
                style={{
                  backgroundColor: "var(--info)",
                }}
                title={`${unreadNotifsCount} Unread Notifications`}
                aria-label={`${unreadNotifsCount} unread notifications`}
              >
                {unreadNotifsCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/habitations"
            className={getNavClass}
            onClick={handleNavigation}
          >
            <div className="nav-left">
              <MapPinned size={17} className="nav-icon" />
              <span>Habitations</span>
            </div>
          </NavLink>
          <NavLink
            to="/relocation-sites"
            className={getNavClass}
            onClick={handleNavigation}
          >
            <div className="nav-left">
              <TentTree size={17} className="nav-icon" />
              <span>Relocation Sites</span>
            </div>
          </NavLink>
        </nav>
      </aside>
    </>
  );
};
export default Sidebar;
