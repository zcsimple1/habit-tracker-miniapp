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
 */
async function getTodosByDate(openid, data) {
  const { ymd } = data

  const result = await db.collection('todos')
    .where({
      openid,
      dueDate: ymd,
      archived: false
    })
    .orderBy('priority', 'asc')
    .orderBy('dueTime', 'asc')
    .get()

  return { code: 0, data: result.data }
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
