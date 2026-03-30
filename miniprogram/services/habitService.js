const storage = require('../utils/storage');
const { toYMD, addDays, startOfWeek, startOfMonth } = require('../utils/date');

function uid() {
  return 'h_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function listHabits() {
  const st = storage.ensure();
  return st.habits.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function getHabit(id) {
  const st = storage.ensure();
  return st.habits.find(h => h.id === id);
}

function upsertHabit(habit) {
  const st = storage.ensure();
  const now = Date.now();
  if (!habit.id) {
    habit.id = uid();
    habit.createdAt = now;
    st.habits.push(habit);
  } else {
    const idx = st.habits.findIndex(h => h.id === habit.id);
    if (idx >= 0) st.habits[idx] = { ...st.habits[idx], ...habit, updatedAt: now };
    else st.habits.push({ ...habit, createdAt: now });
  }
  storage.save(st);
  return habit;
}

function removeHabit(id) {
  const st = storage.ensure();
  st.habits = st.habits.filter(h => h.id !== id);
  delete st.logs[id];
  storage.save(st);
}

function isChecked(id, ymd = toYMD(new Date())) {
  const st = storage.ensure();
  return !!(st.logs[id] && st.logs[id][ymd]);
}

function toggleCheckin(id, ymd = toYMD(new Date())) {
  const st = storage.ensure();
  if (!st.logs[id]) st.logs[id] = {};
  st.logs[id][ymd] = !st.logs[id][ymd];
  if (!st.logs[id][ymd]) delete st.logs[id][ymd];
  storage.save(st);
  return !!(st.logs[id] && st.logs[id][ymd]);
}

function calcStreak(id, todayYmd = toYMD(new Date())) {
  const st = storage.ensure();
  const logs = (st.logs[id] || {});
  let streak = 0;
  let cur = todayYmd;
  while (logs[cur]) {
    streak++;
    cur = addDays(cur, -1);
  }
  return streak;
}

function calcLast7(id, todayYmd = toYMD(new Date())) {
  const st = storage.ensure();
  const logs = (st.logs[id] || {});
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(todayYmd, -i);
    if (logs[d]) done++;
  }
  return { done, total: 7, rate: Math.round(done / 7 * 100) };
}

function calcThisMonth(id, now = new Date()) {
  const st = storage.ensure();
  const logs = (st.logs[id] || {});
  const start = startOfMonth(now);
  const startYmd = toYMD(start);
  const todayYmd = toYMD(now);
  let count = 0;
  let cur = startYmd;
  while (cur <= todayYmd) {
    if (logs[cur]) count++;
    cur = addDays(cur, 1);
  }
  return count;
}

function calcWeek(id, now = new Date()) {
  const st = storage.ensure();
  const logs = (st.logs[id] || {});
  const start = startOfWeek(now);
  const startYmd = toYMD(start);
  const todayYmd = toYMD(now);
  let done = 0;
  let total = 0;
  let cur = startYmd;
  while (cur <= todayYmd) {
    total++;
    if (logs[cur]) done++;
    cur = addDays(cur, 1);
  }
  return { done, total, rate: total ? Math.round(done / total * 100) : 0 };
}

module.exports = {
  listHabits,
  getHabit,
  upsertHabit,
  removeHabit,
  isChecked,
  toggleCheckin,
  calcStreak,
  calcLast7,
  calcThisMonth,
  calcWeek
};
