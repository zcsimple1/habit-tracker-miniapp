Page({
  data: {
    // 数据库状态
    status: {
      users: { status: 'checking', count: 0 },
      categories: { status: 'checking', count: 0 },
      habits: { status: 'checking', count: 0 },
      checkins: { status: 'checking', count: 0 },
      todos: { status: 'checking', count: 0 }
    },
    
    // 初始化结果
    initResult: null,
    presetCategoriesResult: null,
    
    // 加载状态
    loading: false,
    checking: false,
    initializing: false
  },

  onLoad() {
    this.checkDatabaseStatus()
  },

  // 检查数据库状态
  async checkDatabaseStatus() {
    this.setData({ checking: true, initResult: null, presetCategoriesResult: null })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'initDB',
        data: { action: 'getStatus' }
      })

      if (result && result.data) {
        const statusMap = {}
        result.data.collections.forEach(coll => {
          statusMap[coll.name] = {
            status: coll.status === 'exists' ? 'ready' : 'not_ready',
            count: coll.count
          }
        })

        this.setData({
          status: statusMap,
          checking: false
        })
      }
    } catch (err) {
      console.error('检查数据库状态失败', err)
      this.setData({ checking: false })

      wx.showToast({
        title: '请先部署 initDB 云函数',
        icon: 'none'
      })
    }
  },

  // 初始化数据库
  async onInitDatabase() {
    wx.showModal({
      title: '确认初始化',
      content: '初始化将：\n1. 创建用户记录\n2. 添加预设分类\n\n确定要继续吗？',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ initializing: true })

          try {
            wx.showLoading({ title: '初始化中...' })

            const { result } = await wx.cloud.callFunction({
              name: 'initDB',
              data: { action: 'init' }
            })

            wx.hideLoading()
            this.setData({
              initResult: result.data,
              initializing: false
            })

            wx.showModal({
              title: '初始化完成',
              content: `✅ 用户记录已创建\n✅ 添加了 ${result.data.presetData.filter(d => d.type === 'category').length} 个预设分类`,
              showCancel: false,
              success: () => {
                this.checkDatabaseStatus()
              }
            })
          } catch (err) {
            console.error('初始化数据库失败', err)
            wx.hideLoading()
            this.setData({ initializing: false })

            wx.showModal({
              title: '初始化失败',
              content: err.message || '未知错误',
              showCancel: false
            })
          }
        }
      }
    })
  },

  // 添加预设分类
  async onAddPresetCategories() {
    wx.showModal({
      title: '确认添加',
      content: '将添加 9 个预设分类到你的数据库中',
      success: async (res) => {
        if (res.confirm) {
          this.setData({ initializing: true })

          try {
            wx.showLoading({ title: '添加中...' })

            const { result } = await wx.cloud.callFunction({
              name: 'initDB',
              data: { action: 'addPresetCategories' }
            })

            wx.hideLoading()
            this.setData({
              presetCategoriesResult: result.data,
              initializing: false
            })

            const created = result.data.filter(r => r.status === 'created').length
            const skipped = result.data.filter(r => r.status === 'skipped').length

            wx.showModal({
              title: '添加完成',
              content: `✅ 成功添加 ${created} 个\n⏭️ 跳过 ${skipped} 个（已存在）`,
              showCancel: false,
              success: () => {
                this.checkDatabaseStatus()
              }
            })
          } catch (err) {
            console.error('添加预设分类失败', err)
            wx.hideLoading()
            this.setData({ initializing: false })

            wx.showModal({
              title: '添加失败',
              content: err.message || '未知错误',
              showCancel: false
            })
          }
        }
      }
    })
  },

  // 刷新状态
  onRefresh() {
    this.checkDatabaseStatus()
  }
})
