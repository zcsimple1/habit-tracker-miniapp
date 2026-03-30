function pad(n) { return n < 10 ? '0' + n : '' + n; }

function toYMD(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function addDays(ymd, delta) {
  const [y, m, day] = ymd.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + delta);
  return toYMD(d);
}

function startOfWeek(d = new Date()) {
  const dt = new Date(d);
  const day = dt.getDay() || 7; // Mon=1..Sun=7
  dt.setDate(dt.getDate() - (day - 1));
  dt.setHours(0,0,0,0);
  return dt;
}

function startOfMonth(d = new Date()) {
  const dt = new Date(d);
  dt.setDate(1);
  dt.setHours(0,0,0,0);
  return dt;
}

module.exports = { toYMD, addDays, startOfWeek, startOfMonth };
