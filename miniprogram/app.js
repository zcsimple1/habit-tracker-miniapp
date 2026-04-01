App({
  globalData: {
    statsNeedRefresh: false,  // 统计页面刷新标记
    todosNeedRefresh: false,  // 待办页面刷新标记
    categoryNeedRefresh: false // 分类页面刷新标记
  },

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
