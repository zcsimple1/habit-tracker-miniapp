// cloudfunctions/stats/index.js
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')

cloud.init({ env: 'cloudbase-8gw8f3c75c015f6' })
const db = cloud.database()

// 工具函数
function getToday() {
  return dayjs().format('YYYY-MM-DD')
}

function getDateRange(type) {
  const today = dayjs()

  switch (type) {
    case 'today':
      return {
        startDate: today.format('YYYY-MM-DD'),
        endDate: today.format('YYYY-MM-DD')
      }
    case 'week':
      return {
        startDate: today.startOf('week').format('YYYY-MM-DD'),
        endDate: today.endOf('week').format('YYYY-MM-DD')
      }
    case 'month':
      return {
        startDate: today.startOf('month').format('YYYY-MM-DD'),
        endDate: today.endOf('month').format('YYYY-MM-DD')
      }
    case 'year':
      return {
        startDate: today.startOf('year').format('YYYY-MM-DD'),
        endDate: today.endOf('year').format('YYYY-MM-DD')
      }
    default:
      return {
        startDate: today.format('YYYY-MM-DD'),
        endDate: today.format('YYYY-MM-DD')
      }
  }
}

function calculateCompletionRate(completed, total) {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * 统计云函数
 * actions:
 * - getOverview: 获取总体统计
 * - getCategoryStats: 获取分类统计
 * - getHabitStats: 获取习惯统计
 * - getTrend: 获取趋势数据
 * - getRanking: 获取排行榜
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'getOverview':
        return await getOverview(openid, data)

      case 'getCategoryStats':
        return await getCategoryStats(openid, data)

      case 'getHabitStats':
        return await getHabitStats(openid, data)

      case 'getTrend':
        return await getTrend(openid, data)

      case 'getRanking':
        return await getRanking(openid, data)

      default:
        throw new Error('Unknown action: ' + action)
    }
  } catch (err) {
    console.error('[stats] Error:', err)
    return {
      code: -1,
      message: err.message,
      error: err
    }
  }
}

/**
 * 获取总体统计
 */
async function getOverview(openid, options = {}) {
  const { range = 'month' } = options
  const today = getToday()
  const { startDate, endDate } = getDateRange(range)

  // 获取所有习惯数
  const habits = await db.collection('habits')
    .where({ openid, active: true })
    .count()

  // 获取今日数据
  const todayCheckins = await db.collection('checkins')
    .where({
      openid,
      ymd: today,
      skipped: false
    })
    .count()

  // 获取指定范围内的打卡记录
  const rangeCheckins = await db.collection('checkins')
    .where({
      openid,
      ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
      skipped: false
    })
    .count()

  // 计算活跃天数
  const activeDaysResult = await db.collection('checkins')
    .where({
      openid,
      ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
      skipped: false
    })
    .groupBy('ymd')
    .groupField('count', 1)
    .get()

  const activeDays = activeDaysResult.data ? activeDaysResult.data.length : 0

  // 获取用户统计缓存
  const user = await db.collection('users').doc(openid).get()
  const userStats = user.data?.statsCache || {}

  // 计算今日完成率
  const todayRate = habits.total > 0 ?
    calculateCompletionRate(todayCheckins.total, habits.total) :
    0

  // 计算范围完成率（估算）
  const totalPossible = activeDays * (habits.total || 0)
  const rangeRate = totalPossible > 0 ?
    calculateCompletionRate(rangeCheckins.total, totalPossible) :
    0

  return {
    code: 0,
    data: {
      today: {
        completed: todayCheckins.total || 0,
        total: habits.total || 0,
        rate: todayRate
      },
      range: {
        completed: rangeCheckins.total || 0,
        activeDays,
        rate: rangeRate
      },
      overall: {
        totalCheckins: userStats.totalCheckins || 0,
        currentStreak: userStats.currentStreak || 0,
        longestStreak: userStats.longestStreak || 0
      },
      totalHabits: habits.total || 0
    }
  }
}

/**
 * 获取分类统计
 */
async function getCategoryStats(openid, options = {}) {
  const { categoryId, range = 'month' } = options
  const { startDate, endDate } = getDateRange(range)

  // 获取分类信息
  let category = null
  let habitsQuery = db.collection('habits').where({ openid, active: true })

  if (categoryId) {
    category = await db.collection('categories').doc(categoryId).get()
    if (!category.data) {
      throw new Error('分类不存在')
    }
    if (category.data.openid !== openid) {
      throw new Error('无权访问该分类')
    }
    habitsQuery = habitsQuery.where({ categoryId })
  }

  // 获取习惯列表
  const habitsResult = await habitsQuery.get()
  const habits = habitsResult.data || []

  // 统计该分类下的打卡数据
  const habitIds = habits.map(h => h._id)
  const checkins = await db.collection('checkins')
    .where({
      openid,
      habitId: db.command.in(habitIds),
      ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
      skipped: false
    })
    .count()

  // 按习惯分组统计
  const habitStats = []
  for (const habit of habits) {
    const habitCheckins = await db.collection('checkins')
      .where({
        openid,
        habitId: habit._id,
        ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
        skipped: false
      })
      .count()

    habitStats.push({
      habitId: habit._id,
      name: habit.name,
      completed: habitCheckins.total || 0,
      rate: habit.stats?.completionRate || 0,
      important: habit.important
    })
  }

  // 按完成率排序
  habitStats.sort((a, b) => b.rate - a.rate)

  return {
    code: 0,
    data: {
      category: category ? {
        _id: category.data._id,
        name: category.data.name,
        icon: category.data.icon,
        color: category.data.color
      } : null,
      habits: habitStats,
      summary: {
        totalHabits: habits.length,
        completed: checkins.total || 0
      }
    }
  }
}

