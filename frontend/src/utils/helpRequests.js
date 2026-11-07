// Which help requests are new since the last look. `seen` is a Set of ids, or null before the first look (then nothing is "new", so the
// page does not beep for requests that were already there when it opened).
export function newHelpRequests(requests, seen) {
  if (!seen) return [];
  return (Array.isArray(requests) ? requests : []).filter((person) => !seen.has(person.id));
}
