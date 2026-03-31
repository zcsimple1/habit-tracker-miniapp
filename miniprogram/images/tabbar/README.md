# TabBar 图标说明

此目录用于存放底部导航栏图标。

## 需要的图标文件

每个 tab 需要 2 个图标:
- 普通状态图标 (未选中)
- 激活状态图标 (选中)

### 图标列表

1. **首页**
   - home.png (81x81px, 灰色)
   - home-active.png (81x81px, #667eea 紫色)
   - 图标: 🏠

2. **待办**
   - todo.png (81x81px, 灰色)
   - todo-active.png (81x81px, #667eea 紫色)
   - 图标: 📝
   - 徽章显示待办数量

3. **统计**
   - stats.png (81x81px, 灰色)
   - stats-active.png (81x81px, #667eea 紫色)
   - 图标: 📊

4. **设置**
   - settings.png (81x81px, 灰色)
   - settings-active.png (81x81px, #667eea 紫色)
   - 图标: ⚙️

## 临时方案

由于小程序 tabBar 只支持图片图标,不支持 emoji,您可以:

1. **使用在线图标生成器**:
   - https://www.iconfont.cn/
   - https://iconfinder.com/
   - 搜索 "home", "todo", "chart", "settings" 等关键词

2. **使用 SVG 转换工具**:
   - 下载 SVG 图标
   - 使用在线工具转换为 PNG
   - 调整尺寸为 81x81px

3. **使用简单图标**:
   - 从 https://github.com/ant-design/ant-design-icons 下载
   - 或从 https://ionicframework.com/docs/ionicons/ 下载

## 颜色规范

- 普通状态: #999999 (灰色)
- 激活状态: #667eea (紫色渐变色,可以使用单一色或渐变)
- 背景: #ffffff (白色)

## 尺寸要求

- 标准: 81x81px (3倍图)
- 推荐: 提供多种尺寸: 40x40, 60x60, 81x81

## 快速获取图标

访问以下链接获取免费图标:

- Flaticon: https://www.flaticon.com/
- Icons8: https://icons8.com/
- Heroicons: https://heroicons.com/

搜索关键词: "home", "task", "chart", "settings", "gear"
