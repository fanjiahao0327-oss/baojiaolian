# Mini Program Sharing Design

## Goal

Restore official WeChat sharing on the Baojiaolian coach page and make the page-level share button usable for each coach workflow.

## Root Cause

The mini program currently defines neither `onShareAppMessage` nor any `button open-type="share"`. The coach workflows are all states of `pages/coach/coach`, so the missing page callback disables the native share capability for the home form, diagnosis results, and pre-meeting preparation results.

## Design

The coach page will define one official `onShareAppMessage` callback. It will generate a title and path from the active workflow and support both the upper-right WeChat menu and page buttons.

The shared path will contain only a validated `mode` query parameter:

- `objection_followup`
- `pre_meeting_prep`
- `meeting_review`
- `diagnosis`

No customer ID, customer name, conversation ID, message, form data, or AI result will be included. A recipient opening the share will land on the corresponding blank workflow form.

The page will call `wx.showShareMenu` during loading and render a native `<button open-type="share">` in the top bar. Completed coach results will also expose a native share button labelled as sharing the current tool, not the private result.

## Error Handling

Unknown or missing shared modes fall back to `objection_followup`. The share callback also falls back to a generic Baojiaolian title and the coach page root.

## Testing

Security regression checks will assert that the official callback, native share button, share menu activation, validated mode paths, and privacy exclusions exist. Mini program JavaScript syntax and the full project checks will be run before handoff.
