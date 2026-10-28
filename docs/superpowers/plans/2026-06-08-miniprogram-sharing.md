# Mini Program Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore official friend and Moments sharing for promoting the mini program without exposing customer data.

**Architecture:** Add `onShareAppMessage` and `onShareTimeline` to the existing coach page, activate both native share menu entries, and use a native `button open-type="share"` control. All shares open the main coach page with no private query parameters.

**Tech Stack:** WeChat Mini Program Page API, WXML, WXSS, existing Node security regression script.

---

### Task 1: Add A Failing Regression Check

**Files:**
- Modify: `scripts/check-security-regressions.mjs`

- [ ] Assert that `coach.js` defines `onShareAppMessage` and `onShareTimeline`, enables both share menu entries, and does not add customer or conversation identifiers to the share destination.
- [ ] Assert that `coach.wxml` uses `button` with `open-type="share"`.
- [ ] Run `npm run check:security` and confirm the new assertions fail.

### Task 2: Implement Official Sharing

**Files:**
- Modify: `miniprogram/pages/coach/coach.js`
- Modify: `miniprogram/pages/coach/coach.wxml`
- Modify: `miniprogram/pages/coach/coach.wxss`

- [ ] Call `wx.showShareMenu` for `shareAppMessage` and `shareTimeline`.
- [ ] Add privacy-safe promotional callbacks for friend and Moments sharing.
- [ ] Add a native share button to the top bar.
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
