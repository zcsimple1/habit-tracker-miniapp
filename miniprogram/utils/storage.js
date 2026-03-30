const KEY = 'habit_tracker_v1';

function load() {
  const data = wx.getStorageSync(KEY);
  if (data && typeof data === 'object') return data;
  return { habits: [], logs: {} }; // logs: { [habitId]: { [ymd]: true } }
}

function save(state) {
  wx.setStorageSync(KEY, state);
}

function ensure() {
  const st = load();
  if (!st.habits) st.habits = [];
  if (!st.logs) st.logs = {};
  save(st);
  return st;
}

module.exports = { KEY, load, save, ensure };
