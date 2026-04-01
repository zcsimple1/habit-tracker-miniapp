// cloudfunctions/todos/index.js
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')

cloud.init({ env: 'cloudbase-8gw8fj3c75c015f6' })
const db = cloud.database()

// 优先级权重映射
const PRIORITY_WEIGHT = {
  'urgent': 1,
  'high': 2,
  'normal': 3,
  'low': 4
}

/**
 * 待办云函数
 * actions:
 * - list: 获取待办列表
 * - get: 获取单个待办
 * - create: 创建待办
 * - update: 更新待办
 * - delete: 删除待办
 * - toggle: 切换完成状态
 * - archive: 归档/取消归档
 * - getByDate: 获取某天的待办
 * - getByPriority: 按优先级获取待办
 * - getTodoDates: 获取有待办记录的日期列表
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'list':
        return await listTodos(openid, data)

      case 'get':
        return await getTodo(openid, data)

      case 'create':
        return await createTodo(openid, data)

      case 'update':
        return await updateTodo(openid, data)

      case 'delete':
        return await deleteTodo(openid, data)

      case 'toggle':
        return await toggleTodo(openid, data)

      case 'archive':
        return await archiveTodo(openid, data)

      case 'getByDate':
        return await getTodosByDate(openid, data)

      case 'getByPriority':
        return await getTodosByPriority(openid, data)

      case 'getTodoDates':
        return await getTodoDates(openid, data)

      default:
        throw new Error('Unknown action: ' + action)
    }
  } catch (err) {
    console.error('[todos] Error:', err)
    return {
      code: -1,
      message: err.message,
      error: err
    }
  }
}

/**
 * 获取待办列表
 */
async function listTodos(openid, options = {}) {
  const { completed = null, archived = false, categoryId = null, limit = 100 } = options

  let query = db.collection('todos').where({ openid, archived })

  if (completed !== null) {
    query = query.where({ completed })
  }
  if (categoryId) {
    query = query.where({ categoryId })
  }

  const result = await query
    .orderBy('priority', 'asc')
    .orderBy('dueTime', 'asc')
    .orderBy('sortOrder', 'asc')
    .limit(limit)
    .get()

  // 按优先级分组
  const grouped = {
    urgent: [],
    high: [],
    normal: [],
    low: []
  }

  result.data.forEach(todo => {
    if (grouped[todo.priority]) {
      grouped[todo.priority].push(todo)
    } else {
      grouped.normal.push(todo)
    }
  })

  return { code: 0, data: grouped }
}

/**
 * 获取单个待办
 */
async function getTodo(openid, data) {
  const { todoId } = data

  const result = await db.collection('todos').doc(todoId).get()

  if (!result.data) {
    throw new Error('待办不存在')
  }

  if (result.data.openid !== openid) {
    throw new Error('无权访问该待办')
  }

  return { code: 0, data: result.data }
}

/**
 * 创建待办
 */
async function createTodo(openid, data) {
  const now = Date.now()
  const todo = {
    openid,
    title: data.title,
    description: data.description || '',
    categoryId: data.categoryId || null,
    priority: data.priority || 'normal',
    important: data.important || false,
    dueTime: data.dueTime || null,
    dueDate: data.dueDate || dayjs().format('YYYY-MM-DD'),
    completed: false,
    completedAt: null,
    archived: false,
    sortOrder: data.sortOrder || 0,
    createdAt: now,
    updatedAt: now
  }

  const result = await db.collection('todos').add({ data: todo })
  return {
    code: 0,
    data: { ...todo, _id: result._id },
    message: '待办创建成功'
  }
}

/**
 * 更新待办
 */
async function updateTodo(openid, data) {
  const { todoId, ...updateData } = data

  // 验证权限
  const existing = await db.collection('todos').doc(todoId).get()
  if (!existing.data) {
    throw new Error('待办不存在')
  }
  if (existing.data.openid !== openid) {
    throw new Error('无权修改该待办')
  }

  const result = await db.collection('todos').doc(todoId).update({
    data: {
      ...updateData,
      updatedAt: Date.now()
    }
  })

  return { code: 0, data: result, message: '待办更新成功' }
}

/**
 * 删除待办
 */
async function deleteTodo(openid, data) {
  const { todoId } = data

  // 验证权限
  const existing = await db.collection('todos').doc(todoId).get()
  if (!existing.data) {
    throw new Error('待办不存在')
  }
  if (existing.data.openid !== openid) {
    throw new Error('无权删除该待办')
  }

  const result = await db.collection('todos').doc(todoId).remove()
  return { code: 0, data: result, message: '待办删除成功' }
}

/**
 * 切换完成状态
 */
async function toggleTodo(openid, data) {
  const { todoId, completed } = data

  const now = Date.now()
  const updateData = {
    completed,
    updatedAt: now
  }

  if (completed) {
    updateData.completedAt = now
  } else {
    updateData.completedAt = null
  }

  await db.collection('todos').doc(todoId).update({ data: updateData })
  return { code: 0, message: '操作成功' }
}

/**
 * 归档/取消归档
 */
async function archiveTodo(openid, data) {
  const { todoId, archived } = data

  await db.collection('todos').doc(todoId).update({
    data: {
      archived,
      updatedAt: Date.now()
    }
  })

  return { code: 0, message: archived ? '已归档' : '已取消归档' }
}

/**
 * 获取某天的待办
 * 规则：
 * 1. 截止日期 <= 当前日期的未完成待办
 * 2. 截止日期 == 当前日期的所有待办（包括已完成）
 * 3. 已完成的待办只在截止日期当天显示
 */
async function getTodosByDate(openid, data) {
  const { ymd } = data
  const today = dayjs()

  // 查询截止日期 <= ymd 的未完成待办
  const uncompletedResult = await db.collection('todos')
    .where({
      openid,
      completed: false,
      archived: false,
      dueDate: db.command.lte(ymd)
    })
    .orderBy('priority', 'asc')
    .orderBy('dueTime', 'asc')
    .orderBy('createdAt', 'asc')
    .get()

  // 查询截止日期 == ymd 的已完成待办
  const completedResult = await db.collection('todos')
    .where({
      openid,
      completed: true,
      archived: false,
      dueDate: ymd
    })
    .orderBy('completedAt', 'desc')
    .get()

  // 合并结果
  const todos = [...uncompletedResult.data, ...completedResult.data]

  return { code: 0, data: todos }
}

/**
 * 按优先级获取待办
 */
async function getTodosByPriority(openid, data) {
  const { priority } = data

  const result = await db.collection('todos')
    .where({
      openid,
      priority,
      archived: false
    })
    .orderBy('dueTime', 'asc')
    .get()

  return { code: 0, data: result.data }
}

/**
 * 获取有待办记录的日期列表
 */
async function getTodoDates(openid, data) {
  const { days = 180 } = data || {} // 默认获取最近180天的日期

  // 计算时间范围
  const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD') // 包括过去30天
  const endDate = dayjs().add(days, 'day').format('YYYY-MM-DD')

  const result = await db.collection('todos')
    .where({
      openid,
      archived: false,
      dueDate: db.command.and(
        db.command.gte(startDate),
        db.command.lte(endDate)
      )
    })
    .field({
      dueDate: true
    })
    .get()

  // 去重并返回日期列表
  const dateSet = new Set()
  result.data.forEach(todo => {
    if (todo.dueDate) {
      dateSet.add(todo.dueDate)
    }
  })

  return {
    code: 0,
    data: Array.from(dateSet).sort()
  }
}
