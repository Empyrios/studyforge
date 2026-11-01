# StudyForge ✳

**Make it stick.** StudyForge is a local-first, dark-only Progressive Web App for creating subject and lecture trackers, practising spaced-repetition flashcards and four-answer MCQs, and planning study sessions against exam dates.

## MVP

- Subjects with optional exam dates; lecture/topic lists with RAG rating, watched counts 0–3 and notes.
- Due flashcard reviews with Again / Hard / Good / Easy spacing, using calendar-day scheduling.
- Four-answer MCQ banks with explanations, immediate answer feedback and logged quiz results.
- Upcoming exam countdowns and revision priorities, with logged study sessions and time.
- JSON backups/import (versioned, validates cross-references), topic CSV export, fictional opt-in demo deck.
- Mobile and desktop navigation, installable PWA shell, offline-capable when previously cached.
- No subscriptions, external AI generation or runtime database. No personally identifiable pupil data is required.

## Local run

Run `python3 -m http.server 8000 --directory site` from the project root, then open `http://localhost:8000`. Run `npm run verify` to check syntax and run tests (Node.js 22+).

## Publish

Create a separate public GitHub repository named `studyforge`, copy the project source into its root and enable **GitHub Pages → Source → GitHub Actions**. The included workflow verifies the code and publishes the `site/` folder. The expected GitHub Pages project URL is `https://empyrios.github.io/studyforge/`, but this is not a confirmed live link until GitHub reports a successful Pages deployment.

## Privacy and important limitations

- Data is stored in the browser's `localStorage` in its **current browser profile** and is **not encrypted or synchronised**. Clearing site data may destroy the only copy; export JSON backups regularly.
- The app is suitable for non-sensitive personal revision material, not identifiable student, client or patient records. Do not commit personal backups to GitHub.
- The revision scheduling algorithm is a simplified, editable SM-2-style heuristic, **not** a clinically validated predictor of retention. “Again” is immediately due today and may be reviewed again in a later session.
- Practice questions and sample educational content are not a substitute for lecture notes or an authoritative course resource; review answers for accuracy.
- The app does **not** automatically parse PDFs, PowerPoints or generate questions using AI. Those can be added later with explicit data-flow and security choices.
- No multi-device sync, accounts, paid AI APIs, automatic notifications, audio or collaboration in v1.

## Product boundaries

This repo should remain independent of AppHub and all other Empyrios apps. AppHub is a launcher only. Live links should be added to AppHub only after a successful deployment.
