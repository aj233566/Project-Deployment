// Reading NDMA SACHET alert text: severity wording and region matching.

const HIGH_PATTERN = /(extremely heavy|very heavy|severe|cyclon|tsunami|flash flood|landslide|cloud ?burst|dense fog|heat ?wave|cold ?wave)/i;
const WATCH_PATTERN = /(heavy|strong|squall|hail|lightning|thunderstorm with|gust|gale|flood)/i;
const MODERATE_PATTERN = /moderate/i;

// SACHET titles carry no severity field, so the level is read from the wording of the alert itself.
export function classifySachetAlert(title) {
  const text = String(title || '');
  if (HIGH_PATTERN.test(text)) return 'high';
  if (WATCH_PATTERN.test(text) && !/^light\b/i.test(text)) return 'watch';
  if (MODERATE_PATTERN.test(text)) return 'moderate';
  return 'advisory';
}

const escapeRegExp = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function alertMentionsRegion(alert, keywords) {
  if (!keywords?.length) return true;
  const text = String(alert?.title || '').toLowerCase();
  return keywords.some((keyword) => new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(text));
}

// Alerts published in a regional language have no English wording to read a severity from, so they are marked
// 'local' instead of being given a guessed level.
export function prepareSachetAlerts(alerts, keywords = []) {
  return (Array.isArray(alerts) ? alerts : [])
    .map((alert) => ({ ...alert, level: alert.language === 'other' ? 'local' : classifySachetAlert(alert.title) }))
    .filter((alert) => alertMentionsRegion(alert, keywords));
}

// Combines several alert lists (for example a state's own feed and the matching All India items): one entry per
// alert id, newest first.
export function mergeSachetAlerts(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const alert of Array.isArray(list) ? list : []) {
      if (!byId.has(alert.id)) byId.set(alert.id, alert);
    }
  }
  return [...byId.values()].sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')));
}

// The alerts panel shows English alerts by default. `english` are the alerts with English wording (they have a severity level), and
// `localCount` is how many more are published only in a regional language and stay one click away.
export function splitSachetByLanguage(alerts) {
  const list = Array.isArray(alerts) ? alerts : [];
  const english = list.filter((alert) => alert.level !== 'local');
  return { english, localCount: list.length - english.length };
}
