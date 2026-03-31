# 自定义底部导航栏实现说明

## 概述

由于微信小程序的原生 tabBar 必须使用图片图标,不支持 emoji,我们采用了**自定义底部导航栏组件**的方案。

## 实现方案

### 1. 移除原生 tabBar
在 `app.json` 中移除了 tabBar 配置,改为使用自定义导航栏。

```json
{
  "window": {
    "navigationStyle": "custom"
  }
}
```

### 2. 创建自定义组件
创建了 `/components/custom-tabbar/` 组件,包含:

**功能特性:**
- ✅ 支持 emoji 图标 (🏠📝📊⚙️)
- ✅ 点击高亮效果
- ✅ 徽章显示 (待办数量)
- ✅ 平滑动画效果
- ✅ 适配安全区域

**组件文件:**
- `custom-tabbar.wxml` - 模板
- `custom-tabbar.js` - 逻辑
- `custom-tabbar.wxss` - 样式
- `custom-tabbar.json` - 配置

### 3. 在各页面引入组件

已在以下页面引入:
- ✅ 首页 (`pages/index/index`)
- ✅ 待办 (`pages/todos/todos`)
- ✅ 统计 (`pages/stats/stats`)
- ✅ 设置 (`pages/settings/settings`)

## 使用方法

在页面的 wxml 文件末尾添加:
```xml
<custom-tabbar currentPage="pages/index/index" />
```

对于待办页面,可以传递待办数量徽章:
```xml
<custom-tabbar currentPage="pages/todos/todos" todo-count="{{todayTodoCount}}" />
```

## 预设分类

### 代码中定义
预设分类完全在代码中定义,不依赖数据库:

**推荐分类:**
- 🏢 工作 - 工作任务、会议、日报等
- ❤️ 健康 - 运动、健身、饮食等
- 👶 孩子 - 接送孩子、辅导作业等
- 📚 学习 - 阅读、课程、技能学习等

**其他分类:**
- 🏠 家庭 - 家务、陪伴家人等
- 💰 财务 - 记账、理财、账单支付等
- ⭐ 个人成长 - 冥想、反思、日记等
- 💬 社交 - 联系朋友、社交活动等

### 数据库存储
只有用户**从预设分类中选择**后,才会保存到数据库中。

自定义分类(用户自己创建的)会直接保存到数据库。

## 页面布局调整

由于使用了自定义导航栏,所有页面底部需要预留空间。

已调整的页面:
```css
.container {
  padding-bottom: 120rpx; /* 为底部导航栏留空间 */
}
```

## 样式规范

### 导航栏高度
- 内容区: 约 80rpx
- 安全区域: env(safe-area-inset-bottom)
- 总高度: 约 100-120rpx

### 颜色规范
- 未选中: #999999 (灰色)
- 选中: #667eea (紫色)
- 徽章: #ef4444 (红色)
- 背景: #ffffff (白色)

## 优势

### 相比原生 tabBar
1. ✅ 支持 emoji 图标
2. ✅ 不需要准备图片资源
3. ✅ 更灵活的样式定制
4. ✅ 支持徽章动画

### 相比完全手写导航
1. ✅ 统一管理,易于维护
2. ✅ 组件化,可复用
3. ✅ 自动处理页面切换

## 后续优化

如果未来需要使用图片图标:
1. 修改 `custom-tabbar.wxml` 使用 `<image>` 标签
2. 更新 `custom-tabbar.js` 的数据源
3. 不需要修改页面引用

## 设计对照

### ✅ 已实现
- 4 个标签页 (首页、待办、统计、设置)
- emoji 图标显示
- 选中状态高亮
- 待办数量徽章
- 平滑动画

### 📋 设计预览
参考: `docs/design-preview/tabbar-design.html`

方案对比:
- 方案 1: 经典底部导航 ✅ (已实现)
- 方案 2: 现代浮动导航 (可选)
- 方案 3: 居中添加按钮 (可选)

## 注意事项

1. **自定义导航栏位置**
   - `position: fixed; bottom: 0`
   - 需要处理页面底部 padding

2. **页面切换**
   - 使用 `wx.switchTab()` 而非 `wx.navigateTo()`
   - 页面会被缓存

3. **徽章更新**
   - 通过组件属性传递
   - 组件内部有 observer 自动更新

4. **安全区域**
   - 使用 `env(safe-area-inset-bottom)` 适配 iPhone X+
   - 确保底部按钮不被遮挡
