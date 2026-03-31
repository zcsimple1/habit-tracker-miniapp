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

  observers: {
    'year, month, selectedDate, markedDates': function() {
      this.renderCalendar()
    }
  },

  methods: {
    renderCalendar() {
      const { year, month, selectedDate, markedDates } = this.data
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const startDay = firstDay.getDay()
      const totalDays = lastDay.getDate()

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
        const isSelected = i === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()
        const currentDateStr = toYMD(new Date(year, month, i))
        const hasMark = markedDates.includes(currentDateStr)

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

      this.setData({ days })
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
    }
  }
})
