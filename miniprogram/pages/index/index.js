const { toYMD } = require('../../utils/date')
const { getAllCategories, getCategoryIcon, getCategoryColor } = require('../../utils/preset-categories.js')

Page({
  data: {
    // 日期选择
    currentDate: new Date(),
    selectedDate: new Date(),

    // 视图模式: category | time
    viewMode: 'category',

    // 显示已完成
    showCompleted: false,

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
    checkinDates: []
  },

  onLoad() {
    // 强制使用当前时间
    const now = new Date()
    this.setData({
      currentDate: now,
      selectedDate: now,
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth()
    })
    this.loadUserPreferences()
    this.loadCheckinDates()
    this.updateDateDisplay()
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  // 加载用户偏好设置
  async loadUserPreferences() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'getProfile' }
      })

      if (result && result.data && result.data.preferences) {
        const { viewMode, showCompleted } = result.data.preferences
        this.setData({
          viewMode: viewMode || 'category',
          showCompleted: showCompleted || false,
          eyeIcon: showCompleted ? '👁' : '👁'
        })
      }
    } catch (err) {
      console.warn('加载用户偏好失败', err)
    }
  },

  // 更新日期显示
  updateDateDisplay() {
    // 由date-picker组件自动处理
  },

  // 切换日期
  onChangeDate(e) {
    const { delta } = e.detail
    const newDate = new Date(this.data.currentDate)
    newDate.setDate(newDate.getDate() + delta)

    this.setData({ currentDate: newDate })
    this.updateCalendarDate()
    this.loadData()
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
    this.updateDateDisplay()
    this.loadData()
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

  // 切换显示已完成
  toggleShowCompleted() {
    const showCompleted = !this.data.showCompleted
    this.setData({
      showCompleted
    })

    this.saveUserPreferences()
  },

  // 保存用户偏好
  async saveUserPreferences() {
    try {
      await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'updatePreferences',
          data: {
            viewMode: this.data.viewMode,
            showCompleted: this.data.showCompleted
          }
        }
      })
    } catch (err) {
      console.warn('保存用户偏好失败', err)
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

      const checkinDates = result.data || []
      this.setData({ checkinDates })
    } catch (err) {
      console.error('加载打卡日期失败', err)
    }
  },

  // 关闭日历
  onCloseCalendar() {
    this.setData({ showCalendar: false })
  },

  // 更新日历年月
  updateCalendarDate() {
    const { currentDate } = this.data
    this.setData({
      calendarYear: currentDate.getFullYear(),
      calendarMonth: currentDate.getMonth()
    })
  },

  // 加载数据
  async loadData() {
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

      // 为每个习惯添加打卡状态
      habits.forEach(h => {
        const checkin = checkinMap[h._id]
        h.checked = !!checkin && !checkin.skipped
        h.skipped = !!checkin && checkin.skipped
        h.checkinTime = checkin ? checkin.time : null

        // 关联分类信息
        const category = categories.find(c => (c.isPreset && c.id === h.categoryId) || (!c.isPreset && c._id === h.categoryId))
        h.categoryName = category ? category.name : '未分类'
        h.categoryColor = category ? category.color : '#999'
        h.categoryIcon = category ? category.icon : '📌'
      })

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

    try {
      wx.showLoading({ title: '打卡中' })

      await wx.cloud.callFunction({
        name: 'checkin',
        data: { action: 'checkin', data: { habitId } }
      })

      wx.hideLoading()
      wx.showToast({ title: '打卡成功' })
      this.loadData()
    } catch (err) {
      console.error('打卡失败', err)
      wx.hideLoading()
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

    wx.showModal({
      title: '取消打卡',
      content: '确定要取消今天的打卡吗?',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '取消中' })

            await wx.cloud.callFunction({
              name: 'checkin',
              data: { action: 'uncheckin', data: { habitId, ymd } }
            })

            wx.hideLoading()
            wx.showToast({ title: '已取消' })
            this.loadData()
          } catch (err) {
            console.error('取消打卡失败', err)
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

  // 跳过今日
  async onSkip(e) {
    const { habitId } = e.currentTarget.dataset

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
            this.loadData()
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
