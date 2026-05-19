/**
 * Cookie 管理工具
 *
 * 微信小程序 wx.request 不会自动管理 Cookie，需要手动：
 * 1. 从 Set-Cookie 响应头提取并存储
 * 2. 在后续请求中附带 Cookie 头
 */

var COOKIE_KEY = "session_cookies";

function load() {
  try {
    return wx.getStorageSync(COOKIE_KEY) || {};
  } catch (e) {
    return {};
  }
}

function save(cookies) {
  try {
    wx.setStorageSync(COOKIE_KEY, cookies);
  } catch (e) {
    // 静默
  }
}

function parseSetCookie(headerValue) {
  var result = {};
  var match = headerValue.match(/^\s*([^=]+)=([^;]*)/);
  if (match) {
    result[match[1].trim()] = match[2].trim();
  }
  return result;
}

function extractFromResponse(res) {
  var cookies = load();

  if (res.cookies && res.cookies.length > 0) {
    for (var i = 0; i < res.cookies.length; i++) {
      var c = res.cookies[i];
      var parts = c.split("=");
      var name = parts[0];
      if (name) {
        cookies[name.trim()] = parts.slice(1).join("=").trim();
      }
    }
  }

  var setCookieVal = res.header["set-cookie"] || res.header["Set-Cookie"];
  if (typeof setCookieVal === "string" && setCookieVal) {
    var parsed = parseSetCookie(setCookieVal);
    Object.assign(cookies, parsed);
  } else if (Array.isArray(setCookieVal)) {
    for (var j = 0; j < setCookieVal.length; j++) {
      var sc = setCookieVal[j];
      if (typeof sc === "string") {
        var parsed2 = parseSetCookie(sc);
        Object.assign(cookies, parsed2);
      }
    }
  }

  save(cookies);
}

function getCookieHeader() {
  var cookies = load();
  var parts = [];
  var keys = Object.keys(cookies);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    parts.push(k + "=" + cookies[k]);
  }
  return parts.join("; ");
}

function clearCookies() {
  try {
    wx.removeStorageSync(COOKIE_KEY);
  } catch (e) {
    // 静默
  }
}

module.exports = {
  extractFromResponse: extractFromResponse,
  getCookieHeader: getCookieHeader,
  clearCookies: clearCookies,
};
