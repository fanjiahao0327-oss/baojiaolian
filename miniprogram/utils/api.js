var app = getApp();
var auth = require("./auth");
var pendingLogin = null;

function request(url, options) {
  var opts = options || {};
  var method = opts.method || "GET";
  var data = opts.data;
  var showLoading = opts.showLoading;

  if (showLoading) {
    wx.showLoading({ title: "加载中...", mask: true });
  }

  return new Promise(function (resolve, reject) {
    wx.request({
      url: app.globalData.apiBase + url,
      method: method,
      data: data,
      timeout: 120000,
      header: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + auth.getToken(),
      },
      success: function (res) {
        if (res.statusCode === 401) {
          if (!pendingLogin) {
            pendingLogin = app.wechatLogin().finally(function () {
              pendingLogin = null;
            });
          }
          pendingLogin.then(function () {
            wx.request({
              url: app.globalData.apiBase + url,
              method: method,
              data: data,
              timeout: 120000,
              header: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + auth.getToken(),
              },
              success: function (r) {
                if (r.statusCode >= 200 && r.statusCode < 300) resolve(r.data);
                else reject(new Error((r.data && r.data.error) || "请求失败"));
              },
              fail: reject,
            });
          }).catch(reject);
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          var msg = (res.data && res.data.error) || "请求失败";
          wx.showToast({ title: msg, icon: "none" });
          reject(new Error(msg));
        }
      },
      fail: function (err) {
        wx.showToast({ title: "网络异常", icon: "none" });
        reject(err);
      },
      complete: function () {
        if (showLoading) wx.hideLoading();
      },
    });
  });
}

module.exports = {
  get: function (url, options) { return request(url, Object.assign({}, options, { method: "GET" })); },
  post: function (url, data, options) { return request(url, Object.assign({}, options, { method: "POST", data: data })); },
  put: function (url, data, options) { return request(url, Object.assign({}, options, { method: "PUT", data: data })); },
  del: function (url, options) { return request(url, Object.assign({}, options, { method: "DELETE" })); },
};
