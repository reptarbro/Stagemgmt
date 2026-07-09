# StandBy — Pitch / Overview Deck

Marketing and roadmap collateral for StandBy. Not part of the app build (GitHub
Pages only publishes `dist/`), just stored here for safekeeping.

| File | What it is |
|------|------------|
| `StandBy-Overview-Letter.pdf` | 7-page product overview, US Letter portrait, dark theme (screen/sending). |
| `StandBy-Overview-Print-Light.pdf` | Same overview, light background with darker greens (printing). |
| `StandBy-Deck-Editable.pptx` | 11-slide deck with **native editable text, a real comparison table, and embedded screenshots**. Opens in PowerPoint; import into Google Slides via File → Import slides. |
| `StandBy-How-SignIn-Works.pdf` | 3-page "Accounts & Sign-In" explainer, dark theme (screen/sending): how passwordless sign-in works, a password-vs-StandBy comparison table, one-account/multiple-productions plus archiving, and a full FAQ for the non-traditional (no password) login. |
| `StandBy-How-SignIn-Works-Print-Light.pdf` | Same explainer, light background for printing. |
| `how-sign-in-works.html` + `how-sign-in-works.build.mjs` | Source for the explainer (self-contained HTML with embedded Montserrat/Raleway) and the Node/Chromium script that renders both PDFs. Rebuild with a session that has `playwright-core` and the app's `@fontsource` files. |

Contents: cover, purpose + KPIs, a StandBy-vs-others comparison matrix, real-world
scenarios, OOB/AEA perspectives, five interface screenshots with blurbs, and a
phased roadmap (v3.5 shipped → Phase 2 → Phase 3).

To regenerate, the source generators live in the working scratchpad
(`build3.mjs` for the PDFs, `build_pptx.mjs` for the deck, `content.mjs` for the
copy). Ask a new session to rebuild them if the app UI changes and the
screenshots need refreshing.
