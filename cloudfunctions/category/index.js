// cloudfunctions/category/index.js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 预设分类数据
const PRESET_CATEGORIES = [
  { name: '工作', icon: '🏢', color: '#3b82f6', description: '工作任务、会议、日报等' },
  { name: '健康', icon: '❤️', color: '#ef4444', description: '运动、健身、饮食等' },
  { name: '学习', icon: '📚', color: '#8b5cf6', description: '阅读、课程、技能学习等' },
  { name: '家庭', icon: '🏠', color: '#f59e0b', description: '家务、陪伴家人等' },
  { name: '孩子', icon: '👶', color: '#10b981', description: '接送孩子、辅导作业等' },
  { name: '财务', icon: '💰', color: '#06b6d4', description: '记账、理财、账单支付等' },
  { name: '个人成长', icon: '⭐', color: '#ec4899', description: '冥想、反思、日记等' },
  { name: '社交', icon: '💬', color: '#f97316', description: '联系朋友、社交活动等' },
  { name: '其它', icon: '📌', color: '#6b7280', description: '其他未分类的打卡项目' }
]

/**
 * 分类云函数
 * actions:
 * - list: 获取分类列表
 * - get: 获取单个分类
 * - create: 创建分类
 * - batchCreate: 批量创建分类
 * - update: 更新分类
 * - delete: 删除分类
 * - reorder: 重新排序
 * - getPresets: 获取预设分类列表
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'list':
        return await listCategories(openid, data)

      case 'get':
        return await getCategory(openid, data.categoryId)

      case 'create':
        return await createCategory(openid, data)

      case 'batchCreate':
        return await batchCreateCategories(openid, data)

      case 'update':
        return await updateCategory(openid, data)

      case 'delete':
        return await deleteCategory(openid, data.categoryId)

      case 'reorder':
        return await reorderCategories(openid, data)

      case 'getPresets':
        return { code: 0, data: PRESET_CATEGORIES, message: '获取预设分类成功' }

      default:
        throw new Error('Unknown action: ' + action)
    }
  } catch (err) {
    console.error('[category] Error:', err)
    return {
      code: -1,
      message: err.message,
      error: err
    }
  }
}

/**
 * 获取分类列表
 */
async function listCategories(openid, options = {}) {
  const { includeStats = true } = options

  let query = db.collection('categories').where({ openid })
  const result = await query.orderBy('sortOrder', 'asc').get()

  return { code: 0, data: result.data }
}

/**
 * 获取单个分类
 */
async function getCategory(openid, categoryId) {
  const result = await db.collection('categories').doc(categoryId).get()

  if (!result.data) {
    throw new Error('分类不存在')
  }

  if (result.data.openid !== openid) {
    throw new Error('无权访问该分类')
  }

  return { code: 0, data: result.data }
}

/**
 * 创建分类
 */
async function createCategory(openid, data) {
  const now = Date.now()
  const category = {
    openid,
    name: data.name,
    icon: data.icon || '📌',
    color: data.color || '#667eea',
    sortOrder: data.sortOrder || 0,
    isPreset: data.isPreset || false,
    stats: {
      totalHabits: 0,
      activeHabits: 0,
      lastUpdatedAt: now
    },
    createdAt: now,
    updatedAt: now
  }

  const result = await db.collection('categories').add({ data: category })
  return {
    code: 0,
    data: { ...category, _id: result._id },
    message: '分类创建成功'
  }
}

/**
 * 批量创建分类
 */
async function batchCreateCategories(openid, data) {
  const { categories } = data
  const now = Date.now()

  const results = []
  for (const cat of categories) {
    const category = {
      openid,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      sortOrder: cat.sortOrder || 0,
      isPreset: true,
      stats: {
        totalHabits: 0,
        activeHabits: 0,
        lastUpdatedAt: now
      },
      createdAt: now,
      updatedAt: now
    }

    try {
      const result = await db.collection('categories').add({ data: category })
      results.push({ success: true, data: { ...category, _id: result._id } })
    } catch (err) {
      results.push({ success: false, error: err.message, data: cat })
    }
  }

  return {
    code: 0,
    data: results,
    message: `批量创建完成,成功 ${results.filter(r => r.success).length}/${results.length} 个`
  }
}

/**
 * 更新分类
 */
async function updateCategory(openid, data) {
  const { categoryId, ...updateData } = data

  // 验证权限
  const existing = await db.collection('categories').doc(categoryId).get()
  if (!existing.data) {
    throw new Error('分类不存在')
  }
  if (existing.data.openid !== openid) {
    throw new Error('无权修改该分类')
  }

  const result = await db.collection('categories').doc(categoryId).update({
    data: {
      ...updateData,
      updatedAt: Date.now()
    }
  })

  return { code: 0, data: result, message: '分类更新成功' }
}

/**
 * 删除分类
 */
async function deleteCategory(openid, categoryId) {
  // 验证权限
  const existing = await db.collection('categories').doc(categoryId).get()
  if (!existing.data) {
    throw new Error('分类不存在')
  }
  if (existing.data.openid !== openid) {
    throw new Error('无权删除该分类')
  }

  // 检查分类下是否有习惯
  const habits = await db.collection('habits')
    .where({ openid, categoryId })
    .count()

  if (habits.total > 0) {
    throw new Error(`该分类下还有 ${habits.total} 个习惯,无法删除`)
  }

  const result = await db.collection('categories').doc(categoryId).remove()
  return { code: 0, data: result, message: '分类删除成功' }
}

/**
 * 重新排序
 */
async function reorderCategories(openid, data) {
  const { orders } = data
  const operations = []

  for (const item of orders) {
    operations.push(
      db.collection('categories').doc(item.categoryId).update({
        data: {
          sortOrder: item.sortOrder,
          updatedAt: Date.now()
        }
      })
    )
  }

  try {
    await Promise.all(operations)
    return { code: 0, message: '排序成功' }
  } catch (err) {
    throw new Error('排序失败: ' + err.message)
  }
}
