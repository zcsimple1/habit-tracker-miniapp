const { toYMD } = require('../../utils/date')
const { PRESET_CATEGORIES } = require('../../utils/preset-categories.js')

Page({
  data: {
    // 日期
    currentDate: new Date(),
    selectedDate: new Date(),
    dateMain: '',
    dateWeekday: '',
    isToday: true,

    // 临时显示已完成状态（眼睛按钮控制）
    tempShowCompleted: true,

    // 待办列表 - 按新分类
    todayTodos: [],      // 今日
    futureTodos: [],     // 将来
    overdueTodos: [],    // 已过期
    completedTodos: [],  // 已完成

    // 加载状态
    loading: false,

    // 日历相关
    showCalendar: false,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    calendarDays: [],

    // 有待办记录的日期列表（YYYY-MM-DD格式）
    todoDates: [],

    // 刷新标记
    needRefresh: false
  },

  onLoad() {
    // 强制使用当前时间
    const now = new Date()
    console.log('onLoad - 当前时间:', now, toYMD(now))

    this.setData({
      currentDate: now,
      selectedDate: now,
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth()
    })

    this.loadUserPreferences() // 加载用户偏好（包括隐藏已完成状态）
    this.loadTodoDates() // 加载有待办记录的日期
    this.updateDateDisplay()
    this.loadTodos(true) // 首次加载强制刷新
  },

  onShow() {
    const app = getApp()

    // 检查是否是从取消新建返回的
    if (app.globalData && app.globalData.todosCancelRefresh) {
      app.globalData.todosCancelRefresh = false
      return // 不刷新，直接返回
    }

    // 检查偏好刷新标记
    if (app.globalData && app.globalData.preferencesNeedRefresh) {
      app.globalData.preferencesNeedRefresh = false
      this.loadUserPreferences() // 重新加载用户偏好
    }

    // 检查全局刷新标记
    if (app.globalData && app.globalData.todosNeedRefresh) {
      app.globalData.todosNeedRefresh = false
      this.loadTodos(true)
      return
    }

    // 检查本地刷新标记
    if (this.data.needRefresh) {
      this.loadTodos(true)
      this.setData({ needRefresh: false })
      return
    }

    this.loadTodos(false) // 使用缓存，不强制刷新
  },

  // 加载用户偏好
  async loadUserPreferences() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'getProfile' }
      })

      if (result && result.data && result.data.preferences) {
        const { hideCompleted } = result.data.preferences
        // hideCompleted 为 true 时，tempShowCompleted 为 false（隐藏已完成）
        this.setData({
          tempShowCompleted: hideCompleted === undefined ? true : !hideCompleted
        })
      }
    } catch (err) {
      console.warn('加载用户偏好失败', err)
    }
  },

  // 更新日期显示
  updateDateDisplay() {
    const date = this.data.currentDate
    const today = new Date()

    // 确保 date 是 Date 对象
    const dateObj = date instanceof Date ? date : new Date(date)

    // 检查日期是否有效
    if (isNaN(dateObj.getTime())) {
      console.error('无效的日期对象:', date)
      // 使用当前时间
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const day = now.getDate()
      const weekday = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]

      this.setData({
        dateMain: `${year}年${month}月${day}日`,
        dateWeekday: `星期${weekday}`,
        isToday: true,
        currentDate: now
      })
      return
    }

    // 判断是否为今天
    const todayYMD = toYMD(today)
    const currentYMD = toYMD(dateObj)
    const isToday = todayYMD === currentYMD

    // 格式化日期
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1
    const day = dateObj.getDate()
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()]

    this.setData({
      dateMain: `${year}年${month}月${day}日`,
      dateWeekday: `星期${weekday}`,
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
  async onOpenCalendar() {
    this.setData({ showCalendar: true })
    await this.loadTodoDates() // 重新加载有待办记录的日期
    this.renderCalendar()
  },

  // 关闭日历
  onCloseCalendar() {
    this.setData({ showCalendar: false })
  },

  // 日历内容点击（阻止冒泡）
  onCalendarContentTap() {},

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
    const { todoDates } = this.data

    for (let i = 1; i <= totalDays; i++) {
      const isTodayDate = i === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear()
      const isSelected = i === this.data.selectedDate.getDate() && calendarMonth === this.data.selectedDate.getMonth() && calendarYear === this.data.selectedDate.getFullYear()

      // 检查该日期是否有待办记录
      const currentDateStr = toYMD(new Date(calendarYear, calendarMonth, i))
      const hasTodo = todoDates.includes(currentDateStr)

      days.push({
        day: i,
        isOtherMonth: false,
        isToday: isTodayDate,
        isSelected,
        hasTodo
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

  // 加载有待办记录的日期
  async loadTodoDates() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'todos',
        data: {
          action: 'getTodoDates',
          data: { days: 365 } // 获取未来一年的日期
        }
      })

      const todoDates = result.data || []
      this.setData({ todoDates })
    } catch (err) {
      console.error('加载待办日期失败', err)
    }
  },

  // 加载待办列表
  async loadTodos(forceRefresh = false) {
    const ymd = toYMD(this.data.currentDate)
    const cacheKey = `todos_${ymd}`
    const today = toYMD(new Date())

    // 检查缓存：同一天且不需要强制刷新
    if (!forceRefresh) {
      const cachedData = wx.getStorageSync(cacheKey)
      if (cachedData && cachedData.date === ymd) {
        console.log('从缓存加载待办数据:', cacheKey)
        this.setData({
          todayTodos: cachedData.todayTodos,
          futureTodos: cachedData.futureTodos,
          overdueTodos: cachedData.overdueTodos,
          completedTodos: cachedData.completedTodos,
          loading: false
        })
        return
      }
    }

    this.setData({ loading: true })

    try {
      // 获取指定日期的待办
      const { result } = await wx.cloud.callFunction({
        name: 'todos',
        data: {
          action: 'getByDate',
          data: { ymd }
        }
      })

      const todos = result.data || []
      // 用选中的日期来分组，而不是今天的日期
      const selectedDateStr = ymd

      // 按截止日期与选中日期的关系分组：今日、将来、已过期、已完成
      const todayTodos = []
      const futureTodos = []
      const overdueTodos = []
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
        } else if (todo.dueDate && todo.dueDate.length === 10) {
          // 根据截止日期与选中日期的关系分组
          if (todo.dueDate < selectedDateStr) {
            // 截止日期在选中日期之前 -> 已过期
            overdueTodos.push(todo)
          } else if (todo.dueDate === selectedDateStr) {
            // 截止日期等于选中日期 -> 今日
            todayTodos.push(todo)
          } else {
            // 截止日期在选中日期之后 -> 将来
            futureTodos.push(todo)
          }
        } else {
          // 没有截止日期的放到今日
          todayTodos.push(todo)
        }
      })

      this.setData({
        todayTodos,
        futureTodos,
        overdueTodos,
        completedTodos,
        loading: false
      })

      // 保存到缓存（包含时间戳）
      wx.setStorageSync(cacheKey, {
        todayTodos,
        futureTodos,
        overdueTodos,
        completedTodos,
        date: ymd  // 缓存日期，同一天内有效
      })
      console.log('待办数据已缓存:', cacheKey)
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

  // 切换临时显示已完成（眼睛按钮）
  toggleShowCompleted() {
    const tempShowCompleted = !this.data.tempShowCompleted
    console.log('toggleShowCompleted:', { old: this.data.tempShowCompleted, new: tempShowCompleted })
    this.setData({
      tempShowCompleted
    })
  },

  // 添加待办
  onAddTodo() {
    wx.navigateTo({
      url: '/pages/todo-form/todo-form'
    })
    // 设置刷新标记，从表单返回时会刷新数据
    this.setData({ needRefresh: true })
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
      ...this.data.todayTodos,
      ...this.data.futureTodos,
      ...this.data.overdueTodos,
      ...this.data.completedTodos
    ]
    const todo = allTodos.find(t => t._id === todoId)

    if (!todo) return

    const newCompleted = !todo.completed

    try {
      await wx.cloud.callFunction({
        name: 'todos',
        data: {
          action: 'toggle',
          data: {
            todoId,
            completed: newCompleted
          }
        }
      })

      wx.showToast({
        title: newCompleted ? '已完成' : '已取消',
        icon: 'none'
      })

      // 局部更新 - 只更新这一个待办的状态
      this.updateTodoLocal(todoId, newCompleted)

      // 清除缓存
      const ymd = toYMD(this.data.currentDate)
      wx.removeStorageSync(`todos_${ymd}`)
      wx.removeStorageSync('stats_week')
      wx.removeStorageSync('stats_month')
      wx.removeStorageSync('stats_year')
    } catch (err) {
      console.error('更新状态失败', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 局部更新待办状态（不重新加载整个列表）
  updateTodoLocal(todoId, completed) {
    const moveTodo = (list, id) => {
      const index = list.findIndex(t => t._id === id)
      if (index === -1) return { list, todo: null }
      const [todo] = list.splice(index, 1)
      todo.completed = completed
      return { list, todo }
    }

    let { todayTodos, futureTodos, overdueTodos, completedTodos } = this.data
    let movedTodo = null

    // 从当前位置移除
    if (completed) {
      // 勾选完成 -> 移到已完成
      let result = moveTodo(todayTodos, todoId)
      if (!result.todo) result = moveTodo(futureTodos, todoId)
      if (!result.todo) result = moveTodo(overdueTodos, todoId)
      movedTodo = result.todo
      if (movedTodo) completedTodos = [...completedTodos, movedTodo]
    } else {
      // 取消完成 -> 移回今日
      let result = moveTodo(completedTodos, todoId)
      movedTodo = result.todo
      if (movedTodo) todayTodos = [...todayTodos, movedTodo]
    }

    this.setData({
      todayTodos,
      futureTodos,
      overdueTodos,
      completedTodos
    })

    // 同步更新缓存
    this.saveTodosToCache()
  },

  // 保存待办到缓存
  saveTodosToCache() {
    const ymd = toYMD(this.data.currentDate)
    const cacheKey = `todos_${ymd}`
    wx.setStorageSync(cacheKey, {
      todayTodos: this.data.todayTodos,
      futureTodos: this.data.futureTodos,
      overdueTodos: this.data.overdueTodos,
      completedTodos: this.data.completedTodos,
      date: ymd
    })
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

            // 局部更新：从列表中移除
            this.setData({
              todayTodos: this.data.todayTodos.filter(t => t._id !== todoId),
              futureTodos: this.data.futureTodos.filter(t => t._id !== todoId),
              overdueTodos: this.data.overdueTodos.filter(t => t._id !== todoId),
              completedTodos: this.data.completedTodos.filter(t => t._id !== todoId)
            })
            this.saveTodosToCache()

            // 清除统计缓存
            wx.removeStorageSync('stats_week')
            wx.removeStorageSync('stats_month')
            wx.removeStorageSync('stats_year')
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

      // 局部更新：移到今日
      const completedTodos = this.data.completedTodos
      const todo = completedTodos.find(t => t._id === todoId)
      if (todo) {
        todo.completed = false
        this.setData({
          completedTodos: completedTodos.filter(t => t._id !== todoId),
          todayTodos: [...this.data.todayTodos, todo]
        })
        this.saveTodosToCache()
      }
    } catch (err) {
      console.error('恢复失败', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  },

  // 一键删除所有已过期待办
  onDeleteOverdueTodos() {
    const { overdueTodos } = this.data
    if (overdueTodos.length === 0) {
      wx.showToast({ title: '没有已过期项', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除所有 ${overdueTodos.length} 项已过期待办吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const deletePromises = overdueTodos.map(todo => {
              return wx.cloud.callFunction({
                name: 'todos',
                data: {
                  action: 'delete',
                  data: { todoId: todo._id }
                }
              })
            })

            await Promise.all(deletePromises)

            wx.showToast({ title: `已删除 ${overdueTodos.length} 项` })

            // 局部更新：清空过期列表
            this.setData({ overdueTodos: [] })
            this.saveTodosToCache()

            // 清除统计缓存
            wx.removeStorageSync('stats_week')
            wx.removeStorageSync('stats_month')
            wx.removeStorageSync('stats_year')
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
