import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import { getStoredUser, getToken } from "../context/session";
import { applyTheme, getSavedTheme } from "../utils/theme.js";
import { getAuthorityNavigationGroups, getCitizenNavigationGroups, getDashboardPath, getNavigationLinks } from "../utils/navigation";
import "../css/navbar.css";
function Navbar() {
  const location = useLocation();
  const user = getStoredUser();
  const isGroupedNav = user?.role === "authority" || user?.role === "citizen";
  const isAuthenticated = Boolean(user && getToken());
  const [isDark, setIsDark] = useState(() => getSavedTheme() === "dark");
  const menuKey = `${location.pathname}:${user?.role || "guest"}`;
  const [menuState, setMenuState] = useState({ key: menuKey, isNavOpen: false, openDropdown: null });
  const currentMenuState = menuState.key === menuKey
    ? menuState
    : { key: menuKey, isNavOpen: false, openDropdown: null };
  const isNavOpen = currentMenuState.isNavOpen;
  const openDropdown = currentMenuState.openDropdown;
  const navRef = useRef(null);
  const navigate = useNavigate();
  const dashboardPath = getDashboardPath(user);
  const navigationLinks = getNavigationLinks(user);
  const groupedNavigationGroups = user?.role === "authority"
    ? getAuthorityNavigationGroups(user)
    : getCitizenNavigationGroups(user);
  const canGoBack = Number(window.history.state?.idx) > 0;
  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    applyTheme(nextTheme);
    setIsDark(nextTheme === "dark");
  };
  const closeMenu = () => {
    setMenuState({ key: menuKey, isNavOpen: false, openDropdown: null });
  };
  const updateDropdown = (update) => setMenuState((previous) => {
    const currentDropdown = previous.key === menuKey ? previous.openDropdown : null;
    const currentNavOpen = previous.key === menuKey && previous.isNavOpen;
    return {
      key: menuKey,
      isNavOpen: currentNavOpen,
      openDropdown: typeof update === "function" ? update(currentDropdown) : update,
    };
  });
  useEffect(() => {
    const closeOnOutsidePointer = (event) => {
      if (isGroupedNav && !navRef.current?.contains(event.target)) {
        setMenuState({ key: menuKey, isNavOpen: false, openDropdown: null });
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isGroupedNav, menuKey]);
  return (
    <nav ref={navRef} className={`navbar navbar-expand-xxl senetry-navbar px-3 px-xl-4${isGroupedNav ? " grouped-navbar" : ""}`} aria-label="Main navigation">
      <div className="container-fluid">

        <NavLink className="navbar-brand fw-bold" to={dashboardPath} onClick={closeMenu}>
          <span className="senetry-navbar-brand" aria-label="SENETRY disaster decision support">
            <span className="senetry-navbar-mark" aria-hidden="true"><img src="/senetry-logo-transparent.svg" alt="" /></span>
            <span className="senetry-navbar-name">SENETRY</span>
          </span>
        </NavLink>

        {!isGroupedNav && <button
          className="btn btn-sm navbar-back-button me-2"
          type="button"
          onClick={() => {
            closeMenu();
            navigate(canGoBack ? -1 : dashboardPath);
          }}
          disabled={!canGoBack && location.pathname === dashboardPath}
          aria-label="Go back to the previous page"
        >
          ← Back
        </button>}

        <button
          className={`navbar-toggler${isGroupedNav ? " grouped-mobile-toggle" : ""}`}
          type="button"
          aria-controls={isGroupedNav ? "groupedMobileNav" : "mainNavbar"}
          aria-expanded={isNavOpen}
          aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuState({ key: menuKey, isNavOpen: !isNavOpen, openDropdown: null })}
        >
          <Menu size={22} aria-hidden="true" />
        </button>

        <div className={`collapse navbar-collapse${isGroupedNav || isNavOpen ? " show" : ""}${isGroupedNav ? " grouped-navbar-collapse" : ""}`} id="mainNavbar">
          {isGroupedNav ? (
            <ul className="navbar-nav grouped-navbar-items">
              {groupedNavigationGroups.map((group) => {
                if (group.to) {
                  return (
                    <li className="nav-item" key={group.to}>
                      <NavLink className="nav-link" to={group.to} onClick={closeMenu} end>
                        {group.label}
                      </NavLink>
                    </li>
                  );
                }
                const dropdownId = `nav-menu-${group.label.toLowerCase().replaceAll(" ", "-")}`;
                const isActive = group.links.some(({ to }) => location.pathname === to || location.pathname.startsWith(`${to}/`));
                return (
                  <li
                    className={`nav-item grouped-nav-group${openDropdown === group.label ? " is-open" : ""}`}
                    key={group.label}
                    onMouseEnter={() => updateDropdown(group.label)}
                    onMouseLeave={() => updateDropdown((current) => current === group.label ? null : current)}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        updateDropdown((current) => current === group.label ? null : current);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        updateDropdown(null);
                        event.currentTarget.querySelector(".grouped-nav-trigger")?.focus();
                      }
                    }}
                  >
                    <button
                      type="button"
                      className={`nav-link grouped-nav-trigger${isActive ? " active" : ""}`}
                      aria-haspopup="true"
                      aria-expanded={openDropdown === group.label}
                      aria-controls={dropdownId}
                      onClick={() => updateDropdown((current) => current === group.label ? null : group.label)}
                    >
                      {group.label}<span className="grouped-nav-caret" aria-hidden="true" />
                    </button>
                    <ul className="grouped-nav-menu" id={dropdownId}>
                      {group.links.map((link) => (
                        <li key={link.to}>
                          <NavLink className="grouped-nav-menu-link" to={link.to} onClick={closeMenu}>
                            {link.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          ) : (
          <ul className="navbar-nav ms-xxl-auto">
            {navigationLinks.map((link) => (
              <li className="nav-item" key={link.to}>
                <NavLink
                  className="nav-link"
                  to={link.to}
                  onClick={closeMenu}
                  end={link.to === dashboardPath}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
          )}
        </div>
        {isGroupedNav && (
          <div
            className={`grouped-mobile-panel${isNavOpen ? " is-open" : ""}`}
            id="groupedMobileNav"
            aria-hidden={!isNavOpen}
          >
            {groupedNavigationGroups.map((group) => (
              <section className="grouped-mobile-section" key={group.label}>
                {group.to ? (
                  <NavLink className="grouped-mobile-link" to={group.to} onClick={closeMenu} end>
                    {group.label}
                  </NavLink>
                ) : (
                  <>
                    <h2 className="grouped-mobile-heading">{group.label}</h2>
                    {group.links.map((link) => (
                      <NavLink className="grouped-mobile-link" to={link.to} onClick={closeMenu} key={link.to}>
                        {link.label}
                      </NavLink>
                    ))}
                  </>
                )}
              </section>
            ))}
            <button
              className="grouped-mobile-back-button"
              type="button"
              onClick={() => {
                closeMenu();
                navigate(canGoBack ? -1 : dashboardPath);
              }}
              disabled={!canGoBack && location.pathname === dashboardPath}
            >
              ← Back
            </button>
          </div>
        )}
        {isAuthenticated && (
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            aria-pressed={isDark}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
          >
            {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
            <span className="visually-hidden">Switch to {isDark ? "light" : "dark"} mode</span>
          </button>
        )}
        {isGroupedNav && (
          <button
            className="btn btn-sm navbar-back-button ms-3 grouped-back-button"
            type="button"
            onClick={() => {
              closeMenu();
              navigate(canGoBack ? -1 : dashboardPath);
            }}
            disabled={!canGoBack && location.pathname === dashboardPath}
            aria-label="Go back to the previous page"
          >
            ← Back
          </button>
        )}
      </div>
    </nav>
  );
}
export default Navbar;
