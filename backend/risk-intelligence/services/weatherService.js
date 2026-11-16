const { validateCoordinates } = require("../utils/validation");
const { remember } = require("../utils/lastGoodAnswer");
// With OPEN_METEO_API_KEY set, the paid host is used. A hosted server shares its address with many others, and the free host limits shared
// addresses (HTTP 429); a key is the lasting fix. Without a key nothing changes.
const OPEN_METEO_URL = process.env.OPEN_METEO_API_KEY ? "https://customer-api.open-meteo.com/v1/forecast" : "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_TIMEOUT_MS = 12000;
const OPEN_METEO_RETRIES = 1;
// The same place is asked again and again by many phones, so a good answer is kept for 10 minutes, and kept for 6 hours as a fallback when
// Open-Meteo is busy or says 429. Places are grouped to about 1 km.
async function getWeatherByCoordinates(latitude, longitude) {
    const validation = validateCoordinates(latitude, longitude);
    if (!validation.valid) {
        const error = new Error(validation.message);
        error.statusCode = 400;
        throw error;
    }
    const key = `weather:${Number(validation.latitude).toFixed(2)},${Number(validation.longitude).toFixed(2)}`;
    return remember(key, () => loadWeather(latitude, longitude));
}
async function loadWeather(latitude, longitude) {
    const validation = validateCoordinates(latitude, longitude);
    if (!validation.valid) {
        const error = new Error(validation.message);
        error.statusCode = 400;
        throw error;
    }
    const params = new URLSearchParams({
        latitude: validation.latitude,
        longitude: validation.longitude,
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation",
            "rain",
            "wind_speed_10m",
            "wind_gusts_10m",
            "weather_code"
        ].join(","),
        daily: [
            "temperature_2m_max",
            "precipitation_sum",
            "wind_speed_10m_max",
            "wind_gusts_10m_max",
            "weather_code",
            "uv_index_max",
            "et0_fao_evapotranspiration"
        ].join(","),
        timezone: "auto",
        forecast_days: "5",
        wind_speed_unit: "kmh",
        precipitation_unit: "mm"
    });
    if (process.env.OPEN_METEO_API_KEY) params.set("apikey", process.env.OPEN_METEO_API_KEY);
    const response = await fetchWithTimeout(`${OPEN_METEO_URL}?${params.toString()}`);
    if (!response.ok) {
        const error = new Error(`Open-Meteo returned status ${response.status}.`);
        error.statusCode = 502;
        throw error;
    }
    const apiData = await response.json();
    validateWeatherResponse(apiData);
    const current = apiData.current;
    const daily = apiData.daily || {};
    const days = buildDailyForecast(daily);
    return {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        rain: current.rain,
        windSpeed: current.wind_speed_10m,
        windGusts: current.wind_gusts_10m,
        weatherCode: current.weather_code,
        updateTime: current.time,
        timezone: apiData.timezone,
        forecast: {
            todayPrecipitation: getDailyValue(daily.precipitation_sum, 0),
            dailyPrecipitation: getMaxDailyValue(daily.precipitation_sum),
            next72HourPrecipitation: sumDailyValues(daily.precipitation_sum, 3),
            maxTemperature: getMaxDailyValue(daily.temperature_2m_max),
            maxWindSpeed: getMaxDailyValue(daily.wind_speed_10m_max),
            maxWindGusts: getMaxDailyValue(daily.wind_gusts_10m_max),
            maxUvIndex: getMaxDailyValue(daily.uv_index_max),
            evapotranspiration: getMaxDailyValue(daily.et0_fao_evapotranspiration),
            weatherCode: getMaxDailyValue(daily.weather_code),
            days
        },
        coordinates: {
            latitude: apiData.latitude,
            longitude: apiData.longitude
        },
        source: "Open-Meteo Forecast API",
        sourceUrl: "https://open-meteo.com/"
    };
}
function sumDailyValues(values, count) {
    if (!Array.isArray(values) || values.length === 0) return null;
    const selected = values.slice(0, count).filter((value) => value !== null && value !== undefined && value !== "").map(Number);
    if (selected.length === 0 || selected.some((value) => !Number.isFinite(value))) return null;
    return selected.reduce((total, value) => total + value, 0);
}
async function fetchWithTimeout(url) {
    let lastError;
    for (let attempt = 0; attempt <= OPEN_METEO_RETRIES; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), OPEN_METEO_TIMEOUT_MS);
        try {
            return await fetch(url, { signal: controller.signal });
        } catch (error) {
            lastError = error;
            if (attempt < OPEN_METEO_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, 300));
            }
        } finally {
            clearTimeout(timeout);
        }
    }

    const causeCode = getCauseCode(lastError);
    const detail = lastError?.name === "AbortError"
        ? `did not respond within ${OPEN_METEO_TIMEOUT_MS / 1000} seconds`
        : causeCode
            ? `could not be reached (${causeCode})`
            : "could not be reached";
    const upstreamError = new Error(`Open-Meteo ${detail}. Please retry shortly.`);
    upstreamError.statusCode = 502;
    throw upstreamError;
}
function getCauseCode(error) {
    let current = error;
    while (current) {
        if (current.code) return current.code;
        current = current.cause;
    }
    return null;
}
function getDailyValue(values, index) {
    return Array.isArray(values) && values[index] !== undefined ? values[index] : null;
}
function getMaxDailyValue(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return null;
    }
    const numericValues = values
        .filter((value) => value !== null && value !== undefined && value !== "")
        .map(Number)
        .filter(Number.isFinite);
    return numericValues.length > 0 ? Math.max(...numericValues) : null;
}
function buildDailyForecast(daily) {
    if (!Array.isArray(daily.time)) {
        return [];
    }
    return daily.time.map((date, index) => ({
        date,
        precipitation: getDailyValue(daily.precipitation_sum, index),
        maxTemperature: getDailyValue(daily.temperature_2m_max, index),
        maxWindSpeed: getDailyValue(daily.wind_speed_10m_max, index),
        maxWindGusts: getDailyValue(daily.wind_gusts_10m_max, index),
        weatherCode: getDailyValue(daily.weather_code, index)
    }));
}
function validateWeatherResponse(data) {
    if (!data || !data.current) {
        const error = new Error("Open-Meteo returned an invalid weather response.");
        error.statusCode = 502;
        throw error;
    }
    const requiredFields = [
        "temperature_2m",
        "relative_humidity_2m",
        "precipitation",
        "rain",
        "wind_speed_10m",
        "wind_gusts_10m",
        "weather_code",
        "time"
    ];
    const missingField = requiredFields.find((field) => {
        return data.current[field] === undefined || data.current[field] === null;
    });
    if (missingField) {
        const error = new Error(`Open-Meteo response is missing ${missingField}.`);
        error.statusCode = 502;
        throw error;
    }
}
module.exports = {
    getWeatherByCoordinates
};
