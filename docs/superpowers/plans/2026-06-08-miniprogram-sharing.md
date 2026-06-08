# Mini Program Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore official WeChat sharing for all coach workflows without exposing customer data.

**Architecture:** Add a mode-aware share helper and `onShareAppMessage` to the existing coach page, activate the native share menu, and use native `button open-type="share"` controls. Shared links contain only a validated workflow mode.

**Tech Stack:** WeChat Mini Program Page API, WXML, WXSS, existing Node security regression script.

---

### Task 1: Add A Failing Regression Check

**Files:**
- Modify: `scripts/check-security-regressions.mjs`

- [ ] Assert that `coach.js` defines `onShareAppMessage`, calls `wx.showShareMenu`, validates the shared mode, and does not add customer or conversation identifiers to the share path.
- [ ] Assert that `coach.wxml` uses `button` with `open-type="share"`.
- [ ] Run `npm run check:security` and confirm the new assertions fail.

### Task 2: Implement Official Sharing

**Files:**
- Modify: `miniprogram/pages/coach/coach.js`
- Modify: `miniprogram/pages/coach/coach.wxml`
- Modify: `miniprogram/pages/coach/coach.wxss`

- [ ] Parse a validated `mode` query parameter in `onLoad`.
- [ ] Call `wx.showShareMenu` for `shareAppMessage`.
- [ ] Add a mode-aware `onShareAppMessage` callback with privacy-safe titles and paths.
- [ ] Add native share buttons to the top bar and completed result area.
- [ ] Style the buttons without overriding native share behavior or appearing disabled.

### Task 3: Verify And Handoff

**Files:**
- Verify: full repository

- [ ] Run `npm run check:security`.
- [ ] Run `node --check miniprogram/pages/coach/coach.js`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Confirm only mini program and regression/documentation files changed for this task.
- [ ] Tell the owner to upload `miniprogram` through WeChat Developer Tools.
