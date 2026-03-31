# Habit Tracker Mini Program (习惯打卡小程序)

一个功能完善的微信小程序，支持习惯管理、分类打卡、待办事项、统计分析等功能。

## 核心功能

### 📝 习惯管理
- **分类管理**：支持多分类（工作、健康、学习等）
- **时间规则**：每日/工作日/周末/每周指定/自定义日期
- **固定时间**：设置固定打卡时间（如 08:00）
- **有效期**：设置习惯的开始和结束日期
- **重要标记**：重要习惯显示小红旗 🚩

### ✓ 每日打卡
- **双视图模式**：分类模式/时间模式自由切换
- **智能显示**：自动显示当日需要打卡的习惯
- **一键打卡**：简单的打卡操作
- **跳过功能**：支持跳过当日，不影响连续统计
- **历史查看**：左右滑动切换日期，查看历史记录
- **显示/隐藏**：眼睛图标控制已打卡项的显示

### 📋 待办事项
- **优先级管理**：紧急 > 高 > 普通 > 低
- **快速添加**：支持标题、描述、截止时间
- **分类关联**：可关联到习惯分类
- **完成管理**：完成后移到"已完成"区域
- **搜索功能**：快速查找待办事项

### 📊 数据统计
- **总体概况**：今日完成率、本月完成率、连续天数
- **分类统计**：按分类查看完成情况和进度条
- **排行榜**：完成率排行榜，前3名特殊标识
- **日期范围**：支持本周/本月/本年/自定义

## 技术方案
- **前端**：微信小程序原生开发
- **后端**：CloudBase 云开发
- **数据库**：CloudBase 文档数据库 (NoSQL)
- **云函数**：7个云函数（user, category, habit, checkin, todos, stats, common）

## 云开发环境
- **主环境ID**: `cloudbase-8gw8fj3c75c015f6`
- **备用环境ID**: `zcsimple1-yun001-5fwuf5q0949ed7d`
- **环境名称**: cloudbase-8gw8fj3c75c015f6 (当前使用)
- **数据库集合**:
  - `users`: 用户信息和偏好设置
  - `categories`: 分类数据
  - `habits`: 习惯/打卡项目
  - `checkins`: 打卡记录
  - `todos`: 待办事项

## 快速开始

### 🚀 一键初始化（推荐）
```bash
# 最快的上手方式 - 只需点击一个按钮！
参考: docs/quick-start-guide.md
```

### 📚 详细配置
```bash
# 如果需要详细了解每个步骤
参考: docs/cloud-setup-guide.md
```

### 1. 开发环境准备
```bash
# 克隆项目
git clone [repository-url]
cd habit-tracker-miniapp
```

### 2. 配置小程序
1. 使用微信开发者工具打开项目
2. AppID 使用: `wx980f2fed4c1f4905`
3. 配置云开发环境ID（已在app.js中配置）

### 3. 部署云函数
在微信开发者工具中：
1. 找到 `cloudfunctions` 目录
2. 右键点击每个云函数文件夹，选择"上传并部署：云端安装依赖"
3. 等待部署完成（按顺序部署：common → user → category → habit → checkin → todos → stats）

### 4. 初始化数据库
在云开发控制台：
1. 创建数据库集合：users, categories, habits, checkins, todos
2. 配置安全规则（见 `docs/cloud-deployment-guide.md`）
3. 创建数据库索引（优化查询性能）

### 5. 开始使用
1. 点击"编译"在模拟器中预览
2. 点击"预览"扫码在微信中体验

## 项目结构

