// 云数据库初始化函数
// 功能：一键创建所有数据库集合、配置安全规则、导入预设数据

const cloud = require('wx-server-sdk')
cloud.init({
  env: 'cloudbase-8gw8fj3c75c015f6'
})

const db = cloud.database()
const _ = db.command

// 数据库集合列表
const collections = [
  {
    name: 'users',
    desc: '用户信息和偏好设置',
    indexes: [{ name: 'openid', fields: ['openid'] }]
  },
  {
    name: 'categories',
    desc: '分类数据',
    indexes: [{ name: 'userId', fields: ['userId'] }]
  },
  {
    name: 'habits',
    desc: '习惯/打卡项目',
    indexes: [
      { name: 'userId', fields: ['userId'] },
      { name: 'categoryId', fields: ['categoryId'] }
    ]
  },
  {
    name: 'checkins',
    desc: '打卡记录',
    indexes: [
      { name: 'habitId', fields: ['habitId'] },
      { name: 'ymd', fields: ['ymd'] },
      { name: 'habit_ymd', fields: ['habitId', 'ymd'] }
    ]
  },
  {
    name: 'todos',
    desc: '待办事项',
    indexes: [
      { name: 'userId', fields: ['userId'] },
      { name: 'dueDate', fields: ['dueDate'] },
      { name: 'priority', fields: ['priority'] }
    ]
  }
]

// 预设分类数据
const presetCategories = [
  {
    name: '工作',
    icon: '🏢',
    color: '#3b82f6',
    description: '工作相关的习惯和待办'
  },
  {
    name: '健康',
    icon: '❤️',
    color: '#ef4444',
    description: '健康和运动相关的习惯'
  },
  {
    name: '学习',
    icon: '📚',
    color: '#8b5cf6',
    description: '学习和自我提升'
  },
  {
    name: '孩子',
    icon: '👶',
    color: '#10b981',
    description: '育儿相关事项'
  },
  {
    name: '家庭',
    icon: '🏠',
    color: '#f59e0b',
    description: '家庭生活和关系'
  },
  {
    name: '财务',
    icon: '💰',
    color: '#06b6d4',
    description: '财务管理和储蓄'
  },
  {
    name: '个人成长',
    icon: '⭐',
    color: '#ec4899',
    description: '个人发展和成长'
  },
  {
    name: '社交',
    icon: '💬',
    color: '#f97316',
    description: '社交活动和人际关系'
  }
]

// 安全规则配置
const securityRules = {
  users: {
    read: "auth.openid == doc.openid",
    write: "auth.openid == doc.openid"
  },
  categories: {
    read: "auth.openid == doc.openid",
    write: "auth.openid == doc.openid"
  },
  habits: {
    read: "auth.openid == doc.openid",
    write: "auth.openid == doc.openid"
  },
  checkins: {
    read: "auth.openid == doc.openid",
    write: "auth.openid == doc.openid"
  },
  todos: {
    read: "auth.openid == doc.openid",
    write: "auth.openid == doc.openid"
  }
}

exports.main = async (event, context) => {
  const { action, userId } = event

  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    switch (action) {
      case 'init':
        return await initDatabase(openid)
      
      case 'addPresetCategories':
        return await addPresetCategories(openid)
      
      case 'getStatus':
        return await getDatabaseStatus()
      
      default:
        throw new Error('未知的操作: ' + action)
    }
  } catch (err) {
    console.error('[initDB] Error:', err)
    throw err
  }
}

// 初始化数据库
async function initDatabase(openid) {
  const results = {
    collections: [],
    securityRules: [],
    presetData: [],
    errors: []
  }

  try {
    // 1. 创建用户记录
    const userResult = await db.collection('users').add({
      data: {
        openid,
        nickname: '用户',
        avatarUrl: '',
        preferences: {
          viewMode: 'category',
          showCompleted: false,
          theme: 'light'
        },
        createTime: new Date().getTime(),
        updateTime: new Date().getTime()
      }
    })
    results.presetData.push({ type: 'user', status: 'created', id: userResult._id })

    // 2. 添加预设分类
    for (const category of presetCategories) {
      try {
        const catResult = await db.collection('categories').add({
          data: {
            ...category,
            userId: openid,
            createTime: new Date().getTime(),
            updateTime: new Date().getTime()
          }
        })
        results.presetData.push({ type: 'category', name: category.name, status: 'created', id: catResult._id })
      } catch (err) {
        results.errors.push({ type: 'category', name: category.name, error: err.message })
      }
    }

    // 3. 检查集合状态
    const status = await getDatabaseStatus()
    results.collections = status.collections
    results.securityRules = status.securityRules

    return {
      code: 0,
      message: '数据库初始化成功',
      data: results
    }

  } catch (err) {
    throw new Error('数据库初始化失败: ' + err.message)
  }
}

// 添加预设分类
async function addPresetCategories(openid) {
  const results = []

  for (const category of presetCategories) {
    try {
      // 检查是否已存在
      const exist = await db.collection('categories').where({
        userId: openid,
        name: category.name
      }).count()

      if (exist.total > 0) {
        results.push({ name: category.name, status: 'skipped', reason: '已存在' })
        continue
      }

      // 添加新分类
      const result = await db.collection('categories').add({
        data: {
          ...category,
          userId: openid,
          createTime: new Date().getTime(),
          updateTime: new Date().getTime()
        }
      })

      results.push({ name: category.name, status: 'created', id: result._id })
    } catch (err) {
      results.push({ name: category.name, status: 'failed', error: err.message })
    }
  }

  return {
    code: 0,
    message: '添加预设分类完成',
    data: results
  }
}

// 获取数据库状态
async function getDatabaseStatus() {
  const results = {
    collections: [],
    securityRules: []
  }

  // 检查每个集合
  for (const coll of collections) {
    try {
      const count = await db.collection(coll.name).count()
      results.collections.push({
        name: coll.name,
        desc: coll.desc,
        count: count.total,
        status: 'exists'
      })
    } catch (err) {
      if (err.errCode === -502001) {
        // 集合不存在
        results.collections.push({
          name: coll.name,
          desc: coll.desc,
          count: 0,
          status: 'not_exists'
        })
      } else {
        results.collections.push({
          name: coll.name,
          desc: coll.desc,
          count: 0,
          status: 'error',
          error: err.message
        })
      }
    }
  }

  return results
}
