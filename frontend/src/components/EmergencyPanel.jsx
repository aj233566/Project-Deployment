function EmergencyPanel({
  contacts = [
    {
      name: "Police",
      number: "100",
      icon: "🚓",
    },
    {
      name: "Fire & Rescue",
      number: "101",
      icon: "🚒",
    },
    {
      name: "Ambulance",
      number: "108",
      icon: "🚑",
    },
    {
      name: "Disaster Management",
      number: "1070",
      icon: "🆘",
    },
  ],
}) {
  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h5 className="fw-bold mb-1">Emergency Response</h5>
            <p className="text-muted mb-0">
              Emergency contacts and response services
            </p>
          </div>

          <span className="badge bg-danger">24/7</span>
        </div>

        <div className="row g-3">
          {contacts.map((contact) => (
            <div className="col-md-6" key={contact.name}>
              <div className="border rounded p-3 h-100">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                    style={{
                      width: "45px",
                      height: "45px",
                      fontSize: "34.4px",
                    }}
                  >
                    {contact.icon}
                  </div>

                  <div className="flex-grow-1">
                    <h6 className="fw-bold mb-1">{contact.name}</h6>
                    <a
                      href={`tel:${contact.number}`}
                      className="text-danger fw-bold"
                    >
                      {contact.number}
                    </a>
                  </div>

                  <a
                    href={`tel:${contact.number}`}
                    className="btn btn-sm btn-danger"
                  >
                    Call
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-danger w-100 mt-4">
          🚨 Activate Emergency Response
        </button>
      </div>
    </div>
  );
}
export default EmergencyPanel;