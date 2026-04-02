const { toYMD } = require('../../utils/date')

Page({
  data: {
    // 日期范围
    dateRange: 'month',

    // 总体统计
    overview: {
      totalHabits: 0,
      todosCompleted: 0,
      rangeCompleted: 0,
      rangeTotal: 0,
      rangeRate: 0,
      activeDays: 0,
      totalCheckins: 0,
      currentStreak: 0,
      longestStreak: 0
    },

    // 分类统计
    categoryStats: [],

    // 排行
    ranking: [],

    // 加载状态
    loading: false,

    // 刷新标记
    needRefresh: false
  },

  onLoad() {
    this.loadStats(true)
  },

  onShow() {
    // 检查全局刷新标记
    const app = getApp()
    if (app.globalData && app.globalData.statsNeedRefresh) {
      app.globalData.statsNeedRefresh = false
      this.loadStats(true)
      return
    }

    // 检查本地刷新标记
    if (this.data.needRefresh) {
      this.loadStats(true)
      this.setData({ needRefresh: false })
      return
    }

    // 检查缓存
    const cacheKey = `stats_${this.data.dateRange}`
    const cachedData = wx.getStorageSync(cacheKey)
    if (cachedData && Date.now() - cachedData.timestamp < 60000) {
      this.setData({
        overview: cachedData.overview,
        categoryStats: cachedData.categoryStats,
        ranking: cachedData.ranking
      })
      return
    }

    this.loadStats(false)
  },

  // 切换日期范围
  onDateRangeChange(e) {
    const range = e.currentTarget.dataset.range
    this.setData({ dateRange: range })
    this.loadStats(true)
  },

  // 加载统计数据
  async loadStats(forceRefresh = false) {
    const cacheKey = `stats_${this.data.dateRange}`

    // 强制刷新时清除缓存
    if (forceRefresh) {
      wx.removeStorageSync(cacheKey)
    } else {
      const cachedData = wx.getStorageSync(cacheKey)
      if (cachedData && Date.now() - cachedData.timestamp < 60000) {
        this.setData({
          overview: cachedData.overview,
          categoryStats: cachedData.categoryStats,
          ranking: cachedData.ranking
        })
        return
      }
    }

    this.setData({ loading: true })

    try {
      // 并行获取所有数据
      const [overviewResult, categoryResult, rankingResult] = await Promise.all([
        wx.cloud.callFunction({ name: 'stats', data: { action: 'getOverview', data: { range: this.data.dateRange } } }),
        wx.cloud.callFunction({ name: 'stats', data: { action: 'getCategoryStats', data: { range: this.data.dateRange } } }),
        wx.cloud.callFunction({ name: 'stats', data: { action: 'getRanking', data: { range: this.data.dateRange } } })
      ])

      const overview = overviewResult.result?.data || {}
      const categoryStats = categoryResult.result?.data || []
      const ranking = rankingResult.result?.data || []

      this.setData({
        overview: {
          totalHabits: overview.totalHabits || 0,
          todosCompleted: overview.todosCompleted || 0,
          rangeCompleted: overview.rangeCompleted || 0,
          rangeTotal: overview.rangeTotal || 0,
          rangeRate: overview.rangeRate || 0,
          activeDays: overview.activeDays || 0,
          totalCheckins: overview.totalCheckins || 0,
          currentStreak: overview.currentStreak || 0,
          longestStreak: overview.longestStreak || 0
        },
        categoryStats,
        ranking,
        loading: false
      })

      // 缓存结果
      wx.setStorageSync(cacheKey, {
        overview: this.data.overview,
        categoryStats,
        ranking,
        timestamp: Date.now()
      })
    } catch (err) {
      console.error('加载统计数据失败', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  }
})