/**
 * 获取习惯统计
 */
async function getHabitStats(openid, data) {
  const { habitId, range = 'month' } = data
  const { startDate, endDate } = getDateRange(range)

  // 获取习惯信息
  const habit = await db.collection('habits').doc(habitId).get()
  if (!habit.data) {
    throw new Error('习惯不存在')
  }
  if (habit.data.openid !== openid) {
    throw new Error('无权访问该习惯')
  }

  // 获取范围内的打卡记录
  const checkins = await db.collection('checkins')
    .where({
      openid,
      habitId,
      ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
      skipped: false
    })
    .orderBy('ymd', 'asc')
    .get()

  // 计算应打卡天数（简化：根据时间规则计算）
  let totalDays = 0
  if (habit.data.timeRule) {
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    let current = start

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const ymd = current.format('YYYY-MM-DD')
      // 简化判断：假设每日都要打卡
      totalDays++
      current = current.add(1, 'day')
    }
  }

  const completed = checkins.data ? checkins.data.length : 0
  const completionRate = totalDays > 0 ?
    calculateCompletionRate(completed, totalDays) :
    0

  // 获取最近打卡时间
  const lastCheckin = checkins.data && checkins.data.length > 0 ?
    checkins.data[checkins.data.length - 1] :
    null

  return {
    code: 0,
    data: {
      habitId,
      name: habit.data.name,
      description: habit.data.description,
      timeRule: habit.data.timeRule,
      important: habit.data.important,
      stats: {
        totalDays,
        completed,
        completionRate,
        currentStreak: habit.data.stats?.currentStreak || 0,
        longestStreak: habit.data.stats?.longestStreak || 0
      },
      lastCheckin: lastCheckin ? {
        date: lastCheckin.ymd,
        time: lastCheckin.time
      } : null
    }
  }
}

/**
 * 获取趋势数据
 */
async function getTrend(openid, data) {
  const { range = 'month' } = data
  const { startDate, endDate } = getDateRange(range)

  // 获取该范围内的打卡数据
  const checkins = await db.collection('checkins')
    .where({
      openid,
      ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
      skipped: false
    })
    .orderBy('ymd', 'asc')
    .get()

  // 按日期分组统计
  const dateStats = {}
  const start = dayjs(startDate)
  const end = dayjs(endDate)

  let current = start
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const ymd = current.format('YYYY-MM-DD')
    dateStats[ymd] = 0
    current = current.add(1, 'day')
  }

  // 填充打卡数据
  if (checkins.data) {
    for (const checkin of checkins.data) {
      if (dateStats[checkin.ymd] !== undefined) {
        dateStats[checkin.ymd]++
      }
    }
  }

  // 转换为数组格式
  const trend = Object.keys(dateStats)
    .sort()
    .map(ymd => ({
      date: ymd,
      count: dateStats[ymd]
    }))

  return {
    code: 0,
    data: {
      range,
      startDate,
      endDate,
      trend
    }
  }
}

/**
 * 获取排行榜
 */
async function getRanking(openid, data) {
  const { type = 'completion', range = 'month' } = data
  const { startDate, endDate } = getDateRange(range)

  // 获取所有习惯
  const habitsResult = await db.collection('habits')
    .where({ openid, active: true })
    .get()

  const habits = habitsResult.data || []
  const ranking = []

  for (const habit of habits) {
    // 获取范围内的打卡记录
    const checkins = await db.collection('checkins')
      .where({
        openid,
        habitId: habit._id,
        ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
        skipped: false
      })
      .count()

    // 获取分类信息
    const category = await db.collection('categories').doc(habit.categoryId).get()

    ranking.push({
      habitId: habit._id,
      name: habit.name,
      category: category.data ? {
        name: category.data.name,
        icon: category.data.icon,
        color: category.data.color
      } : null,
      completed: checkins.total || 0,
      rate: habit.stats?.completionRate || 0,
      important: habit.important
    })
  }

  // 根据类型排序
  if (type === 'completion') {
    ranking.sort((a, b) => b.rate - a.rate)
  } else if (type === 'count') {
    ranking.sort((a, b) => b.completed - a.completed)
  }

  // 取前10名
  const top10 = ranking.slice(0, 10)

  return {
    code: 0,
    data: {
      type,
      range,
      ranking: top10
    }
  }
}
