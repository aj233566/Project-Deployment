import ResourceManagement from "../components/ResourceManagement";
function ResourcesPage() {
  return (
    <div className="resources-page">
      <div className="container-fluid">
        <div className="page-header">
          <span>RELIEF LOGISTICS & INFRASTRUCTURE</span>
          <h1>Resources & Facilities</h1>
        </div>

        <ResourceManagement />
      </div>
    </div>
  );
}
export default ResourcesPage;