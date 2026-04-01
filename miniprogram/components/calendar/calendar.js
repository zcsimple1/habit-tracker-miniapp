const { toYMD } = require('../../utils/date')

Component({
  properties: {
    year: {
      type: Number,
      value: new Date().getFullYear()
    },
    month: {
      type: Number,
      value: new Date().getMonth()
    },
    selectedDate: {
      type: Object,
      value: new Date()
    },
    markedDates: {
      type: Array,
      value: []
    }
  },

  data: {
    days: []
  },

  observers: {
    'year, month, selectedDate, markedDates': function() {
      this.renderCalendar()
    }
  },

  lifetimes: {
    attached() {
      // 组件初始化时立即渲染日历
      console.log('[calendar] Component attached, rendering calendar')
      this.renderCalendar()
    }
  },

  methods: {
    renderCalendar() {
      try {
        const { year, month, selectedDate, markedDates } = this.data
        console.log('[calendar] Rendering calendar:', { year, month, selectedDate, markedDates })
        console.log('[calendar] markedDates type:', typeof markedDates, Array.isArray(markedDates), 'length:', markedDates?.length)

        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startDay = firstDay.getDay()
        const totalDays = lastDay.getDate()

        // 确保 selectedDate 是 Date 对象
        const selectedDateObj = selectedDate instanceof Date
          ? selectedDate
          : (selectedDate ? new Date(selectedDate) : new Date())

        const days = []

        // 上个月的日期
        const prevLastDay = new Date(year, month, 0).getDate()
        for (let i = startDay - 1; i >= 0; i--) {
          days.push({
            day: prevLastDay - i,
            isOtherMonth: true,
            isToday: false,
            isSelected: false,
            hasMark: false
          })
        }

        // 当前月的日期
        const today = new Date()
        for (let i = 1; i <= totalDays; i++) {
          const isTodayDate = i === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const isSelected = i === selectedDateObj.getDate() &&
                          month === selectedDateObj.getMonth() &&
                          year === selectedDateObj.getFullYear()
          // 注意：month 是从 0 开始的，所以要用 month + 1
          const currentDate = new Date(year, month, i)
          const currentDateStr = toYMD(currentDate)
          const hasMark = markedDates.includes(currentDateStr)
          // 调试：检查日期匹配
          if (i === 1 || i === 15) {
            console.log('[calendar] Day check:', i, 'month:', month, 'currentDate:', currentDate, 'currentDateStr:', currentDateStr, 'hasMark:', hasMark)
          }

          days.push({
            day: i,
            isOtherMonth: false,
            isToday: isTodayDate,
            isSelected,
            hasMark
          })
        }

        // 下个月的日期
        const remainingDays = 42 - (startDay + totalDays)
        for (let i = 1; i <= remainingDays; i++) {
          days.push({
            day: i,
            isOtherMonth: true,
            isToday: false,
            isSelected: false,
            hasMark: false
          })
        }

        console.log('[calendar] Rendered days:', days.length)
        this.setData({ days })
      } catch (err) {
        console.error('[calendar] Render error:', err)
      }
    },

    onSelectDate(e) {
      const { index } = e.currentTarget.dataset
      const day = this.data.days[index]

      if (day.isOtherMonth) return

      const newDate = new Date(this.data.year, this.data.month, day.day)
      this.triggerEvent('select', { date: newDate })
    },

    onMonthChange(e) {
      const { delta } = e.currentTarget.dataset
      let { year, month } = this.data
      month += parseInt(delta)

      if (month < 0) {
        month = 11
        year--
      } else if (month > 11) {
        month = 0
        year++
      }

      this.setData({ year, month })
    },

    onClose() {
      this.triggerEvent('close')
    },

    // 内容区域点击（阻止冒泡）
    onContentTap() {}
  }
})
