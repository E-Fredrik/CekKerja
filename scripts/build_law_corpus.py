import json
import re
import sys

import pypdf

HEADER = re.compile(r"^\s*(PRES|REP|REF|RE\W?P|r-f|_|-|\d+\s*$|[-_\s\dtlIO.,]+$)")
SK = re.compile(r"\s*SK\s*[NnIl][oO0]\s*[\dlO]+\s*[A-Z]?\s*")
DIGITS = str.maketrans({"O": "0", "o": "0", "T": "7", "l": "1", "L": "1", "I": "1", "J": "1"})
WORDS = {
    "tqjuh": "tujuh", "tqiuh": "tujuh", "danlatau": "dan/atau", "Tenoga": "Tenaga", "bagr": "bagi",
    "kebljakan": "kebijakan", "kebilakan": "kebijakan", "kebjakan": "kebijakan", "kebiakan": "kebijakan",
    "gubemur": "gubernur", "persetqiuan": "persetujuan", "sErma": "sama", "wama": "warna",
    "sslagaiman4": "sebagaimana", "sebagaiman4": "sebagaimana", "sslag4imana": "sebagaimana", "peizinan": "perizinan",
    "peringatantertulis": "peringatan tertulis", "dendaadministratif": "denda administratif",
    "asasnondiskriminasi": "asas nondiskriminasi", "pencegahandiskriminasi": "pencegahan diskriminasi",
    "kecelalaan": "kecelakaan", "istiraha$": "istirahat;", "hal-halyangdapatdiperhitungan": "hal-hal yang dapat diperhitungkan",
    "denganUpah": "dengan Upah", "ketenagakedaan": "ketenagakerjaan", "diselenggaralan": "diselenggarakan",
    "lmbaga": "lembaga", "perencernaan": "perencanaan", "ditakukan": "dilakukan", "anggrran": "anggaran",
    "anggarrn": "anggaran", "dilaksanalan": "dilaksanakan", "pelalsanaan": "pelaksanaan", "sebegian": "sebagian",
    "sertilikasi": "sertifikasi", "mendapatlan": "mendapatkan", "sebagran": "sebagian", "praturan": "peraturan",
    "kesepalatan": "kesepakatan", "perizrnan": "perizinan", "keseiahteraan": "kesejahteraan", "paragral": "paragraf",
    "dilasanakan": "dilaksanakan", "pmbatasan": "pembatasan", "ditaksanakan": "dilaksanakan", "berahir": "berakhir",
    "pemerintsh": "pemerintah", "rnggaran": "anggaran", "perseorangeln": "perseorangan", "pelaksaneran": "pelaksanaan",
    "perundzrngundangan": "perundang-undangan", "penghargeran": "penghargaan", "penghargarn": "penghargaan", "hat": "hal", "yhng": "yang",
}
WORD = re.compile(r"(?<![\w$])(" + "|".join(map(re.escape, WORDS)) + r")(?![\w$])")
STEMS = [("{", "rj"), ("}", "k"), ("[j", "ij"), ("[i", "ij"), ("d[", "di")]
KEDA = re.compile(r"\b([Pp]e|[Mm]empe|[Dd]ipe)?([Kk])e(?:da|4a)(?=an\b|kan\b|\b|/)")


def page_lines(page):
    lines = [SK.sub(" ", line).rstrip() for line in page.split("\n")]
    lines = [line for line in lines if line.strip()]
    while lines and HEADER.match(lines[0]):
        lines.pop(0)
    while lines and re.search(r"(\.\s?){2,}\W*$", lines[-1]):
        lines.pop()
    return lines


def join_pages(pages):
    out = []
    for lines in pages:
        if out and lines and lines[0].startswith(out[-1].strip()) and len(out[-1].strip()) < 25:
            out.pop()
        out += lines
    return out


def fix_text(text):
    for bad, good in STEMS:
        text = text.replace(bad, good)
    text = KEDA.sub(lambda m: (m.group(1) or "") + m.group(2) + "erja", text)
    text = WORD.sub(lambda m: WORDS[m.group(0)], text)
    text = re.sub(r"\s*RE\S*\s+INDO\S*\s*[-_]\S*[-_]", "", text)
    text = re.sub(r"\((?:l|I)\)", "(1)", text)
    text = re.sub(r"\bI(?= \()", "1", text)
    text = re.sub(r"(?<=ayat )[lt]([\d])[lt]", r"(\1)", text)
    text = re.sub(r"\)(?=[a-z])", ") ", text)
    text = re.sub(r"\((\d)1(?=\s)", r"(\1)", text)
    text = re.sub(r"(?m)^\(U\s", "(1) ", text)
    text = re.sub(r"(?m)^[lL1t]([\d])[lt1](?=\s)", r"(\1)", text)
    text = re.sub(r"(?<=\d)[Oo]|[Oo](?=\d)", "0", text)
    text = re.sub(r"(?<=[a-z])(\d+ \()", r" \1", text)
    text = re.sub(r"-\n(?=[a-z])", "", text)
    text = re.sub(r"\n(?!\(\d+\) |[a-z]\. )", " ", text)
    text = re.sub(r"(\s\(\d+\))+\s*$", "", text)
    text = re.sub(r" BAB [IVXLC]+\b.*$", "", text)
    return re.sub(r"[ \t]+", " ", text).strip()


def articles(lines):
    found, current, expect = {}, None, 1
    for line in lines:
        heading = re.match(r"^[\s.]*Pas([a-zA-Z0-9 ]{1,8})$", line)
        if heading:
            rest = heading.group(1).replace(" ", "").translate(DIGITS)
            if any(rest[i:] == str(expect) for i in range(len(rest))):
                current, expect = str(expect), expect + 1
                found[current] = []
                continue
        if current:
            found[current].append(line)
    return {number: fix_text("\n".join(body)) for number, body in found.items()}


def main(pdf_path, out_path, law_id, title, url):
    text = "\n<<PAGE>>\n".join(page.extract_text() or "" for page in pypdf.PdfReader(pdf_path).pages)
    body = text.split("PENJELASAN\nATAS")[0]
    corpus = articles(join_pages(page_lines(page) for page in body.split("<<PAGE>>")))
    with open(out_path, "w", encoding="utf-8") as file:
        json.dump({"id": law_id, "title": title, "url": url, "articles": corpus}, file, ensure_ascii=False, indent=1)
        file.write("\n")
    print(f"{len(corpus)} articles written to {out_path}")


if __name__ == "__main__":
    main(*sys.argv[1:6])
