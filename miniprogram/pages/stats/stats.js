const { toYMD } = require('../../utils/date');
const svc = require('../../services/habitService');

Page({
  data: {
    today: toYMD(new Date()),
    rows: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const today = toYMD(new Date());
    const rows = svc.listHabits().map(h => {
      return {
        id: h.id,
        name: h.name,
        streak: svc.calcStreak(h.id, today),
        last7: svc.calcLast7(h.id, today),
        week: svc.calcWeek(h.id, new Date()),
        monthCount: svc.calcThisMonth(h.id, new Date())
      };
    });
    this.setData({ today, rows });
  }
});
