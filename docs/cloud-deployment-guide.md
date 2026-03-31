# 云函数部署指南

## 一、前提条件

1. 已安装微信开发者工具
2. 已创建微信小程序项目
3. 已开通云开发服务
4. 云开发环境已配置（在app.js中配置）

## 二、云函数列表

### 1. user - 用户管理
- 路径：`cloudfunctions/user/`
- 功能：获取/更新用户信息、用户偏好、用户统计

### 2. category - 分类管理
- 路径：`cloudfunctions/category/`
- 功能：创建、更新、删除、列表、排序分类

### 3. habit - 习惯管理
- 路径：`cloudfunctions/habit/`
- 功能：创建、更新、删除、列表习惯，获取今日习惯

### 4. checkin - 打卡功能
- 路径：`cloudfunctions/checkin/`
- 功能：打卡、取消打卡、跳过、获取打卡记录

### 5. todos - 待办管理
- 路径：`cloudfunctions/todos/`
- 功能：创建、更新、删除、切换状态待办

### 6. stats - 统计功能
- 路径：`cloudfunctions/stats/`
- 功能：获取总体统计、分类统计、习惯统计

### 7. common - 公共工具
- 路径：`cloudfunctions/common/`
- 功能：日期判断、统计更新等公共函数
- **部署顺序**：必须最先部署（其他云函数依赖它）

### 8. initDB - 数据库初始化 ⭐ 新增
- 路径：`cloudfunctions/initDB/`
- 功能：一键初始化数据库、创建用户记录、导入预设分类
- Actions：
  - `init`: 完整初始化（创建用户 + 导入预设分类）
  - `addPresetCategories`: 仅添加预设分类
  - `getStatus`: 检查数据库状态
- **使用方式**：通过数据库初始化页面调用

## 三、部署步骤

### 方法一：使用微信开发者工具图形界面（推荐）

1. **打开微信开发者工具**
   - 在开发者工具中打开项目 `habit-tracker-miniapp`

2. **部署云函数**
   - 在左侧项目文件树中，找到 `cloudfunctions` 目录
   - 右键点击需要部署的云函数文件夹（如 `user`、`category` 等）
   - 选择 **"上传并部署：云端安装依赖"**
   - 等待部署完成（每个云函数约需 10-30 秒）

3. **批量部署**
   - 可以依次右键每个云函数文件夹进行部署
   - 或者使用命令行批量部署（见方法二）

4. **查看部署状态**
   - 点击左侧的 **"云开发"** 按钮
   - 选择 **"云函数"** 标签
   - 查看云函数部署状态
   - 状态显示为 **"正常"** 表示部署成功

### 方法二：使用命令行部署

如果需要批量部署或自动化部署，可以使用命令行工具：

```bash
# 安装微信云开发命令行工具
npm install -g @cloudbase/cli

# 登录
cloudbase login

# 部署所有云函数
cloudbase functions:deploy cloudfunctions/user
cloudbase functions:deploy cloudfunctions/category
cloudbase functions:deploy cloudfunctions/habit
cloudbase functions:deploy cloudfunctions/checkin
cloudbase functions:deploy cloudfunctions/todos
cloudbase functions:deploy cloudfunctions/stats
cloudbase functions:deploy cloudfunctions/common
```

## 四、数据库初始化

### 1. 创建数据库集合

在云开发控制台创建以下集合：

| 集合名称 | 说明 |
|---------|------|
| users | 用户信息 |
| categories | 分类 |
| habits | 习惯 |
| checkins | 打卡记录 |
| todos | 待办任务 |

### 2. 配置数据库安全规则

在云开发控制台 -> 数据库 -> 安全规则中配置：

```json
{
  "users": {
    "read": "auth.openid == doc.openid",
    "write": "auth.openid == doc.openid"
  },
  "categories": {
    "read": "auth.openid == doc.openid",
    "write": "auth.openid == doc.openid"
  },
  "habits": {
    "read": "auth.openid == doc.openid",
    "write": "auth.openid == doc.openid"
  },
  "checkins": {
    "read": "auth.openid == doc.openid",
    "write": "auth.openid == doc.openid"
  },
  "todos": {
    "read": "auth.openid == doc.openid",
    "write": "auth.openid == doc.openid"
  }
}
```

