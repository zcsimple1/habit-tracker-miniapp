App({
  onLaunch() {
    if (!wx.cloud) {
      console.warn("当前基础库不支持 wx.cloud");
      return;
    }

  wx.cloud.init({
    env: "cloudbase-8gw8fj3c75c015f6",
    traceUser: true
  });
  }
});
