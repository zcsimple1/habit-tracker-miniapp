// cloudfunctions/checkin/index.js
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')

cloud.init({ env: 'cloudbase-8gw8fj3c75c015f6' })
const db = cloud.database()

// 工具函数
function getToday() {
  return dayjs().format('YYYY-MM-DD')
}

function calculateStreak(checkins) {
  if (!checkins || checkins.length === 0) return 0

  const today = dayjs().format('YYYY-MM-DD')
  let streak = 0
  let expectedDate = dayjs(today)

  const sortedCheckins = [...checkins].sort((a, b) => b.ymd.localeCompare(a.ymd))
  const checkinDates = new Set(sortedCheckins.map(c => c.ymd))

  for (let i = 0; i < 365; i++) {
    const ymd = expectedDate.format('YYYY-MM-DD')
    if (checkinDates.has(ymd)) {
      streak++
    } else if (i === 0) {
      expectedDate = expectedDate.subtract(1, 'day')
      continue
    } else {
      break
    }
    expectedDate = expectedDate.subtract(1, 'day')
  }

  return streak
}

/**
 * 打卡云函数
 * actions:
 * - checkin: 打卡
 * - uncheckin: 取消打卡
 * - skip: 跳过今日
 * - unskip: 取消跳过
 * - getToday: 获取今日打卡情况
 * - getHistory: 获取历史记录
 * - getByDate: 获取某天的打卡记录
 * - getByHabit: 获取某习惯的打卡记录
 * - getCheckinDates: 获取有打卡记录的日期列表
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'checkin':
        return await checkin(openid, data)

      case 'uncheckin':
        return await uncheckin(openid, data)

      case 'skip':
        return await skip(openid, data)

      case 'unskip':
        return await unskip(openid, data)

      case 'getToday':
        return await getTodayCheckins(openid)

      case 'getHistory':
        return await getHistory(openid, data)

      case 'getByDate':
        return await getCheckinsByDate(openid, data)

      case 'getByHabit':
        return await getCheckinsByHabit(openid, data)

      case 'getCheckinDates':
        return await getCheckinDates(openid, data)

      default:
        throw new Error('Unknown action: ' + action)
    }
  } catch (err) {
    console.error('[checkin] Error:', err)
    return {
      code: -1,
      message: err.message,
      error: err
    }
  }
}

/**
 * 打卡
 */
async function checkin(openid, data) {
  const { habitId, note = '', location = null, ymd } = data
  const today = getToday()
  const targetYmd = ymd || today
  const now = Date.now()
  const time = dayjs().format('HH:mm:ss')

  // 检查是否是将来日期
  if (targetYmd > today) {
    throw new Error('未到时间，不能打卡')
  }

  // 检查习惯是否存在且属于该用户
  const habit = await db.collection('habits').doc(habitId).get()
  if (!habit.data) {
    throw new Error('习惯不存在')
  }
  if (habit.data.openid !== openid) {
    throw new Error('无权访问该习惯')
  }

  // 检查是否已打卡
  const existing = await db.collection('checkins')
    .where({
      openid,
      habitId,
      ymd: targetYmd,
      skipped: false
    })
    .get()

  if (existing.data && existing.data.length > 0) {
    throw new Error('今日已打卡')
  }

  // 创建打卡记录
  const checkin = {
    openid,
    habitId,
    ymd: targetYmd,
    time,
    timestamp: now,
    skipped: false,
    note,
    location,
    createdAt: now
  }

  await db.collection('checkins').add({ data: checkin })

  // 更新习惯统计
  await updateHabitStats(openid, habitId)

  // 更新用户统计
  await updateUserStats(openid)

  return { code: 0, data: checkin, message: '打卡成功' }
}

/**
 * 取消打卡
 */
async function uncheckin(openid, data) {
  const { habitId, ymd } = data
  const targetYmd = ymd || getToday()

  // 删除打卡记录
  const result = await db.collection('checkins')
    .where({
      openid,
      habitId,
      ymd: targetYmd,
      skipped: false
    })
    .remove()

  // 更新习惯统计
  await updateHabitStats(openid, habitId)

  // 更新用户统计
  await updateUserStats(openid)

  return { code: 0, data: result, message: '已取消打卡' }
}

/**
 * 跳过今日
 */
async function skip(openid, data) {
  const { habitId, note = '' } = data
  const today = getToday()
  const now = Date.now()

  // 检查是否已有记录（打卡或跳过）
  const existing = await db.collection('checkins')
    .where({
      openid,
      habitId,
      ymd: today
    })
    .get()

  if (existing.data && existing.data.length > 0) {
    throw new Error('今日已有记录,无法跳过')
  }

  // 创建跳过记录
  const skipRecord = {
    openid,
    habitId,
    ymd: today,
    time: '00:00:00',
    timestamp: now,
    skipped: true,
    note,
    createdAt: now
  }

  await db.collection('checkins').add({ data: skipRecord })

  return { code: 0, data: skipRecord, message: '已跳过今日' }
}

/**
 * 取消跳过
 */
async function unskip(openid, data) {
  const { habitId, ymd } = data
  const targetYmd = ymd || getToday()

  // 删除跳过记录
  const result = await db.collection('checkins')
    .where({
      openid,
      habitId,
      ymd: targetYmd,
      skipped: true
    })
    .remove()

  return { code: 0, data: result, message: '已取消跳过' }
}

