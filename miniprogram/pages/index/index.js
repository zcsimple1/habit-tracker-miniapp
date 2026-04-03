const { toYMD } = require('../../utils/date')
const { getAllCategories, getCategoryIcon, getCategoryColor } = require('../../utils/preset-categories.js')

Page({
  data: {
    // 日期选择
    currentDate: new Date(),
    selectedDate: new Date(),
    dateMain: '',
    dateWeekday: '',
    isToday: true,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),

    // 视图模式: category | time
    viewMode: 'category',

    // 临时显示已完成状态（眼睛按钮控制）
    tempShowCompleted: true,

    // 分类模式数据
    categoryGroups: [],

    // 时间模式数据
    timeHabits: [],

    // 今日统计
    todayStats: {
      total: 0,
      completed: 0,
      rate: 0
    },

    // 加载状态
    loading: false,

    // 日历弹窗显示状态
    showCalendar: false,

    // 有打卡记录的日期列表（YYYY-MM-DD格式）
    checkinDates: [],

    // 习惯详情日历弹窗
    showHabitCalendar: false,
    habitCalendarDates: [],
    habitCalendarHabitId: '',
    habitCalendarHabitName: '',

    // 习惯打卡日期缓存
    habitCheckinCache: {},

    // 缓存键
    cacheKey: ''
  },

  onLoad() {
    // 强制使用当前时间
    const now = new Date()
    console.log('[index] onLoad - 当前时间:', now, toYMD(now))

    this.setData({
      currentDate: now,
      selectedDate: now,
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth()
    }, () => {
      console.log('[index] setData 完成，当前数据:', this.data)
      this.updateDateDisplay(now)
      this.loadUserPreferences()
      this.loadCheckinDates()
      this.loadData(true) // 首次加载强制刷新
    })
  },

  onShow() {
    console.log('[index] onShow - 当前数据:', {
      currentDate: this.data.currentDate,
      selectedDate: this.data.selectedDate,
      tempShowCompleted: this.data.tempShowCompleted
    })
    // 从缓存读取数据，不强制刷新
    this.loadData(false)
    this.loadCheckinDates() // 确保打卡记录日期是最新的
  },



  // 更新日期显示
  updateDateDisplay(date) {
    if (!date) return

    const dateObj = date instanceof Date ? date : new Date(date)
    const today = new Date()

    const todayYMD = toYMD(today)
    const currentYMD = toYMD(dateObj)
    const isToday = todayYMD === currentYMD

    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    const day = dateObj.getDate()
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()]

    this.setData({
      dateMain: `${year}年${month}月${day}日`,
      dateWeekday: `星期${weekday}`,
      isToday
    })
  },

  // 加载用户偏好设置
  async loadUserPreferences() {
    try {
      console.log('[index] 开始加载用户偏好...')
      const { result } = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'getProfile' }
      })

      console.log('[index] 云函数返回:', result)

      if (result && result.data && result.data.preferences) {
        const { viewMode } = result.data.preferences
        console.log('[index] 用户偏好:', { viewMode })

        // 只更新视图模式，不影响临时的眼睛按钮状态
        this.setData({
          viewMode: viewMode || 'category'
        }, () => {
          console.log('[index] 用户偏好已设置到 data:', {
            viewMode: this.data.viewMode,
            tempShowCompleted: this.data.tempShowCompleted
          })
        })
      }
    } catch (err) {
      console.warn('[index] 加载用户偏好失败', err)
    }
  },



  // 切换日期
  onPrevDay() {
    const newDate = new Date(this.data.currentDate)
    newDate.setDate(newDate.getDate() - 1)
    this.setData({ currentDate: newDate })
    this.updateDateDisplay(newDate)
    this.updateCalendarDate()
    this.loadData(true) // 日期切换强制刷新
  },

  onNextDay() {
    const newDate = new Date(this.data.currentDate)
    newDate.setDate(newDate.getDate() + 1)
    this.setData({ currentDate: newDate })
    this.updateDateDisplay(newDate)
    this.updateCalendarDate()
    this.loadData(true) // 日期切换强制刷新
  },

  // 选择日期
  async onChooseDate() {
    this.updateCalendarDate()
    this.setData({ showCalendar: true })
    await this.loadCheckinDates()
  },

  // 选择日期（日历）
  onSelectDate(e) {
    const { date } = e.detail
    this.setData({
      currentDate: date,
      selectedDate: date,
      showCalendar: false
    })
    this.updateDateDisplay(date)
    this.loadData(true) // 日期选择强制刷新
  },

  // 切换视图模式
  toggleViewMode() {
    const newMode = this.data.viewMode === 'category' ? 'time' : 'category'
    this.setData({ viewMode: newMode })

    // 保存用户偏好
    this.saveUserPreferences()

    // 重新加载数据
    this.loadData()
  },

  // 切换临时显示已完成（眼睛按钮）
  toggleShowCompleted() {
    const tempShowCompleted = !this.data.tempShowCompleted
    console.log('[index] toggleShowCompleted:', { old: this.data.tempShowCompleted, new: tempShowCompleted })
    this.setData({
      tempShowCompleted
    })
    // 不保存到用户偏好，这是临时状态
  },

  // 保存用户偏好（只保存视图模式，不保存眼睛按钮状态）
  async saveUserPreferences() {
    try {
      console.log('[index] 保存用户偏好:', {
        viewMode: this.data.viewMode
      })
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'updatePreferences',
          data: {
            viewMode: this.data.viewMode
          }
        }
      })
      console.log('[index] 保存用户偏好成功:', res.result)
    } catch (err) {
      console.warn('[index] 保存用户偏好失败', err)
    }
  },

  // 加载有打卡记录的日期
  async loadCheckinDates() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'checkin',
        data: {
          action: 'getCheckinDates'
        }
      })

      console.log('[index] 云函数返回 result:', result)
      console.log('[index] result.data:', result.data)

      // 确保日期格式为 YYYY-MM-DD
      const checkinDates = (result.data || []).map(d => {
        if (d instanceof Date) {
          return toYMD(d)
        } else if (typeof d === 'object' && d.ymd) {
          return d.ymd
        }
        return d
      })
      console.log('[index] 加载打卡日期 checkinDates:', checkinDates)
      this.setData({ checkinDates })
    } catch (err) {
      console.error('加载打卡日期失败', err)
    }
  },

  // 关闭日历
  onCloseCalendar() {
    this.setData({ showCalendar: false })
  },

  // 点击累计打卡天数 - 显示习惯日历
  async onShowHabitCalendar(e) {
    const { habitId, habitName } = e.currentTarget.dataset
    console.log('[index] 点击累计天数:', { habitId, habitName })

    this.setData({
      showHabitCalendar: true,
      habitCalendarHabitId: habitId,
      habitCalendarHabitName: habitName,
      calendarYear: new Date().getFullYear(),
      calendarMonth: new Date().getMonth()
    })

    // 加载该习惯的打卡日期
    await this.loadHabitCheckinDates(habitId)
  },

  // 加载某个习惯的打卡日期
  async loadHabitCheckinDates(habitId) {
    // 先检查内存缓存
    const cache = this.data.habitCheckinCache
    if (cache[habitId]) {
      console.log('[index] 习惯打卡日期从缓存加载:', habitId)
      this.setData({ habitCalendarDates: cache[habitId] })
      return
    }

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'checkin',
        data: {
          action: 'getHabitCheckinDates',
          data: { habitId }
        }
      })

      console.log('[index] 习惯打卡日期:', result.data)
      const dates = result.data || []
      this.setData({ habitCalendarDates: dates })

      // 存入缓存
      const newCache = { ...cache, [habitId]: dates }
      this.setData({ habitCheckinCache: newCache })
      console.log('[index] 习惯打卡日期已缓存:', habitId)
    } catch (err) {
      console.error('加载习惯打卡日期失败', err)
      this.setData({ habitCalendarDates: [] })
    }
  },

  // 关闭习惯日历
  onCloseHabitCalendar() {
    this.setData({
      showHabitCalendar: false,
      habitCalendarDates: [],
      habitCalendarHabitId: '',
      habitCalendarHabitName: ''
    })
  },

  // 选择习惯日历中的日期
  onSelectHabitCalendarDate(e) {
    const { date } = e.detail
    this.setData({
      currentDate: date,
      selectedDate: date,
      showHabitCalendar: false
    })
    this.updateDateDisplay(date)
    this.loadData(true) // 日期选择强制刷新
  },

  // 更新日历年月
  updateCalendarDate() {
    const { currentDate } = this.data
    this.setData({
      calendarYear: currentDate.getFullYear(),
      calendarMonth: currentDate.getMonth(),
      selectedDate: currentDate
    })
  },

  // 加载数据
  async loadData(forceRefresh = false) {
    const ymd = toYMD(this.data.currentDate)
    const cacheKey = `habits_${ymd}`

    // 检查缓存
    if (!forceRefresh) {
      const cachedData = wx.getStorageSync(cacheKey)
      if (cachedData) {
        console.log('[index] 从缓存加载数据:', cacheKey)
        this.setData({
          categoryGroups: cachedData.categoryGroups,
          timeHabits: cachedData.timeHabits,
          todayStats: cachedData.todayStats,
          loading: false
        })
        return
      }
    }

    this.setData({ loading: true })

    try {
      const ymd = toYMD(this.data.currentDate)

      // 获取分类列表
      const { result: catResult } = await wx.cloud.callFunction({
        name: 'category',
        data: { action: 'list' }
      })

      const customCategories = catResult.data || []

      // 合并预设分类和自定义分类
      const categories = getAllCategories(customCategories)

      // 获取今日习惯
      const { result: habitResult } = await wx.cloud.callFunction({
        name: 'habit',
        data: { action: 'getTodayHabits', data: { ymd } }
      })

      const habits = habitResult.data || []

      // 获取今日打卡记录
      const { result: checkinResult } = await wx.cloud.callFunction({
        name: 'checkin',
        data: { action: 'getByDate', data: { ymd } }
      })

      const checkins = checkinResult.data || []
      const checkinMap = {}
      checkins.forEach(c => {
        checkinMap[c.habitId] = c
      })

      // 为每个习惯添加打卡状态和累计打卡天数
      for (const h of habits) {
        const checkin = checkinMap[h._id]
        h.checked = !!checkin && !checkin.skipped
        h.skipped = !!checkin && checkin.skipped
        h.checkinTime = checkin ? checkin.time : null
        h.totalCheckins = h.stats?.totalCheckins || 0

        // 关联分类信息
        const category = categories.find(c => (c.isPreset && c.id === h.categoryId) || (!c.isPreset && c._id === h.categoryId))
        h.categoryName = category ? category.name : '未分类'
        h.categoryColor = category ? category.color : '#999'
        h.categoryIcon = category ? category.icon : '📌'
      }

      // 分类模式数据
      const categoryGroups = categories.map(cat => {
        // 根据分类类型匹配习惯
        const catHabits = habits.filter(h => {
          if (cat.isPreset) {
            return h.categoryId === cat.id
          } else {
            return h.categoryId === cat._id
          }
        })
          .sort((a, b) => {
            // 重要的排前面
            if (a.important && !b.important) return -1
            if (!a.important && b.important) return 1

            // 按时间排序
            const timeA = a.timeRule?.fixedTime || '99:99'
            const timeB = b.timeRule?.fixedTime || '99:99'
            return timeA.localeCompare(timeB)
          })

        // 统计完成情况
        const total = catHabits.length
        const completed = catHabits.filter(h => h.checked).length

        return {
          ...cat,
          habits: catHabits,
          total,
          completed,
          expanded: true
        }
      }).filter(g => g.habits.length > 0)

      // 时间模式数据
      const timeHabits = habits.sort((a, b) => {
        // 重要的排前面
        if (a.important && !b.important) return -1
        if (!a.important && b.important) return 1

        // 按时间排序
        const timeA = a.timeRule?.fixedTime || '99:99'
        const timeB = b.timeRule?.fixedTime || '99:99'
        return timeA.localeCompare(timeB)
      })

      // 今日统计
      const totalHabits = habits.length
      const completedHabits = habits.filter(h => h.checked).length
      const rate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0

      this.setData({
        categoryGroups,
        timeHabits,
        todayStats: {
          total: totalHabits,
          completed: completedHabits,
          rate
        },
        loading: false
      })

      // 保存到缓存
      wx.setStorageSync(cacheKey, {
        categoryGroups,
        timeHabits,
        todayStats: {
          total: totalHabits,
          completed: completedHabits,
          rate
        }
      })
      console.log('[index] 数据已缓存:', cacheKey)
    } catch (err) {
      console.error('加载数据失败', err)
      this.setData({ loading: false })

      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 打卡
  async onCheckin(e) {
    const { habitId } = e.currentTarget.dataset

    // 检查是否是将来的日期
    if (this.data.currentDate > new Date()) {
      wx.showToast({
        title: '不能打卡将来的任务',
        icon: 'none'
      })
      return
    }

    try {
      const ymd = toYMD(this.data.currentDate)
      console.log('[index] 打卡 - habitId:', habitId, 'ymd:', ymd)

      await wx.cloud.callFunction({
        name: 'checkin',
        data: { action: 'checkin', data: { habitId, ymd } }
      })

      wx.showToast({ title: '打卡成功' })

      // 清除缓存
      wx.removeStorageSync(`habits_${ymd}`)
      wx.removeStorageSync('stats_week')
      wx.removeStorageSync('stats_month')
      wx.removeStorageSync('stats_year')

      // 设置统计页面刷新标记
      const app = getApp()
      if (app.globalData) {
        app.globalData.statsNeedRefresh = true
      }

      // 局部更新：只更新当前习惯的状态
      this.updateHabitCheckinStatus(habitId, true)
    } catch (err) {
      console.error('打卡失败', err)
      wx.showToast({
        title: err.message || '打卡失败',
        icon: 'none'
      })
    }
  },

  // 取消打卡
  async onUncheckin(e) {
    const { habitId } = e.currentTarget.dataset
    const ymd = toYMD(this.data.currentDate)

    // 检查是否是将来的日期
    if (this.data.currentDate > new Date()) {
      wx.showToast({
        title: '不能操作将来的任务',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '取消打卡',
      content: '确定要取消打卡吗?',
      success: async (res) => {
        if (res.confirm) {
          try {
            await wx.cloud.callFunction({
              name: 'checkin',
              data: { action: 'uncheckin', data: { habitId, ymd } }
            })

            wx.showToast({ title: '已取消' })

            // 清除缓存
            wx.removeStorageSync(`habits_${ymd}`)
            wx.removeStorageSync('stats_week')
            wx.removeStorageSync('stats_month')
            wx.removeStorageSync('stats_year')

            // 设置统计页面刷新标记
            const app = getApp()
            if (app.globalData) {
              app.globalData.statsNeedRefresh = true
            }

            // 局部更新：只更新当前习惯的状态
            this.updateHabitCheckinStatus(habitId, false)
          } catch (err) {
            console.error('取消打卡失败', err)
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 跳过今日
  async onSkip(e) {
    const { habitId } = e.currentTarget.dataset
    const ymd = toYMD(this.data.currentDate)

    wx.showModal({
      title: '跳过今日',
      content: '确定要跳过今天的打卡吗?跳过不影响连续打卡统计',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中' })

            await wx.cloud.callFunction({
              name: 'checkin',
              data: { action: 'skip', data: { habitId } }
            })

            wx.hideLoading()
            wx.showToast({ title: '已跳过' })

            // 清除缓存
            wx.removeStorageSync(`habits_${ymd}`)
            wx.removeStorageSync('stats_week')
            wx.removeStorageSync('stats_month')
            wx.removeStorageSync('stats_year')

            this.loadData(true) // 跳过后强制刷新
          } catch (err) {
            console.error('跳过失败', err)
            wx.hideLoading()
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 折叠/展开分类
  onToggleCategory(e) {
    const { categoryId } = e.currentTarget.dataset
    const categoryGroups = this.data.categoryGroups.map(g => {
      if (g._id === categoryId) {
        g.expanded = !g.expanded
      }
      return g
    })

    this.setData({ categoryGroups })
  },

  // 编辑习惯
  onEditHabit(e) {
    const { habitId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/habit-form/habit-form?id=${habitId}`
    })
  },

  // 删除习惯
  onDeleteHabit(e) {
    const { habitId } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个习惯吗？删除后将无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中' })
            await wx.cloud.callFunction({
              name: 'habit',
              data: {
                action: 'delete',
                data: { habitId }
              }
            })
            wx.hideLoading()
            wx.showToast({ title: '删除成功' })

            // 清除缓存
            const ymd = toYMD(this.data.currentDate)
            wx.removeStorageSync(`habits_${ymd}`)
            wx.removeStorageSync('stats_week')
            wx.removeStorageSync('stats_month')
            wx.removeStorageSync('stats_year')

            this.loadData(true)
            this.loadCheckinDates()
          } catch (err) {
            console.error('删除失败', err)
            wx.hideLoading()
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 局部更新习惯打卡状态
  updateHabitCheckinStatus(habitId, isChecked) {
    const ymd = toYMD(this.data.currentDate)
    const now = new Date().toTimeString().slice(0, 8)

    // 更新时间模式数据
    let timeHabits = this.data.timeHabits.map(h => {
      if (h._id === habitId) {
        return {
          ...h,
          checked: isChecked,
          checkinTime: isChecked ? now : null,
          totalCheckins: isChecked ? (h.totalCheckins || 0) + 1 : Math.max(0, (h.totalCheckins || 0) - 1)
        }
      }
      return h
    })

    // 更新分类模式数据
    let categoryGroups = this.data.categoryGroups.map(group => ({
      ...group,
      habits: group.habits.map(h => {
        if (h._id === habitId) {
          return {
            ...h,
            checked: isChecked,
            checkinTime: isChecked ? now : null,
            totalCheckins: isChecked ? (h.totalCheckins || 0) + 1 : Math.max(0, (h.totalCheckins || 0) - 1)
          }
        }
        return h
      })
    }))

    // 更新分类的已完成数
    categoryGroups = categoryGroups.map(group => {
      const completed = group.habits.filter(h => h.checked).length
      return { ...group, completed }
    })

    // 更新今日统计
    const total = timeHabits.length
    const completed = timeHabits.filter(h => h.checked).length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0

    this.setData({
      timeHabits,
      categoryGroups,
      todayStats: {
        total,
        completed,
        rate
      }
    })

    // 更新习惯打卡日期缓存
    const cache = this.data.habitCheckinCache
    if (cache[habitId]) {
      const newDates = isChecked
        ? [...cache[habitId], ymd]
        : cache[habitId].filter(d => d !== ymd)
      this.setData({
        habitCheckinCache: { ...cache, [habitId]: newDates }
      })
    }
  },

  // 添加习惯
  onAddHabit() {
    wx.navigateTo({
      url: '/pages/habit-form/habit-form'
    })
  },

  // 分类管理
  onManageCategories() {
    wx.navigateTo({
      url: '/pages/category-manage/category-manage'
    })
  }
})
