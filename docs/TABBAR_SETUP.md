# TabBar 图标设置说明

## 当前状态

小程序已配置了4个底部导航页面:
- 首页 (`pages/index/index`)
- 待办 (`pages/todos/todos`)
- 统计 (`pages/stats/stats`)
- 设置 (`pages/settings/settings`)

## 图标问题

微信小程序的 tabBar 只支持图片图标,不支持 emoji 或文字。当前配置需要以下图标文件:

```
miniprogram/images/tabbar/
├── home.png              # 首页图标(未选中)
├── home-active.png       # 首页图标(选中)
├── todo.png              # 待办图标(未选中)
├── todo-active.png       # 待办图标(选中)
├── stats.png             # 统计图标(未选中)
├── stats-active.png      # 统计图标(选中)
├── settings.png          # 设置图标(未选中)
└── settings-active.png   # 设置图标(选中)
```

## 临时解决方案

如果您暂时没有图标文件,可以使用以下方案:

### 方案 1: 移除 tabBar,使用自定义导航

修改 `miniprogram/app.json`,移除 `tabBar` 配置,在每个页面底部添加自定义导航栏。

### 方案 2: 下载免费图标

推荐以下免费图标资源:

1. **IconFont (阿里巴巴矢量图标库)**
   - 网址: https://www.iconfont.cn/
   - 搜索关键词: "home", "todo", "chart", "settings"
   - 下载 81x81px 的 PNG 图片

2. **Icons8**
   - 网址: https://icons8.com/icons/set/
   - 可下载 PNG 格式
   - 推荐: "home", "checklist", "chart", "settings"

3. **Flaticon**
   - 网址: https://www.flaticon.com/
   - 搜索相关关键词下载

### 方案 3: 使用 SVG 转换工具

1. 从 GitHub 下载 SVG 图标
2. 使用在线工具转换:
   - https://cloudconvert.com/svg-to-png
   - https://svgtopng.com/
3. 设置尺寸为 81x81px

## 图标设计规范

- **尺寸**: 81x81px (3倍图,适配高分屏)
- **格式**: PNG (支持透明背景)
- **颜色**:
  - 未选中: #999999 (灰色)
  - 选中: #667eea (紫色)
- **样式**: 简洁线条图标或填充图标
- **背景**: 透明

## 快速测试

如果您想快速测试,可以暂时:

1. 创建简单的纯色方块图标 (临时方案)
2. 或移除 tabBar 配置,使用页面内导航

## 设计参考

参考设计预览中的图标风格:
- 首页: 🏠 房子图标
- 待办: 📝 笔记本图标
- 统计: 📊 图表图标
- 设置: ⚙️ 齿轮图标

## 自动化脚本

如果您需要批量生成图标,可以使用以下工具:

```bash
# 使用 imagemagick (需要安装)
convert -size 81x81 xc:#999999 images/tabbar/home.png
convert -size 81x81 xc:#667eea images/tabbar/home-active.png
```

## 联系

如有问题,请查看:
- 微信小程序官方文档: https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/tabBar.html
- 项目设计文档: `docs/design-v2.md`
