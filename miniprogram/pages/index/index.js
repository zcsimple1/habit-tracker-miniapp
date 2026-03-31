const { toYMD } = require('../../utils/date')
const { getAllCategories, getCategoryIcon, getCategoryColor } = require('../../utils/preset-categories.js')

Page({
  data: {
    // 日期选择
    currentDate: new Date(),
    displayDate: '',
    displayWeekday: '',
    isToday: true,

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
    loading: false
  },

  onLoad() {
    // 确保 currentDate 是 Date 对象
    if (!(this.data.currentDate instanceof Date)) {
      this.setData({ currentDate: new Date() })
    }
    this.loadUserPreferences()
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
    let date = this.data.currentDate
    const today = new Date()

    // 确保 date 是 Date 对象
    if (!(date instanceof Date)) {
      date = new Date(date)
      this.setData({ currentDate: date })
    }

    const todayYMD = toYMD(today)
    const currentYMD = toYMD(date)

    // 判断是否为今天
    const isToday = todayYMD === currentYMD

    // 格式化日期
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]

    this.setData({
      displayDate: `${year}年${month}月${day}日`,
      displayWeekday: `星期${weekday}`,
      isToday
    })
  },

  // 切换日期
  onChangeDate(e) {
    const { delta } = e.currentTarget.dataset
    const newDate = new Date(this.data.currentDate)
    newDate.setDate(newDate.getDate() + delta)

    this.setData({ currentDate: newDate })
    this.updateDateDisplay()
    this.loadData()
  },

  // 选择日期
  onChooseDate() {
    const currentDate = this.data.currentDate
    const today = new Date()

    wx.showActionSheet({
      itemList: ['今天', '昨天', '前天', '选择日期'],
      success: (res) => {
        let selectedDate

        switch (res.tapIndex) {
          case 0: // 今天
            selectedDate = new Date()
            break
          case 1: // 昨天
            selectedDate = new Date()
            selectedDate.setDate(today.getDate() - 1)
            break
          case 2: // 前天
            selectedDate = new Date()
            selectedDate.setDate(today.getDate() - 2)
            break
          case 3: // 选择日期
            wx.showModal({
              title: '提示',
              content: '日期选择功能开发中，请使用左右箭头切换日期',
              showCancel: false
            })
            return
        }

        this.setData({ currentDate: selectedDate })
        this.updateDateDisplay()
        this.loadData()
      }
    })
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
