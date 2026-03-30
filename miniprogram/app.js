App({
  onLaunch() {
    if (!wx.cloud) {
      console.warn("当前基础库不支持 wx.cloud");
      return;
    }

    wx.cloud.init({
      env: "zcsimple1-yun001-5fwuf5q0949ed7d",
      traceUser: true
    });
  }
});
