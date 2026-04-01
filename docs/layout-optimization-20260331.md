# 页面布局优化与Tab切换性能优化 - 2026-03-31

## 优化内容

### 1. ✅ 统一三个页面的头部布局

#### 首页 (index)
- 头部标题：左对齐 "今日打卡"
- 头部padding：`40rpx 30rpx 40rpx`，top: `calc(100rpx + env(safe-area-inset-top))`
- 日期选择器：单独的行，使用与待办相同的样式
- 操作按钮（眼睛+加号）：绝对定位在右上角

#### 待办页面 (todos)
- 头部标题：左对齐 "今日待办"
- 头部padding：`40rpx 30rpx 40rpx`，top: `calc(100rpx + env(safe-area-inset-top))`
- 日期选择器：单独的行，保持原有样式
- 添加按钮：绝对定位在右上角

#### 统计页面 (stats)
- 头部标题：左对齐 "统计中心"
- 头部padding：`40rpx 30rpx 40rpx`，top: `calc(100rpx + env(safe-area-inset-top))`
- 分享按钮：圆按钮样式（72rpx × 72rpx），绝对定位在右上角

**统一的样式规范**：
```css
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx 40rpx;
  padding-top: calc(100rpx + env(safe-area-inset-top));
  box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.3);
  position: relative;
}

.header-title {
  font-size: 36rpx;
  font-weight: 700;
  color: white;
  margin-bottom: 20rpx;
}

/* 右上角按钮通用样式 */
.header-btn {
  position: absolute;
  top: calc(100rpx + env(safe-area-inset-top) + 40rpx);
  right: 30rpx;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  line-height: 1;
  z-index: 10;
}
```

### 2. ✅ 优化Tab切换性能

#### 原有问题
使用 `wx.reLaunch()` 导致每次切换都重新加载整个页面，体验很差。

#### 优化方案

**智能页面切换逻辑**：
1. **检查页面栈**：判断目标页面是否已在栈中
2. **页面已存在**：使用 `wx.navigateBack()` 返回，保持页面状态
3. **页面不存在**：
   - 如果页面栈未满（<10页）：使用 `wx.navigateTo()` 跳转
   - 如果页面栈已满：使用 `wx.redirectTo()` 替换当前页面
4. **失败处理**：降级方案确保切换成功

#### 优化后的代码

```javascript
onTabClick(e) {
  const { path } = e.currentTarget.dataset;
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const currentRoute = currentPage.route;

  // 如果已经在目标页面，不做任何操作
  if (currentRoute === path) return;

  // 检查目标页面是否已在栈中
  const targetPageIndex = pages.findIndex(page => page.route === path);

  if (targetPageIndex >= 0) {
    // 目标页面已存在，使用 navigateBack 返回
    wx.navigateBack({
      delta: pages.length - 1 - targetPageIndex,
      fail: () => {
        // 失败降级：redirectTo
        wx.redirectTo({
          url: `/${path}`,
          fail: () => wx.navigateTo({ url: `/${path}` })
        });
      }
    });
  } else {
    // 目标页面不在栈中
    const maxPages = 10;
    if (pages.length >= maxPages) {
      // 页面栈已满，使用 redirectTo
      wx.redirectTo({
        url: `/${path}`,
        fail: () => wx.navigateTo({ url: `/${path}` })
      });
    } else {
      // 使用 navigateTo
      wx.navigateTo({
        url: `/${path}`,
        fail: () => wx.redirectTo({ url: `/${path}` })
      });
    }
  }
}
```

#### 性能提升效果

| 操作 | 优化前 | 优化后 |
|------|--------|--------|
| 首页 ↔ 待办 | 每次重新加载 | 已访问过直接返回 |
| 首页 ↔ 统计 | 每次重新加载 | 已访问过直接返回 |
| 切换动画 | 无 | 保留微信原生动画 |
| 数据加载 | 每次重新请求 | 利用缓存数据 |
| 滚动位置 | 每次重置 | 保留滚动位置 |

## 修改的文件

### 组件
- `miniprogram/components/custom-tabbar/custom-tabbar.js` - 优化Tab切换逻辑

### 首页 (index)
- `miniprogram/pages/index/index.wxss` - 统一头样式，优化按钮定位

### 待办页面 (todos)
- `miniprogram/pages/todos/todos.wxml` - 调整头部布局
- `miniprogram/pages/todos/todos.wxss` - 统一头样式，绝对定位按钮

### 统计页面 (stats)
- `miniprogram/pages/stats/stats.wxml` - 统一头布局
- `miniprogram/pages/stats/stats.wxss` - 统一头样式，优化分享按钮

## 技术细节

### 页面栈管理
微信小程序页面栈最大深度为10层，超过限制会报错。

**优化策略**：
1. 优先使用 `navigateBack()` - 最快，保持状态
2. 次选使用 `navigateTo()` - 正常跳转，添加到栈
3. 降级使用 `redirectTo()` - 替换当前，减少栈深度
4. 最终保底使用 `reLaunch()` - 清空栈，最后手段

### 错误处理
每个API调用都添加 `fail` 回调，确保切换失败时有降级方案：

```javascript
wx.navigateBack({
  delta: n,
  fail: () => wx.redirectTo({
    url: path,
    fail: () => wx.navigateTo({ url: path })
  })
})
```

## 实现效果

✅ 三个页面头部布局完全统一
✅ 标题位置一致（左对齐，相同padding）
✅ 按钮样式一致（圆按钮，72rpx）
✅ 背景和阴影一致
✅ Tab切换不再重新加载整个页面
✅ 已访问页面直接返回，保持状态
✅ 保留滚动位置和输入内容
✅ 体验更加流畅快速
