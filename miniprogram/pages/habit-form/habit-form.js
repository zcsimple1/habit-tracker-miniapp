const { getAllCategories } = require('../../utils/preset-categories.js')

Page({
  data: {
    habitId: null,
    name: '',
    description: '',
    categoryId: '',
    categories: [],
    categoryIndex: 0,
    categoryName: '选择分类',

    // 时间规则
    timeRule: {
      type: 'daily',           // daily | weekdays | weekend | weekly | custom
      weekDays: [],             // weekly 模式使用 [1,3,5]
      customDates: [],          // custom 模式使用
      fixedTime: '',            // 固定时间 HH:mm
      startDate: '',             // 开始日期
      endDate: ''               // 结束日期
    },
    timeRuleTypes: ['daily','weekdays','weekend','weekly','custom'],
    timeRuleTypeIndex: 0,
    timeRuleTypeText: '每日',

    // 重要标记
    important: false,

    // 显示控制
    showTimeInput: false,
    showDateInput: false,

    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ habitId: options.id })
      this.loadHabit(options.id)
    }

    this.loadCategories()
  },

  // 加载习惯详情
  async loadHabit(habitId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'habit',
        data: { action: 'get', data: { habitId } }
      })

      if (result && result.data) {
        const habit = result.data
        this.setData({
          name: habit.name || '',
          description: habit.description || '',
          categoryId: habit.categoryId || '',
          important: habit.important || false,
          timeRule: habit.timeRule || { type: 'daily' }
        })
        // 更新分类索引和名称
        this.updateCategoryInfo(habit.categoryId)
        // 更新时间规则类型索引和文本
        this.updateTimeRuleTypeInfo(habit.timeRule ? habit.timeRule.type : 'daily')
      }
    } catch (err) {
      console.error('加载习惯失败', err)
    }
  },

  // 加载分类列表
  async loadCategories() {
    try {
      // 获取用户自定义分类
      const { result } = await wx.cloud.callFunction({
        name: 'category',
        data: { action: 'list' }
      })

      const customCategories = result.data || []

      // 合并预设分类和自定义分类
      const allCategories = getAllCategories(customCategories)

      this.setData({
        categories: allCategories
      })

      // 如果有选中的分类，更新索引和名称
      if (this.data.categoryId) {
        this.updateCategoryInfo(this.data.categoryId)
      }
    } catch (err) {
      console.error('加载分类失败', err)
    }
  },

  // 更新分类索引和名称
  updateCategoryInfo(categoryId) {
    if (!categoryId) {
      this.setData({
        categoryIndex: 0,
        categoryName: '选择分类'
      })
      return
    }

    const categories = this.data.categories || []
    const index = categories.findIndex(c => c._id === categoryId)
    const category = categories[index]

    this.setData({
      categoryIndex: index >= 0 ? index : 0,
      categoryName: category ? category.name : '选择分类'
    })
  },

  // 更新时间规则类型索引和文本
  updateTimeRuleTypeInfo(type) {
    const types = this.data.timeRuleTypes
    const typeTexts = ['每日', '仅工作日', '仅周末', '每周指定日期', '自定义日期']
    const index = types.indexOf(type)

    this.setData({
      timeRuleTypeIndex: index >= 0 ? index : 0,
      timeRuleTypeText: typeTexts[index >= 0 ? index : 0]
    })
  },

  // 名称输入
  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  // 描述输入
  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  // 分类选择
  onCategoryChange(e) {
    const index = parseInt(e.detail.value)
    const categories = this.data.categories || []
    const category = categories[index]

    this.setData({
      categoryId: category ? category._id : '',
      categoryIndex: index,
      categoryName: category ? category.name : '选择分类'
    })
  },

  // 时间规则选择
  onTimeRuleTypeChange(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    const types = this.data.timeRuleTypes

    this.setData({
      'timeRule.type': types[index],
      timeRuleTypeIndex: index,
      'timeRule.weekDays': [],
      'timeRule.customDates': []
    })
  },

  // 切换时间输入显示
  onToggleTimeInput() {
    this.setData({ showTimeInput: !this.data.showTimeInput })
  },

  // 切换日期输入显示
  onToggleDateInput() {
    this.setData({ showDateInput: !this.data.showDateInput })
  },

  // 星期选择（weekly模式）
  onWeekDayToggle(e) {
    const { day } = e.currentTarget.dataset
    const weekDays = [...this.data.timeRule.weekDays]

    const index = weekDays.indexOf(day)
    if (index > -1) {
      weekDays.splice(index, 1)
    } else {
      weekDays.push(day)
    }

    this.setData({ 'timeRule.weekDays': weekDays })
  },

  // 固定时间选择
  onFixedTimeChange(e) {
    this.setData({ 'timeRule.fixedTime': e.detail.value })
  },

  // 时间选择器确认
  onTimePickerConfirm(e) {
    this.setData({ 'timeRule.fixedTime': e.detail.value })
  },

  // 重要标记切换
  onImportantToggle() {
    this.setData({ important: !this.data.important })
  },

  // 原有方法保持兼容
  onImportantChange(e) {
    this.setData({ important: e.detail.checked })
  },

  // 开始日期选择
  onStartDateChange(e) {
    this.setData({ 'timeRule.startDate': e.detail.value })
  },

  // 结束日期选择
  onEndDateChange(e) {
    this.setData({ 'timeRule.endDate': e.detail.value })
  },

  // 重要标记切换
  onImportantChange(e) {
    this.setData({ important: e.detail.checked })
  },

  // 保存
  // 取消
  onCancel() {
    wx.navigateBack()
  },

  // 重要标记切换（新方法）
  onImportantToggle() {
    this.setData({ important: !this.data.important })
  },

  async onSave() {
    if (!this.data.name.trim()) {
      wx.showToast({
        title: '请输入习惯名称',
        icon: 'none'
      })
      return
    }

    if (!this.data.categoryId) {
      wx.showToast({
        title: '请选择分类',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      wx.showLoading({ title: '保存中' })

      const data = {
        name: this.data.name.trim(),
        description: this.data.description.trim(),
        categoryId: this.data.categoryId || null,
        important: this.data.important,
        timeRule: {
          ...this.data.timeRule,
          weekDays: this.data.timeRule.weekDays.sort(),
          customDates: this.data.timeRule.customDates
        }
      }

      if (this.data.habitId) {
        // 更新
        await wx.cloud.callFunction({
          name: 'habit',
          data: {
            action: 'update',
            data: {
              habitId: this.data.habitId,
              ...data
            }
          }
        })
      } else {
        // 创建
        await wx.cloud.callFunction({
          name: 'habit',
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
        title: err.message || '保存失败',
        icon: 'none'
      })
    }
  },

  // 删除
  onDelete() {
    if (!this.data.habitId) return

    wx.showModal({
      title: '确认删除',
      content: '删除后该习惯的打卡记录也会清空，确定要删除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中' })

            await wx.cloud.callFunction({
              name: 'habit',
              data: {
                action: 'delete',
                data: { habitId: this.data.habitId }
              }
            })

            wx.hideLoading()
            wx.showToast({ title: '删除成功' })

            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
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
