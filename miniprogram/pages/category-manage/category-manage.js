const { PRESET_CATEGORIES } = require('../../utils/preset-categories.js')

Page({
  data: {
    presetCategories: [],
    customCategories: [],
    loading: false,
    lastLoadTime: 0,  // 上次加载时间
    cacheDuration: 5 * 60 * 1000  // 缓存5分钟
  },

  onLoad() {
    this.initCategories()
  },

  onShow() {
    // 检查是否需要刷新
    const now = Date.now()
    const timeSinceLastLoad = now - this.data.lastLoadTime

    // 如果距离上次加载超过缓存时间，或者没有数据，则重新加载
    if (timeSinceLastLoad > this.data.cacheDuration || this.data.customCategories.length === 0) {
      this.loadCustomCategories()
    }
  },

  // 初始化分类列表
  initCategories() {
    this.setData({ presetCategories: PRESET_CATEGORIES })
    this.loadCustomCategories()
  },

  // 加载自定义分类
  async loadCustomCategories() {
    this.setData({ loading: true })

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'category',
        data: { action: 'list' }
      })

      this.setData({
        customCategories: result.data || [],
        loading: false,
        lastLoadTime: Date.now()  // 更新加载时间
      })
    } catch (err) {
      console.error('加载分类失败', err)
      this.setData({ loading: false })

      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 完成按钮
  onFinish() {
    wx.navigateBack()
  },

  // 添加分类
  onAddCategory() {
    wx.navigateTo({
      url: '/pages/category-form/category-form'
    })
    // 设置刷新标记，从分类表单返回时会刷新数据
    this.setData({ needRefresh: true })
  },

  // 编辑分类
  onEditCategory(e) {
    const { categoryId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/category-form/category-form?id=${categoryId}`
    })
  },

  // 删除分类
  onDeleteCategory(e) {
    const { categoryId } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个分类吗?如果该分类下还有习惯,将无法删除。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中' })

            await wx.cloud.callFunction({
              name: 'category',
              data: { action: 'delete', data: { categoryId } }
            })

            wx.hideLoading()
            wx.showToast({ title: '删除成功' })
            this.loadCustomCategories()
          } catch (err) {
            console.error('删除失败', err)
            wx.hideLoading()
            wx.showToast({
              title: err.message || '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})
