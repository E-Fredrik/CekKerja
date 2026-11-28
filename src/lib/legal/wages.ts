import ump from "../../../data/wages/ump-2026.json" with { type: "json" };

export const UMP_SOURCE_URL = ump.url;

export type MinimumWage = { amount: number; place: string; label: string; url: string };

const ALIASES: Record<string, string> = {
  jakarta: "dki jakarta",
  dki: "dki jakarta",
  yogyakarta: "di yogyakarta",
  "daerah istimewa yogyakarta": "di yogyakarta",
  diy: "di yogyakarta",
  "bangka belitung": "kepulauan bangka belitung",
  babel: "kepulauan bangka belitung",
  kepri: "kepulauan riau",
  ntb: "nusa tenggara barat",
  ntt: "nusa tenggara timur",
  jabar: "jawa barat",
  jateng: "jawa tengah",
  jatim: "jawa timur",
  sumut: "sumatera utara",
  sumsel: "sumatera selatan",
  sulsel: "sulawesi selatan",
  kaltim: "kalimantan timur",
};

export function provinceKey(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/\bprov(insi|\.)?\s*/g, "")
    .replace(/\bkep\.\s*/g, "kepulauan ")
    .replace(/\bsumatra\b/g, "sumatera")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ALIASES[key] ?? key;
}

const BY_KEY = new Map(Object.entries(ump.provinces).map(([name, amount]) => [provinceKey(name), { name, amount }]));

export function minimumWageFor(province: string | null): MinimumWage | null {
  const found = province ? BY_KEY.get(provinceKey(province)) : undefined;
  if (!found) return null;
  return { amount: found.amount, place: found.name, label: `${ump.kind} ${found.name} ${ump.year}`, url: ump.url };
}
