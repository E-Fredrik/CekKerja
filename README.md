# CekKerja

**Read it before you sign it.** CekKerja is a bilingual (Bahasa Indonesia / English) web app that helps Indonesian students and fresh graduates check a job ad or their first work contract against Indonesian labour rules, and prepare for the interview.

Team 04, Cloud Computing. SDG 8 (Decent Work and Economic Growth) and SDG 10 (Reduced Inequalities).

> Results are possible violations for learning, not legal advice. For a real case, contact the local Disnaker or LBH.

## The problem

- An analysis of 8,969 online job ads in Central Java found that 66.3% set an age limit and 38.8% asked for a gender (Ningrum et al., *PLoS ONE*, 2020).
- In 2025, a Surabaya company was reported for holding employees' original diplomas, and dozens more reports followed. The Ministry of Manpower then banned the practice by circular.
- Job platforms match people to jobs, and legal sites sell lawyer time. We found no free tool that checks a worker's own job ad or contract against Indonesian law.

## Features

Status is updated with every feature pull request: Not started, In progress, Done.

| Feature | What it does | Status |
|---|---|---|
| Cek lowongan (job ad check) | Paste a job ad or link. Flags discriminatory or exploitative requirements (age, gender, appearance, unpaid internships) with the rule they may break, a question to ask, and an inclusive rewrite. | In progress |
| Cek kontrak (contract check) | Upload a contract PDF or photo. Each clause gets a red, yellow or green mark with its legal basis, plus a polite message for HR. | In progress |
| Latihan interview (interview prep) | Reads the job ad, the company site and public interview question pages, then tailors questions to the candidate's profile and CV. | Not started |
| Bilingual interface | Every page in Bahasa Indonesia and English, with a language toggle. | In progress |
| Web mailer | Emails a result to the user's own address. | In progress |
| Accounts and history | Sign up, log in, and see past checks. | Not started |
| Premium | Free plan with monthly limits; Premium through Midtrans. | Not started |

## Progress so far

- Project set up: Next.js, TypeScript and Tailwind CSS, with the team's branch and pull request workflow.
- Design system defined: verdicts drawn as road signs, a traffic-light result summary, shared colour and type tokens for light and dark mode.
- AI client ready: Gemini answers are checked against fixed JSON schemas, and a busy or broken answer falls back to another model automatically.
- Safe page reader ready: links to job ads and company sites are read with robots.txt respected, private and local addresses blocked, and a time and size limit, then turned into clean text and a list of interview questions.
- Labour rules ready: a list of Indonesian labour rules, each with its legal source in both languages, and plain-code checks for the minimum wage and the length of internships and fixed-term contracts, so the AI never decides a number.
- Job ad check API ready: a pasted job ad or a link is checked against the labour rules; every flag quotes the ad's exact words, cites its legal source and suggests a question to ask, followed by an inclusive rewrite of the ad.
- App shell done: NavBar with logo, tool links and slanted active underline; ID/EN language toggle remembered in localStorage; "not legal advice" footer; dark mode via design tokens.
- Shared UI components ready: road-sign verdict marks and tags, traffic-light summary, wipe-in summary plate, finding rows with verbatim quotes, pill buttons, input and textarea fields, file drop zone, inline notices, and client check hook.

- Automatic checks and deployment: every pull request is built, type-checked, linted and tested on GitHub Actions, and every change merged into `main` is deployed to the server.
- Contract check API ready: an uploaded contract PDF or photo is split into clauses, each marked red, yellow or green against the labour rules with its legal source, and plain code decides every wage and duration limit. A polite message to HR is included.
- Contract check page ready: upload a contract, see a traffic-light summary and every clause with its quote, legal basis and a question to ask, ordered from most to least serious, then copy a ready-made message for HR.
- Web mailer ready: emails contract, job ad, and interview prep findings to the user's own address with clean HTML formatting, escaped inputs, and plain-text fallback.

## Tech stack

- **Framework:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4
- **AI:** Gemini API (`@google/genai`), with zod-validated JSON output
- **Scraping:** cheerio, with robots.txt and safe-URL checks
- **Email:** Nodemailer over SMTP
- **Database and auth:** Supabase
- **Payments:** Midtrans Snap (sandbox)

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
- Every feature pull request updates the feature status and the progress list above.
- Commit messages are plain sentences, for example `Add the contract check API`.
