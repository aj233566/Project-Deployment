import api from "./api";
export async function analyzeRisk({
    latitude,
    longitude,
    name = "",
    disasterType = "flood"
}) {
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
        throw new Error("A current location is required to request risk analysis.");
    }
    const response = await api.post("/risk/analyze", {
        disasterType,
        location: {
            latitude: Number(latitude),
            longitude: Number(longitude),
            ...(name ? { name } : {})
        }
    }, { timeout: 60000 });
    if (!response.data?.success) {
        throw new Error(response.data?.message || "Risk analysis failed.");
    }
    return response.data.data;
}