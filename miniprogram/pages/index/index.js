const { toYMD } = require('../../utils/date');
const svc = require('../../services/habitService');
const syncSvc = require('../../services/syncService');

Page({
  data: {
    today: toYMD(new Date()),
    habits: []
  },

  async onShow() {
    // 每次回到首页先做一次云端下拉，保证多端一致
    try {
      await syncSvc.safeSyncOnLaunch();
    } catch (e) {
      console.warn('sync onShow failed', e);
    }
    this.refresh();
  },

  refresh() {
    const today = toYMD(new Date());
    const habits = svc.listHabits().map(h => {
      const checked = svc.isChecked(h.id, today);
      const streak = svc.calcStreak(h.id, today);
      const last7 = svc.calcLast7(h.id, today);
      const monthCount = svc.calcThisMonth(h.id, new Date());
      return { ...h, checked, streak, last7, monthCount };
    });
    this.setData({ today, habits });
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/habit-form/habit-form' });
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/habit-form/habit-form?id=${id}` });
  },

  async onToggle(e) {
    const id = e.currentTarget.dataset.id;
    svc.toggleCheckin(id, this.data.today);

    // 先刷新 UI，再后台同步
    this.refresh();
    try {
      await syncSvc.syncUpFromLocal();
    } catch (err) {
      console.warn('syncUp failed', err);
    }
  }
});
