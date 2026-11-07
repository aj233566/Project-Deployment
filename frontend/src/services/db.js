import { openDB } from 'idb'
const DB_NAME = 'disaster-net-db'
const STORE_NAME = 'incidents'
export const db = openDB(DB_NAME, 1, {
    upgrade(database) {
        if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, {
                keyPath: 'id',
                autoIncrement: true,
            })
        }
    },
})
export async function saveIncident(incident) {
    const database = await db
    const clientReportId = incident.clientReportId || createClientReportId()
    const id = await database.add(STORE_NAME, {
        ...incident,
        clientReportId,
        synced: false,
        createdAt: new Date().toISOString(),
    })
    return id
}
export async function getIncidents() {
    const database = await db
    return database.getAll(STORE_NAME)
}
export async function getPendingIncidents() {
    const database = await db
    const incidents = await database.getAll(STORE_NAME)
    return incidents.filter(
        (incident) => incident.synced === false
    )
}
export async function markIncidentAsSynced(id, serverIncident = null) {
    const database = await db
    const incident = await database.get(STORE_NAME, id)
    if (!incident) {
        return
    }
    incident.synced = true
    incident.syncStatus = 'Synced'
    if (serverIncident?._id) incident.remoteId = String(serverIncident._id)
    if (serverIncident?.status) incident.status = serverIncident.status
    if (serverIncident?.linkedHabitation) incident.linkedHabitation = String(serverIncident.linkedHabitation)
    if (serverIncident?.updatedAt) incident.serverUpdatedAt = serverIncident.updatedAt
    await database.put(STORE_NAME, incident)
}
export async function updateIncidentFromServer(id, serverIncident) {
    const database = await db
    const incident = await database.get(STORE_NAME, id)
    if (!incident || !serverIncident?._id) return null
    incident.remoteId = String(serverIncident._id)
    incident.status = serverIncident.status || incident.status
    incident.linkedHabitation = serverIncident.linkedHabitation
        ? String(serverIncident.linkedHabitation)
        : null
    incident.serverUpdatedAt = serverIncident.updatedAt || null
    incident.synced = true
    incident.syncStatus = 'Synced'
    await database.put(STORE_NAME, incident)
    return incident
}
export async function setIncidentClientReportId(id, clientReportId) {
    const database = await db
    const incident = await database.get(STORE_NAME, id)
    if (!incident) return null
    incident.clientReportId = clientReportId
    await database.put(STORE_NAME, incident)
    return incident
}
function createClientReportId() {
    return globalThis.crypto?.randomUUID?.()
        || `report_${Date.now()}_${Math.random().toString(36).slice(2)}`
}
export async function clearAllIncidents() {
    const database = await db
    await database.clear(STORE_NAME)
}