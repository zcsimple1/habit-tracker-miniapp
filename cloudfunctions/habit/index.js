// cloudfunctions/habit/index.js
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')

cloud.init({ env: 'cloudbase-8gw8fj3c75c015f6' })
const db = cloud.database()

// 工具函数
function getToday() {
  return dayjs().format('YYYY-MM-DD')
}

function shouldShowOnDate(habit, ymd) {
  if (!habit.active) return false

  const { timeRule } = habit
  if (!timeRule) return true

  // 检查日期范围
  if (timeRule.startDate && ymd < timeRule.startDate) return false
  if (timeRule.endDate && ymd > timeRule.endDate) return false

  const date = dayjs(ymd)
  const dayOfWeek = date.day()

  switch (timeRule.type) {
    case 'daily':
      return true
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'weekend':
      return dayOfWeek === 0 || dayOfWeek === 6
    case 'weekly':
      return timeRule.weekDays && timeRule.weekDays.includes(dayOfWeek)
    case 'custom':
      return timeRule.customDates && timeRule.customDates.includes(ymd)
    default:
      return true
  }
}

/**
 * 习惯云函数
 * actions:
 * - list: 获取习惯列表
 * - getByCategory: 获取某分类下的习惯
 * - getTodayHabits: 获取今日需打卡的习惯
 * - get: 获取单个习惯
 * - create: 创建习惯
 * - update: 更新习惯
 * - delete: 删除习惯
 * - toggle: 切换启用状态
 * - reorder: 重新排序
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'list':
        return await listHabits(openid, data)

      case 'getByCategory':
        return await getHabitsByCategory(openid, data)

      case 'getTodayHabits':
        return await getTodayHabits(openid, data)

      case 'get':
        return await getHabit(openid, data.habitId)

      case 'create':
        return await createHabit(openid, data)

      case 'update':
        return await updateHabit(openid, data)

      case 'delete':
        return await deleteHabit(openid, data.habitId)

      case 'toggle':
        return await toggleHabit(openid, data)

      case 'reorder':
        return await reorderHabits(openid, data)

      default:
        throw new Error('Unknown action: ' + action)
    }
  } catch (err) {
    console.error('[habit] Error:', err)
    return {
      code: -1,
      message: err.message,
      error: err
    }
  }
}

/**
 * 获取习惯列表
 */
async function listHabits(openid, options = {}) {
  const { active = true, categoryId } = options
  let query = db.collection('habits').where({ openid })

  if (active !== null) {
    query = query.where({ active })
  }
  if (categoryId) {
    query = query.where({ categoryId })
  }

  const result = await query
    .orderBy('important', 'desc')
    .orderBy('sortOrder', 'asc')
    .get()

  return { code: 0, data: result.data }
}

/**
 * 获取某分类下的习惯
 */
async function getHabitsByCategory(openid, data) {
  const { categoryId, active = true } = data

  let query = db.collection('habits')
    .where({
      openid,
      categoryId
    })

  if (active !== null) {
    query = query.where({ active })
  }

  const result = await query
    .orderBy('important', 'desc')
    .orderBy('sortOrder', 'asc')
    .get()

  return { code: 0, data: result.data }
}

/**
 * 获取今日需打卡的习惯
 */
async function getTodayHabits(openid, options = {}) {
  const { categoryId = null, hideCompleted = false } = options
  const today = getToday()

  // 获取所有习惯
  let query = db.collection('habits').where({ openid, active: true })

  if (categoryId) {
    query = query.where({ categoryId })
  }

  const habitsResult = await query.get()
  const habits = habitsResult.data || []

  // 获取今日打卡记录
  const checkinsResult = await db.collection('checkins')
    .where({
      openid,
      ymd: today,
      skipped: false
    })
    .get()

  const checkedHabitIds = new Set(
    (checkinsResult.data || []).map(c => c.habitId)
  )

  // 过滤出今日需要打卡的习惯
  const todayHabits = habits.filter(habit => {
    // 判断是否应该在今天显示
    if (!shouldShowOnDate(habit, today)) {
      return false
    }

    // 如果隐藏已完成,过滤掉已打卡的
    if (hideCompleted && checkedHabitIds.has(habit._id)) {
      return false
    }

    return true
  })

  // 添加今日打卡状态
  const habitsWithStatus = todayHabits.map(habit => ({
    ...habit,
    checked: checkedHabitIds.has(habit._id)
  }))

  // 按固定时间排序
  habitsWithStatus.sort((a, b) => {
    const timeA = a.timeRule?.fixedTime || '99:99'
    const timeB = b.timeRule?.fixedTime || '99:99'
    return timeA.localeCompare(timeB)
  })

  return { code: 0, data: habitsWithStatus }
}

/**
 * 获取单个习惯
 */
