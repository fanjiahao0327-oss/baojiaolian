var auth = require("./utils/auth");

App({
  globalData: {
    userInfo: null,
    isLogin: false,
    apiBase: "https://baojiaolian.com.cn",
    needBindPhone: false,
    loginReady: false,
  },

  onLaunch() {
    this.autoLogin();
  },

  async autoLogin() {
    try {
      var token = auth.getToken();
      if (!token) {
        this.globalData.isLogin = false;
        this.globalData.loginReady = true;
        return;
      }
      var res = await this.request("/api/auth/me");
      if (res.statusCode >= 200 && res.statusCode < 300) {
        this.globalData.userInfo = res.data;
        this.globalData.isLogin = true;
        this.globalData.needBindPhone = !res.data.phone;
      } else {
        // Token 过期，清除本地缓存
        if (res.statusCode === 401) auth.clearToken();
        this.globalData.isLogin = false;
      }
    } catch (e) {
      // 网络异常或超时，不清除 token（可能是临时网络问题）
      this.globalData.isLogin = false;
    }
    this.globalData.loginReady = true;
  },

  async wechatLogin() {
    var codeRes = await wx.login();
    var res = await this.request("/api/auth/wechat-login", {
      method: "POST",
      data: { code: codeRes.code },
    });
    if (res.statusCode >= 200 && res.statusCode < 300) {
      this.globalData.userInfo = res.data.user;
      this.globalData.isLogin = true;
      this.globalData.needBindPhone = !res.data.user.phone;
      if (res.data.token) {
        auth.setToken(res.data.token);
      }
    } else {
      throw new Error((res.data && res.data.error) || "登录失败");
    }
  },

  request(url, options) {
    var opts = options || {};
    var method = opts.method || "GET";
    var data = opts.data;
    return new Promise(function (resolve, reject) {
      wx.request({
        url: this.globalData.apiBase + url,
        method: method,
        data: data,
        timeout: 60000,
        header: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + auth.getToken(),
        },
        success: function (res) {
          resolve(res);
        },
        fail: reject,
      });
    }.bind(this));
  },
});
