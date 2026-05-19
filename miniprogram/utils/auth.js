/**
 * 认证工具 - Token 管理
 *
 * 微信小程序不支持 Cookie，改用 Authorization: Bearer <token> 方案。
 */

var TOKEN_KEY = "auth_token";

function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || "";
  } catch (e) {
    return "";
  }
}

function setToken(token) {
  try {
    wx.setStorageSync(TOKEN_KEY, token);
  } catch (e) {
    // 静默
  }
}

function clearToken() {
  try {
    wx.removeStorageSync(TOKEN_KEY);
  } catch (e) {
    // 静默
  }
}

module.exports = {
  getToken: getToken,
  setToken: setToken,
  clearToken: clearToken,
};
