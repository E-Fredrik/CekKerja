import type { Verdict } from "../ai/schemas.ts";
import type { Lang } from "../http.ts";

export type Scope = "ad" | "contract";

export type Rule = {
  id: string;
  verdict: Verdict;
  scope: Scope[];
  source: string;
  summary: Record<Lang, string>;
};

export const RULES: Rule[] = [
  {
    id: "equal-opportunity",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 13/2003 Pasal 5 dan Pasal 6",
    summary: {
      id: "Setiap pekerja berhak atas kesempatan dan perlakuan yang sama tanpa diskriminasi, termasuk soal jenis kelamin, agama, suku, ras dan status pernikahan.",
      en: "Every worker has the right to equal opportunity and treatment without discrimination, including gender, religion, ethnicity, race and marital status.",
    },
  },
  {
    id: "age-limit",
    verdict: "yellow",
    scope: ["ad"],
    source: "UU 13/2003 Pasal 5",
    summary: {
      id: "Batas usia tidak dilarang secara tegas, tetapi bisa menjadi diskriminasi kalau tidak ada hubungannya dengan pekerjaan.",
      en: "An age limit is not explicitly banned, but it may be discrimination when the job does not need it.",
    },
  },
  {
    id: "appearance",
    verdict: "yellow",
    scope: ["ad"],
    source: "UU 13/2003 Pasal 5",
    summary: {
      id: "Syarat penampilan, tinggi atau berat badan bisa menjadi diskriminasi kalau tidak dibutuhkan untuk pekerjaannya.",
      en: "Appearance, height or weight requirements may be discrimination when the job does not need them.",
    },
  },
  {
    id: "disability",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 8/2016 Pasal 11",
    summary: {
      id: "Penyandang disabilitas berhak memperoleh pekerjaan tanpa diskriminasi.",
      en: "People with disabilities have the right to work without discrimination.",
    },
  },
  {
    id: "job-seeker-fee",
    verdict: "yellow",
    scope: ["ad", "contract"],
    source: "UU 13/2003 Pasal 38 ayat (1) dan (2)",
    summary: {
      id: "Biaya penempatan kerja dibebankan kepada pemberi kerja, bukan pelamar, kecuali untuk golongan dan jabatan tertentu. Permintaan biaya pelatihan, seragam atau deposit sering menjadi tanda penipuan.",
      en: "Job placement fees are charged to the employer, not the applicant, except for certain job groups. Requests to pay for training, uniforms or deposits are a common sign of a scam.",
    },
  },
  {
    id: "document-holding",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "Surat Edaran Menaker M/5/HK.04.00/V/2025",
    summary: {
      id: "Pemberi kerja dilarang mensyaratkan atau menahan ijazah dan dokumen pribadi milik pekerja sebagai jaminan untuk bekerja.",
      en: "Employers may not require or hold a worker's diploma or personal documents as a guarantee for the job.",
    },
  },
  {
    id: "minimum-wage",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 13/2003 Pasal 88E ayat (2), diubah UU 6/2023",
    summary: {
      id: "Pengusaha dilarang membayar upah lebih rendah dari upah minimum.",
      en: "Employers may not pay less than the minimum wage.",
    },
  },
  {
    id: "unpaid-internship",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "Permenaker 6/2020 Pasal 13",
    summary: {
      id: "Peserta magang berhak atas uang saku, jaminan sosial dan sertifikat.",
      en: "Interns have the right to an allowance, social security and a certificate.",
    },
  },
  {
    id: "internship-length",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "Permenaker 6/2020 Pasal 5",
    summary: {
      id: "Magang paling lama 1 tahun.",
      en: "An internship lasts at most 1 year.",
    },
  },
  {
    id: "pkwt-probation",
    verdict: "red",
    scope: ["contract"],
    source: "UU 13/2003 Pasal 58",
    summary: {
      id: "Kontrak kerja waktu tertentu (PKWT) tidak boleh mensyaratkan masa percobaan. Kalau ada, masa percobaannya batal demi hukum.",
      en: "A fixed-term contract (PKWT) may not require a probation period. If it does, the probation is void.",
    },
  },
  {
    id: "probation-length",
    verdict: "red",
    scope: ["contract"],
    source: "UU 13/2003 Pasal 60",
    summary: {
      id: "Masa percobaan untuk pekerja tetap (PKWTT) paling lama 3 bulan, dan upahnya tidak boleh di bawah upah minimum.",
      en: "Probation for a permanent worker (PKWTT) lasts at most 3 months, and the wage may not be below the minimum wage.",
    },
  },
  {
    id: "pkwt-length",
    verdict: "red",
    scope: ["contract"],
    source: "PP 35/2021 Pasal 8",
    summary: {
      id: "PKWT berdasarkan jangka waktu paling lama 5 tahun, termasuk perpanjangannya.",
      en: "A time-based PKWT lasts at most 5 years, including extensions.",
    },
  },
  {
    id: "pkwt-compensation",
    verdict: "yellow",
    scope: ["contract"],
    source: "UU 13/2003 Pasal 61A, diubah UU 6/2023",
    summary: {
      id: "Saat PKWT berakhir, pekerja berhak atas uang kompensasi.",
      en: "When a PKWT ends, the worker has the right to compensation pay.",
    },
  },
  {
    id: "early-termination",
    verdict: "yellow",
    scope: ["contract"],
    source: "UU 13/2003 Pasal 62",
    summary: {
      id: "Pihak yang mengakhiri PKWT sebelum waktunya wajib membayar ganti rugi sebesar upah sampai kontrak berakhir. Denda di luar itu perlu dicek lagi.",
      en: "The party that ends a PKWT early must pay compensation equal to the wages until the contract ends. Penalties beyond that need checking.",
    },
  },
  {
    id: "working-hours",
    verdict: "yellow",
    scope: ["ad", "contract"],
    source: "UU 13/2003 Pasal 77 dan 78; PP 35/2021 Pasal 26",
    summary: {
      id: "Jam kerja 40 jam seminggu. Lembur paling lama 4 jam sehari dan 18 jam seminggu, dan wajib dibayar.",
      en: "Working time is 40 hours a week. Overtime is at most 4 hours a day and 18 hours a week, and must be paid.",
    },
  },
  {
    id: "annual-leave",
    verdict: "yellow",
    scope: ["contract"],
    source: "UU 13/2003 Pasal 79",
    summary: {
      id: "Setelah 12 bulan bekerja terus-menerus, pekerja berhak atas cuti tahunan paling sedikit 12 hari kerja.",
      en: "After 12 months of continuous work, a worker has the right to at least 12 working days of annual leave.",
    },
  },
  {
    id: "marriage-pregnancy",
    verdict: "red",
    scope: ["ad", "contract"],
    source: "UU 13/2003 Pasal 153 ayat (1) huruf d dan e",
    summary: {
      id: "Pengusaha dilarang memutus hubungan kerja karena pekerja menikah, hamil, melahirkan, keguguran atau menyusui.",
      en: "Employers may not dismiss a worker for getting married, being pregnant, giving birth, miscarrying or breastfeeding.",
    },
  },
  {
    id: "social-security",
    verdict: "yellow",
    scope: ["contract"],
    source: "UU 24/2011 Pasal 15",
    summary: {
      id: "Pemberi kerja wajib mendaftarkan pekerjanya ke BPJS.",
      en: "Employers must register their workers with BPJS.",
    },
  },
];

const byId = new Map(RULES.map((r) => [r.id, r]));

export const ruleById = (id: string) => byId.get(id);

export const rulesFor = (scope: Scope) => RULES.filter((r) => r.scope.includes(scope));
