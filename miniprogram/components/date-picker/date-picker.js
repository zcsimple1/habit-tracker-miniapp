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

  methods: {
    updateDisplay(date) {
      const today = new Date()
      const dateObj = date instanceof Date ? date : new Date(date)
      
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
