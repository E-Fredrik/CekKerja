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
| Cek lowongan (job ad check) | Paste a job ad or link (public LinkedIn job ads included). Flags discriminatory or exploitative requirements (age, gender, appearance, unpaid internships) with the rule they may break, a question to ask, and an inclusive rewrite. | Done |
| Cek kontrak (contract check) | Upload a contract PDF or photo. Each clause gets a red, yellow or green mark with its legal basis, plus a polite message for HR. | In progress |
| CV match | Upload a CV once in your profile; every job ad you check is compared with it: which requirements you meet, what is missing, and suggestions for your application. | Done |
| Latihan interview (interview prep) | Reads the job ad, the company site and public interview question pages, then tailors questions to the candidate's profile and CV. | Done |
| Bilingual interface | Every page in Bahasa Indonesia and English, with a language toggle. | In progress |
| Web mailer | Emails a result to the user's own address. | In progress |
| Accounts and history | Sign up, log in, and see past checks. | In progress |
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
- Email result button ready: a form that sends a contract or job ad result to the address you type (filled in for you when signed in), never to anyone else, with every field checked, a size limit, and a limit on how many emails can be sent in a few minutes.
- Shell and mailer integrated: interview practice results can now be emailed too, and the top bar links to your profile while you are signed in.
- Job ad check page ready: paste a job ad or a link, see a traffic-light summary and every flagged requirement with the ad's exact words, its legal basis and a question to ask, then copy an inclusive version of the ad.
- Landing page ready: a bilingual landing page with a 3D traffic light that turns and lights red, yellow and green as you scroll, a sample contract check with every verdict and its legal basis, how the check works, job ad statistics that count up with their source, and links to both tools. Across the site, the top bar hides while you scroll down and a bracket cursor marks what you are about to click.
- Interview question sources ready: the job ad, the company's own about and career pages, and public interview question pages are read safely, skipping sites that forbid automated reading (Glassdoor, LinkedIn, Indeed, social media), and every question keeps a link to where it was found.
- Interview prep API ready: give a role, company, job ad and a short profile, and get 12 to 15 tailored practice questions, each with why it fits, answer tips and the link it came from (or marked as generated), plus questions to ask the employer about the contract type, probation, salary and BPJS.
- Interview prep page ready: enter the role, company, job ad or its link, the company website and a short profile, then get practice questions with why each fits, answer tips and a link to where it was found, questions to ask the company about your contract, and a note on any page that could not be read.
- Landing page hero improved: the traffic light is now modelled with recessed lenses and hoods, and as each lamp lights up the hero explains what that sign means, next to a note that every flag cites its source and is not legal advice.
- Sign in and sign up pages ready: bilingual forms that check the name, email, password length and consent before sending, point to the first field that needs fixing, and are reachable from a Sign in button in the top bar. Accounts themselves come in a later step.
- Demo sign-in added: signing up (with a repeated password) or signing in keeps only your name and email in this browser, never the password, and the top bar shows the three checks and a Sign out button only while you are signed in. Real accounts replace this in a later step.
- AI mode choice: the contract check has a Cepat / Teliti (fast / thorough) switch; Teliti uses a stronger Gemini model and falls back to the fast model automatically when it is busy.
- Profile with CV ready: a signed-in user uploads a CV once; it is read into a profile (education, experience, skills, languages) that stays only in their browser, separately for each account, and can be replaced or removed at any time.
- Step-by-step sign up and sign in: signing up now takes four short steps (email; password with a strength meter and a repeat; name and status as student, fresh graduate or job seeker; then a review with consent) and signing in two (email, then password), with a step bar, a Back button that keeps what you typed, each step checked before you move on, and sign up allowed only with a password of at least Fair strength.
- Landing hero redesigned: the 3D traffic light now stands on a deep blue road-sign stage and casts its shadow on it, and as each lamp lights up a sample contract clause with that verdict, its exact words and its legal basis appears below it. A flat traffic light shows while the 3D one loads, and a short hint tells you to scroll.
- Job ad check and interview prep errors translated: a missing role, a too-short ad or a link that cannot be read is now explained in the language you chose, with a hint such as pasting the ad text when a site blocks automated reading.
- Claude ready: the AI can switch from Gemini to Claude (Claude Opus 5.5 for thorough checks, Claude Haiku 5.5 for fast ones) with one setting, with the same results, checks and automatic fallback.
- CV match ready: after a job ad check, a signed-in user with a CV in their profile sees each skill, education and experience requirement marked met, partly met or not shown yet, with the words from their CV that show it and a tip, plus a match percentage counted by plain code rather than by the AI.
- Interview prep uses your CV and portfolio: a signed-in user's CV from their profile is used automatically (without their name), and an optional portfolio PDF, image or link lets the practice questions name their own projects; a portfolio link that cannot be read is listed and skipped.
- Scrapling page reader ready: job ad, company and portfolio links are read through Scrapling, so public LinkedIn job ad pages (`linkedin.com/jobs/view/...`) can be checked too. Only those LinkedIn pages are read, signed out and without cookies; profiles, people and search pages, Glassdoor, Indeed and social media are refused, and every other page still respects robots.txt, private-address blocking and time and size limits. When Python or Scrapling is not available, the built-in reader takes over.
- Real accounts with Supabase: signing up and signing in now create and open a real account instead of a demo kept in the browser, the job ad, contract and interview checks ask you to sign in first and bring you back to the page you wanted afterwards, and signing out ends the session everywhere on that browser.
- Two-step sign in by email: after your password, a 6-digit code is emailed to you and you are only signed in once you type it in; a code works for 10 minutes and 5 tries, a new one can be sent once a minute and 5 times an hour, and new accounts confirm their email the same way.
- Law corpus and citations: the labour rules now follow the new Labour Protection Law (UU 27/2026), which replaced UU 13/2003 on 28 October 2026, including its shorter limits (an internship lasts at most 6 months and one fixed-term contract at most 2 years). Every contract finding can open the exact text of the article it cites, with a link to the official PDF, and a clause that no rule covers is matched to the closest article of the law through a vector search in Supabase, shown only when the match is close and labelled as possibly related.
- Accessibility and mobile pass for the job ad check and interview prep: when a result appears or you start over, keyboard and screen-reader focus moves to it; the CV match score and "Copied" are announced; source links say they open a new tab; long links wrap at phone width; and an odd source link can no longer break the interview results.

