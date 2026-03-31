const { toYMD } = require('../../utils/date')

Page({
  data: {
    // 日期范围选择
    dateRange: 'month', // week | month | year | custom
    customStartDate: '',
    customEndDate: '',

    // 总体统计
    overview: {
      totalHabits: 0,
      todayCompleted: 0,
      todayTotal: 0,
      todayRate: 0,
      monthCompleted: 0,
      monthRate: 0,
      currentStreak: 0,
      longestStreak: 0,
      activeDays: 0
    },

    // 分类统计
    categoryStats: [],

    // 完成率排行
    ranking: [],

    // 加载状态
    loading: false,

    // 日期选择器
    showStartDatePicker: false,
    showEndDatePicker: false
  },

  onLoad() {
    this.loadStats()
  },

  onShow() {
    this.loadStats()
  },

  // 加载统计数据
  async loadStats() {
    this.setData({ loading: true })

    try {
      // 获取总体统计
      const { result: overviewResult } = await wx.cloud.callFunction({
        name: 'stats',
        data: {
          action: 'getOverview',
          data: {
            dateRange: this.data.dateRange
          }
        }
      })

      // 获取分类统计
      const { result: categoryResult } = await wx.cloud.callFunction({
        name: 'stats',
        data: {
          action: 'getCategoryStats',
          data: {
            dateRange: this.data.dateRange
          }
        }
      })

      // 获取排行榜
      const { result: rankingResult } = await wx.cloud.callFunction({
        name: 'stats',
        data: {
          action: 'getRanking',
          data: {
            dateRange: this.data.dateRange
          }
        }
      })

      this.setData({
        overview: overviewResult.data || {},
        categoryStats: categoryResult.data || [],
        ranking: rankingResult.data || [],
        loading: false
      })
    } catch (err) {
      console.error('加载统计数据失败', err)
      this.setData({ loading: false })

      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 切换日期范围
  onDateRangeChange(e) {
    const ranges = ['week', 'month', 'year', 'custom']
    const range = ranges[e.detail.value]

    this.setData({ dateRange: range })
    this.loadStats()
  },

  // 自定义开始日期
  onCustomStartDateChange(e) {
    this.setData({ customStartDate: e.detail.value })
  },

  // 自定义结束日期
  onCustomEndDateChange(e) {
    this.setData({ customEndDate: e.detail.value })

    // 如果两个日期都选了，重新加载
    if (this.data.customStartDate && this.data.customEndDate) {
      this.loadStats()
    }
  },

  // 查看习惯详情
  onViewHabit(e) {
    const { habitId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/habit-detail/habit-detail?id=${habitId}`
    })
  },

  // 分享
  onShare() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    })
  }
})
