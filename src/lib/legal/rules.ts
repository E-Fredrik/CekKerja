import type { Verdict } from "../ai/schemas.ts";
import type { Lang } from "../http.ts";

export type Scope = "ad" | "contract";

export type Citation = { law: string; article: string; ayat?: number };

export type Rule = {
  id: string;
  verdict: Verdict;
  scope: Scope[];
  source: string;
  cite: Citation[];
  summary: Record<Lang, string>;
};

export const RULES: Rule[] = [
  {
    id: "equal-opportunity",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 27/2026 Pasal 6 dan Pasal 7",
    cite: [{ law: "uu-27-2026", article: "6" }, { law: "uu-27-2026", article: "7", ayat: 1 }],
    summary: {
      id: "Setiap pekerja berhak atas kesempatan dan perlakuan yang sama tanpa diskriminasi, termasuk soal jenis kelamin, agama, suku, ras dan status pernikahan.",
      en: "Every worker has the right to equal opportunity and treatment without discrimination, including gender, religion, ethnicity, race and marital status.",
    },
  },
  {
    id: "age-limit",
    verdict: "yellow",
    scope: ["ad"],
    source: "UU 27/2026 Pasal 6",
    cite: [{ law: "uu-27-2026", article: "6" }],
    summary: {
      id: "Batas usia tidak dilarang secara tegas, tetapi bisa menjadi diskriminasi kalau tidak ada hubungannya dengan pekerjaan.",
      en: "An age limit is not explicitly banned, but it may be discrimination when the job does not need it.",
    },
  },
  {
    id: "appearance",
    verdict: "yellow",
    scope: ["ad"],
    source: "UU 27/2026 Pasal 6",
    cite: [{ law: "uu-27-2026", article: "6" }],
    summary: {
      id: "Syarat penampilan, tinggi atau berat badan bisa menjadi diskriminasi kalau tidak dibutuhkan untuk pekerjaannya.",
      en: "Appearance, height or weight requirements may be discrimination when the job does not need them.",
    },
  },
  {
    id: "disability",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 8/2016 Pasal 11; UU 27/2026 Pasal 6",
    cite: [{ law: "uu-27-2026", article: "6" }],
    summary: {
      id: "Penyandang disabilitas berhak memperoleh pekerjaan tanpa diskriminasi.",
      en: "People with disabilities have the right to work without discrimination.",
    },
  },
  {
    id: "job-seeker-fee",
    verdict: "yellow",
    scope: ["ad", "contract"],
    source: "UU 27/2026 Pasal 50",
    cite: [{ law: "uu-27-2026", article: "50" }],
    summary: {
      id: "Biaya penempatan kerja dibebankan kepada pemberi kerja, bukan pelamar, kecuali untuk golongan dan jabatan tertentu. Permintaan biaya pelatihan, seragam atau deposit sering menjadi tanda penipuan.",
      en: "Job placement fees are charged to the employer, not the applicant, except for certain job groups. Requests to pay for training, uniforms or deposits are a common sign of a scam.",
    },
  },
  {
    id: "document-holding",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 27/2026 Pasal 78 ayat (1)",
    cite: [{ law: "uu-27-2026", article: "78", ayat: 1 }],
    summary: {
      id: "Pemberi kerja dilarang mensyaratkan atau menahan ijazah dan dokumen pribadi milik pekerja sebagai jaminan untuk bekerja.",
      en: "Employers may not require or hold a worker's diploma or personal documents as a guarantee for the job.",
    },
  },
  {
    id: "minimum-wage",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 27/2026 Pasal 140 ayat (5)",
    cite: [{ law: "uu-27-2026", article: "140", ayat: 5 }],
    summary: {
      id: "Pengusaha dilarang membayar upah lebih rendah dari upah minimum.",
      en: "Employers may not pay less than the minimum wage.",
    },
  },
  {
    id: "unpaid-internship",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 27/2026 Pasal 37 ayat (6)",
    cite: [{ law: "uu-27-2026", article: "37", ayat: 6 }],
    summary: {
      id: "Peserta magang berhak atas bimbingan mentor, pelindungan K3, uang saku, jaminan kecelakaan kerja dan jaminan kematian, serta sertifikat.",
      en: "Interns have the right to a mentor, workplace safety, an allowance, work accident and death insurance, and a certificate.",
    },
  },
  {
    id: "internship-length",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 27/2026 Pasal 38 huruf a",
    cite: [{ law: "uu-27-2026", article: "38" }],
    summary: {
      id: "Magang berlangsung paling lama 6 bulan.",
      en: "An internship lasts at most 6 months.",
    },
  },
  {
    id: "pkwt-probation",
    verdict: "red",
    scope: ["contract"],
    source: "UU 27/2026 Pasal 86",
    cite: [{ law: "uu-27-2026", article: "86" }],
    summary: {
      id: "Kontrak kerja waktu tertentu (PKWT) tidak boleh mensyaratkan masa percobaan. Kalau ada, masa percobaannya batal demi hukum.",
      en: "A fixed-term contract (PKWT) may not require a probation period. If it does, the probation is void.",
    },
  },
  {
    id: "probation-length",
    verdict: "red",
    scope: ["contract"],
    source: "UU 27/2026 Pasal 92 ayat (1) dan (2)",
    cite: [{ law: "uu-27-2026", article: "92", ayat: 1 }, { law: "uu-27-2026", article: "92", ayat: 2 }],
    summary: {
      id: "Masa percobaan untuk pekerja tetap (PKWTT) paling lama 3 bulan, dengan upah paling sedikit 75% dari upah jabatannya dan tidak di bawah upah minimum.",
      en: "Probation for a permanent worker (PKWTT) lasts at most 3 months, with pay of at least 75% of the position's wage and never below the minimum wage.",
    },
  },
  {
    id: "pkwt-length",
    verdict: "red",
    scope: ["contract"],
    source: "UU 27/2026 Pasal 82 ayat (2)",
    cite: [{ law: "uu-27-2026", article: "82", ayat: 2 }],
    summary: {
      id: "Satu PKWT berlangsung paling lama 2 tahun, dan hanya dapat diperpanjang 2 kali dengan setiap perpanjangan paling lama 1 tahun.",
      en: "One PKWT lasts at most 2 years, and can be extended only twice, by at most 1 year each time.",
    },
  },
  {
    id: "pkwt-compensation",
    verdict: "yellow",
    scope: ["contract"],
    source: "UU 27/2026 Pasal 88",
    cite: [{ law: "uu-27-2026", article: "88" }],
    summary: {
      id: "Saat PKWT berakhir, pekerja berhak atas uang kompensasi.",
      en: "When a PKWT ends, the worker has the right to compensation pay.",
    },
  },
  {
    id: "early-termination",
    verdict: "yellow",
    scope: ["contract"],
    source: "UU 27/2026 Pasal 90",
    cite: [{ law: "uu-27-2026", article: "90" }],
    summary: {
      id: "Pihak yang mengakhiri PKWT sebelum waktunya wajib membayar ganti rugi sebesar upah sampai kontrak berakhir. Denda di luar itu perlu dicek lagi.",
      en: "The party that ends a PKWT early must pay compensation equal to the wages until the contract ends. Penalties beyond that need checking.",
    },
  },
  {
    id: "working-hours",
    verdict: "yellow",
    scope: ["ad", "contract"],
    source: "UU 27/2026 Pasal 115 dan Pasal 116",
    cite: [{ law: "uu-27-2026", article: "115", ayat: 2 }, { law: "uu-27-2026", article: "116", ayat: 1 }, { law: "uu-27-2026", article: "116", ayat: 2 }],
    summary: {
      id: "Jam kerja 40 jam seminggu. Lembur paling lama 4 jam sehari dan 18 jam seminggu, dan wajib dibayar.",
      en: "Working time is 40 hours a week. Overtime is at most 4 hours a day and 18 hours a week, and must be paid.",
    },
  },
  {
    id: "annual-leave",
    verdict: "yellow",
    scope: ["contract"],
    source: "UU 27/2026 Pasal 118 ayat (5)",
    cite: [{ law: "uu-27-2026", article: "118", ayat: 5 }],
    summary: {
      id: "Setelah 12 bulan bekerja terus-menerus, pekerja berhak atas cuti tahunan paling sedikit 12 hari kerja.",
      en: "After 12 months of continuous work, a worker has the right to at least 12 working days of annual leave.",
    },
  },
  {
    id: "marriage-pregnancy",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 27/2026 Pasal 230 ayat (1) huruf d dan e",
    cite: [{ law: "uu-27-2026", article: "230", ayat: 1 }],
    summary: {
      id: "Pengusaha dilarang memutus hubungan kerja karena pekerja menikah, hamil, melahirkan, keguguran atau menyusui.",
      en: "Employers may not dismiss a worker for getting married, being pregnant, giving birth, miscarrying or breastfeeding.",
    },
  },
  {
    id: "social-security",
    verdict: "yellow",
    scope: ["contract"],
    source: "UU 27/2026 Pasal 155; UU 24/2011 Pasal 15",
    cite: [{ law: "uu-27-2026", article: "155" }],
    summary: {
      id: "Pemberi kerja wajib mendaftarkan pekerjanya ke BPJS.",
      en: "Employers must register their workers with BPJS.",
    },
  },
];

const byId = new Map(RULES.map((r) => [r.id, r]));

export const ruleById = (id: string) => byId.get(id);

export const rulesFor = (scope: Scope) => RULES.filter((r) => r.scope.includes(scope));
