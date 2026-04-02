/**
 * 统计云函数 - 优化版
 * 使用批量查询减少数据库调用
 */
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')

cloud.init({ env: 'cloudbase-8gw8fj3c75c015f6' })
const db = cloud.database()

// 获取今天的日期字符串
function getToday() {
  return dayjs().format('YYYY-MM-DD')
}

// 获取日期范围
function getDateRange(type) {
  const today = dayjs()

  switch (type) {
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
        startDate: getToday(),
        endDate: getToday()
      }
  }
}

// 计算完成率
function calcRate(completed, total) {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'getOverview':
        return await getOverview(openid, data)
      case 'getCategoryStats':
        return await getCategoryStats(openid, data)
      case 'getRanking':
        return await getRanking(openid, data)
      case 'getAll':
        // 合并所有统计，减少网络往返
        return await getAllStats(openid, data)
      default:
        throw new Error('Unknown action')
    }
  } catch (err) {
    console.error('[stats] Error:', err)
    return { code: -1, message: err.message }
  }
}

/**
 * 合并获取所有统计数据
 */
async function getAllStats(openid, options = {}) {
  const { range = 'month' } = options
  const today = getToday()
  const { startDate, endDate } = getDateRange(range)
  const daysCount = dayjs(endDate).diff(dayjs(startDate), 'day') + 1

  // 并行获取基础数据
  const [habitsResult, categoriesResult, rangeCheckinsResult, todayCheckinsResult] = await Promise.all([
    db.collection('habits').where({ openid }).get(),
    db.collection('categories').where({ openid }).get(),
    db.collection('checkins').where({
      openid,
      ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
      skipped: false
    }).get(),
    db.collection('checkins').where({
      openid,
      ymd: today,
      skipped: false
    }).get()
  ])

  const habits = habitsResult.data || []
  const categories = categoriesResult.data || []
  const rangeCheckins = rangeCheckinsResult.data || []
  const todayCheckins = todayCheckinsResult.data || []
  const totalHabits = habits.length

  // 构建分类映射
  const categoriesMap = {}
  categories.forEach(cat => {
    categoriesMap[cat._id] = cat
  })

  // 统计今日打卡
  const todayHabitIds = new Set(todayCheckins.map(c => c.habitId))
  const todayCompleted = todayHabitIds.size

  // 统计范围内的数据
  const habitCheckinMap = {} // habitId -> checkin count
  const habitCategoryMap = {} // habitId -> categoryId

  rangeCheckins.forEach(checkin => {
    const habitId = checkin.habitId
    habitCheckinMap[habitId] = (habitCheckinMap[habitId] || 0) + 1
  })

  habits.forEach(h => {
    habitCategoryMap[h._id] = h.categoryId || 'uncategorized'
  })

  // 计算活跃天数
  const activeDaysSet = new Set(rangeCheckins.map(c => c.ymd))
  const activeDays = activeDaysSet.size

  // 计算范围完成率
  const totalPossible = totalHabits * daysCount
  const rangeCompleted = rangeCheckins.length
  const rangeRate = calcRate(rangeCompleted, totalPossible)

  // 分类统计
  const categoryStatsMap = {}
  habits.forEach(habit => {
    const catId = habit.categoryId || 'uncategorized'
    const cat = categoriesMap[catId]
    
    if (!categoryStatsMap[catId]) {
      categoryStatsMap[catId] = {
        categoryId: catId,
        categoryName: cat?.name || '未分类',
        categoryIcon: cat?.icon || '📁',
        categoryColor: cat?.color || '#667eea',
        completed: 0,
        total: 0
      }
    }
    
    const checkins = habitCheckinMap[habit._id] || 0
    categoryStatsMap[catId].completed += checkins
    categoryStatsMap[catId].total += 1
  })

  // 排行榜
  const ranking = habits.map(habit => {
    const checkins = habitCheckinMap[habit._id] || 0
    const cat = categoriesMap[habit.categoryId]
    return {
      habitId: habit._id,
      habitName: habit.name,
      categoryName: cat?.name || '未分类',
      completed: checkins,
      rate: checkins
    }
  })

  // 排序
  ranking.sort((a, b) => b.rate - a.rate)

  // 获取连续打卡
  let currentStreak = 0
  let longestStreak = 0
  try {
    const userResult = await db.collection('users').doc(openid).get()
    if (userResult.data) {
      currentStreak = userResult.data.currentStreak || 0
      longestStreak = userResult.data.longestStreak || 0
    }
  } catch (e) {}

  const result = {
    code: 0,
    data: {
      overview: {
        totalHabits,
        todayCompleted,
        todayTotal: totalHabits,
        todayRate: calcRate(todayCompleted, totalHabits),
        rangeCompleted,
        rangeTotal: totalPossible,
        rangeRate,
        activeDays,
        currentStreak,
        longestStreak
      },
      categoryStats: Object.values(categoryStatsMap).map(cat => ({
        ...cat,
        rate: calcRate(cat.completed, cat.total)
      })).sort((a, b) => b.rate - a.rate),
      ranking: ranking.slice(0, 10)
    }
  }

  return result
}

/**
 * 获取总体统计 (保留单独接口)
 */
async function getOverview(openid, options = {}) {
  const result = await getAllStats(openid, options)
  return { code: 0, data: result.data.overview }
}

/**
 * 获取分类统计 (保留单独接口)
 */
async function getCategoryStats(openid, options = {}) {
  const result = await getAllStats(openid, options)
  return { code: 0, data: result.data.categoryStats }
}

/**
 * 获取完成率排行 (保留单独接口)
 */
async function getRanking(openid, options = {}) {
  const result = await getAllStats(openid, options)
  return { code: 0, data: result.data.ranking }
}
