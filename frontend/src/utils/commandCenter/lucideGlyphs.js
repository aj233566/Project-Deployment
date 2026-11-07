// Incident symbols for the map pins, as 24 x 24 stroke paths.
// Source: Lucide icons (flame, waves-horizontal, mountain, activity, traffic-cone, house, cloud-lightning, snowflake, sun, wind, tornado, mountain-snow, triangle-alert, octagon-alert, eye, shield-check, hand-helping, user-round), https://lucide.dev, ISC licence.
// Copyright (c) for Lucide Contributors. Permission to use, copy, modify and distribute is granted under the ISC licence, which is included
// with the lucide-react package in node_modules. The 'dot' symbol is our own.

export const LUCIDE_GLYPHS = Object.freeze({
  flood: Object.freeze(["M2 12q2.5 2 5 0t5 0 5 0 5 0", "M2 19q2.5 2 5 0t5 0 5 0 5 0", "M2 5q2.5 2 5 0t5 0 5 0 5 0"]),
  fire: Object.freeze(["M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"]),
  landslide: Object.freeze(["m8 3 4 8 5-5 5 15H2L8 3z"]),
  earthquake: Object.freeze(["M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"]),
  road: Object.freeze(["M16.05 10.966a5 2.5 0 0 1-8.1 0", "m16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04", "M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z", "M9.194 6.57a5 2.5 0 0 0 5.61 0"]),
  home: Object.freeze(["M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"]),
  alert: Object.freeze(["m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3", "M12 9v4", "M12 17h.01"]),
  ring: Object.freeze(["M12 16h.01", "M12 8v4", "M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"]),
  watch: Object.freeze(["M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0", "M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"]),
  safe: Object.freeze(["M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z", "m9 12 2 2 4-4"]),
  help: Object.freeze(["M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14", "m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9", "m2 13 6 6"]),
  person: Object.freeze(["M7 8a5 5 0 1 0 10 0a5 5 0 1 0 -10 0", "M20 21a8 8 0 0 0-16 0"]),
  storm: Object.freeze(["M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973", "m13 12-3 5h4l-3 5"]),
  snow: Object.freeze(["m10 20-1.25-2.5L6 18", "M10 4 8.75 6.5 6 6", "m14 20 1.25-2.5L18 18", "m14 4 1.25 2.5L18 6", "m17 21-3-6h-4", "m17 3-3 6 1.5 3", "M2 12h6.5L10 9", "m20 10-1.5 2 1.5 2", "M22 12h-6.5L14 15", "m4 10 1.5 2L4 14", "m7 21 3-6-1.5-3", "m7 3 3 6h4"]),
  heat: Object.freeze(["M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"]),
  dust: Object.freeze(["M12.8 19.6A2 2 0 1 0 14 16H2", "M17.5 8a2.5 2.5 0 1 1 2 4H2", "M9.8 4.4A2 2 0 1 1 11 8H2"]),
  cyclone: Object.freeze(["M21 4H3", "M18 8H6", "M19 12H9", "M16 16h-6", "M11 20H9"]),
  volcano: Object.freeze(["m8 3 4 8 5-5 5 15H2L8 3z", "M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19"]),
  dot: Object.freeze(['M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0']),
});
