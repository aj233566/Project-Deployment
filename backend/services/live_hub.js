// Live updates for the phone app. A phone keeps one request open to GET /api/live. When a notification is saved, the server writes one short
// line to every open request that should hear about it, and the app then asks for its list. Nothing private is in the line.
const clients = new Set();

function add(res, user) {
  const client = { res, user };
  clients.add(client);
  res.on("close", () => clients.delete(client));
  return client;
}

// kind "notification": citizens and everyone else with the app open. kind "citizen-report": only authority and admin.
function publish(kind, filter = () => true) {
  const event = kind === "citizen-report" ? "citizen-report" : "notification";
  for (const c of clients) {
    const role = c.user && c.user.role;
    if (event === "citizen-report" && role !== "authority" && role !== "admin") continue;
    if (!filter(c.user)) continue;
    try { c.res.write(`event: ${event}\ndata: {}\n\n`); } catch { clients.delete(c); }
  }
}

// Ask the hub to speak when a document of this model is saved. No fields of the document are sent.
function attach(model, kind) {
  model.schema.post("save", () => { try { publish(kind); } catch { /* a failed line must never fail a save */ } });
}

module.exports = { add, publish, attach, _count: () => clients.size };
