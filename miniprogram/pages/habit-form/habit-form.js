const svc = require('../../services/habitService');
const syncSvc = require('../../services/syncService');

Page({
  data: {
    id: '',
    name: '',
    isEdit: false
  },

  onLoad(query) {
    if (query.id) {
      const h = svc.getHabit(query.id);
      if (h) {
        this.setData({ id: h.id, name: h.name || '', isEdit: true });
      }
    }
  },

  onName(e) {
    this.setData({ name: e.detail.value });
  },

  onSave() {
    const name = (this.data.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写习惯名称', icon: 'none' });
      return;
    }
    svc.upsertHabit({ id: this.data.id || undefined, name });
    wx.showToast({ title: '已保存', icon: 'success' });

    // 后台同步
    syncSvc.syncUpFromLocal().catch(err => console.warn('syncUp failed', err));

    setTimeout(() => wx.navigateBack(), 400);
  },

  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '删除后该习惯的打卡记录也会清空。',
      success: (res) => {
        if (res.confirm) {
          svc.removeHabit(this.data.id);
          wx.showToast({ title: '已删除', icon: 'success' });

          // 后台同步
          syncSvc.syncUpFromLocal().catch(err => console.warn('syncUp failed', err));

          setTimeout(() => wx.navigateBack(), 400);
        }
      }
    });
  }
});