### 3. 创建数据库索引（优化查询性能）

为以下字段创建索引：

- **users**:
  - `openid` (唯一索引)

- **categories**:
  - `openid + sortOrder` (复合索引)

- **habits**:
  - `openid + categoryId` (复合索引)
  - `openid + active` (复合索引)
  - `openid + active + important` (复合索引)

- **checkins**:
  - `openid + ymd` (复合索引)
  - `habitId + ymd` (复合索引)
  - `openid + habitId` (复合索引)

- **todos**:
  - `openid + completed` (复合索引)
  - `openid + dueDate` (复合索引)
  - `openid + priority` (复合索引)

## 五、测试步骤

### 1. 测试首页功能

1. 打开小程序，进入首页
2. 点击"管理分类"按钮
3. 在分类管理页面点击"+ 预设分类"
4. 选择一些预设分类并添加
5. 返回首页，点击"添加习惯"
6. 创建一个习惯，选择分类
7. 在首页进行打卡测试

### 2. 测试待办功能

1. 切换到"待办"Tab
2. 点击"添加待办"
3. 创建一个待办任务
4. 测试完成、编辑、删除功能

### 3. 测试分类模式/时间模式切换

1. 在首页切换"分类模式"和"时间模式"
2. 检查数据展示是否正确
3. 测试眼睛图标切换（显示/隐藏已完成）

### 4. 测试日期切换

1. 点击日期栏的左右箭头
2. 查看不同日期的打卡记录
3. 测试返回今天

## 六、常见问题

### 1. 云函数部署失败

**问题**：上传云函数时提示"网络错误"或"权限不足"

**解决方法**：
- 检查网络连接
- 确认云开发环境是否已开通
- 检查微信开发者工具版本（建议使用最新稳定版）

### 2. 云函数调用失败

**问题**：调用云函数时报错"云函数不存在"或"调用超时"

**解决方法**：
- 确认云函数已成功部署（状态为"正常"）
- 检查云函数名称是否正确
- 查看云函数日志，定位错误原因

### 3. 数据库权限问题

**问题**：数据库操作时报错"权限不足"

**解决方法**：
- 检查数据库安全规则配置
- 确认用户已登录（openid）
- 检查云函数中的openid验证逻辑

### 4. 数据未同步

**问题**：修改后数据未更新

**解决方法**：
- 检查网络连接
- 下拉刷新页面
- 检查云函数返回结果
- 查看云函数日志

## 七、性能优化建议

### 1. 云函数优化

- 使用索引优化数据库查询
- 避免频繁的数据库操作
- 使用缓存减少重复查询
- 批量操作使用事务

### 2. 前端优化

- 使用本地缓存减少云函数调用
- 合理使用分页加载
- 优化图片和资源加载
- 使用骨架屏提升用户体验

### 3. 数据库优化

- 合理设计索引
- 定期清理过期数据
- 使用聚合操作减少数据传输

## 八、监控与日志

### 1. 云函数监控

在云开发控制台可以查看：
- 云函数调用次数
- 云函数运行时间
- 云函数错误率

### 2. 云函数日志

查看云函数执行日志：
```javascript
// 在云函数中添加日志
console.log('开始处理请求')
console.error('错误信息:', err)
```

### 3. 数据库监控

在云开发控制台可以查看：
- 数据库读写次数
- 数据库容量使用
- 数据库性能指标

## 九、后续维护

### 1. 定期备份

定期备份重要数据：
```javascript
// 使用云函数定时任务备份数据
```

### 2. 更新云函数

当需要更新云函数时：
1. 修改云函数代码
2. 重新上传并部署
3. 测试验证

### 3. 监控告警

设置监控告警：
- 云函数调用失败告警
- 数据库异常告警
- 性能下降告警

## 十、联系方式

如有问题，请参考：
- 微信云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- 微信云开发社区：https://developers.weixin.qq.com/community/cloud
