// cloudfunctions/common/index.js
const dayjs = require('dayjs')

/**
 * 公共工具函数模块
 */

/**
 * 判断某天是否应该显示某习惯
 * @param {Object} habit - 习惯对象
 * @param {String} ymd - 日期 YYYY-MM-DD
 * @returns {Boolean}
 */
function shouldShowOnDate(habit, ymd) {
  if (!habit.active) return false

  const { timeRule } = habit
  if (!timeRule) return true

  // 检查日期范围
  if (timeRule.startDate && ymd < timeRule.startDate) return false
  if (timeRule.endDate && ymd > timeRule.endDate) return false

  const date = dayjs(ymd)
  const dayOfWeek = date.day() // 0=周日, 1=周一, ..., 6=周六

  switch (timeRule.type) {
    case 'daily':
      return true

    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5

    case 'weekend':
      return dayOfWeek === 0 || dayOfWeek === 6

    case 'weekly':
      return timeRule.weekDays && timeRule.weekDays.includes(dayOfWeek)

    case 'custom':
      return timeRule.customDates && timeRule.customDates.includes(ymd)

    default:
      return true
  }
}

/**
 * 计算连续打卡天数
 * @param {Array} checkins - 打卡记录数组,按日期排序
 * @returns {Number}
 */
function calculateStreak(checkins) {
  if (!checkins || checkins.length === 0) return 0

  const today = dayjs().format('YYYY-MM-DD')
  let streak = 0
  let currentDate = dayjs(today)

  // 按日期倒序排列
  const sortedCheckins = checkins.sort((a, b) => b.ymd.localeCompare(a.ymd))

  // 找到最近的打卡日期
  let checkinIndex = 0
  let expectedDate = currentDate

  while (checkinIndex < sortedCheckins.length) {
    const checkin = sortedCheckins[checkinIndex]
    const checkinDate = dayjs(checkin.ymd)

    // 检查是否连续
    const diffDays = Math.abs(expectedDate.diff(checkinDate, 'day'))

    if (diffDays === 0) {
      // 当天打卡
      streak++
      checkinIndex++
      expectedDate = expectedDate.subtract(1, 'day')
    } else if (diffDays === 1) {
      // 隔一天,可能是昨天没打卡但今天打卡了
      streak++
      checkinIndex++
      expectedDate = expectedDate.subtract(1, 'day')
    } else {
      // 不连续,中断
      break
    }
  }

  return streak
}

/**
 * 计算完成率
 * @param {Number} completed - 已完成数
 * @param {Number} total - 总数
 * @returns {Number} 完成率百分比
 */
function calculateCompletionRate(completed, total) {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * 格式化日期
 * @param {Date|String|Number} date - 日期
 * @param {String} format - 格式
 * @returns {String}
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  return dayjs(date).format(format)
}

/**
 * 获取今日日期字符串
 * @returns {String} YYYY-MM-DD
 */
function getToday() {
  return dayjs().format('YYYY-MM-DD')
}

/**
 * 获取日期范围
 * @param {String} type - 类型: today, week, month, year
 * @returns {Object} { startDate, endDate }
 */
function getDateRange(type) {
  const today = dayjs()

  switch (type) {
    case 'today':
      return {
        startDate: today.format('YYYY-MM-DD'),
        endDate: today.format('YYYY-MM-DD')
      }

    case 'week':
      return {
        startDate: today.startOf('week').format('YYYY-MM-DD'),
        endDate: today.endOf('week').format('YYYY-MM-DD')
      }

    case 'month':
      return {
        startDate: today.startOf('month').format('YYYY-MM-DD'),
        endDate: today.endOf('month').format('YYYY-MM-DD')
      }

    case 'year':
      return {
        startDate: today.startOf('year').format('YYYY-MM-DD'),
        endDate: today.endOf('year').format('YYYY-MM-DD')
      }

    default:
      return {
        startDate: today.format('YYYY-MM-DD'),
        endDate: today.format('YYYY-MM-DD')
      }
  }
}

/**
 * 深度克隆对象
 * @param {Object} obj - 对象
 * @returns {Object}
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 生成唯一ID
 * @returns {String}
 */
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

module.exports = {
  shouldShowOnDate,
  calculateStreak,
  calculateCompletionRate,
  formatDate,
  getToday,
  getDateRange,
  deepClone,
  generateId
}