## Contributors

| Contributor | What they built |
|---|---|
| **Elifele Fredrik Imanuel Jelifta** ([@E-Fredrik](https://github.com/E-Fredrik)), maintainer | Project setup and team workflow; the design system (road-sign verdicts, traffic-light summary, colour and type tokens); the Gemini client with JSON schemas and model fallback; the labour rule list with plain-code wage and duration checks; the contract check API and page, with the fast and thorough AI modes and the email form; the profile page where a CV is uploaded once and read into a profile; the switch that lets every check run on Claude instead of Gemini; CI/CD with GitHub Actions and deployment to the server; the 3D traffic light, bracket cursor and auto-hiding top bar; the law corpus of the new Labour Protection Law with the exact article text under each contract finding and a search for the article most related to a clause no rule covers; code review and integration fixes across the project. |
| **Dave Tristian Nurcahyo** ([@Dave03062006](https://github.com/Dave03062006)) | The safe page fetcher (robots.txt, blocked private addresses, time and size limits) and text extraction; the job ad check API and page; the interview question sources; the interview prep API and page that turn them into tailored practice questions; error messages for both in Indonesian and English; the CV match that compares a checked job ad with the CV in your profile; interview prep that uses the CV from your profile and an optional portfolio file or link to ask about your own projects; the Scrapling page reader that also reads public LinkedIn job ads, with the built-in reader as fallback; keyboard, screen-reader and phone-width fixes on the job ad check and interview prep pages. |
| **Kenneth Jonathan Halim** ([@Kiyono-kouji](https://github.com/Kiyono-kouji)) | The app shell, top bar and language toggle; the shared form and result components (verdict signs, traffic light, summary plate, findings); the web mailer with Nodemailer and its email templates; the landing page with the verdict legend and the remodelled 3D traffic light, now standing on a blue road-sign stage with a sample clause for each lamp; the sign in and sign up pages; the email result button, which can also send interview practice results; the Profile link in the top bar; step-by-step sign up and sign in with a password strength meter; real accounts with Supabase, so only signed-in users can open the three checks; two-step sign in with a 6-digit code sent to your email. |

## Tech stack

- **Framework:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4
- **AI:** Gemini API (`@google/genai`), with zod-validated JSON output
- **Scraping:** cheerio, with robots.txt and safe-URL checks
- **Email:** Nodemailer over SMTP
- **Database and auth:** Supabase (`@supabase/ssr`, sessions in cookies refreshed by the Next.js proxy)
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