async function getHabit(openid, habitId) {
  const result = await db.collection('habits').doc(habitId).get()

  if (!result.data) {
    throw new Error('习惯不存在')
  }

  if (result.data.openid !== openid) {
    throw new Error('无权访问该习惯')
  }

  return { code: 0, data: result.data }
}

/**
 * 创建习惯
 */
async function createHabit(openid, data) {
  const now = Date.now()
  const habit = {
    openid,
    categoryId: data.categoryId,
    name: data.name,
    description: data.description || '',
    timeRule: data.timeRule || { type: 'daily' },
    important: data.important || false,
    active: true,
    sortOrder: data.sortOrder || 0,
    stats: {
      totalCheckins: 0,
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      lastCheckinDate: null,
      lastUpdatedAt: now
    },
    createdAt: now,
    updatedAt: now
  }

  const result = await db.collection('habits').add({ data: habit })

  // 更新分类统计
  if (data.categoryId) {
    await updateCategoryStats(openid, data.categoryId)
  }

  return {
    code: 0,
    data: { ...habit, _id: result._id },
    message: '习惯创建成功'
  }
}

/**
 * 更新习惯
 */
async function updateHabit(openid, data) {
  const { habitId, ...updateData } = data

  // 验证权限
  const existing = await db.collection('habits').doc(habitId).get()
  if (!existing.data) {
    throw new Error('习惯不存在')
  }
  if (existing.data.openid !== openid) {
    throw new Error('无权修改该习惯')
  }

  const oldCategoryId = existing.data.categoryId
  const newCategoryId = updateData.categoryId

  const result = await db.collection('habits').doc(habitId).update({
    data: {
      ...updateData,
      updatedAt: Date.now()
    }
  })

  // 如果分类发生变化,更新新旧分类的统计
  if (newCategoryId && newCategoryId !== oldCategoryId) {
    if (oldCategoryId) {
      await updateCategoryStats(openid, oldCategoryId)
    }
    await updateCategoryStats(openid, newCategoryId)
  }

  return { code: 0, data: result, message: '习惯更新成功' }
}

/**
 * 删除习惯
 */
async function deleteHabit(openid, habitId) {
  // 验证权限
  const existing = await db.collection('habits').doc(habitId).get()
  if (!existing.data) {
    throw new Error('习惯不存在')
  }
  if (existing.data.openid !== openid) {
    throw new Error('无权删除该习惯')
  }

  const categoryId = existing.data.categoryId

  // 删除习惯
  const result = await db.collection('habits').doc(habitId).remove()

  // 删除该习惯的所有打卡记录
  await db.collection('checkins')
    .where({ openid, habitId })
    .remove()

  // 更新分类统计
  if (categoryId) {
    await updateCategoryStats(openid, categoryId)
  }

  return { code: 0, data: result, message: '习惯删除成功' }
}

/**
 * 切换启用状态
 */
async function toggleHabit(openid, data) {
  const { habitId, active } = data

  // 验证权限
  const existing = await db.collection('habits').doc(habitId).get()
  if (!existing.data) {
    throw new Error('习惯不存在')
  }
  if (existing.data.openid !== openid) {
    throw new Error('无权修改该习惯')
  }

  const result = await db.collection('habits').doc(habitId).update({
    data: {
      active,
      updatedAt: Date.now()
    }
  })

  // 更新分类统计
  if (existing.data.categoryId) {
    await updateCategoryStats(openid, existing.data.categoryId)
  }

  return { code: 0, data: result, message: '状态更新成功' }
}

/**
 * 重新排序
 */
async function reorderHabits(openid, data) {
  const { categoryId, orders } = data
  const operations = []

  for (const item of orders) {
    operations.push(
      db.collection('habits').doc(item.habitId).update({
        data: {
          sortOrder: item.sortOrder,
          updatedAt: Date.now()
        }
      })
    )
  }

  try {
    await Promise.all(operations)

    // 更新分类统计
    if (categoryId) {
      await updateCategoryStats(openid, categoryId)
    }

    return { code: 0, message: '排序成功' }
  } catch (err) {
    throw new Error('排序失败: ' + err.message)
  }
}

/**
 * 更新分类统计
 */
async function updateCategoryStats(openid, categoryId) {
  // 获取该分类下的所有习惯
  const habits = await db.collection('habits')
    .where({
      openid,
      categoryId
    })
    .get()

  const totalHabits = habits.data ? habits.data.length : 0
  const activeHabits = habits.data ?
    habits.data.filter(h => h.active).length :
    0

  await db.collection('categories').doc(categoryId).update({
    data: {
      stats: {
        totalHabits,
        activeHabits,
        lastUpdatedAt: Date.now()
      },
      updatedAt: Date.now()
    }
  })
}
