const { PRESET_COUNTDOWNS } = require('../../utils/preset-countdowns')

Page({
  data: {
    countdowns: [],
    loading: true
  },

  onLoad() {
    this.loadCountdowns()
  },

  onShow() {
    // 从详情页返回时刷新
    const app = getApp()
    if (app.globalData.countdownNeedRefresh) {
      app.globalData.countdownNeedRefresh = false
      this.loadCountdowns()
    }
  },

  async loadCountdowns() {
    this.setData({ loading: true })

    try {
      // TODO: 调用云函数获取倒计时列表
      const { result } = await wx.cloud.callFunction({
        name: 'countdown',
        data: { action: 'list' }
      })

      const countdowns = (result.data || []).map(item => {
        return this.calculateCountdown(item)
      })

      this.setData({
        countdowns,
        loading: false
      })
    } catch (err) {
      console.error('加载失败', err)
      this.setData({ loading: false })

      // 使用预设倒计时作为示例
      this.setData({
        countdowns: PRESET_COUNTDOWNS.map(item => this.calculateCountdown(item)),
        loading: false
      })
    }
  },

  calculateCountdown(item) {
    const now = new Date()
    const target = new Date(item.targetDate)
    const diff = target - now

    const totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24))
    const remainingMonths = Math.floor(totalDays / 30)
    const remainingWeeks = Math.floor(totalDays / 7)

    // 计算进度
    const startDate = new Date(item.startDate || now)
    const totalDuration = target - startDate
    const elapsed = now - startDate
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))

    return {
      ...item,
      remainingDays: totalDays > 0 ? totalDays : 0,
      remainingMonths,
      remainingWeeks,
      progress: progress.toFixed(1),
      taskCount: item.taskCount || 0,
      diaryCount: item.diaryCount || 0
    }
  },

  onAddCountdown() {
    wx.navigateTo({
      url: '/pages/countdown-form/countdown-form'
    })
  },

  onViewCountdown(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/countdown/countdown?id=${id}`
    })
  }
})
