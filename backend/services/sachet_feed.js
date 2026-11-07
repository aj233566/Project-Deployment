"use strict";

// NDMA SACHET public CAP alert feeds: the All India RSS and one RSS per state.
// NDMA rate limits these feeds, so they are fetched on the server, cached, spaced apart, and shared by every client.
// If NDMA is briefly unreachable the last good copy is served and flagged as stale.

const SACHET_BASE_URL = "https://sachet.ndma.gov.in/cap_public_website/rss/";
const SACHET_URL = `${SACHET_BASE_URL}rss_india.xml`;
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_STALE_MS = 60 * 60 * 1000;
const DEFAULT_MIN_GAP_MS = 1500;
const MISSING_TTL_MS = 12 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12000;
const MAX_ALERTS = 60;

// Dashboard state code -> NDMA file name (rss_<name>.xml). NDMA names each file after the state in lower case
// with no spaces, and only the single-word names exist: every multi-word state (Tamil Nadu, West Bengal,
// Uttar Pradesh, Madhya Pradesh, Himachal Pradesh, Andhra Pradesh, Arunachal Pradesh, Jammu and Kashmir,
// the Andaman and Nicobar Islands and Dadra and Nagar Haveli and Daman and Diu) returned HTTP 404 when
// checked, so those states are left out rather than guessed. Callers must only use names from this table.
const STATE_FEEDS = Object.freeze({
    "IN-AS": "assam",
    "IN-BR": "bihar",
    "IN-CH": "chandigarh",
    "IN-CT": "chhattisgarh",
    "IN-DL": "delhi",
    "IN-GA": "goa",
    "IN-GJ": "gujarat",
    "IN-HR": "haryana",
    "IN-JH": "jharkhand",
    "IN-KA": "karnataka",
    "IN-KL": "kerala",
    "IN-LA": "ladakh",
    "IN-LD": "lakshadweep",
    "IN-MH": "maharashtra",
    "IN-ML": "meghalaya",
    "IN-MN": "manipur",
    "IN-MZ": "mizoram",
    "IN-NL": "nagaland",
    "IN-OR": "odisha",
    "IN-PB": "punjab",
    "IN-PY": "puducherry",
    "IN-RJ": "rajasthan",
    "IN-SK": "sikkim",
    "IN-TG": "telangana",
    "IN-TR": "tripura",
    "IN-UT": "uttarakhand",
});

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };

function decodeEntities(text) {
    return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body) => {
        if (body[0] === "#") {
            const code = body[1].toLowerCase() === "x"
                ? parseInt(body.slice(2), 16)
                : parseInt(body.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : match;
        }
        return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body.toLowerCase())
            ? NAMED_ENTITIES[body.toLowerCase()]
            : match;
    });
}

function tagText(block, tag) {
    const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(block);
    if (!match) return "";
    return decodeEntities(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/\s+/g, " ").trim();
}

// The public feed mixes Hindi and regional-language titles; the dashboard shows English alerts only.
function isEnglish(title) {
    const latin = (title.match(/[A-Za-z]/g) || []).length;
    const indic = (title.match(/[ऀ-෿]/g) || []).length;
    return latin >= 8 && indic <= latin * 0.15;
}

