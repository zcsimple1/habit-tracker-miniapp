Page({
  data: {
    userInfo: {},
    hideCompleted: false,
    reminderEnabled: false,
    showProfileModal: false,
    tempAvatarUrl: '',
    tempNickname: '',
    isDevMode: false
  },

  async onLoad() {
    await this.ensureOpenid();
    this.loadUserInfo(true);
    this.loadSettings(true);
    this.checkDevMode();
  },

  // 确保 openid 已缓存
  async ensureOpenid() {
    let openid = wx.getStorageSync('user_openid');
    if (!openid) {
      try {
        const res = await wx.cloud.callFunction({ name: 'user', data: { action: 'getProfile' } });
        if (res.result && res.result.data && res.result.data.openid) {
          openid = res.result.data.openid;
          wx.setStorageSync('user_openid', openid);
        }
      } catch (err) {
        console.warn('获取 openid 失败', err);
      }
    }
    return openid;
  },

  onShow() {
    // 每次显示时检查是否需要刷新
    const lastUpdate = wx.getStorageSync('settings_lastUpdate') || 0;
    const now = Date.now();
    // 超过5分钟自动刷新
    if (now - lastUpdate > 5 * 60 * 1000) {
      this.loadUserInfo(true);
      this.loadSettings(true);
    }
  },

  // 检查是否为开发者模式
  checkDevMode() {
    // 开发者 openid 白名单（只允许特定人员访问）
    // TODO: 在下面填入你的 openid，可添加多个
    const devWhiteList = [
      '你的openid1',
      '你的openid2'
    ];

    // 获取缓存的 openid
    const cachedOpenid = wx.getStorageSync('user_openid');
    if (cachedOpenid && devWhiteList.includes(cachedOpenid)) {
      this.setData({ isDevMode: true });
    } else {
      this.setData({ isDevMode: false });
    }
  },

  // 加载用户信息
  async loadUserInfo(forceRefresh = false) {
    const cacheKey = 'settings_userInfo';
    
    // 先从缓存加载
    if (!forceRefresh) {
      const cached = wx.getStorageSync(cacheKey);
      if (cached) {
        this.setData({ userInfo: cached });
        return;
      }
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getProfile'
        }
      });
      if (res.result.code === 0) {
        const userInfo = res.result.data || {};
        this.setData({ userInfo });
        wx.setStorageSync(cacheKey, userInfo);
        console.log('[settings] 用户信息已缓存');
      }
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
  },

  // 加载设置
  async loadSettings(forceRefresh = false) {
    const cacheKey = 'settings_preferences';

    // 先从缓存加载
    if (!forceRefresh) {
      const cached = wx.getStorageSync(cacheKey);
      if (cached) {
        this.setData(cached);
        return;
      }
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'getProfile'
        }
      });
      if (res.result.code === 0) {
        const profile = res.result.data || {};
        const preferences = profile.preferences || {};
        const settings = {
          hideCompleted: preferences.hideCompleted !== undefined ? preferences.hideCompleted : false,
          reminderEnabled: preferences.reminderEnabled || false,
          reminderTime: preferences.reminderTime || '09:00'
        };
        this.setData(settings);
        wx.setStorageSync(cacheKey, settings);
        wx.setStorageSync('settings_lastUpdate', Date.now());
        console.log('[settings] 设置已缓存');
      }
    } catch (err) {
      console.error('加载设置失败:', err);
    }
  },

  // 打开头像昵称填写弹窗
  onChooseAvatar() {
    this.setData({
      showProfileModal: true,
      tempAvatarUrl: this.data.userInfo.avatarUrl || '',
      tempNickname: this.data.userInfo.nickName || ''
    });
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ tempAvatarUrl: avatarUrl });
  },

  // 输入昵称
  onNicknameInput(e) {
    this.setData({ tempNickname: e.detail.value });
  },

  // 编辑资料
  onEditProfile() {
    this.setData({
      showProfileModal: true,
      tempAvatarUrl: this.data.userInfo.avatarUrl || '',
      tempNickname: this.data.userInfo.nickName || ''
    });
  },

  // 保存资料
  async onSaveProfile() {
    const { tempAvatarUrl, tempNickname } = this.data;

    if (!tempNickname) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });

      // 上传头像到云存储
      let avatarUrl = tempAvatarUrl;
      if (tempAvatarUrl && !tempAvatarUrl.startsWith('cloud://')) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}.png`,
          filePath: tempAvatarUrl
        });
        avatarUrl = uploadRes.fileID;
      }

      // 更新用户信息
      await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'updateProfile',
          data: {
            avatarUrl,
            nickName: tempNickname
          }
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ showProfileModal: false });
      
      // 更新缓存
      const cacheKey = 'settings_userInfo';
      const userInfo = {
        ...this.data.userInfo,
        avatarUrl,
        nickName: tempNickname
      };
      wx.setStorageSync(cacheKey, userInfo);
      this.setData({ userInfo });
    } catch (err) {
      console.error('保存失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  // 取消编辑
  onCancelProfile() {
    this.setData({ showProfileModal: false });
  },

  // 管理分类
  onManageCategories() {
    wx.navigateTo({
      url: '/pages/category-manage/category-manage'
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
    
    // 更新缓存
    this.updateSettingsCache({ hideCompleted });

    // 设置全局刷新标记，让打卡页面和待办页面同步更新
    const app = getApp()
    if (app.globalData) {
      app.globalData.preferencesNeedRefresh = true
    }

    try {
      await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'updatePreferences',
          data: { hideCompleted }
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
    
    // 更新缓存
    this.updateSettingsCache({ reminderEnabled });

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
          data: { reminderEnabled }
        }
      });
    } catch (err) {
      console.error('保存设置失败:', err);
    }
  },
  
  // 更新设置缓存
  updateSettingsCache(updates) {
    const cacheKey = 'settings_preferences';
    const current = wx.getStorageSync(cacheKey) || {};
    const updated = { ...current, ...updates };
    wx.setStorageSync(cacheKey, updated);
    wx.setStorageSync('settings_lastUpdate', Date.now());
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
      content: '习惯打卡 V1.0.0\n一个简洁的习惯管理工具',
      showCancel: false
    });
  }
});
