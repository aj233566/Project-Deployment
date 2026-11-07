import { NavLink } from "react-router-dom";
import { getDashboardPath } from "../utils/navigation";
function Sidebar() {
  return (
    <div className="cc-sidebar">
      <div className="cc-sidebar-title">SENETRY</div>

      <div className="cc-sidebar-menu">
        <NavLink
          to={getDashboardPath()}
          className={({ isActive }) =>
            isActive ? "cc-sidebar-link active" : "cc-sidebar-link"
          }
        >
          <span></span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/incidents"
          className={({ isActive }) =>
            isActive ? "cc-sidebar-link active" : "cc-sidebar-link"
          }
        >
          <span></span>
          <span>Incidents</span>
        </NavLink>

        <NavLink
          to="/weather"
          className={({ isActive }) =>
            isActive ? "cc-sidebar-link active" : "cc-sidebar-link"
          }
        >
          <span></span>
          <span>Weather</span>
        </NavLink>

        <NavLink
          to="/habitations"
          className={({ isActive }) =>
            isActive ? "cc-sidebar-link active" : "cc-sidebar-link"
          }
        >
          <span></span>
          <span>Habitations</span>
        </NavLink>

        <NavLink
          to="/relocation-sites"
          className={({ isActive }) =>
            isActive ? "cc-sidebar-link active" : "cc-sidebar-link"
          }
        >
          <span></span>
          <span>Relocation Sites</span>
        </NavLink>

        <NavLink
          to="/resources"
          className={({ isActive }) =>
            isActive ? "cc-sidebar-link active" : "cc-sidebar-link"
          }
        >
          <span></span>
          <span> Resources & Notifications</span>
        </NavLink>
      </div>
    </div>
  );
}
export default Sidebar;