/**
 * 获取今日打卡情况
 */
async function getTodayCheckins(openid) {
  const today = getToday()

  const result = await db.collection('checkins')
    .where({
      openid,
      ymd: today
    })
    .orderBy('timestamp', 'desc')
    .get()

  return { code: 0, data: result.data }
}

/**
 * 获取历史记录
 */
async function getHistory(openid, options = {}) {
  const { startDate, endDate, habitId, limit = 100 } = options

  let query = db.collection('checkins').where({ openid })

  if (habitId) {
    query = query.where({ habitId })
  }
  if (startDate) {
    query = query.where({ ymd: db.command.gte(startDate) })
  }
  if (endDate) {
    query = query.where({ ymd: db.command.lte(endDate) })
  }

  const result = await query
    .orderBy('ymd', 'desc')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get()

  return { code: 0, data: result.data }
}

/**
 * 获取某天的打卡记录
 */
async function getCheckinsByDate(openid, data) {
  const { ymd } = data

  const result = await db.collection('checkins')
    .where({
      openid,
      ymd,
      skipped: false
    })
    .orderBy('timestamp', 'desc')
    .get()

  return { code: 0, data: result.data }
}

/**
 * 获取某习惯的打卡记录
 */
async function getCheckinsByHabit(openid, data) {
  const { habitId, limit = 365 } = data

  const result = await db.collection('checkins')
    .where({
      openid,
      habitId,
      skipped: false
    })
    .orderBy('ymd', 'desc')
    .limit(limit)
    .get()

  return { code: 0, data: result.data }
}

/**
 * 获取有打卡记录的日期列表
 */
async function getCheckinDates(openid, data) {
  const { days = 365 } = data || {} // 默认获取最近365天的日期

  // 计算时间范围
  const startDate = dayjs().subtract(days, 'day').format('YYYY-MM-DD')

  const result = await db.collection('checkins')
    .where({
      openid,
      ymd: db.command.gte(startDate),
      skipped: false
    })
    .field({
      ymd: true
    })
    .get()

  // 去重并返回日期列表
  const dateSet = new Set()
  result.data.forEach(checkin => {
    if (checkin.ymd) {
      dateSet.add(checkin.ymd)
    }
  })

  return {
    code: 0,
    data: Array.from(dateSet).sort()
  }
}

/**
 * 更新习惯统计
 */
async function updateHabitStats(openid, habitId) {
  const habit = await db.collection('habits').doc(habitId).get()
  if (!habit.data) return

  // 获取总打卡次数
  const totalCheckins = await db.collection('checkins')
    .where({
      openid,
      habitId,
      skipped: false
    })
    .count()

  // 获取最近的打卡记录用于计算连续天数
  const recentCheckins = await db.collection('checkins')
    .where({
      openid,
      habitId,
      skipped: false
    })
    .orderBy('ymd', 'desc')
    .limit(365)
    .get()

  // 计算连续天数
  const currentStreak = calculateStreak(recentCheckins.data || [])

  // 获取最长连续天数（简化，实际应该遍历所有记录）
  const longestStreak = Math.max(habit.data.stats?.longestStreak || 0, currentStreak)

  // 计算完成率（简化版本，实际应该根据日期范围计算）
  const completionRate = habit.data.stats?.completionRate || 0

  // 获取最后打卡日期
  const lastCheckinDate = recentCheckins.data && recentCheckins.data.length > 0 ?
    recentCheckins.data[0].ymd :
    null

  await db.collection('habits').doc(habitId).update({
    data: {
      stats: {
        totalCheckins: totalCheckins.total || 0,
        currentStreak,
        longestStreak,
        completionRate,
        lastCheckinDate,
        lastUpdatedAt: Date.now()
      },
      updatedAt: Date.now()
    }
  })
}

/**
 * 更新用户统计
 */
async function updateUserStats(openid) {
  const today = getToday()

  // 获取总打卡次数
  const totalCheckins = await db.collection('checkins')
    .where({
      openid,
      skipped: false
    })
    .count()

  // 获取活跃天数（使用聚合查询）
  const activeDaysResult = await db.collection('checkins')
    .aggregate()
    .match({
      openid,
      skipped: false
    })
    .group({
      _id: '$ymd'
    })
    .end()

  const activeDays = activeDaysResult.list ? activeDaysResult.list.length : 0

  // 获取当前连续天数（简化版本）
  const recentCheckins = await db.collection('checkins')
    .where({
      openid,
      skipped: false
    })
    .orderBy('ymd', 'desc')
    .limit(365)
    .get()

  const currentStreak = calculateStreak(recentCheckins.data || [])

  // 获取最长连续天数（简化版本）
  const user = await db.collection('users').doc(openid).get()
  const longestStreak = user.data?.statsCache?.longestStreak || 0
  const newLongestStreak = Math.max(longestStreak, currentStreak)

  await db.collection('users').doc(openid).update({
    data: {
      statsCache: {
        totalCheckins: totalCheckins.total || 0,
        currentStreak,
        longestStreak: newLongestStreak,
        activeDays,
        lastUpdatedAt: Date.now()
      },
      updatedAt: Date.now()
    }
  })
}
