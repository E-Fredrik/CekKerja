# CekKerja

**Read it before you sign it.** CekKerja is a bilingual (Bahasa Indonesia / English) web app that helps Indonesian students and fresh graduates check a job ad or their first work contract against Indonesian labour rules, and prepare for the interview.

Team 04, Cloud Computing. SDG 8 (Decent Work and Economic Growth) and SDG 10 (Reduced Inequalities).

> Results are possible violations for learning, not legal advice. For a real case, contact the local Disnaker or LBH.

## The problem

- An analysis of 8,969 online job ads in Central Java found that 66.3% set an age limit and 38.8% asked for a gender (Ningrum et al., *PLoS ONE*, 2020).
- In 2025, a Surabaya company was reported for holding employees' original diplomas, and dozens more reports followed. The Ministry of Manpower then banned the practice by circular.
- Job platforms match people to jobs, and legal sites sell lawyer time. We found no free tool that checks a worker's own job ad or contract against Indonesian law.

## Features

| Feature | What it does |
|---|---|
| Cek lowongan (job ad check) | Paste a job ad or link. Flags discriminatory or exploitative requirements (age, gender, appearance, unpaid internships) with the rule they may break, a question to ask, and an inclusive rewrite. |
| Cek kontrak (contract check) | Upload a contract PDF or photo. Each clause gets a red, yellow or green mark with its legal basis, plus a polite message for HR. |
| Latihan interview (interview prep) | Reads the job ad, the company site and public interview question pages, then tailors questions to the candidate's profile and CV. |
| Web mailer | Emails a result to the user's own address. |
| Accounts and history | Sign up, log in, and see past checks. (planned) |
| Premium | Free plan with monthly limits; Premium through Midtrans. (planned) |
| CI/CD | Automatic checks on every pull request and deployment. (planned) |

## Progress

Every feature pull request updates this table. Status: Planned, In progress, Done.

| Task | Feature | Opens | Status |
|---|---|---|---|
| T01 | Repository skeleton, ownership and commit rules | 4 Nov | Done |
| K01 | App shell, header and language toggle | 5 Nov | Planned |
| L01 | Gemini client and response schemas | 5 Nov | Planned |
| D01 | Safe page fetcher and text extraction | 5 Nov | Planned |
| K02 | Form and result components | 6 Nov | Planned |
| L02 | Labour rules and number checks | 6 Nov | Planned |
| D02 | Job ad check API | 7 Nov | Planned |
| L03 | Contract check API | 7 Nov | Planned |
| K03 | Web mailer with Nodemailer | 8 Nov | Planned |
| D03 | Job ad check page | 9 Nov | Planned |
| L04 | Contract check page | 9 Nov | Planned |
| K04 | Email result button | 10 Nov | Planned |
| D04 | Interview question sources | 11 Nov | Planned |
| L05 | AI mode selector | 11 Nov | Planned |
| K05 | Landing page | 13 Nov | Planned |
| D05 | Interview prep API | 13 Nov | Planned |
| D06 | Interview prep page | 15 Nov | Planned |
| L06, D07, K06 | Integration fixes (first complete version) | 17 Nov | Planned |
| K07 | Supabase setup and accounts | 19 Nov (tentative) | Planned |
| D08 | Interview prep with CV and portfolio upload | 20 Nov | Planned |
| K08 | Check history | 21 Nov (tentative) | Planned |
| L07 | Law corpus and citations | 21 Nov (tentative) | Planned |
| D09 | Accessibility and mobile pass | 22 Nov | Planned |
| L08 | Minimum wage data | 23 Nov (tentative) | Planned |
| K09 | Premium and Midtrans payment | 24 Nov (tentative) | Planned |
| L09 | CI/CD implementation | 25 Nov (tentative) | Planned |
| L10, D10, K10 | Integration fixes (accounts, history, Premium, CI/CD) | 28 Nov | Planned |
| L11, D11, K11 | Testing and bug fixes | 1 Dec | Planned |
| L12, D12, K12 | Final polish | 3 Dec | Planned |
| T02 | Final presentation and demo | 4 Dec | Planned |

Dates marked (tentative) depend on class topics (Supabase, CI/CD) and may move.

## Tech stack

- **Framework:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4
- **AI:** Gemini API (`@google/genai`), with zod-validated JSON output
- **Scraping:** cheerio, with robots.txt and safe-URL checks
- **Email:** Nodemailer over SMTP
- **Database and auth (planned):** Supabase
- **Payments (planned):** Midtrans Snap (sandbox)
- **CI/CD (planned):** GitHub Actions

## Getting started

```bash
git clone https://github.com/E-Fredrik/CekKerja.git
cd CekKerja
npm install
cp .env.example .env.local   # fill in your own keys, never commit this file
npm run dev                  # http://localhost:3000
```

| Task | Command |
|---|---|
| Development server | `npm run dev` |
| Production build | `npm run build` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests | `npm test` |

## How we work

- Every feature has its own branch, named after the feature (for example `contract-check-api`).
- Work reaches `main` only through pull requests, and a teammate reviews each one before it is merged.
- Every feature pull request updates the progress table above.
- Commit messages are plain sentences, for example `Add the contract check API`.
