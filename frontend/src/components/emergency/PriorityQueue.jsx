import PriorityCard from "./PriorityCard";
export const PriorityQueue = ({ areas = [], onDispatch }) => {
  const p1Areas = areas.filter((area) => area.priorityQueue === "Priority 1");
  const p2Areas = areas.filter((area) => area.priorityQueue === "Priority 2");
  const p3Areas = areas.filter((area) => area.priorityQueue === "Priority 3");
  const renderCards = (queueAreas) => {
    if (queueAreas.length === 0) {
      return (
        <div className="ops-card p-3 text-muted-custom">
          No affected areas in this priority queue.
        </div>
      );
    }
    return (
      <div className="row g-3">
        {queueAreas.map((area) => (
          <div
            key={area.id || area._id}
            className="col-12 col-md-6 col-xl-4 d-flex"
          >
            <div className="w-100 d-flex flex-column">
              <PriorityCard area={area} onDispatch={onDispatch} />
            </div>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="emergency-queue-boards">

      <section className="priority-queue-section p1 mb-4">
        <div className="queue-header-row d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <div className="queue-header-left d-flex align-items-center gap-2">
            <span className="queue-tag-badge p1">Priority 1</span>

            <h3 className="m-0">Immediate Life-Threatening Response</h3>
          </div>

          <span className="badge-ops critical">
            {p1Areas.length} Zones Requiring Immediate Action
          </span>
        </div>

        <p className="queue-subtext">
          Highest-risk areas requiring immediate emergency response, evacuation
          planning, and rapid resource deployment.
        </p>

        {renderCards(p1Areas)}
      </section>


      <section className="priority-queue-section p2 mb-4">
        <div className="queue-header-row d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <div className="queue-header-left d-flex align-items-center gap-2">
            <span className="queue-tag-badge p2">Priority 2</span>

            <h3 className="m-0">Active Evacuation & Precautionary Response</h3>
          </div>

          <span className="badge-ops high">
            {p2Areas.length} Zones on Precautionary Alert
          </span>
        </div>

        <p className="queue-subtext">
          Areas requiring precautionary evacuation, road monitoring, and
          coordinated response readiness.
        </p>

        {renderCards(p2Areas)}
      </section>


      <section className="priority-queue-section p3 mb-4">
        <div className="queue-header-row d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <div className="queue-header-left d-flex align-items-center gap-2">
            <span className="queue-tag-badge p3">Priority 3</span>

            <h3 className="m-0">Continuous Observation & Standby Readiness</h3>
          </div>

          <span className="badge-ops warning">
            {p3Areas.length} Zones Under Observation
          </span>
        </div>

        <p className="queue-subtext">
          Lower-risk areas requiring continued monitoring and emergency standby
          readiness.
        </p>

        {renderCards(p3Areas)}
      </section>
    </div>
  );
};
export default PriorityQueue;
