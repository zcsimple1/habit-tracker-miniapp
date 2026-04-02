// cloudfunctions/stats/index.js
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')

cloud.init({ env: 'cloudbase-8gw8fj3c75c015f6' })
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
        endDate: today.format('YYYY-MM-DD'),
        days: 1
      }
    case 'week':
      const weekStart = today.startOf('week')
      const weekEnd = today.endOf('week')
      return {
        startDate: weekStart.format('YYYY-MM-DD'),
        endDate: weekEnd.format('YYYY-MM-DD'),
        days: weekEnd.diff(weekStart, 'day') + 1
      }
    case 'month':
      const monthStart = today.startOf('month')
      const monthEnd = today.endOf('month')
      return {
        startDate: monthStart.format('YYYY-MM-DD'),
        endDate: monthEnd.format('YYYY-MM-DD'),
        days: monthEnd.diff(monthStart, 'day') + 1
      }
    case 'year':
      const yearStart = today.startOf('year')
      const yearEnd = today.endOf('year')
      return {
        startDate: yearStart.format('YYYY-MM-DD'),
        endDate: yearEnd.format('YYYY-MM-DD'),
        days: yearEnd.diff(yearStart, 'day') + 1
      }
    default:
      return {
        startDate: today.format('YYYY-MM-DD'),
        endDate: today.format('YYYY-MM-DD'),
        days: 1
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
  const { startDate, endDate, days } = getDateRange(range)

  console.log('[stats] getOverview - openid:', openid, 'range:', range)
  console.log('[stats] 日期范围:', startDate, '-', endDate, '天数:', days)

  // 获取所有习惯数
  const habitsResult = await db.collection('habits')
    .where({ openid })
    .get()
  const habits = habitsResult.data || []
  const totalHabits = habits.length
  console.log('[stats] 习惯数量:', totalHabits)

  // 获取今日打卡数据
  const todayCheckins = await db.collection('checkins')
    .where({
      openid,
      ymd: today,
      skipped: false
    })
    .count()
  console.log('[stats] 今日打卡数:', todayCheckins.total)

  // 获取范围内所有打卡记录
  const rangeCheckins = await db.collection('checkins')
    .where({
      openid,
      ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
      skipped: false
    })
    .count()
  console.log('[stats] 范围打卡数:', rangeCheckins.total)

  // 计算活跃天数
  const activeDaysResult = await db.collection('checkins')
    .aggregate()
    .match({
      openid,
      ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
      skipped: false
    })
    .group({
      _id: '$ymd'
    })
    .end()
  console.log('[stats] 活跃天数:', activeDaysResult.list?.length || 0)

  const activeDays = activeDaysResult.list ? activeDaysResult.list.length : 0

  // 获取用户统计数据
  const user = await db.collection('users').doc(openid).get()
  const userStats = user.data?.statsCache || {}
  console.log('[stats] 用户统计:', JSON.stringify(userStats))

  // 计算总打卡次数（所有时间）
  const totalCheckinsResult = await db.collection('checkins')
    .where({
      openid,
      skipped: false
    })
    .count()
  console.log('[stats] 总打卡数:', totalCheckinsResult.total)

  // 计算今日应打卡数（今日有记录的习惯数）
  const todayShouldCheck = totalHabits

  // 计算今日完成率
  const todayRate = todayShouldCheck > 0
    ? calculateCompletionRate(todayCheckins.total, todayShouldCheck)
    : 0

  // 计算范围内完成率 = 实际打卡数 / (习惯数 × 范围天数)
  const totalPossible = totalHabits * days
  const rangeRate = totalPossible > 0
    ? calculateCompletionRate(rangeCheckins.total, totalPossible)
    : 0

  const result = {
    code: 0,
    data: {
      today: {
        completed: todayCheckins.total || 0,
        total: todayShouldCheck,
        rate: todayRate
      },
      range: {
        completed: rangeCheckins.total || 0,
        totalPossible,
        activeDays,
        rate: rangeRate
      },
      overall: {
        totalCheckins: totalCheckinsResult.total || 0,
        currentStreak: userStats.currentStreak || 0,
        longestStreak: userStats.longestStreak || 0
      },
      totalHabits
    }
  }
  console.log('[stats] 返回结果:', JSON.stringify(result))
  return result
}

/**
 * 获取分类统计
 */
