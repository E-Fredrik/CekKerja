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
};

export const strings: Record<Lang, Dict> = { id, en };
