# 首页UI优化总结 - 2026-03-31

## 优化内容

### 1. ✅ 统一首页和待办页面的日期选择器样式

**首页 (index.wxml)**：
- 移除了`date-picker`组件的引用
- 改用与待办页面相同的日期选择器布局
- 添加了`displayDate`、`displayWeekday`、`isToday`数据字段
- 实现了`onPrevDay()`、`onNextDay()`方法
- 实现了`updateDateDisplay()`方法来更新日期显示

**样式统一**：
- 日期显示区域：垂直布局（日期在上，星期在下）
- 导航按钮：左右箭头
- 状态徽章：显示"今天"或"查看"
- 背景：半透明白色 `rgba(255,255,255,0.25)`

### 2. ✅ 隐藏按钮优化

**位置和样式**：
- 从标题右侧移至加号旁边
- 使用圆按钮样式（72rpx × 72rpx）
- 背景：`rgba(255,255,255,0.25)`
- 眼睛图标：睁开👁 / 闭上🙈
- 与加号按钮并排显示

**布局结构**：
```html
<view class="action-buttons">
  <view class="eye-btn">...</view>
  <button class="add-habit-btn">+</button>
</view>
```

### 3. ✅ 列表项样式优化

**分类模式**：
- 习惯名称作为主标题
- 时间和状态标签在第二行显示
- 时间颜色：有固定时间时显示蓝色 `#667eea`，无固定时间显示灰色 `#999`
- 状态标签：待完成（绿色背景）/ 已完成（灰色背景）

**时间模式**：
- 保持与分类模式相同的布局
- 分类徽章在复选框右侧
- 内容区域包含名称和元信息
- 元信息包含时间、状态标签

**统计信息**：
- 时间模式顶部显示总体统计
- 格式：`已完成 X/Y 项`
- 已完成数量：绿色 `#10b981`
- 总数量：蓝色 `#667eea`

## 修改的文件

### 首页 (index)
- `miniprogram/pages/index/index.wxml` - 修改头部布局、习惯列表结构
- `miniprogram/pages/index/index.wxss` - 优化日期选择器、操作按钮、列表项样式
- `miniprogram/pages/index/index.js` - 添加日期显示逻辑、导航方法
- `miniprogram/pages/index/index.json` - 移除date-picker组件引用

### 待办页面 (todos)
- `miniprogram/pages/todos/todos.wxss` - 优化时间显示颜色

## 样式细节

### 时间显示
```css
.habit-time.has-time {
  color: #667eea;  /* 蓝色 - 有固定时间 */
}

.habit-time.no-time {
  color: #999;  /* 灰色 - 无固定时间 */
}
```

### 状态标签
```css
.habit-count {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

/* 待完成 */
.habit-item:not(.hidden-item) .habit-count {
  background: #f0fdf4;
  color: #10b981;
}

/* 已完成 */
.habit-item.hidden-item .habit-count {
  background: #f3f4f6;
  color: #9ca3af;
}
```

### 操作按钮
```css
.eye-btn, .add-habit-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}
```

## 实现效果

✅ 首页和待办页面使用相同的日期选择器样式
✅ 隐藏按钮移至加号旁边，显示为圆按钮
✅ 习惯列表显示时间和状态标签
✅ 时间颜色根据是否有固定时间显示不同颜色
✅ 状态标签区分待完成和已完成
✅ 分类模式和时间模式保持一致的列表样式
✅ 统计信息在时间模式顶部显示