async function getCategoryStats(openid, options = {}) {
  const { categoryId, range = 'month' } = options
  const { startDate, endDate, days } = getDateRange(range)

  // 获取所有分类
  const categoriesResult = await db.collection('categories')
    .where({ openid })
    .get()
  const categories = {}
  categoriesResult.data?.forEach(cat => {
    categories[cat._id] = cat
  })

  // 获取习惯列表
  let habitsQuery = db.collection('habits').where({ openid })
  if (categoryId) {
    habitsQuery = habitsQuery.where({ categoryId })
  }

  const habitsResult = await habitsQuery.get()
  const habits = habitsResult.data || []

  // 按分类分组统计
  const categoryStatsMap = {}

  for (const habit of habits) {
    const catId = habit.categoryId || 'uncategorized'

    if (!categoryStatsMap[catId]) {
      const category = categories[catId] || { name: '未分类', icon: '📁', color: '#667eea' }
      categoryStatsMap[catId] = {
        categoryId: catId,
        categoryName: category.name || '未分类',
        categoryIcon: category.icon || '📁',
        categoryColor: category.color || '#667eea',
        habitCount: 0,
        completed: 0,
        total: 0
      }
    }

    // 获取该习惯在范围内的打卡数
    const habitCheckins = await db.collection('checkins')
      .where({
        openid,
        habitId: habit._id,
        ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
        skipped: false
      })
      .count()

    const completed = habitCheckins.total || 0
    categoryStatsMap[catId].habitCount++
    categoryStatsMap[catId].completed += completed
    categoryStatsMap[catId].total += days // 该习惯在此范围内的应打卡天数
  }

  // 计算完成率并转换为数组
  const categoryStats = Object.values(categoryStatsMap).map(cat => ({
    ...cat,
    completionRate: cat.total > 0 ? calculateCompletionRate(cat.completed, cat.total) : 0
  }))

  // 按完成率排序
  categoryStats.sort((a, b) => b.completionRate - a.completionRate)

  return {
    code: 0,
    data: {
      categoryStats,
      summary: {
        totalHabits: habits.length,
        totalCategories: categoryStats.length
      }
    }
  }
}

/**
 * 获取习惯统计
 */
async function getHabitStats(openid, data) {
  const { habitId, range = 'month' } = data
  const { startDate, endDate, days } = getDateRange(range)

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

  const completed = checkins.data ? checkins.data.length : 0
  const completionRate = calculateCompletionRate(completed, days)

  // 获取最后打卡时间
  const lastCheckin = checkins.data && checkins.data.length > 0
    ? checkins.data[checkins.data.length - 1]
    : null

  return {
    code: 0,
    data: {
      habitId,
      name: habit.data.name,
      description: habit.data.description,
      timeRule: habit.data.timeRule,
      important: habit.data.important,
      stats: {
        totalDays: days,
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
  const { startDate, endDate, days } = getDateRange(range)

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

  for (let i = 0; i < days; i++) {
    const ymd = start.add(i, 'day').format('YYYY-MM-DD')
    dateStats[ymd] = 0
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
      dateLabel: dayjs(ymd).format('M/D'),
      count: dateStats[ymd]
    }))

  return {
    code: 0,
    data: {
      range,
      startDate,
      endDate,
      days,
      trend
    }
  }
}

/**
 * 获取排行榜
 */
async function getRanking(openid, data) {
  const { type = 'completion', range = 'month' } = data
  const { startDate, endDate, days } = getDateRange(range)

  // 获取所有分类
  const categoriesResult = await db.collection('categories')
    .where({ openid })
    .get()
  const categories = {}
  categoriesResult.data?.forEach(cat => {
    categories[cat._id] = cat
  })

  // 获取所有习惯
  const habitsResult = await db.collection('habits')
    .where({ openid })
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

    const category = categories[habit.categoryId] || { name: '未分类' }
    const completed = checkins.total || 0
    const completionRate = calculateCompletionRate(completed, days)

    ranking.push({
      habitId: habit._id,
      habitName: habit.name,
      categoryName: category.name || '未分类',
      completed,
      total: days,
      completionRate,
      important: habit.important
    })
  }

  // 根据类型排序
  if (type === 'completion') {
    ranking.sort((a, b) => b.completionRate - a.completionRate)
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