// By default only English items are kept. State feeds are often published in the state's own language (Kerala's is
// entirely Malayalam), so they are read with includeOtherLanguages and each item says which kind it is.
function parseRss(xml, { includeOtherLanguages = false } = {}) {
    const blocks = String(xml || "").match(/<item>[\s\S]*?<\/item>/gi) || [];
    const alerts = [];
    for (const block of blocks) {
        const title = tagText(block, "title");
        const english = isEnglish(title);
        if (!title || (!english && !includeOtherLanguages)) continue;
        const author = tagText(block, "author");
        const agency = /\(([^)]+)\)/.exec(author);
        const published = tagText(block, "pubDate");
        const time = published ? new Date(published) : null;
        alerts.push({
            id: tagText(block, "guid") || tagText(block, "link") || title,
            title,
            language: english ? "en" : "other",
            agency: agency ? agency[1] : (author || "NDMA"),
            category: tagText(block, "category") || "Alert",
            time: time && Number.isFinite(time.getTime()) ? time.toISOString() : null,
            link: tagText(block, "link") || null,
        });
        if (alerts.length >= MAX_ALERTS) break;
    }
    return alerts;
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createSachetFeed({
    fetchImpl = globalThis.fetch,
    now = Date.now,
    sleep = defaultSleep,
    ttlMs = DEFAULT_TTL_MS,
    staleMs = DEFAULT_STALE_MS,
    minGapMs = DEFAULT_MIN_GAP_MS,
} = {}) {
    const caches = new Map();
    const inFlight = new Map();
    const missing = new Map();
    let queue = Promise.resolve();
    let lastCallAt = null;

    // NDMA answers HTTP 403 ("429") when called too fast, so upstream requests run one at a time, minGapMs apart.
    function schedule(task) {
        const run = queue.then(async () => {
            if (lastCallAt !== null) {
                const wait = lastCallAt + minGapMs - now();
                if (wait > 0) await sleep(wait);
            }
            lastCallAt = now();
            return task();
        });
        queue = run.catch(() => {});
        return run;
    }

    async function load(slug, { allowEmpty, includeOtherLanguages }) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const url = slug === "india" ? SACHET_URL : `${SACHET_BASE_URL}rss_${slug}.xml`;
            const response = await fetchImpl(url, {
                signal: controller.signal,
                headers: { "User-Agent": "SENTRY-disaster-dss/1.0", Accept: "application/rss+xml, application/xml, text/xml" },
            });
            if (response.status === 404) {
                const notFound = new Error(`NDMA SACHET has no ${slug} feed`);
                notFound.code = "NOT_FOUND";
                throw notFound;
            }
            if (!response.ok) {
                throw new Error(`NDMA SACHET returned HTTP ${response.status}`);
            }
            const alerts = parseRss(await response.text(), { includeOtherLanguages });
            if (alerts.length === 0 && !allowEmpty) {
                throw new Error("NDMA SACHET returned no readable English alerts");
            }
            const entry = { alerts, fetchedAt: now() };
            caches.set(slug, entry);
            return entry;
        } finally {
            clearTimeout(timer);
        }
    }

    async function getFeed(slug, { allowEmpty = false, includeOtherLanguages = false } = {}) {
        const cache = caches.get(slug);
        if (cache && now() - cache.fetchedAt < ttlMs) {
            return { alerts: cache.alerts, fetchedAt: cache.fetchedAt, cached: true, stale: false };
        }
        let pending = inFlight.get(slug);
        if (!pending) {
            pending = schedule(() => load(slug, { allowEmpty, includeOtherLanguages }));
            inFlight.set(slug, pending);
            const clear = () => { inFlight.delete(slug); };
            pending.then(clear, clear);
        }
        try {
            const fresh = await pending;
            return { alerts: fresh.alerts, fetchedAt: fresh.fetchedAt, cached: false, stale: false };
        } catch (error) {
            if (cache && now() - cache.fetchedAt < staleMs) {
                return { alerts: cache.alerts, fetchedAt: cache.fetchedAt, cached: true, stale: true };
            }
            throw error;
        }
    }

    // The All India feed.
    function getAlerts() {
        return getFeed("india");
    }

    // One state's feed, by dashboard state code (for example "IN-KL"). States NDMA has no feed for, and
    // codes that are not states at all, answer `supported: false` without any request to NDMA.
    async function getStateAlerts(stateCode) {
        const slug = Object.prototype.hasOwnProperty.call(STATE_FEEDS, stateCode) ? STATE_FEEDS[stateCode] : null;
        const unsupported = { alerts: [], fetchedAt: null, cached: false, stale: false, supported: false };
        if (!slug) return unsupported;
        if ((missing.get(slug) || 0) > now()) return unsupported;
        try {
            return { ...(await getFeed(slug, { allowEmpty: true, includeOtherLanguages: true })), supported: true };
        } catch (error) {
            if (error.code === "NOT_FOUND") {
                missing.set(slug, now() + MISSING_TTL_MS);
                return unsupported;
            }
            throw error;
        }
    }

    return { getAlerts, getStateAlerts };
}

module.exports = { createSachetFeed, parseRss, SACHET_URL, STATE_FEEDS };
