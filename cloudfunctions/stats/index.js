/**
 * 统计云函数 - 简化版
 * 基于实际打卡数据计算统计
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
      default:
        throw new Error('Unknown action')
    }
  } catch (err) {
    console.error('[stats] Error:', err)
    return { code: -1, message: err.message }
  }
}

/**
 * 获取总体统计
 */
async function getOverview(openid, options = {}) {
  const { range = 'month' } = options
  const today = getToday()
  const { startDate, endDate } = getDateRange(range)

  // 获取所有习惯
  const habitsResult = await db.collection('habits').where({ openid }).get()
  const habits = habitsResult.data || []
  const totalHabits = habits.length

  // 获取范围内的打卡数
  const rangeCheckins = await db.collection('checkins')
    .where({
      openid,
      ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
      skipped: false
    })
    .count()

  // 获取今日打卡数
  const todayCheckins = await db.collection('checkins')
    .where({
      openid,
      ymd: today,
      skipped: false
    })
    .count()

  // 计算活跃天数（使用聚合）
  const activeDaysResult = await db.collection('checkins')
    .aggregate()
    .match({
      openid,
      ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
      skipped: false
    })
    .group({ _id: '$ymd' })
    .end()

  const activeDays = activeDaysResult.list?.length || 0

  // 获取总打卡次数
  const totalCheckins = await db.collection('checkins')
    .where({ openid, skipped: false })
    .count()

  // 计算完成率 = 实际打卡数 / (习惯数 × 天数)
  const daysCount = dayjs(endDate).diff(dayjs(startDate), 'day') + 1
  const totalPossible = totalHabits * daysCount
  const rangeRate = calcRate(rangeCheckins.total, totalPossible)

  // 获取用户连续打卡信息
  let currentStreak = 0
  let longestStreak = 0
  try {
    const userResult = await db.collection('users').doc(openid).get()
    if (userResult.data) {
      currentStreak = userResult.data.currentStreak || 0
      longestStreak = userResult.data.longestStreak || 0
    }
  } catch (e) {
    // 用户文档可能不存在
  }

  return {
    code: 0,
    data: {
      totalHabits,
      todayCompleted: todayCheckins.total,
      todayTotal: totalHabits,
      todayRate: calcRate(todayCheckins.total, totalHabits),
      rangeCompleted: rangeCheckins.total,
      rangeTotal: totalPossible,
      rangeRate,
      activeDays,
      totalCheckins: totalCheckins.total,
      currentStreak,
      longestStreak
    }
  }
}

/**
 * 获取分类统计
 */
async function getCategoryStats(openid, options = {}) {
  const { range = 'month' } = options
  const { startDate, endDate } = getDateRange(range)

  // 获取所有习惯
  const habitsResult = await db.collection('habits').where({ openid }).get()
  const habits = habitsResult.data || []

  // 获取所有分类
  const categoriesResult = await db.collection('categories').where({ openid }).get()
  const categoriesMap = {}
  categoriesResult.data?.forEach(cat => {
    categoriesMap[cat._id] = cat
  })

  // 按分类聚合数据
  const categoryStats = {}
  let uncategorizedCount = 0

  for (const habit of habits) {
    const catId = habit.categoryId || 'uncategorized'
    
    if (!categoryStats[catId]) {
      const cat = categoriesMap[catId]
      categoryStats[catId] = {
        categoryId: catId,
        categoryName: cat?.name || '未分类',
        categoryIcon: cat?.icon || '📁',
        categoryColor: cat?.color || '#667eea',
        completed: 0,
        total: 0
      }
    }

    // 获取该习惯在范围内的打卡数
    const checkins = await db.collection('checkins')
      .where({
        openid,
        habitId: habit._id,
        ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
        skipped: false
      })
      .count()

    categoryStats[catId].completed += checkins.total || 0
    categoryStats[catId].total += 1 // 每个习惯计为1次应打卡
  }

  // 计算完成率并转换为数组
  const result = Object.values(categoryStats).map(cat => ({
    ...cat,
    rate: calcRate(cat.completed, cat.total)
  }))

  // 按完成率排序
  result.sort((a, b) => b.rate - a.rate)

  return { code: 0, data: result }
}

/**
 * 获取完成率排行
 */
async function getRanking(openid, options = {}) {
  const { range = 'month' } = options
  const { startDate, endDate } = getDateRange(range)

  // 获取所有习惯
  const habitsResult = await db.collection('habits').where({ openid }).get()
  const habits = habitsResult.data || []

  // 获取所有分类
  const categoriesResult = await db.collection('categories').where({ openid }).get()
  const categoriesMap = {}
  categoriesResult.data?.forEach(cat => {
    categoriesMap[cat._id] = cat
  })

  const ranking = []

  for (const habit of habits) {
    // 获取打卡数
    const checkins = await db.collection('checkins')
      .where({
        openid,
        habitId: habit._id,
        ymd: db.command.gte(startDate).and(db.command.lte(endDate)),
        skipped: false
      })
      .count()

    const completed = checkins.total || 0
    const cat = categoriesMap[habit.categoryId] || {}

    ranking.push({
      habitId: habit._id,
      habitName: habit.name,
      categoryName: cat.name || '未分类',
      completed,
      rate: completed // 直接用打卡数作为排行依据
    })
  }

  // 按完成数排序
  ranking.sort((a, b) => b.rate - a.rate)

  // 取前10
  return { code: 0, data: ranking.slice(0, 10) }
}
