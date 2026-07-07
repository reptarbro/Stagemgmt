# Standby — Pitch / Overview Deck

Marketing and roadmap collateral for Standby. Not part of the app build (GitHub
Pages only publishes `dist/`), just stored here for safekeeping.

| File | What it is |
|------|------------|
| `Standby-Overview-Letter.pdf` | 7-page product overview, US Letter portrait, dark theme (screen/sending). |
| `Standby-Overview-Print-Light.pdf` | Same overview, light background with darker greens (printing). |
| `Standby-Deck-Editable.pptx` | 11-slide deck with **native editable text, a real comparison table, and embedded screenshots**. Opens in PowerPoint; import into Google Slides via File → Import slides. |

Contents: cover, purpose + KPIs, a Standby-vs-others comparison matrix, real-world
scenarios, OOB/AEA perspectives, five interface screenshots with blurbs, and a
phased roadmap (v3.5 shipped → Phase 2 → Phase 3).

To regenerate, the source generators live in the working scratchpad
(`build3.mjs` for the PDFs, `build_pptx.mjs` for the deck, `content.mjs` for the
copy). Ask a new session to rebuild them if the app UI changes and the
screenshots need refreshing.
