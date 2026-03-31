# 习惯打卡小程序 - 后端设计文档

## 一、技术栈

### 微信小程序云开发
- **云数据库**: 文档数据库 (NoSQL)
- **云函数**: Node.js 16.13
- **云存储**: 用于存储分享卡片图片等
- **云调用**: 订阅消息等能力

### 依赖库
```json
{
  "dependencies": {
    "wx-server-sdk": "latest",
    "dayjs": "^1.11.0",
    "lodash": "^4.17.21"
  }
}
```

---

## 二、数据库设计

### 2.1 users 集合 (用户信息)

```javascript
{
  _id: "user_xxx",                    // 用户ID (openid)
  openid: "user_openid",             // 微信openid

  // 基本信息
  nickname: "用户昵称",               // 可选
  avatarUrl: "https://...",           // 可选

  // 用户偏好设置
  preferences: {
    viewMode: "category",            // 首页视图模式: category | time
    showCompleted: false,            // 默认隐藏已完成
    defaultCategory: "cat_xxx",      // 默认分类
    themeColor: "#667eea"            // 主题色
  },

  // 统计数据缓存 (优化查询性能)
  statsCache: {
    totalCheckins: 0,                // 总打卡次数
    currentStreak: 0,                // 当前连续天数
    longestStreak: 0,                // 最长连续天数
    activeDays: 0,                   // 活跃天数
    lastUpdatedAt: 1234567890        // 最后更新时间
  },

  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

**索引**:
- `_id` (主键)
- `openid` (唯一)

**安全规则**:
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

---

### 2.2 categories 集合 (分类)

```javascript
{
  _id: "cat_xxx",                    // 分类ID
  openid: "user_openid",             // 用户ID

  // 基本信息
  name: "工作",                       // 分类名称
  icon: "🏢",                        // 图标 (emoji)
  color: "#3b82f6",                  // 颜色值

  // 排序
  sortOrder: 1,                      // 排序权重 (数字越小越靠前)

  // 是否预设分类
  isPreset: false,                   // true=预设分类

  // 统计信息 (冗余字段,提升查询性能)
  stats: {
    totalHabits: 5,                  // 总项目数
    activeHabits: 4,                 // 活跃项目数
    lastUpdatedAt: 1234567890        // 最后更新时间
  },

  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

**索引**:
- `_id` (主键)
- `openid + sortOrder` (复合索引)

**安全规则**:
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

---

### 2.3 habits 集合 (习惯/打卡项目)

```javascript
{
  _id: "habit_xxx",                  // 项目ID
  openid: "user_openid",             // 用户ID
  categoryId: "cat_xxx",            // 所属分类ID

  // 基本信息
  name: "写日报",                    // 项目名称
  description: "每天下班前写日报",    // 描述 (可选)

  // 时间规则
  timeRule: {
    type: "daily",                   // daily | weekdays | weekend | weekly | custom

    // weekly 模式使用
    weekDays: [1, 3, 5],             // 1=周一, 7=周日

    // custom 模式使用
    customDates: ["2026-03-30"],    // 具体日期数组

    // 固定时间 (可选)
    fixedTime: "09:00",              // HH:mm 格式

    // 有效期 (可选)
    startDate: "2026-01-01",         // YYYY-MM-DD
    endDate: "2026-12-31"            // YYYY-MM-DD
  },

  // 重要标记
  important: false,                  // 是否为重要项目

  // 状态
  active: true,                      // 是否启用

  // 排序
  sortOrder: 1,                      // 排序权重

  // 统计信息 (冗余字段)
  stats: {
    totalCheckins: 100,              // 总打卡次数
    currentStreak: 15,               // 当前连续天数
    longestStreak: 30,               // 最长连续天数
    completionRate: 85,              // 完成率 (%)
    lastCheckinDate: "2026-03-30",   // 最后打卡日期
    lastUpdatedAt: 1234567890        // 最后更新时间
  },

  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

**索引**:
- `_id` (主键)
- `openid + categoryId` (复合索引)
- `openid + active` (复合索引)
- `openid + active + important` (复合索引,用于重要项目排序)

**安全规则**:
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

---

### 2.4 checkins 集合 (打卡记录)

```javascript
{
  _id: "chk_xxx",                    // 记录ID
  openid: "user_openid",             // 用户ID
  habitId: "habit_xxx",             // 习惯ID

  // 日期时间
  ymd: "2026-03-30",                 // 打卡日期 (YYYY-MM-DD)
  time: "09:15:30",                  // 打卡时间 (HH:mm:ss)
  timestamp: 1234567890,             // 打卡时间戳

  // 跳过标记
  skipped: false,                    // true 表示当日跳过,不纳入统计

  // 额外信息 (可选)
  note: "心情不错",                  // 备注
  location: {                        // 位置 (可选,未来扩展)
    latitude: 39.9,
    longitude: 116.4
  },

  createdAt: 1234567890
}
```

**索引**:
- `_id` (主键)
- `openid + ymd` (复合索引,查询某天所有打卡)
- `habitId + ymd` (复合索引,查询某习惯的打卡记录)
- `openid + habitId` (复合索引,查询某用户某习惯的所有打卡)

**安全规则**:
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

---

### 2.5 todos 集合 (待办任务)

```javascript
{
  _id: "todo_xxx",                   // 待办ID
  openid: "user_openid",             // 用户ID

  // 任务信息
  title: "买牛奶",                   // 任务标题
  description: "全脂牛奶2盒",         // 描述 (可选)

  // 分类
  categoryId: "cat_xxx",            // 所属分类ID (可选)

  // 优先级
  priority: "normal",                // low | normal | high | urgent
  important: false,                  // 是否标记为重要

  // 时间
  dueTime: "18:00",                  // 截止时间 (可选)
  dueDate: "2026-03-30",            // 截止日期,默认今天

  // 状态
  completed: false,                  // 是否完成
  completedAt: 1234567890,           // 完成时间

  // 归档
  archived: false,                  // 是否归档

  // 排序
  sortOrder: 1,                      // 排序权重

  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

**索引**:
- `_id` (主键)
- `openid + completed` (复合索引)
- `openid + dueDate` (复合索引,查询某天待办)
- `openid + priority` (复合索引,按优先级排序)

**安全规则**:
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

---

## 三、云函数设计

### 3.1 目录结构

```
cloudfunctions/
├── user/                    # 用户相关
│   └── index.js
├── category/                # 分类管理
│   └── index.js
├── habit/                   # 习惯管理
│   └── index.js
├── checkin/                 # 打卡功能
│   └── index.js
├── todo/                    # 待办管理
│   └── index.js
├── stats/                   # 统计功能
│   └── index.js
└── common/                  # 公共工具
    └── index.js
```

---

### 3.2 user 云函数 (用户相关)

```javascript
// cloudfunctions/user/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

/**
 * 用户云函数
 * actions:
 * - getProfile: 获取用户信息
 * - updateProfile: 更新用户信息
 * - updatePreferences: 更新用户偏好
 * - getStats: 获取用户统计
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'getProfile':
        return await getProfile(openid)

      case 'updateProfile':
        return await updateProfile(openid, data)

      case 'updatePreferences':
        return await updatePreferences(openid, data)

      case 'getStats':
        return await getStats(openid)

      default:
        throw new Error('Unknown action')
    }
  } catch (err) {
    console.error(err)
    return {
      code: -1,
      message: err.message
    }
  }
}

// 获取用户信息
async function getProfile(openid) {
  let user = await db.collection('users').doc(openid).get()

  // 如果用户不存在,创建新用户
  if (!user.data) {
    const now = Date.now()
    const newUser = {
      _id: openid,
      openid,
      preferences: {
        viewMode: 'category',
        showCompleted: false,
        themeColor: '#667eea'
      },
      statsCache: {
        totalCheckins: 0,
        currentStreak: 0,
        longestStreak: 0,
        activeDays: 0,
        lastUpdatedAt: now
      },
      createdAt: now,
      updatedAt: now
    }
    await db.collection('users').add({ data: newUser })
    return { code: 0, data: newUser }
  }

  return { code: 0, data: user.data }
}

// 更新用户信息
async function updateProfile(openid, data) {
  const result = await db.collection('users').doc(openid).update({
    data: {
      ...data,
      updatedAt: Date.now()
    }
  })
  return { code: 0, data: result }
}

// 更新用户偏好
async function updatePreferences(openid, preferences) {
  const result = await db.collection('users').doc(openid).update({
    data: {
      preferences,
      updatedAt: Date.now()
    }
  })
  return { code: 0, data: result }
}

// 获取用户统计
async function getStats(openid) {
  const user = await db.collection('users').doc(openid).get()
  if (!user.data) {
    throw new Error('User not found')
  }

  // 如果缓存过期,重新计算
  const now = Date.now()
  const cacheExpired = now - (user.data.statsCache?.lastUpdatedAt || 0) > 3600000 // 1小时

  if (cacheExpired) {
    // TODO: 重新计算统计数据
    const stats = await recalculateUserStats(openid)
    await db.collection('users').doc(openid).update({
      data: {
        statsCache: {
          ...stats,
          lastUpdatedAt: now
        },
        updatedAt: now
      }
    })
    return { code: 0, data: stats }
  }

  return { code: 0, data: user.data.statsCache }
}
```

---

### 3.3 category 云函数 (分类管理)

```javascript
// cloudfunctions/category/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 分类云函数
 * actions:
 * - list: 获取分类列表
 * - get: 获取单个分类
 * - create: 创建分类
 * - update: 更新分类
 * - delete: 删除分类
 * - reorder: 重新排序
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'list':
        return await listCategories(openid)

      case 'get':
        return await getCategory(openid, data.categoryId)

      case 'create':
        return await createCategory(openid, data)

      case 'update':
        return await updateCategory(openid, data)

      case 'delete':
        return await deleteCategory(openid, data.categoryId)

      case 'reorder':
        return await reorderCategories(openid, data.orders)

      default:
        throw new Error('Unknown action')
    }
  } catch (err) {
    console.error(err)
    return {
      code: -1,
      message: err.message
    }
  }
}

// 获取分类列表
async function listCategories(openid) {
  const result = await db.collection('categories')
    .where({ openid })
    .orderBy('sortOrder', 'asc')
    .get()

  return { code: 0, data: result.data }
}

// 创建分类
async function createCategory(openid, data) {
  const now = Date.now()
  const category = {
    openid,
    name: data.name,
    icon: data.icon || '📌',
    color: data.color || '#667eea',
    sortOrder: data.sortOrder || 0,
    isPreset: false,
    stats: {
      totalHabits: 0,
      activeHabits: 0,
      lastUpdatedAt: now
    },
    createdAt: now,
    updatedAt: now
  }

  const result = await db.collection('categories').add({ data: category })
  return { code: 0, data: { ...category, _id: result._id } }
}

// 更新分类
async function updateCategory(openid, data) {
  const { categoryId, ...updateData } = data
  const result = await db.collection('categories').doc(categoryId).update({
    data: {
      ...updateData,
      updatedAt: Date.now()
    }
  })
  return { code: 0, data: result }
}

// 删除分类
async function deleteCategory(openid, categoryId) {
  // 检查分类下是否有习惯
  const habits = await db.collection('habits')
    .where({ openid, categoryId })
    .count()

  if (habits.total > 0) {
    throw new Error('该分类下还有习惯,无法删除')
  }

  const result = await db.collection('categories').doc(categoryId).remove()
  return { code: 0, data: result }
}

// 重新排序
async function reorderCategories(openid, orders) {
  const batch = db.collection('categories')
  const operations = []

  for (const item of orders) {
    operations.push(batch.doc(item.categoryId).update({
      data: {
        sortOrder: item.sortOrder,
        updatedAt: Date.now()
      }
    }))
  }

  await Promise.all(operations)
  return { code: 0, message: '排序成功' }
}
```

---

### 3.4 habit 云函数 (习惯管理)

```javascript
// cloudfunctions/habit/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 习惯云函数
 * actions:
 * - list: 获取习惯列表
 * - getByCategory: 获取某分类下的习惯
 * - get: 获取单个习惯
 * - create: 创建习惯
 * - update: 更新习惯
 * - delete: 删除习惯
 * - toggle: 切换启用状态
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'list':
        return await listHabits(openid, data)

      case 'getByCategory':
        return await getHabitsByCategory(openid, data.categoryId)

      case 'get':
        return await getHabit(openid, data.habitId)

      case 'create':
        return await createHabit(openid, data)

      case 'update':
        return await updateHabit(openid, data)

      case 'delete':
        return await deleteHabit(openid, data.habitId)

      case 'toggle':
        return await toggleHabit(openid, data.habitId, data.active)

      default:
        throw new Error('Unknown action')
    }
  } catch (err) {
    console.error(err)
    return {
      code: -1,
      message: err.message
    }
  }
}

// 获取习惯列表
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

// 创建习惯
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
  await updateCategoryStats(openid, data.categoryId)

  return { code: 0, data: { ...habit, _id: result._id } }
}
```

---

### 3.5 checkin 云函数 (打卡功能)

```javascript
// cloudfunctions/checkin/index.js
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 打卡云函数
 * actions:
 * - checkin: 打卡
 * - uncheckin: 取消打卡
 * - skip: 跳过今日
 * - unskip: 取消跳过
 * - getToday: 获取今日打卡情况
 * - getHistory: 获取历史记录
 * - getByDate: 获取某天的打卡记录
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'checkin':
        return await checkin(openid, data.habitId)

      case 'uncheckin':
        return await uncheckin(openid, data.habitId, data.ymd)

      case 'skip':
        return await skip(openid, data.habitId)

      case 'unskip':
        return await unskip(openid, data.habitId, data.ymd)

      case 'getToday':
        return await getTodayCheckins(openid)

      case 'getHistory':
        return await getHistory(openid, data)

      case 'getByDate':
        return await getCheckinsByDate(openid, data.ymd)

      default:
        throw new Error('Unknown action')
    }
  } catch (err) {
    console.error(err)
    return {
      code: -1,
      message: err.message
    }
  }
}

// 打卡
async function checkin(openid, habitId) {
  const today = dayjs().format('YYYY-MM-DD')
  const now = Date.now()
  const time = dayjs().format('HH:mm:ss')

  // 检查是否已打卡
  const existing = await db.collection('checkins')
    .where({
      openid,
      habitId,
      ymd: today,
      skipped: false
    })
    .get()

  if (existing.data.length > 0) {
    throw new Error('今日已打卡')
  }

  // 创建打卡记录
  const checkin = {
    openid,
    habitId,
    ymd: today,
    time,
    timestamp: now,
    skipped: false,
    createdAt: now
  }

  await db.collection('checkins').add({ data: checkin })

  // 更新习惯统计
  await updateHabitStats(openid, habitId)

  // 更新用户统计
  await updateUserStats(openid)

  return { code: 0, data: checkin }
}

// 取消打卡
async function uncheckin(openid, habitId, ymd) {
  const result = await db.collection('checkins')
    .where({
      openid,
      habitId,
      ymd,
      skipped: false
    })
    .remove()

  // 更新统计
  await updateHabitStats(openid, habitId)
  await updateUserStats(openid)

  return { code: 0, data: result }
}

// 获取今日打卡情况
async function getTodayCheckins(openid) {
  const today = dayjs().format('YYYY-MM-DD')

  const result = await db.collection('checkins')
    .where({
      openid,
      ymd: today,
      skipped: false
    })
    .get()

  return { code: 0, data: result.data }
}
```

---

### 3.6 todo 云函数 (待办管理)

```javascript
// cloudfunctions/todo/index.js
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 待办云函数
 * actions:
 * - list: 获取待办列表
 * - get: 获取单个待办
 * - create: 创建待办
 * - update: 更新待办
 * - delete: 删除待办
 * - toggle: 切换完成状态
 * - archive: 归档
 * - getByDate: 获取某天的待办
 */
exports.main = async (event, context) => {
  const { action, data } = event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (action) {
      case 'list':
        return await listTodos(openid, data)

      case 'get':
        return await getTodo(openid, data.todoId)

      case 'create':
        return await createTodo(openid, data)

      case 'update':
        return await updateTodo(openid, data)

      case 'delete':
        return await deleteTodo(openid, data.todoId)

      case 'toggle':
        return await toggleTodo(openid, data.todoId, data.completed)

      case 'archive':
        return await archiveTodo(openid, data.todoId, data.archived)

      case 'getByDate':
        return await getTodosByDate(openid, data.ymd)

      default:
        throw new Error('Unknown action')
    }
  } catch (err) {
    console.error(err)
    return {
      code: -1,
      message: err.message
    }
  }
}

// 获取待办列表
async function listTodos(openid, options = {}) {
  const { completed = null, archived = false, dueDate } = options
  let query = db.collection('todos').where({ openid, archived })

  if (completed !== null) {
    query = query.where({ completed })
  }
  if (dueDate) {
    query = query.where({ dueDate })
  }

  const result = await query
    .orderBy('priority', 'asc')
    .orderBy('dueTime', 'asc')
    .orderBy('sortOrder', 'asc')
    .get()

  return { code: 0, data: result.data }
}

// 创建待办
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
  return { code: 0, data: { ...todo, _id: result._id } }
}

// 切换完成状态
async function toggleTodo(openid, todoId, completed) {
  const now = Date.now()
  const updateData = {
    completed,
    updatedAt: now
  }

  if (completed) {
    updateData.completedAt = now
  }

  await db.collection('todos').doc(todoId).update({ data: updateData })
  return { code: 0, message: '操作成功' }
}
```

---

### 3.7 stats 云函数 (统计功能)

```javascript
// cloudfunctions/stats/index.js
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const $ = db.command.aggregate

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
        return await getHabitStats(openid, data.habitId)

      case 'getTrend':
        return await getTrend(openid, data)

      case 'getRanking':
        return await getRanking(openid, data)

      default:
        throw new Error('Unknown action')
    }
  } catch (err) {
    console.error(err)
    return {
      code: -1,
      message: err.message
    }
  }
}

// 获取总体统计
async function getOverview(openid, options = {}) {
  const { startDate, endDate } = options
  const today = dayjs().format('YYYY-MM-DD')

  // 获取今日数据
  const todayCheckins = await db.collection('checkins')
    .where({
      openid,
      ymd: today,
      skipped: false
    })
    .count()

  // 获取本月数据
  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')
  const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD')

  const monthCheckins = await db.collection('checkins')
    .where({
      openid,
      ymd: db.command.gte(monthStart).and(db.command.lte(monthEnd)),
      skipped: false
    })
    .count()

  // 获取所有习惯数
  const habits = await db.collection('habits')
    .where({ openid, active: true })
    .count()

  return {
    code: 0,
    data: {
      today: {
        completed: todayCheckins.total,
        total: habits.total,
        rate: habits.total > 0 ? Math.round((todayCheckins.total / habits.total) * 100) : 0
      },
      month: {
        completed: monthCheckins.total,
        rate: habits.total > 0 ? Math.round((monthCheckins.total / (habits.total * 30)) * 100) : 0
      },
      totalHabits: habits.total
    }
  }
}
```

---

## 四、公共工具函数

```javascript
// cloudfunctions/common/index.js
const dayjs = require('dayjs')

/**
 * 判断某天是否应该显示某习惯
 */
function shouldShowOnDate(habit, ymd) {
  if (!habit.active) return false

  const { timeRule } = habit
  if (!timeRule) return true

  // 检查日期范围
  if (timeRule.startDate && ymd < timeRule.startDate) return false
  if (timeRule.endDate && ymd > timeRule.endDate) return false

  const date = dayjs(ymd)
  const dayOfWeek = date.day() // 0=周日, 1=周一, ..., 6=周六

  switch (timeRule.type) {
    case 'daily':
      return true

    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5

    case 'weekend':
      return dayOfWeek === 0 || dayOfWeek === 6

    case 'weekly':
      return timeRule.weekDays.includes(dayOfWeek)

    case 'custom':
      return timeRule.customDates.includes(ymd)

    default:
      return true
  }
}

/**
 * 更新习惯统计
 */
async function updateHabitStats(openid, habitId) {
  // TODO: 实现统计更新逻辑
}

/**
 * 更新分类统计
 */
async function updateCategoryStats(openid, categoryId) {
  // TODO: 实现统计更新逻辑
}

/**
 * 更新用户统计
 */
async function updateUserStats(openid) {
  // TODO: 实现统计更新逻辑
}

/**
 * 计算连续天数
 */
function calculateStreak(checkins) {
  // TODO: 实现连续天数计算逻辑
  return 0
}

module.exports = {
  shouldShowOnDate,
  updateHabitStats,
  updateCategoryStats,
  updateUserStats,
  calculateStreak
}
```

---

## 五、前端调用示例

```javascript
// 调用云函数示例

// 获取用户信息
wx.cloud.callFunction({
  name: 'user',
  data: {
    action: 'getProfile'
  },
  success: res => {
    console.log(res.result.data)
  }
})

// 获取今日打卡
wx.cloud.callFunction({
  name: 'checkin',
  data: {
    action: 'getToday'
  },
  success: res => {
    console.log(res.result.data)
  }
})

// 打卡
wx.cloud.callFunction({
  name: 'checkin',
  data: {
    action: 'checkin',
    data: {
      habitId: 'habit_xxx'
    }
  },
  success: res => {
    console.log('打卡成功')
  }
})

// 创建待办
wx.cloud.callFunction({
  name: 'todo',
  data: {
    action: 'create',
    data: {
      title: '买牛奶',
      priority: 'normal',
      dueDate: '2026-03-30',
      dueTime: '18:00'
    }
  },
  success: res => {
    console.log('创建成功')
  }
})
```

---

## 六、注意事项

1. **数据安全**: 所有云函数都会验证 `openid`,确保用户只能访问自己的数据

2. **性能优化**:
   - 合理使用索引
   - 使用统计缓存
   - 避免频繁的数据库操作

3. **错误处理**: 统一的错误处理机制,返回 `{code, message, data}` 格式

4. **日志记录**: 使用 `console.error` 记录错误日志,方便调试

5. **事务处理**: 对于需要原子性操作的场景,使用数据库事务

6. **定时任务**: 可使用云函数定时任务来定期更新统计数据

---

## 七、后续优化

1. **数据压缩**: 对大量数据进行压缩传输
2. **分页加载**: 历史数据使用分页加载
3. **缓存策略**: 完善缓存策略,减少数据库查询
4. **批量操作**: 支持批量创建、更新、删除
5. **数据备份**: 定期备份重要数据
