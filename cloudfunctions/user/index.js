// cloudfunctions/user/index.js
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')

cloud.init({ env: 'cloudbase-8gw8fj3c75c015f6' })
const db = cloud.database()

// 工具函数
function getToday() {
  return dayjs().format('YYYY-MM-DD')
}

/**
 * 用户云函数
 * actions:
 * - getProfile: 获取用户信息
 * - updateProfile: 更新用户信息
 * - updatePreferences: 更新用户偏好
 * - getStats: 获取用户统计
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'getProfile':
        return await getProfile(openid)

      case 'updateProfile':
        return await updateProfile(openid, data)

      case 'updatePreferences':
        return await updatePreferences(openid, data)

      case 'getStats':
        return await getStats(openid, data)

      default:
        throw new Error('Unknown action: ' + action)
    }
  } catch (err) {
    console.error('[user] Error:', err)
    return {
      code: -1,
      message: err.message,
      error: err
    }
  }
}

/**
 * 获取用户信息
 */
async function getProfile(openid) {
  const userResult = await db.collection('users').where({
    openid: openid
  }).get()

  // 如果用户不存在,创建新用户
  if (!userResult.data || userResult.data.length === 0) {
    const now = Date.now()
    const newUser = {
      openid,
      nickname: '',
      avatarUrl: '',
      preferences: {
        viewMode: 'category',
        showCompleted: false,
        defaultCategory: '',
        themeColor: '#667eea'
      },
      statsCache: {
        totalCheckins: 0,
        currentStreak: 0,
        longestStreak: 0,
        activeDays: 0,
        lastUpdatedAt: now
      },
      createdAt: now,
      updatedAt: now
    }

    try {
      await db.collection('users').add({ data: newUser })
      return { code: 0, data: newUser, message: '用户创建成功' }
    } catch (addErr) {
      // 可能是并发创建导致的重复,再次尝试获取
      const retryResult = await db.collection('users').where({
        openid: openid
      }).get()
      if (retryResult.data && retryResult.data.length > 0) {
        return { code: 0, data: retryResult.data[0] }
      }
      throw addErr
    }
  }

  return { code: 0, data: userResult.data[0] }
}

/**
 * 更新用户信息
 */
async function updateProfile(openid, data) {
  const { nickname, avatarUrl } = data
  const updateData = { updatedAt: Date.now() }

  if (nickname !== undefined) updateData.nickname = nickname
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl

  // 先获取用户记录以获取正确的 _id
  const userResult = await db.collection('users').where({
    openid: openid
  }).get()

  if (!userResult.data || userResult.data.length === 0) {
    throw new Error('用户不存在')
  }

  const result = await db.collection('users').doc(userResult.data[0]._id).update({
    data: updateData
  })

  return { code: 0, data: result, message: '更新成功' }
}

/**
 * 更新用户偏好
 */
async function updatePreferences(openid, preferences) {
  // 先获取用户记录以获取正确的 _id
  const userResult = await db.collection('users').where({
    openid: openid
  }).get()

  if (!userResult.data || userResult.data.length === 0) {
    throw new Error('用户不存在')
  }

  const result = await db.collection('users').doc(userResult.data[0]._id).update({
    data: {
      preferences,
      updatedAt: Date.now()
    }
  })

  return { code: 0, data: result, message: '偏好设置已更新' }
}

/**
 * 获取用户统计
 */
async function getStats(openid, options = {}) {
  const { forceRefresh = false } = options

  const userResult = await db.collection('users').where({
    openid: openid
  }).get()
  if (!userResult.data || userResult.data.length === 0) {
    throw new Error('用户不存在')
  }
  const user = userResult.data[0]

  const now = Date.now()
  const statsCache = user.statsCache || {}
  const cacheExpired = !statsCache.lastUpdatedAt || (now - statsCache.lastUpdatedAt) > 3600000 // 1小时

  if (cacheExpired || forceRefresh) {
    // 重新计算统计数据
    const stats = await recalculateUserStats(openid)
    const id = user._id
    await db.collection('users').doc(id).update({
      data: {
        statsCache: {
          ...stats,
          lastUpdatedAt: now
        },
        updatedAt: now
      }
    })
    return { code: 0, data: stats, message: '统计已更新' }
  }

  return { code: 0, data: statsCache }
}

/**
 * 重新计算用户统计数据
 */
async function recalculateUserStats(openid) {
  const today = getToday()

  // 获取总打卡次数
  const totalCheckins = await db.collection('checkins')
    .where({
      openid,
      skipped: false
    })
    .count()

  // 获取活跃天数 (有打卡的日期数)
  const activeDaysResult = await db.collection('checkins')
    .where({
      openid,
      skipped: false
    })
    .groupBy('ymd')
    .groupField('count', 1)
    .get()

  const activeDays = activeDaysResult.data ? activeDaysResult.data.length : 0

  // 计算最长连续天数 (简化版本)
  const longestStreak = 0 // TODO: 实现完整计算逻辑

  // 计算当前连续天数
  const currentStreak = 0 // TODO: 实现完整计算逻辑

  return {
    totalCheckins: totalCheckins.total || 0,
    currentStreak,
    longestStreak,
    activeDays,
    lastUpdatedAt: Date.now()
  }
}
