const test = require("node:test");
const assert = require("node:assert/strict");
const { createSachetFeed, parseRss, STATE_FEEDS } = require("../services/sachet_feed");

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>All India</title>
<item>
  <title>Light rain ( 5 mm/hr) with Thunderstorms &amp; gusts is very likely over Diu district in next 3 hours.</title>
  <description/><category>Met</category>
  <link>https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=1</link>
  <author>controlroom@ndma.gov.in (IMD Ahmedabad)</author>
  <guid isPermaLink="false">1</guid>
  <pubDate>Fri, 30 Oct 2026 10:45:23 GMT</pubDate>
</item>
<item>
  <title><![CDATA[Heavy rain likely over Kota, Bundi and Tonk in next 3 hours.]]></title>
  <category>Met</category><link>https://sachet.ndma.gov.in/x?identifier=2</link>
  <author>controlroom@ndma.gov.in (IMD Jaipur)</author><guid>2</guid>
  <pubDate>Fri, 30 Oct 2026 10:40:07 GMT</pubDate>
</item>
<item>
  <title>अगले 3 घंटों में हल्की बारिश की संभावना है</title>
  <category>Met</category><guid>3</guid><pubDate>Fri, 30 Oct 2026 10:30:00 GMT</pubDate>
</item>
</channel></rss>`;

test("parses English SACHET items, decodes entities and skips other languages", () => {
    const alerts = parseRss(RSS);
    assert.equal(alerts.length, 2);
    assert.match(alerts[0].title, /Thunderstorms & gusts/);
    assert.equal(alerts[0].agency, "IMD Ahmedabad");
    assert.equal(alerts[0].category, "Met");
    assert.equal(alerts[0].time, "2026-10-30T10:45:23.000Z");
    assert.equal(alerts[1].title, "Heavy rain likely over Kota, Bundi and Tonk in next 3 hours.");
    assert.equal(alerts[1].id, "2");
});

test("garbage or empty input yields no alerts instead of throwing", () => {
    assert.deepEqual(parseRss(""), []);
    assert.deepEqual(parseRss(null), []);
    assert.deepEqual(parseRss("<html>not rss</html>"), []);
});

function makeFeed({ responses, clock, options = {} }) {
    let calls = 0;
    const urls = [];
    const feed = createSachetFeed({
        now: () => clock.t,
        minGapMs: 0,
        ...options,
        fetchImpl: async (url) => {
            urls.push(url);
            const next = responses[Math.min(calls, responses.length - 1)];
            calls += 1;
            if (next instanceof Error) throw next;
            return next;
        },
    });
    return { feed, calls: () => calls, urls };
}

const ok = () => ({ ok: true, status: 200, text: async () => RSS });

test("serves from cache inside the TTL so NDMA is not called per browser", async () => {
    const clock = { t: 1_000_000 };
    const { feed, calls } = makeFeed({ responses: [ok()], clock });
    const first = await feed.getAlerts();
    clock.t += 60_000;
    const second = await feed.getAlerts();
    assert.equal(calls(), 1);
    assert.equal(first.cached, false);
    assert.equal(second.cached, true);
    assert.equal(second.stale, false);
});

test("concurrent requests share one upstream call", async () => {
    const clock = { t: 5 };
    const { feed, calls } = makeFeed({ responses: [ok()], clock });
    await Promise.all([feed.getAlerts(), feed.getAlerts(), feed.getAlerts()]);
    assert.equal(calls(), 1);
});

test("falls back to the last good copy, flagged stale, when NDMA rate limits", async () => {
    const clock = { t: 10 };
    const limited = { ok: false, status: 403, text: async () => "429" };
    const { feed } = makeFeed({ responses: [ok(), limited], clock });
    await feed.getAlerts();
    clock.t += 6 * 60 * 1000;
    const result = await feed.getAlerts();
    assert.equal(result.stale, true);
    assert.equal(result.alerts.length, 2);
});

test("throws when there is nothing cached to fall back on", async () => {
    const clock = { t: 10 };
    const { feed } = makeFeed({ responses: [new Error("network down")], clock });
    await assert.rejects(feed.getAlerts(), /network down/);
});

test("does not serve a copy older than the stale limit", async () => {
    const clock = { t: 10 };
    const { feed } = makeFeed({ responses: [ok(), { ok: false, status: 500, text: async () => "" }], clock });
    await feed.getAlerts();
    clock.t += 2 * 60 * 60 * 1000;
    await assert.rejects(feed.getAlerts(), /HTTP 500/);
});

const EMPTY_RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Sikkim</title></channel></rss>`;
const okWith = (body) => ({ ok: true, status: 200, text: async () => body });

