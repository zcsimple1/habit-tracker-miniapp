const { toYMD } = require('../../utils/date')
const { PRESET_CATEGORIES } = require('../../utils/preset-categories.js')

Page({
  data: {
    // 日期
    currentDate: new Date(),
    selectedDate: new Date(),
    displayDate: '',
    displayWeekday: '',
    isToday: true,

    // 待办列表
    urgentTodos: [],
    todayTodos: [],
    completedTodos: [],

    // 加载状态
    loading: false,

    // 日历相关
    showCalendar: false,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    calendarDays: []
  },

  onLoad() {
    this.updateDateDisplay()
    this.loadTodos()
  },

  onShow() {
    this.loadTodos()
  },

  // 更新日期显示
  updateDateDisplay() {
    const date = this.data.currentDate
    const today = new Date()
    const todayYMD = toYMD(today)
    const currentYMD = toYMD(date)

    // 判断是否为今天
    const isToday = todayYMD === currentYMD

    // 确保 date 是 Date 对象
    const dateObj = date instanceof Date ? date : new Date(date)

    // 格式化日期
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    const day = dateObj.getDate()
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()]

    this.setData({
      displayDate: `${year}年${month}月${day}日`,
      displayWeekday: `星期${weekday}`,
      isToday,
      currentDate: dateObj,
      selectedDate: dateObj
    })
  },

  // 前一天
  onPrevDay() {
    const date = new Date(this.data.currentDate)
    date.setDate(date.getDate() - 1)
    this.setData({ currentDate: date })
    this.updateDateDisplay()
    this.loadTodos()
  },

  // 后一天
  onNextDay() {
    const date = new Date(this.data.currentDate)
    date.setDate(date.getDate() + 1)
    this.setData({ currentDate: date })
    this.updateDateDisplay()
    this.loadTodos()
  },

  // 打开日历
  onOpenCalendar() {
    this.setData({ showCalendar: true })
    this.renderCalendar()
  },

  // 关闭日历
  onCloseCalendar() {
    this.setData({ showCalendar: false })
  },

  // 渲染日历
  renderCalendar() {
    const { calendarYear, calendarMonth } = this.data
    const firstDay = new Date(calendarYear, calendarMonth, 1)
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0)
    const startDay = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days = []

    // 上个月的日期
    const prevLastDay = new Date(calendarYear, calendarMonth, 0).getDate()
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        day: prevLastDay - i,
        isOtherMonth: true,
        isToday: false,
        isSelected: false
      })
    }

    // 当前月的日期
    const today = new Date()
    for (let i = 1; i <= totalDays; i++) {
      const isTodayDate = i === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear()
      const isSelected = i === this.data.selectedDate.getDate() && calendarMonth === this.data.selectedDate.getMonth() && calendarYear === this.data.selectedDate.getFullYear()

      days.push({
        day: i,
        isOtherMonth: false,
        isToday: isTodayDate,
        isSelected
      })
    }

    // 下个月的日期
    const remainingDays = 42 - (startDay + totalDays)
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isOtherMonth: true,
        isToday: false,
        isSelected: false
      })
    }

    this.setData({ calendarDays: days })
  },

  // 选择日期
  onSelectDate(e) {
    const { index } = e.currentTarget.dataset
    const day = this.data.calendarDays[index]

    if (day.isOtherMonth) return

    const newDate = new Date(this.data.calendarYear, this.data.calendarMonth, day.day)
    this.setData({
      currentDate: newDate,
      selectedDate: newDate,
      showCalendar: false
    })

    this.updateDateDisplay()
    this.loadTodos()
  },

  // 月份切换
  onMonthChange(e) {
    const { delta } = e.currentTarget.dataset
    let { calendarYear, calendarMonth } = this.data
    calendarMonth += parseInt(delta)

    if (calendarMonth < 0) {
      calendarMonth = 11
      calendarYear--
    } else if (calendarMonth > 11) {
      calendarMonth = 0
      calendarYear++
    }

    this.setData({ calendarYear, calendarMonth })
    this.renderCalendar()
  },

  // 加载待办列表
  async loadTodos() {
    this.setData({ loading: true })

    try {
      const ymd = toYMD(this.data.currentDate)

      // 获取指定日期的待办
      const { result } = await wx.cloud.callFunction({
        name: 'todos',
        data: {
          action: 'getByDate',
          data: { ymd }
        }
      })

      const todos = result.data || []

      // 按优先级分组：紧急、高/普通/低为"今天"，已完成
      const urgentTodos = []
      const todayTodos = []
      const completedTodos = []

      todos.forEach(todo => {
        // 添加分类信息
        const category = this.getCategoryById(todo.categoryId)
        if (category) {
          todo.categoryName = category.name
          todo.categoryIcon = category.icon
          todo.categoryColor = category.color
        }

        if (todo.completed) {
          completedTodos.push(todo)
        } else if (todo.priority === 'urgent') {
          urgentTodos.push(todo)
        } else {
          todayTodos.push(todo)
        }
      })

      this.setData({
        urgentTodos,
        todayTodos,
        completedTodos,
        loading: false
      })
    } catch (err) {
      console.error('加载待办失败', err)
      this.setData({ loading: false })

      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 获取分类信息
  getCategoryById(categoryId) {
    if (!categoryId) return null

    // 先在预设分类中查找
    const preset = PRESET_CATEGORIES.find(cat => cat.id === categoryId)
    if (preset) return preset

    // 自定义分类需要从云端获取
    return { name: '自定义', icon: '📌', color: '#f3f4f6' }
  },

  // 添加待办
  onAddTodo() {
    wx.navigateTo({
      url: '/pages/todo-form/todo-form'
    })
  },

  // 编辑待办
  onEditTodo(e) {
    const { todoId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/todo-form/todo-form?id=${todoId}`
    })
  },

  // 切换完成状态
  async onToggleTodo(e) {
    const { todoId } = e.currentTarget.dataset
    const allTodos = [
      ...this.data.urgentTodos,
      ...this.data.todayTodos,
      ...this.data.completedTodos
    ]
    const todo = allTodos.find(t => t._id === todoId)

    if (!todo) return

    try {
      await wx.cloud.callFunction({
        name: 'todos',
        data: {
          action: 'toggle',
          data: {
            todoId,
            completed: !todo.completed
          }
        }
      })

      wx.showToast({
        title: todo.completed ? '已取消' : '已完成',
        icon: 'none'
      })

      this.loadTodos()
    } catch (err) {
      console.error('更新状态失败', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 删除待办
  onDeleteTodo(e) {
    const { todoId } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个待办吗?',
      success: async (res) => {
        if (res.confirm) {
          try {
            await wx.cloud.callFunction({
              name: 'todos',
              data: {
                action: 'delete',
                data: { todoId }
              }
            })

            wx.showToast({ title: '删除成功' })
            this.loadTodos()
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
  },

  // 恢复待办
  async onRestoreTodo(e) {
    const { todoId } = e.currentTarget.dataset

    try {
      await wx.cloud.callFunction({
        name: 'todos',
        data: {
          action: 'toggle',
          data: {
            todoId,
            completed: false
          }
        }
      })

      wx.showToast({
        title: '已恢复',
        icon: 'none'
      })

      this.loadTodos()
    } catch (err) {
      console.error('恢复失败', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  }
})
