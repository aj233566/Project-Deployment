import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, BrowserRouter, useLocation } from "react-router-dom";
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Signup = lazy(() => import("./pages/Signup"));
import ProtectedRoute from "./pages/ProtectedRoute";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const AuthorityIncidents = lazy(() => import("./pages/AuthorityIncidents"));
const CitizenIncidents = lazy(() => import("./pages/CitizenIncidents"));
const ReportIncident = lazy(() => import("./pages/ReportIncident"));
const IncidentDetails = lazy(() => import("./pages/IncidentDetails"));
const Weather = lazy(() => import("./pages/Weather"));
const EmergencyResources = lazy(() => import("./pages/EmergencyResources"));
import Navbar from "./components/Navbar";
import OfflineBanner from "./components/OfflineBanner";
import PresenceBeat from "./components/PresenceBeat";
import { AlertProvider } from "./context/AlertContext";
import { getDashboardPath } from "./utils/navigation";
import { getStoredUser, getToken } from "./context/session";
import { syncPendingIncidents } from "./services/incidentSyncService";
const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const EmergencyResponsePage = lazy(() => import("./pages/EmergencyResponsePage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const HabitationsPage = lazy(() => import("./pages/HabitationsPage"));
const HabitationDetails = lazy(() => import("./pages/HabitationDetails"));
const RelocationSitesPage = lazy(() => import("./pages/RelocationSitesPage"));
const RelocationSiteDetails = lazy(() => import("./pages/RelocationSiteDetails"));
function getHomePath() {
  return getDashboardPath();
}
function OperationalLayout({ children }) {
  const location = useLocation();
  // Citizen pages use a fixed 18-32 px text scale (css/citizen-text.css), switched on by this class.
  const role = getStoredUser()?.role;
  // The command center has its own text scale; every other authority or admin page uses css/authority-text.css.
  const isStaffPage = (role === "authority" || role === "admin") && location.pathname !== "/dashboard/authority";
  const roleClass = role === "citizen" ? " role-citizen" : isStaffPage ? " role-authority" : "";
  return (
    <div className={`operational-layout${roleClass}`}>
      {!location.pathname.startsWith("/admin") && <Navbar />}
      {children}
    </div>
  );
}
function DivyaOperationsLayout({ children }) {
  return (
    <OperationalLayout>{children}</OperationalLayout>
  );
}
function AppRoutes() {
  return (
    <>
      <OfflineBanner />

      <Suspense fallback={<div className="page-loading" role="status">Loading page…</div>}>
      <Routes>

        <Route path="/" element={<Navigate to={getHomePath()} replace />} />


        <Route
          path="/login"
          element={
            getToken() && getStoredUser() ? (
              <Navigate to={getHomePath()} replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/login/citizen"
          element={
            getToken() && getStoredUser()?.role === "citizen" ? (
              <Navigate to={getHomePath()} replace />
            ) : (
              <Login expectedRole="citizen" />
            )
          }
        />

        <Route
          path="/login/authority"
          element={
            getToken() && getStoredUser()?.role === "authority" ? (
              <Navigate to={getHomePath()} replace />
            ) : (
              <Login expectedRole="authority" />
            )
          }
        />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/signup"
          element={
            getToken() && getStoredUser() ? (
              <Navigate to={getHomePath()} replace />
            ) : (
              <Signup />
            )
          }
        />


        <Route
          path="/dashboard/citizen"
          element={
            <ProtectedRoute allowedRoles={["citizen"]}>
              <OperationalLayout>
                <Dashboard />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/dashboard/authority"
          element={
            <ProtectedRoute allowedRoles={["authority"]}>
              <CommandCenter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={<Navigate to={getHomePath()} replace />}
        />
        <Route
          path="/command-center"
          element={<Navigate to="/dashboard/authority" replace />}
        />


        <Route
          path="/incidents"
          element={
            <ProtectedRoute allowedRoles={["authority", "admin"]}>
              <OperationalLayout>
                <AuthorityIncidents />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/incidents/:id"
          element={
            <ProtectedRoute allowedRoles={["authority", "admin"]}>
              <OperationalLayout>
                <IncidentDetails />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/citizen/incidents"
          element={
            <ProtectedRoute allowedRoles={["citizen"]}>
              <OperationalLayout>
                <CitizenIncidents />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen/incidents/:id"
          element={
            <ProtectedRoute allowedRoles={["citizen"]}>
              <OperationalLayout>
                <IncidentDetails />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/report-incident"
          element={
            <ProtectedRoute allowedRoles={["citizen", "authority"]}>
              <OperationalLayout>
                <ReportIncident />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/weather"
          element={
            <ProtectedRoute allowedRoles={["citizen", "authority", "admin"]}>
              <OperationalLayout>
                <Weather />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/alerts"
          element={
            <ProtectedRoute allowedRoles={["authority", "admin"]}>
              <DivyaOperationsLayout>
                <AlertsPage />
              </DivyaOperationsLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/emergency"
          element={
            <ProtectedRoute allowedRoles={["authority", "admin"]}>
              <DivyaOperationsLayout>
                <EmergencyResponsePage />
              </DivyaOperationsLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={["authority", "admin"]}>
              <DivyaOperationsLayout>
                <NotificationsPage />
              </DivyaOperationsLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/resources"
          element={
            <ProtectedRoute allowedRoles={["authority", "admin"]}>
              <DivyaOperationsLayout>
                <ResourcesPage />
              </DivyaOperationsLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/emergency-resources"
          element={
            <ProtectedRoute allowedRoles={["citizen", "authority", "admin"]}>
              <OperationalLayout>
                <EmergencyResources />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/habitations"
          element={
            <ProtectedRoute allowedRoles={["citizen", "authority", "admin"]}>
              <OperationalLayout>
                <HabitationsPage />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/habitations/:id"
          element={
            <ProtectedRoute allowedRoles={["citizen", "authority", "admin"]}>
              <OperationalLayout>
                <HabitationDetails />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/relocation-sites"
          element={
            <ProtectedRoute allowedRoles={["citizen", "authority", "admin"]}>
              <OperationalLayout>
                <RelocationSitesPage />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/relocation-sites/:id"
          element={
            <ProtectedRoute allowedRoles={["citizen", "authority", "admin"]}>
              <OperationalLayout>
                <RelocationSiteDetails />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/operations-overview"
          element={
            <ProtectedRoute allowedRoles={["authority", "admin"]}>
              <DivyaOperationsLayout>
                <OverviewPage />
              </DivyaOperationsLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <OperationalLayout>
                <AdminDashboard />
              </OperationalLayout>
            </ProtectedRoute>
          }
        />


        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}
function App() {
  useEffect(() => {
    const syncQueuedReports = () => {
      void syncPendingIncidents().catch((error) => {
        console.error("Offline incident queue could not be processed:", error);
      });
    };
    window.addEventListener("online", syncQueuedReports);
    if (navigator.onLine) syncQueuedReports();
    return () => window.removeEventListener("online", syncQueuedReports);
  }, []);
  return (
    <BrowserRouter>
      <AlertProvider>
        <PresenceBeat />
        <AppRoutes />
      </AlertProvider>
    </BrowserRouter>
  );
}
export default App;
