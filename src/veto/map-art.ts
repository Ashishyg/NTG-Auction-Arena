/**
 * Map art, keyed by display name.
 *
 * Sourced from valorant-api.com (community Riot asset mirror) and hotlinked
 * rather than bundled — Riot updates these per act, and a custom map name just
 * falls back to a plain gradient tile.
 *
 * Only the 456x100 list banner (~60 KB) is used, everywhere. The full splash is
 * 5.4 MB per map, which stalled every side-pick turn on a slow connection.
 */
const MAP_IDS: Record<string, string> = {
  ascent: "7eaecc1b-4337-bbf6-6ab9-04b8f06b3319",
  split: "d960549e-485c-e861-8d71-aa9d1aed12a2",
  fracture: "b529448b-4d60-346e-e89e-00a4c527a405",
  bind: "2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba",
  breeze: "2fb9a4fd-47b8-4e7d-a969-74b4046ebd53",
  abyss: "224b0a95-48b9-f703-1bd8-67aca101a61f",
  lotus: "2fe4ed3a-450a-948b-6d6b-e89a78e680a9",
  sunset: "92584fbe-486a-b1b2-9faa-39b0f486b498",
  pearl: "fd267378-4d1d-484f-ff52-77821ed10dc2",
  summit: "756da597-416b-c0f2-f47b-afbdf28670bc",
  icebox: "e2ad5c54-4114-a870-9641-8ea21279579a",
  corrode: "1c18ab1f-420d-0d8b-71d0-77ad3c439115",
  haven: "2bee0dc9-4ffe-519b-1cbd-7fbe763a6047",
};

function assetFor(name: string, file: string): string | null {
  const id = MAP_IDS[name.trim().toLowerCase()];
  return id ? `https://media.valorant-api.com/maps/${id}/${file}` : null;
}

/** Wide, lightweight banner art. */
export function mapBanner(name: string): string | null {
  return assetFor(name, "listviewicon.png");
}
