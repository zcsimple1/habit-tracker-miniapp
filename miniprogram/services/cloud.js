const ENV_ID = "cloudbase-8gw8fj3c75c015f6";

function ensureCloudInit() {
  if (!wx.cloud) {
    throw new Error("wx.cloud 不可用：请确认基础库版本 & 已开启云开发");
  }
  // app.onLaunch 已 init，这里兜底一下
  try {
    wx.cloud.init({ env: ENV_ID, traceUser: true });
  } catch (e) {
    // ignore duplicate init
  }
}

async function getOpenid() {
  ensureCloudInit();
  const { result } = await wx.cloud.callFunction({ name: "login" });
  return result && result.openid;
}

module.exports = {
  ENV_ID,
  ensureCloudInit,
  getOpenid
};