test("a state feed is fetched from its own file and cached separately from the All India feed", async () => {
    const clock = { t: 1_000 };
    const { feed, calls, urls } = makeFeed({ responses: [ok()], clock });
    const kerala = await feed.getStateAlerts("IN-KL");
    assert.equal(kerala.supported, true);
    assert.equal(kerala.alerts.length, 3, "a state feed keeps its regional-language item too");
    assert.equal(kerala.cached, false);
    assert.equal(urls[0], "https://sachet.ndma.gov.in/cap_public_website/rss/rss_kerala.xml");

    const again = await feed.getStateAlerts("IN-KL");
    assert.equal(again.cached, true);
    assert.equal(calls(), 1);

    await feed.getAlerts();
    assert.equal(urls[1], "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml");
    assert.equal(calls(), 2);
});

test("a state with no English alerts right now is an empty list, not an error", async () => {
    const clock = { t: 1_000 };
    const { feed } = makeFeed({ responses: [okWith(EMPTY_RSS)], clock });
    const sikkim = await feed.getStateAlerts("IN-SK");
    assert.equal(sikkim.supported, true);
    assert.deepEqual(sikkim.alerts, []);
    await assert.rejects(makeFeed({ responses: [okWith(EMPTY_RSS)], clock }).feed.getAlerts(), /no readable English alerts/);
});

test("states without an NDMA feed, and anything that is not a known state code, never reach NDMA", async () => {
    const clock = { t: 1_000 };
    const { feed, calls } = makeFeed({ responses: [ok()], clock });
    for (const code of ["IN-TN", "IN-UP", "IN-XX", "", "kerala", "../admin", "__proto__", "constructor", "IN-KL/../x", undefined, null]) {
        const result = await feed.getStateAlerts(code);
        assert.equal(result.supported, false, String(code));
        assert.deepEqual(result.alerts, []);
    }
    assert.equal(calls(), 0);
});

test("every state feed name is plain lower-case letters so it can only ever build a SACHET file URL", () => {
    for (const [code, name] of Object.entries(STATE_FEEDS)) {
        assert.match(code, /^IN-[A-Z]{2}$/);
        assert.match(name, /^[a-z]+$/);
    }
    assert.equal(new Set(Object.values(STATE_FEEDS)).size, Object.keys(STATE_FEEDS).length);
});

test("a state feed NDMA reports as missing is remembered for hours instead of being retried", async () => {
    const clock = { t: 1_000 };
    const gone = { ok: false, status: 404, text: async () => "Not Found" };
    const { feed, calls } = makeFeed({ responses: [gone, ok()], clock });
    assert.equal((await feed.getStateAlerts("IN-GA")).supported, false);
    clock.t += 60 * 60 * 1000;
    assert.equal((await feed.getStateAlerts("IN-GA")).supported, false);
    assert.equal(calls(), 1, "still inside the 12 hour memory");
    clock.t += 12 * 60 * 60 * 1000;
    const retried = await feed.getStateAlerts("IN-GA");
    assert.equal(calls(), 2);
    assert.equal(retried.supported, true);
});

test("a rate limited state feed falls back to its last good copy, flagged stale", async () => {
    const clock = { t: 10 };
    const limited = { ok: false, status: 403, text: async () => "429" };
    const { feed } = makeFeed({ responses: [ok(), limited], clock });
    await feed.getStateAlerts("IN-AS");
    clock.t += 6 * 60 * 1000;
    const result = await feed.getStateAlerts("IN-AS");
    assert.equal(result.stale, true);
    assert.equal(result.supported, true);
    assert.equal(result.alerts.length, 3);
});

test("upstream requests are spaced apart so NDMA does not rate limit them", async () => {
    const clock = { t: 100_000 };
    const waits = [];
    const sleep = async (ms) => { waits.push(ms); clock.t += ms; };
    const { feed, urls } = makeFeed({ responses: [ok()], clock, options: { minGapMs: 1500, sleep } });
    await Promise.all([feed.getStateAlerts("IN-KL"), feed.getStateAlerts("IN-AS"), feed.getAlerts()]);
    assert.equal(urls.length, 3);
    assert.deepEqual(waits, [1500, 1500]);
});

test("regional-language items can be kept, and are marked as such", () => {
    const all = parseRss(RSS, { includeOtherLanguages: true });
    assert.equal(all.length, 3);
    assert.deepEqual(all.map((alert) => alert.language), ["en", "en", "other"]);
    assert.equal(parseRss(RSS).length, 2, "the All India reading is still English only");
});

test("a state feed keeps alerts published in the state's own language", async () => {
    const clock = { t: 1_000 };
    const { feed } = makeFeed({ responses: [ok()], clock });
    const kerala = await feed.getStateAlerts("IN-KL");
    assert.equal(kerala.alerts.length, 3);
    assert.equal(kerala.alerts.filter((alert) => alert.language === "other").length, 1);
    const india = await makeFeed({ responses: [ok()], clock }).feed.getAlerts();
    assert.equal(india.alerts.length, 2);
});
