const { toYMD } = require('../../utils/date')

Component({
  properties: {
    currentDate: {
      type: Object,
      value: new Date()
    }
  },

  data: {
    displayDate: '',
    displayWeekday: '',
    isToday: true
  },

  observers: {
    'currentDate': function(date) {
      if (date) {
        this.updateDisplay(date)
      }
    }
  },

  lifetimes: {
    attached() {
      // 组件初始化时立即更新显示
      const currentDate = this.data.currentDate
      if (currentDate) {
        this.updateDisplay(currentDate)
      }
    }
  },

  methods: {
    updateDisplay(date) {
      try {
        const today = new Date()
        const dateObj = date instanceof Date ? date : new Date(date)

        // 检查日期有效性
        if (isNaN(dateObj.getTime())) {
          console.warn('Invalid date:', date)
          return
        }

        const todayYMD = toYMD(today)
        const currentYMD = toYMD(dateObj)
        const isToday = todayYMD === currentYMD

        const year = dateObj.getFullYear()
        const month = dateObj.getMonth() + 1
        const day = dateObj.getDate()
        const weekday = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()]

        this.setData({
          displayDate: `${year}年${month}月${day}日`,
          displayWeekday: `星期${weekday}`,
          isToday
        })
      } catch (err) {
        console.error('Error updating date display:', err)
      }
    },

    onPrevDay() {
      this.triggerEvent('change', { delta: -1 })
    },

    onNextDay() {
      this.triggerEvent('change', { delta: 1 })
    },

    onOpenCalendar() {
      this.triggerEvent('openCalendar')
    }
  }
})
