var HISTORY_KEY = "checkup_history";
var PREVIEW_KEY = "checkup_report_preview";
var FULL_KEY = "checkup_report_full";
var ORDER_KEY = "checkup_order";

function save(key, value) {
  try { wx.setStorageSync(key, value); } catch (e) { /* ignore */ }
}
function load(key, fallback) {
  try { return wx.getStorageSync(key) || fallback; } catch (e) { return fallback; }
}
function clearAll() {
  [HISTORY_KEY, PREVIEW_KEY, FULL_KEY, ORDER_KEY].forEach(function (key) {
    try { wx.removeStorageSync(key); } catch (e) { /* ignore */ }
  });
}
module.exports = {
  HISTORY_KEY: HISTORY_KEY,
  PREVIEW_KEY: PREVIEW_KEY,
  FULL_KEY: FULL_KEY,
  ORDER_KEY: ORDER_KEY,
  save: save,
  load: load,
  clearAll: clearAll,
};
