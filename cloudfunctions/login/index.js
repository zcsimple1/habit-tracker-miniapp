// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloudbase-8gw8fj3c75c015f6' })

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}
