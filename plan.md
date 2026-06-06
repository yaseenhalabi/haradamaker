# Harada Maker — Plan

A very simple, lightweight tool for creating your own **Harada board** (the 9×9 goal grid that Shohei Ohtani made famous).

---

## 1. Background: What the Harada Method Is

The **Harada Method** is a Japanese goal-setting system created by track coach **Takashi Harada**. Its most recognizable piece is the **Open Window 64 (OW64) chart** — a 9×9 grid that breaks one big dream into a concrete, repeatable action plan. Shohei Ohtani famously filled one out at age 15.

### How the chart is structured

The board is a **9×9 grid (81 cells)** organized as nine 3×3 blocks:

```diagram
╭─────────┬─────────┬─────────╮
│  3×3    │  3×3    │  3×3    │
│ Pillar1 │ Pillar2 │ Pillar3 │
├─────────┼─────────┼─────────┤
│  3×3    │  CENTER │  3×3    │
│ Pillar8 │ 8 Pillars│ Pillar4 │
│         │ + GOAL  │         │
├─────────┼─────────┼─────────┤
│  3×3    │  3×3    │  3×3    │
│ Pillar7 │ Pillar6 │ Pillar5 │
╰─────────┴─────────┴─────────╯
```

- **Center cell of the whole board** = the one **main goal** (specific, measurable).
- **8 cells around that center** = the **8 supporting pillars** (the key areas that must be true to reach the goal).
- Each of the 8 pillars is **repeated** in the center of its own surrounding 3×3 block.
- The **8 cells around each pillar** = **8 concrete actions / habits** for that pillar.

That gives: **1 goal → 8 pillars → 64 actions**.

### Key principles (so the tool encourages the right thing)

- The 64 outer cells should be **actions and habits**, not outcomes (e.g. "practice X daily", not "be great at X").
- Pillars should be **balanced** — not all skill; include mindset, health, environment, relationships, luck/character.
- The chart is a **living reference**, reviewed and adjusted over time. It doesn't need to be perfect or 100% full.

---

## 2. Product Goal

Let anyone open a website and quickly build, edit, and keep their own Harada board — with **no sign-up required** and a focus on speed and simplicity. Lightweight over feature-rich.

---

## 3. User Story

> **As** someone who just heard about the Harada Method (maybe from Ohtani's chart),
> **I want** to open a simple website and fill out my own 9×9 board,
> **so that** I can turn one big goal into 8 pillars and 64 daily actions I can actually follow.

### Walkthrough of the experience

1. **Arrives & understands instantly.**
   The user lands on the page. They immediately see an empty (or example-filled) 9×9 Harada board and a one-line explanation of how it works: *one goal in the center, 8 pillars around it, 8 actions per pillar*.

2. **Sets the main goal.**
   They click the center cell and type their main goal (e.g. "Run a sub-3-hour marathon"). The board visually emphasizes that this is the heart of everything.

3. **Adds the 8 pillars.**
   They click each of the 8 cells surrounding the center and type a supporting pillar (e.g. "Training", "Nutrition", "Recovery", "Mindset"...). As they type a pillar, **it automatically appears as the center of its own 3×3 block** so they never retype it.

4. **Fills in the 64 actions.**
   For each pillar block, they click the 8 surrounding cells and write specific actions/habits (e.g. under "Recovery": "Sleep 8 hrs", "Foam roll 10 min", "1 rest day/week"...). Gentle hints nudge them toward *actions, not outcomes*.

5. **Edits freely & sees progress.**
   They can click any cell to rewrite it. The board shows at a glance how complete it is (e.g. cells filled vs. empty), and reminds them it's okay to leave some blank for now.

6. **Keeps their board.**
   Their work is **saved automatically** so closing and reopening the site brings the board back. They can also **export/share** it (e.g. download as an image or print) to pin it up, and **start a new board** if they want.

7. **Returns later to refine.**
   On a later visit, the board is exactly as they left it. They tweak pillars and actions as their plan evolves — the chart grows with them.

### What success looks like for the user
- Goes from "blank page" to a complete (or mostly complete) board in one short sitting.
- Never feels confused about what goes where.
- Can leave and come back without losing anything.
- Ends up with something they can look at daily.

---

## 4. Core Features (scope for v1)

- A clean, editable **9×9 Harada board** with the correct goal → pillar → action structure.
- **Auto-mirroring**: typing a pillar once fills both its position around the center and the center of its block.
- **Auto-save** so boards persist between visits (no account needed).
- **Visual hierarchy**: center goal, pillars, and actions are clearly distinguished.
- **Export / print / share** the finished board.
- **Reset / new board**.

### Explicit non-goals for v1 (keep it lightweight)
- No accounts, login, or cloud sync.
- No daily diary / routine check sheet / habit tracking (these are other Harada tools — possible later).
- No collaboration or multi-board management.
- No mobile-app, just a responsive website.

---

## 5. Open Questions (for later)

- Should we offer an example/template board to start from, or always start blank?
- Should it work well on phones, or is desktop the priority for filling out 81 cells?
- Export format preference: image, PDF, or both?
- Do we want subtle guidance/tips, or keep the UI completely bare?
