# Mini Program Sharing Design

## Goal

Restore official WeChat sharing so the owner and users can promote the Baojiaolian mini program to WeChat friends and Moments.

## Root Cause

The mini program currently defines neither `onShareAppMessage` nor any `button open-type="share"`. The coach workflows are all states of `pages/coach/coach`, so the missing page callback disables the native share capability for the home form, diagnosis results, and pre-meeting preparation results.

## Design

The coach page will define `onShareAppMessage` for friend sharing and `onShareTimeline` for Moments. Both callbacks will promote the mini program itself with a stable brand title and the main coach page as the destination.

No workflow mode, customer ID, customer name, conversation ID, message, form data, or AI result will be included. A recipient will always open the main coach page.

The page will call `wx.showShareMenu` during loading with both `shareAppMessage` and `shareTimeline`. It will render a native `<button open-type="share">` in the top bar for friend sharing. Moments sharing remains available from WeChat's upper-right page menu, as required by the platform.

## Error Handling

If WeChat does not support one of the share menu items, page loading continues normally. The share callbacks always fall back to the main coach page and generic Baojiaolian promotional copy.

## Testing

Security regression checks will assert that both official callbacks, the native share button, both share menu items, and privacy exclusions exist. Mini program JavaScript syntax and the full project checks will be run before handoff.
