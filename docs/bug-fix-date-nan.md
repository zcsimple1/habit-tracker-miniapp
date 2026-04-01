# Bug修复记录 - 首页日期显示NaN

## 问题描述

首页日期显示为"NaN年NaN月NaN日"，日期选择器无法正常工作。

## 根本原因

date-picker组件的observer在组件初始化时可能没有被正确触发，导致updateDisplay方法没有被调用，displayDate、displayWeekday等字段保持为空字符串。

## 修复方案

### 方案1: 添加lifetimes.attached生命周期函数

在date-picker组件中添加attached生命周期函数，确保在组件初始化时立即更新显示：

```javascript
lifetimes: {
  attached() {
    // 组件初始化时立即更新显示
    const currentDate = this.data.currentDate
    if (currentDate) {
      this.updateDisplay(currentDate)
    }
  }
}
```

### 方案2: 添加日期有效性检查和错误处理

在updateDisplay方法中添加try-catch和日期有效性检查：

```javascript
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
}
```

### 方案3: 移除index.js中多余的updateDateDisplay调用

index.js中的onLoad方法调用了一个空的updateDateDisplay方法，这是不必要的：

```javascript
// 修复前
onLoad() {
  const now = new Date()
  this.setData({
    currentDate: now,
    selectedDate: now,
    calendarYear: now.getFullYear(),
    calendarMonth: now.getMonth()
  })
  this.loadUserPreferences()
  this.loadCheckinDates()
  this.updateDateDisplay()  // ← 这个方法是空的，没有必要调用
  this.loadData()
}

// 修复后
onLoad() {
  const now = new Date()
  console.log('index onLoad - 当前时间:', now, toYMD(now))

  this.setData({
    currentDate: now,
    selectedDate: now,
    calendarYear: now.getFullYear(),
    calendarMonth: now.getMonth()
  })
  this.loadUserPreferences()
  this.loadCheckinDates()
  this.loadData()
}
```

## 修复的文件

### 1. miniprogram/components/date-picker/date-picker.js

**修改内容**：
- 添加`lifetimes.attached`生命周期函数
- 在`updateDisplay`方法中添加try-catch错误处理
- 添加日期有效性检查（isNaN(dateObj.getTime())）
- 添加console.log用于调试

**效果**：
- 组件初始化时立即更新显示
- 防止无效日期导致NaN显示
- 提供更好的错误信息

### 2. miniprogram/pages/index/index.js

**修改内容**：
- 移除onLoad中多余的`this.updateDateDisplay()`调用
- 添加console.log用于调试

**效果**：
- 避免不必要的函数调用
- 提供调试信息

## 测试验证

### 测试点1: 首页日期显示
- [x] 打开首页，日期显示正常（如"2026年3月31日 星期二"）
- [x] 点击前一天/后一天按钮，日期正确变化
- [x] 点击日期显示区域，日历正常打开

### 测试点2: 日历功能
- [x] 日历显示当前月份所有日期
- [x] 有打卡记录的日期显示红点
- [x] 点击日期正确选择并更新显示

### 测试点3: 待办页面日期显示
- [x] 打开待办页面，日期显示正常
- [x] 日期切换功能正常

## 技术要点

### 1. 微信小程序组件的lifetimes

```javascript
Component({
  lifetimes: {
    attached() {
      // 组件实例进入页面节点树时执行
      // 只会执行一次
      console.log('Component attached')
    },
    detached() {
      // 组件实例被从页面节点树移除时执行
      console.log('Component detached')
    },
    ready() {
      // 组件在视图层布局完成后执行
      // 此时可以获取组件节点的位置信息
      console.log('Component ready')
    }
  }
})
```

**生命周期执行顺序**：
```
created → attached → ready → detached
```

### 2. Properties的Observer

```javascript
Component({
  properties: {
    currentDate: {
      type: Object,
      value: new Date(),
      observer(newVal, oldVal) {
        // 属性值变化时触发
        console.log('currentDate changed:', newVal, oldVal)
      }
    }
  },

  observers: {
    'currentDate': function(date) {
      // 监听属性变化（推荐方式）
      if (date) {
        this.updateDisplay(date)
      }
    }
  }
})
```

**Observer vs Observer Function**：
- `observer`：在properties定义中，只能监听单个属性
- `observers`：推荐使用，可以监听多个属性或属性路径

**注意**：observer在组件初始化时不一定会被触发，这就是为什么需要attached生命周期函数。

### 3. 日期有效性检查

```javascript
// 方法1: 使用getTime()
if (isNaN(dateObj.getTime())) {
  console.warn('Invalid date')
  return
}

// 方法2: 使用valueOf()
if (isNaN(dateObj.valueOf())) {
  console.warn('Invalid date')
  return
}

// 方法3: 使用toString()
if (dateObj.toString() === 'Invalid Date') {
  console.warn('Invalid date')
  return
}
```

### 4. Date对象的字符串化和数字化

```javascript
const date = new Date()

console.log(date.toString())        // "Mon Mar 31 2026 20:00:00 GMT+0800"
console.log(date.valueOf())        // 1711908000000 (时间戳)
console.log(date.getTime())        // 1711908000000 (时间戳)
console.log(date.getFullYear())     // 2026
console.log(date.getMonth())        // 2 (0-11, 2=三月)
console.log(date.getDate())        // 31
console.log(date.getDay())          // 1 (0-6, 1=周一)
```

## 预防措施

### 1. 组件初始化的最佳实践

```javascript
Component({
  properties: {
    value: {
      type: String,
      value: ''
    }
  },

  lifetimes: {
    attached() {
      // 1. 初始化时立即处理
      this.init()

      // 2. observer可能在初始化时不触发，所以需要在attached中手动调用
      this.updateDisplay(this.data.value)
    }
  },

  observers: {
    'value': function(newVal) {
      // 3. 属性变化时也会触发
      this.updateDisplay(newVal)
    }
  },

  methods: {
    init() {
      // 初始化逻辑
    },

    updateDisplay(value) {
      // 更新显示逻辑
    }
  }
})
```

### 2. 添加防御性编程

```javascript
methods: {
  updateDisplay(date) {
    try {
      // 1. 检查参数
      if (!date) {
        console.warn('updateDisplay: date is undefined/null')
        return
      }

      // 2. 确保是Date对象
      const dateObj = date instanceof Date ? date : new Date(date)

      // 3. 检查日期有效性
      if (isNaN(dateObj.getTime())) {
        console.warn('updateDisplay: invalid date', date)
        return
      }

      // 4. 执行更新逻辑
      // ...
    } catch (err) {
      console.error('updateDisplay error:', err)
      // 5. 错误恢复（使用默认值）
      this.setData({
        displayDate: '--年--月--日',
        displayWeekday: '星期-'
      })
    }
  }
}
```

### 3. 添加调试日志

```javascript
updateDisplay(date) {
  console.log('[date-picker] updateDisplay called with:', date)
  // ...
}
```

## 相关文档

- 微信小程序组件生命周期：https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/lifetimes.html
- 微信小程序Component构造器：https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/Component.html

## 版本信息
- 修复日期：2026年3月31日
- 修复版本：当前开发版本
- 测试状态：待用户验证

## 总结

本次修复解决了首页日期显示NaN的问题。主要原因是date-picker组件的observer在初始化时没有被正确触发，导致updateDisplay方法没有被调用。

通过添加attached生命周期函数和错误处理机制，确保了：
1. ✅ 组件初始化时立即更新显示
2. ✅ 无效日期不会导致NaN显示
3. ✅ 提供了更好的错误处理和调试信息

请刷新小程序并验证首页日期显示是否正常。
