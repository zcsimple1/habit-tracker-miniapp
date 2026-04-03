App({
  globalData: {
    statsNeedRefresh: false,
    todosNeedRefresh: false,
    categoryNeedRefresh: false
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

    // 预加载数据到缓存，加快首屏加载
    this.preloadData();
  },

  // 预加载数据
  async preloadData() {
    const today = this.formatDate(new Date());
    const cacheKey = `habits_${today}`;
    const todoCacheKey = `todos_${today}`;

    // 如果缓存已存在且未过期，跳过
    const cachedHabits = wx.getStorageSync(cacheKey);
    if (cachedHabits) return;

    try {
      // 并行预加载多个数据
      await Promise.all([
        // 预加载用户偏好
        wx.cloud.callFunction({
          name: 'user',
          data: { action: 'getProfile' }
        }).then(res => {
          if (res.result && res.result.data) {
            wx.setStorageSync('settings_preferences', res.result.data.preferences || {});
          }
        }).catch(() => {}),

        // 预加载今日习惯
        wx.cloud.callFunction({
          name: 'habit',
          data: { action: 'getTodayHabits', data: { ymd: today } }
        }).then(res => {
          if (res.result && res.result.data) {
            wx.setStorageSync(cacheKey, {
              ...res.result.data,
              timestamp: Date.now()
            });
          }
        }).catch(() => {}),

        // 预加载今日打卡
        wx.cloud.callFunction({
          name: 'checkin',
          data: { action: 'getCheckinDates' }
        }).then(res => {
          if (res.result && res.result.data) {
            wx.setStorageSync('checkin_dates', res.result.data);
          }
        }).catch(() => {}),

        // 预加载今日待办
        wx.cloud.callFunction({
          name: 'todos',
          data: { action: 'getByDate', data: { ymd: today } }
        }).then(res => {
          if (res.result && res.result.data) {
            wx.setStorageSync(todoCacheKey, {
              data: res.result.data,
              timestamp: Date.now()
            });
          }
        }).catch(() => {})
      ]);

      console.log('[app] 预加载完成');
    } catch (err) {
      console.warn('[app] 预加载失败', err);
    }
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
