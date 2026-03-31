const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloudbase-8gw8fj3c75c015f6' })
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

  if (action === 'pull') {
    // 拉取云端数据（只取当前用户）
    const habitsRes = await db.collection('habits').where({ openid }).get()
    const logsRes = await db.collection('checkins').where({ openid }).get()

    const habits = (habitsRes.data || []).map(h => ({
      id: h.habitId,
      name: h.name,
      color: h.color || '#4f46e5',
      createdAt: h.createdAt
    }))

    const logs = {}
    for (const row of (logsRes.data || [])) {
      const hid = row.habitId
      if (!logs[hid]) logs[hid] = {}
      logs[hid][row.ymd] = true
    }

    return { habits, logs }
  }

  if (action === 'push') {
    const { state } = event
    if (!state || typeof state !== 'object') throw new Error('state 不能为空')
    const habits = Array.isArray(state.habits) ? state.habits : []
    const logs = state.logs && typeof state.logs === 'object' ? state.logs : {}

    // upsert habits
    const habitTasks = habits.map(h => {
      if (!h || typeof h !== 'object') return null
      assertString(h.id, 'habit.id')
      assertString(h.name, 'habit.name')
      const docId = `${openid}_${h.id}`
      return db.collection('habits').doc(docId).set({
        data: {
          _id: docId,
          openid,
          habitId: h.id,
          name: h.name,
          color: h.color || '#4f46e5',
          createdAt: h.createdAt || Date.now(),
          updatedAt: Date.now()
        }
      })
    }).filter(Boolean)

    // rewrite checkins: simple strategy (clear user's checkins then re-add)
    // MVP: data volume small; later we can do incremental diff.
    const clearRes = await db.collection('checkins').where({ openid }).remove()

    const checkinRows = []
    for (const [hid, dates] of Object.entries(logs)) {
      if (!dates || typeof dates !== 'object') continue
      for (const [ymd, v] of Object.entries(dates)) {
        if (!v) continue
        checkinRows.push({
          openid,
          habitId: hid,
          ymd,
          createdAt: Date.now()
        })
      }
    }

    // batch add (20 per batch)
    const batches = []
    for (let i = 0; i < checkinRows.length; i += 20) {
      const slice = checkinRows.slice(i, i + 20)
      const batch = db.batch()
      for (const row of slice) {
        // deterministic id
        const docId = `${openid}_${row.habitId}_${row.ymd}`
        batch.set(db.collection('checkins').doc(docId), {
          ...row,
          _id: docId
        })
      }
      batches.push(batch.commit())
    }

    await Promise.all([...habitTasks, ...batches])
    return { ok: true, cleared: clearRes.stats?.removed || 0, added: checkinRows.length }
  }

  throw new Error(`未知 action: ${action}`)
}
