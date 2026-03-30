const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function assertString(v, name) {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`${name} 必须是非空字符串`)
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const { action } = event || {}
  assertString(action, 'action')

  // 获取待办列表
  if (action === 'list') {
    const { completed } = event || {}
    let query = db.collection('todos').where({ openid })
    if (typeof completed === 'boolean') {
      query = query.where({ completed })
    }
    const res = await query.orderBy('createdAt', 'desc').get()
    return res.data
  }

  // 创建待办
  if (action === 'create') {
    const { title } = event || {}
    assertString(title, 'title')
    
    const docId = `${openid}_${Date.now()}`
    const data = {
      _id: docId,
      openid,
      title,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    await db.collection('todos').add({ data })
    return data
  }

  // 更新待办状态
  if (action === 'update') {
    const { id, completed, title } = event || {}
    if (!id) throw new Error('id 不能为空')
    
    // 验证文档所有权
    const doc = await db.collection('todos').doc(id).get()
    if (!doc.data || doc.data.openid !== openid) {
      throw new Error('无权操作此文档')
    }
    
    const updates = { updatedAt: Date.now() }
    if (typeof completed === 'boolean') {
      updates.completed = completed
    }
    if (title && typeof title === 'string') {
      updates.title = title
    }
    
    await db.collection('todos').doc(id).update({ data: updates })
    return { ok: true }
  }

  // 删除待办
  if (action === 'delete') {
    const { id } = event || {}
    if (!id) throw new Error('id 不能为空')
    
    // 验证文档所有权
    const doc = await db.collection('todos').doc(id).get()
    if (!doc.data || doc.data.openid !== openid) {
      throw new Error('无权操作此文档')
    }
    
    await db.collection('todos').doc(id).remove()
    return { ok: true }
  }

  throw new Error(`未知 action: ${action}`)
}
