Page({
  data: {
    categoryId: null,
    name: '',
    icon: '',
    color: '#667eea',
    icons: ['📌', '🏢', '💼', '❤️', '📚', '🏠', '👶', '💰', '⭐', '💬', '🎯', '🎮', '🎨', '🎵', '🏃', '🍎', '☕', '🎁'],
    colors: ['#667eea', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'],
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ categoryId: options.id })
      this.loadCategory(options.id)
    }
  },

  // 加载分类详情
  async loadCategory(categoryId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'category',
        data: { action: 'get', data: { categoryId } }
      })

      if (result && result.data) {
        const category = result.data
        this.setData({
          name: category.name || '',
          icon: category.icon || '',
          color: category.color || '#667eea'
        })
      }
    } catch (err) {
      console.error('加载分类失败', err)
    }
  },

  // 名称输入
  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  // 图标选择
  onIconSelect(e) {
    this.setData({ icon: e.currentTarget.dataset.icon })
  },

  // 颜色选择
  onColorSelect(e) {
    this.setData({ color: e.currentTarget.dataset.color })
  },

  // 保存
  async onSave() {
    if (!this.data.name.trim()) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      })
      return
    }

    if (!this.data.icon) {
      wx.showToast({
        title: '请选择图标',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      wx.showLoading({ title: '保存中' })

      const data = {
        name: this.data.name.trim(),
        icon: this.data.icon,
        color: this.data.color
      }

      if (this.data.categoryId) {
        // 更新
        await wx.cloud.callFunction({
          name: 'category',
          data: {
            action: 'update',
            data: {
              categoryId: this.data.categoryId,
              ...data
            }
          }
        })
      } else {
        // 创建
        await wx.cloud.callFunction({
          name: 'category',
          data: {
            action: 'create',
            data
          }
        })
      }

      wx.hideLoading()
      wx.showToast({ title: '保存成功' })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      console.error('保存失败', err)
      wx.hideLoading()
      this.setData({ loading: false })

      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  }
})
