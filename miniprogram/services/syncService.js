const storage = require('../utils/storage');
const { ensureCloudInit } = require('./cloud');

let syncing = false;

async function pullFromCloud() {
  ensureCloudInit();
  const { result } = await wx.cloud.callFunction({
    name: 'sync',
    data: { action: 'pull' }
  });
  return result;
}

async function pushToCloud(state) {
  ensureCloudInit();
  const { result } = await wx.cloud.callFunction({
    name: 'sync',
    data: { action: 'push', state }
  });
  return result;
}

async function migrateLocalToCloudIfNeeded() {
  // 如果本地已有数据且云端为空：做一次 push
  const st = storage.ensure();
  const hasLocal = (st.habits && st.habits.length > 0) || (st.logs && Object.keys(st.logs).length > 0);

  const remote = await pullFromCloud();
  const remoteEmpty = (!remote?.habits || remote.habits.length === 0) && (!remote?.logs || Object.keys(remote.logs).length === 0);

  if (hasLocal && remoteEmpty) {
    await pushToCloud(st);
    return { migrated: true };
  }
  return { migrated: false };
}

async function syncDownToLocal() {
  const remote = await pullFromCloud();
  const st = storage.ensure();
  const next = {
    ...st,
    habits: Array.isArray(remote?.habits) ? remote.habits : [],
    logs: remote?.logs && typeof remote.logs === 'object' ? remote.logs : {}
  };
  storage.save(next);
  return next;
}

async function syncUpFromLocal() {
  const st = storage.ensure();
  await pushToCloud(st);
}

async function safeSyncOnLaunch() {
  if (syncing) return;
  syncing = true;
  try {
    await migrateLocalToCloudIfNeeded();
    await syncDownToLocal();
  } finally {
    syncing = false;
  }
}

module.exports = {
  pullFromCloud,
  pushToCloud,
  migrateLocalToCloudIfNeeded,
  syncDownToLocal,
  syncUpFromLocal,
  safeSyncOnLaunch
};
