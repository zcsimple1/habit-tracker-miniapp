Page({
  data: {
    userInfo: {},
    hideCompleted: true,  // 默认为 true，即隐藏已完成
    reminderEnabled: false
  },

  onLoad() {
    this.loadUserInfo();
    this.loadSettings();
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getProfile'
        }
      });
      if (res.result.success) {
        this.setData({ userInfo: res.result.data });
      }
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
  },

  // 加载设置
  async loadSettings() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getProfile'
        }
      });
      if (res.result.code === 0) {
        const profile = res.result.data || {};
        this.setData({
          hideCompleted: profile.hideCompleted || false,
          reminderEnabled: profile.reminderEnabled || false
        });
      }
    } catch (err) {
      console.error('加载设置失败:', err);
    }
  },

  // 登录
  async onLogin() {
    try {
      const { userInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      });

      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          userInfo
        }
      });

      if (res.result.success) {
        wx.showToast({ title: '登录成功', icon: 'success' });
        this.loadUserInfo();
      }
    } catch (err) {
      console.error('登录失败:', err);
      wx.showToast({ title: '登录失败', icon: 'error' });
    }
  },

  // 管理分类
  onManageCategories() {
    wx.navigateTo({
      url: '/pages/category-manage/category-manage'
    });
  },

  // 预设分类
  onPresetCategories() {
    wx.navigateTo({
      url: '/pages/preset-categories/preset-categories'
    });
  },

  // 初始化数据库
  onInitDatabase() {
    wx.showModal({
      title: '确认操作',
      content: '这将重置所有数据,确定要继续吗?',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/database-init/database-init'
          });
        }
      }
    });
  },

  // 隐藏已完成
  async onHideCompletedChange(e) {
    const hideCompleted = e.detail.value;
    this.setData({ hideCompleted });

    try {
      await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'updatePreferences',
          preferences: { hideCompleted }
        }
      });
    } catch (err) {
      console.error('保存设置失败:', err);
    }
  },

  // 提醒开关
  async onReminderChange(e) {
    const reminderEnabled = e.detail.value;
    this.setData({ reminderEnabled });

    if (reminderEnabled) {
      wx.showModal({
        title: '设置提醒',
        content: '请选择提醒时间',
        success: (res) => {
          if (res.confirm) {
            this.requestSubscribeMessage();
          } else {
            this.setData({ reminderEnabled: false });
          }
        }
      });
    }

    try {
      await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'updatePreferences',
          preferences: { reminderEnabled }
        }
      });
    } catch (err) {
      console.error('保存设置失败:', err);
    }
  },

  // 请求订阅消息
  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: [], // 填入模板 ID
      success: (res) => {
        console.log('订阅成功:', res);
      }
    });
  },

  // 导出数据
  onExportData() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 同步数据
  onSyncData() {
    wx.showLoading({ title: '同步中...' });

    wx.cloud.callFunction({
      name: 'sync',
      data: {
        action: 'sync'
      }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: '同步成功', icon: 'success' });
    }).catch((err) => {
      wx.hideLoading();
      wx.showToast({ title: '同步失败', icon: 'error' });
    });
  },

  // 清除数据
  onClearData() {
    wx.showModal({
      title: '危险操作',
      content: '此操作不可恢复,确定要删除所有数据吗?',
      confirmText: '确定删除',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          this.clearAllData();
        }
      }
    });
  },

  async clearAllData() {
    wx.showLoading({ title: '清除中...' });

    try {
      // 清除所有集合
      const collections = ['habits', 'checkins', 'todos', 'categories'];
      const db = wx.cloud.database();

      for (const collection of collections) {
        const countRes = await db.collection(collection).count();
        const total = countRes.total;
        const batchSize = 20;

        for (let i = 0; i < total; i += batchSize) {
          const res = await db.collection(collection).limit(batchSize).skip(i).get();
          for (const doc of res.data) {
            await db.collection(collection).doc(doc._id).remove();
          }
        }
      }

      wx.hideLoading();
      wx.showToast({ title: '清除成功', icon: 'success' });

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '清除失败', icon: 'error' });
      console.error('清除数据失败:', err);
    }
  },

  // 关于
  onAbout() {
    wx.showModal({
      title: '关于',
      content: '习惯打卡 V2.0.0\n一个简洁的习惯管理工具',
      showCancel: false
    });
  }
});
