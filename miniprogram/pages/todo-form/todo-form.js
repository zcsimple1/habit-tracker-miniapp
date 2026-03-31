const { PRESET_CATEGORIES } = require('../../utils/preset-categories')

Page({
  data: {
    todoId: null,
    title: '',
    description: '',
    priority: 'normal',
    important: false,
    categoryId: '',
    categoryName: '无分类',
    categories: [],
    dueDate: '',
    dueTime: '',
    loading: false
  },

  onLoad(options) {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    this.setData({ dueDate: `${year}-${month}-${day}` })

    if (options.id) {
      this.setData({ todoId: options.id })
      this.loadTodo(options.id)
    }

    this.loadCategories()
  },

  // 加载待办详情
  async loadTodo(todoId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'todos',
        data: { action: 'get', data: { todoId } }
      })

      if (result && result.data) {
        const todo = result.data
        this.setData({
          title: todo.title || '',
          description: todo.description || '',
          priority: todo.priority || 'normal',
          important: todo.important || false,
          categoryId: todo.categoryId || '',
          dueDate: todo.dueDate || this.data.dueDate,
          dueTime: todo.dueTime || ''
        })
        this.updateCategoryInfo(todo.categoryId || '')
      }
    } catch (err) {
      console.error('加载待办失败', err)
    }
  },

  // 加载分类列表
  async loadCategories() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'category',
        data: { action: 'list' }
      })

      const customCategories = result.data || []
      const allCategories = [
        { _id: '', name: '无分类', icon: '📌', color: '#f3f4f6' },
        ...PRESET_CATEGORIES.map(cat => ({ ...cat, _id: cat.id, isPreset: true })),
        ...customCategories
      ]

      this.setData({ categories: allCategories })
      this.updateCategoryInfo(this.data.categoryId)
    } catch (err) {
      console.error('加载分类失败', err)
    }
  },

  // 更新分类信息
  updateCategoryInfo(categoryId) {
    const categories = this.data.categories || []
    const category = categories.find(c => c._id === categoryId)

    this.setData({
      categoryName: category ? `${category.icon} ${category.name}` : '无分类'
    })
  },

  // 取消
  onCancel() {
    wx.navigateBack()
  },

  // 保存
  async onSave() {
    if (!this.data.title.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      })
      return
    }

    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      wx.showLoading({ title: '保存中' })

      const data = {
        title: this.data.title.trim(),
        description: this.data.description.trim(),
        priority: this.data.priority,
        important: this.data.important,
        categoryId: this.data.categoryId || null,
        dueDate: this.data.dueDate || null,
        dueTime: this.data.dueTime || null
      }

      if (this.data.todoId) {
        // 更新
        await wx.cloud.callFunction({
          name: 'todos',
          data: {
            action: 'update',
            data: {
              todoId: this.data.todoId,
              ...data
            }
          }
        })
      } else {
        // 创建
        await wx.cloud.callFunction({
          name: 'todos',
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
  },

  // 标题输入
  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  // 描述输入
  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  // 优先级选择
  onPriorityTap(e) {
    const priority = e.currentTarget.dataset.priority
    this.setData({ priority })
  },

  // 重要标记切换
  onImportantToggle() {
    this.setData({ important: !this.data.important })
  },

  // 分类选择
  onCategoryTap() {
    const categories = this.data.categories.map(c => c.name)
    wx.showActionSheet({
      itemList: categories,
      success: (res) => {
        const category = this.data.categories[res.tapIndex]
        this.setData({
          categoryId: category._id,
          categoryName: `${category.icon} ${category.name}`
        })
      }
    })
  },

  // 截止日期选择
  onDueDateChange(e) {
    this.setData({ dueDate: e.detail.value })
  },

  // 截止时间选择
  onDueTimeChange(e) {
    this.setData({ dueTime: e.detail.value })
  }
})
