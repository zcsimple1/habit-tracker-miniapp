Page({
  data: {
    inputValue: '',
    todos: []
  },

  onLoad() {
    this.loadTodos()
  },

  async loadTodos() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'todos',
        data: { action: 'list' }
      })
      this.setData({ todos: result || [] })
    } catch (err) {
      console.error('加载待办失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value })
  },

  async onAdd() {
    const title = this.data.inputValue.trim()
    if (!title) return

    try {
      wx.showLoading({ title: '添加中' })
      await wx.cloud.callFunction({
        name: 'todos',
        data: { action: 'create', title }
      })
      this.setData({ inputValue: '' })
      await this.loadTodos()
      wx.hideLoading()
      wx.showToast({ title: '添加成功' })
    } catch (err) {
      wx.hideLoading()
      console.error('添加待办失败', err)
      wx.showToast({
        title: '添加失败',
        icon: 'none'
      })
    }
  },

  async onToggle(e) {
    const id = e.currentTarget.dataset.id
    const todo = this.data.todos.find(t => t._id === id)
    if (!todo) return

    try {
      await wx.cloud.callFunction({
        name: 'todos',
        data: { action: 'update', id, completed: !todo.completed }
      })
      await this.loadTodos()
    } catch (err) {
      console.error('更新状态失败', err)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    }
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个待办吗?',
      success: async (res) => {
        if (res.confirm) {
          try {
            await wx.cloud.callFunction({
              name: 'todos',
              data: { action: 'delete', id }
            })
            await this.loadTodos()
            wx.showToast({ title: '删除成功' })
          } catch (err) {
            console.error('删除失败', err)
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})