```
habit-tracker-miniapp/
├── miniprogram/              # 小程序前端
│   ├── pages/               # 页面
│   │   ├── index/          # 首页（打卡）
│   │   ├── todos/          # 待办页面
│   │   ├── stats/          # 统计中心
│   │   ├── habit-form/     # 习惯表单
│   │   ├── category-manage/# 分类管理
│   │   ├── category-form/  # 分类表单
│   │   ├── todo-form/      # 待办表单
│   │   └── preset-categories/# 预设分类
│   ├── app.js              # 小程序入口
│   ├── app.json            # 小程序配置
│   └── utils/              # 工具函数
├── cloudfunctions/          # 云函数
│   ├── user/               # 用户管理
│   ├── category/           # 分类管理
│   ├── habit/              # 习惯管理
│   ├── checkin/            # 打卡功能
│   ├── todos/              # 待办管理
│   ├── stats/              # 统计功能
│   ├── common/             # 公共工具
│   └── login/              # 登录
├── docs/                   # 文档
│   ├── design-v2.md       # 设计文档
│   ├── backend-design.md  # 后端设计
│   ├── quick-start-guide.md       # 快速开始指南 ⭐ 新增
│   ├── cloud-setup-guide.md        # 云环境配置指南
│   ├── cloud-deployment-guide.md  # 云函数部署指南
│   ├── deployment-checklist.md    # 部署检查清单 ⭐ 新增
│   ├── deploy-and-test-guide.md   # 测试指南
│   └── project-completion-report.md # 完成报告
└── config/                # 配置文件
```

## 云函数说明

| 云函数 | 功能 | Actions |
|--------|------|---------|
| **user** | 用户管理 | getProfile, updateProfile, updatePreferences, getStats |
| **category** | 分类管理 | list, get, create, update, delete, reorder |
| **habit** | 习惯管理 | list, getByCategory, getTodayHabits, get, create, update, delete, toggle, reorder |
| **checkin** | 打卡功能 | checkin, uncheckin, skip, unskip, getToday, getHistory, getByDate |
| **todos** | 待办管理 | list, get, create, update, delete, toggle, archive, getByDate |
| **stats** | 统计功能 | getOverview, getCategoryStats, getHabitStats, getTrend, getRanking |
| **common** | 公共工具 | shouldShowOnDate, updateStats, calculateStreak |
| **initDB** | 数据库初始化 ⭐ | init, addPresetCategories, getStatus |

## 开发进度

### ✅ 已完成
- [x] 云函数开发（8个）包含 initDB 一键初始化
- [x] 前端页面开发（9个）包含数据库初始化页面
- [x] 核心功能实现
- [x] UI/UX设计
- [x] 项目文档（5份完整文档）

### 🚧 待完成
- [ ] 配置云开发环境
- [ ] 部署云函数（8个）
- [ ] 初始化数据库
- [ ] 功能测试
- [ ] 性能优化
- [ ] 提交审核

## Roadmap

### 短期（1-2周）
- [ ] 部署测试
- [ ] 性能优化
- [ ] 用户体验优化
- [ ] Bug修复

### 中期（1-2月）
- [ ] 习惯详情页
- [ ] 成就分享功能
- [ ] 订阅消息提醒
- [ ] 数据导出
- [ ] ECharts图表集成

### 长期（3-6月）
- [ ] AI智能推荐
- [ ] 打卡圈子
- [ ] 团队功能
- [ ] 跨平台支持
- [ ] 企业版

## 文档

- [快速开始指南](./docs/quick-start-guide.md) - ⭐ 最快的上手方式（推荐）
- [部署检查清单](./docs/deployment-checklist.md) - ⭐ 完整的部署验证清单
- [云环境配置指南](./docs/cloud-setup-guide.md) - 云环境配置详细步骤
- [云函数部署指南](./docs/cloud-deployment-guide.md) - 云函数部署步骤
- [测试指南](./docs/deploy-and-test-guide.md) - 完整的测试流程
- [完成报告](./docs/project-completion-report.md) - 项目完成情况总结

## 技术亮点

- **模块化设计**：清晰的代码结构，易于维护和扩展
- **完善的文档**：从设计到部署的完整文档
- **现代化UI**：渐变色主题，卡片式布局
- **优秀的UX**：流畅的交互动画，友好的错误提示
- **可扩展性**：预留扩展接口，易于添加新功能

## 常见问题

### Q: 如何部署云函数？
A: 请参考 [部署指南](./docs/cloud-deployment-guide.md)

### Q: 如何配置数据库？
A: 请参考 [部署指南](./docs/cloud-deployment-guide.md) 中的数据库初始化部分

### Q: 如何进行测试？
A: 请参考 [测试指南](./docs/deploy-and-test-guide.md)

## 贡献指南

欢迎贡献代码、提出建议或报告bug！

## 许可证

MIT License

## 联系方式

- GitHub Issues: [项目地址]/issues
- 邮箱: [联系邮箱]

---

**版本**: v1.0.0

**最后更新**: 2026-03-31

