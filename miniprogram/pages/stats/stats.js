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
    showEndDatePicker: false,

    // 缓存键
    cacheKey: '',

    // 刷新标记
    needRefresh: false
  },

  onLoad() {
    this.loadStats(true) // 首次加载强制刷新
  },

  onShow() {
    // 检查全局刷新标记
    const app = getApp()
    if (app.globalData && app.globalData.statsNeedRefresh) {
      console.log('[stats] 检测到全局刷新标记')
      app.globalData.statsNeedRefresh = false
      this.loadStats(true)
      return
    }

    // 检查是否需要刷新
    if (this.data.needRefresh) {
      this.loadStats(true)
      return
    }

    // 根据日期范围设置不同的缓存时间
    const cacheKey = `stats_${this.data.dateRange}`
    const cachedData = wx.getStorageSync(cacheKey)

    if (cachedData) {
      const now = Date.now()
      const cacheTime = cachedData.timestamp || 0

      // 今日数据：短缓存（1分钟），因为可能频繁变化
      // 周数据：中等缓存（30分钟）
      // 月数据：长缓存（2小时）
      // 年数据：很长缓存（1天）
      let cacheDuration = 0
      switch (this.data.dateRange) {
        case 'week':
          cacheDuration = 30 * 60 * 1000 // 30分钟
          break
        case 'month':
          cacheDuration = 2 * 60 * 60 * 1000 // 2小时
          break
        case 'year':
          cacheDuration = 24 * 60 * 60 * 1000 // 1天
          break
        case 'custom':
          cacheDuration = 2 * 60 * 60 * 1000 // 2小时
          break
        default:
          cacheDuration = 60 * 1000 // 1分钟（默认今日）
      }

      if (now - cacheTime < cacheDuration) {
        console.log('[stats] 从缓存加载:', cacheKey, '缓存时间:', cacheDuration / 1000, '秒')
        this.setData({
          overview: cachedData.overview,
          categoryStats: cachedData.categoryStats,
          ranking: cachedData.ranking,
          loading: false
        })
        return
      }
    }

    // 缓存过期或无缓存，重新加载
    this.loadStats(true)
  },

  // 加载统计数据
  async loadStats(forceRefresh = false) {
    const cacheKey = `stats_${this.data.dateRange}`

    // 检查缓存
    if (!forceRefresh) {
      const cachedData = wx.getStorageSync(cacheKey)
      if (cachedData) {
        console.log('[stats] 从缓存加载:', cacheKey)
        this.setData({
          overview: cachedData.overview,
          categoryStats: cachedData.categoryStats,
          ranking: cachedData.ranking,
          loading: false
        })
        return
      }
    }

    this.setData({ loading: true })

    try {
      // 获取总体统计
      const { result: overviewResult } = await wx.cloud.callFunction({
        name: 'stats',
        data: {
          action: 'getOverview',
          data: {
            range: this.data.dateRange
          }
        }
      })

      // 获取分类统计
      const { result: categoryResult } = await wx.cloud.callFunction({
        name: 'stats',
        data: {
          action: 'getCategoryStats',
          data: {
            range: this.data.dateRange
          }
        }
      })

      // 获取排行榜
      const { result: rankingResult } = await wx.cloud.callFunction({
        name: 'stats',
        data: {
          action: 'getRanking',
          data: {
            range: this.data.dateRange
          }
        }
      })

      // 转换数据格式
      const overviewData = overviewResult.data || {}
      const overview = {
        totalHabits: overviewData.totalHabits || 0,
        todayCompleted: overviewData.today?.completed || 0,
        todayTotal: overviewData.today?.total || 0,
        todayRate: overviewData.today?.rate || 0,
        monthCompleted: overviewData.range?.completed || 0,
        monthRate: overviewData.range?.rate || 0,
        currentStreak: overviewData.overall?.currentStreak || 0,
        longestStreak: overviewData.overall?.longestStreak || 0,
        activeDays: overviewData.range?.activeDays || 0
      }

      const categoryStats = categoryResult.data?.habits || []
      const ranking = rankingResult.data?.ranking || []

      this.setData({
        overview,
        categoryStats,
        ranking,
        loading: false,
        needRefresh: false // 清除刷新标记
      })

      // 保存到缓存（包含时间戳）
      wx.setStorageSync(cacheKey, {
        overview,
        categoryStats,
        ranking,
        timestamp: Date.now()
      })
      console.log('[stats] 数据已缓存:', cacheKey)
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
    this.loadStats(true) // 切换范围时强制刷新
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
      this.loadStats(true)
    }
  },

  // 查看习惯详情
  onViewHabit(e) {
    const { habitId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/habit-detail/habit-detail?id=${habitId}`
    })
  }
})
