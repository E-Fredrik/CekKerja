export type Lang = "id" | "en";

type DeepStringRecord = { [K: string]: string | DeepStringRecord };

type DictShape<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends object
      ? DictShape<T[K]>
      : never;
};

const id = {
  nav: {
    brand: "Cek Kerja",
    lowongan: "Cek Lowongan",
    kontrak: "Cek Kontrak",
    interview: "Latihan Interview",
    masuk: "Masuk",
    daftar: "Daftar",
  },
  footer: {
    disclaimer:
      "Cek Kerja memberikan informasi untuk membantu kamu memahami dokumen kerja. Ini bukan nasihat hukum.",
  },
  lang: {
    id: "ID",
    en: "EN",
  },
  button: {
    pending: "Memeriksa...",
    submit: "Periksa",
  },
  field: {
    required: "Wajib diisi",
  },
  fileDrop: {
    idle: "Seret file ke sini atau klik untuk memilih",
    hint: "PDF, PNG, JPG, atau WEBP · maks. 8 MB",
    active: "Lepaskan untuk mengunggah",
    selected: "File dipilih",
    errorType: "Format tidak didukung. Gunakan PDF, PNG, JPG, atau WEBP.",
    errorSize: "File terlalu besar. Maksimum 8 MB.",
  },
  verdict: {
    red: "Melanggar?",
    yellow: "Cek lagi",
    green: "Aman",
  },
  trafficLight: {
    srLabel: "{red} Melanggar?, {yellow} Cek lagi, {green} Aman",
  },
  finding: {
    legalBasis: "Dasar hukum:",
    question: "Tanyakan:",
  },
  check: {
    errorNetwork: "Tidak dapat menghubungi server. Coba lagi.",
    errorUnknown: "Terjadi kesalahan. Coba lagi.",
  },
  kontrak: {
    title: "Cek kontrak kerja",
    intro: "Unggah kontrak kerja atau magang kamu. Setiap klausul ditandai beserta dasar hukumnya, jadi kamu tahu apa yang perlu ditanyakan sebelum tanda tangan.",
    upload: "Kontrak kamu",
    submit: "Periksa kontrak",
    headlineSome: "{count} klausul perlu kamu tanyakan.",
    headlineNone: "Tidak ada klausul yang perlu ditanyakan.",
    findings: "Hasil per klausul",
    noSource: "Tidak ada di daftar aturan kami",
    hrTitle: "Pesan untuk HR",
    hrHint: "Salin pesan ini, lalu ubah sesuai kebutuhan kamu sebelum mengirimnya.",
    copy: "Salin pesan",
    copied: "Pesan tersalin",
    again: "Periksa kontrak lain",
    typePKWT: "Kontrak waktu tertentu (PKWT)",
    typePKWTT: "Kontrak tetap (PKWTT)",
    typeMagang: "Perjanjian magang",
    typeUnknown: "Jenis kontrak belum jelas",
  },
} as const;

export type Dict = DictShape<typeof id>;

const en: Dict = {
  nav: {
    brand: "Cek Kerja",
    lowongan: "Check Job Ad",
    kontrak: "Check Contract",
    interview: "Interview Prep",
    masuk: "Sign in",
    daftar: "Sign up",
  },
  footer: {
    disclaimer:
      "Cek Kerja provides information to help you understand work documents. This is not legal advice.",
  },
  lang: {
    id: "ID",
    en: "EN",
  },
  button: {
    pending: "Checking...",
    submit: "Check",
  },
  field: {
    required: "Required",
  },
  fileDrop: {
    idle: "Drag a file here or click to choose",
    hint: "PDF, PNG, JPG, or WEBP · max 8 MB",
    active: "Release to upload",
    selected: "File selected",
    errorType: "Format not supported. Use PDF, PNG, JPG, or WEBP.",
    errorSize: "File too large. Maximum 8 MB.",
  },
  verdict: {
    red: "Violation?",
    yellow: "Check again",
    green: "OK",
  },
  trafficLight: {
    srLabel: "{red} Violation?, {yellow} Check again, {green} OK",
  },
  finding: {
    legalBasis: "Legal basis:",
    question: "Ask:",
  },
  check: {
    errorNetwork: "Could not reach the server. Try again.",
    errorUnknown: "An error occurred. Try again.",
  },
  kontrak: {
    title: "Check a work contract",
    intro: "Upload your work or internship contract. Each clause is marked with its legal basis, so you know what to ask before you sign.",
    upload: "Your contract",
    submit: "Check contract",
    headlineSome: "{count} clauses to ask about.",
    headlineNone: "No clauses to ask about.",
    findings: "Results by clause",
    noSource: "Not in our rule list",
    hrTitle: "Message for HR",
    hrHint: "Copy this message and adjust it before you send it.",
    copy: "Copy message",
    copied: "Message copied",
    again: "Check another contract",
    typePKWT: "Fixed-term contract (PKWT)",
    typePKWTT: "Permanent contract (PKWTT)",
    typeMagang: "Internship agreement",
    typeUnknown: "Contract type unclear",
  },
};

export const strings: Record<Lang, Dict> = { id, en };
