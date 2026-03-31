# 部署与测试指南

## 一、准备工作

### 1. 确认开发环境

- [ ] 已安装微信开发者工具（最新稳定版）
- [ ] 已创建微信小程序项目
- [ ] 已开通云开发服务
- [ ] 云开发环境ID已配置（app.js中）

### 2. 检查项目文件

确保以下文件都已创建：

#### 前端页面
- [ ] miniprogram/pages/index/ (首页）
- [ ] miniprogram/pages/todos/ (待办）
- [ ] miniprogram/pages/stats/ (统计）
- [ ] miniprogram/pages/habit-form/ (习惯表单）
- [ ] miniprogram/pages/category-manage/ (分类管理）
- [ ] miniprogram/pages/category-form/ (分类表单）
- [ ] miniprogram/pages/todo-form/ (待办表单）
- [ ] miniprogram/pages/preset-categories/ (预设分类）

#### 云函数
- [ ] cloudfunctions/user/ (用户管理）
- [ ] cloudfunctions/category/ (分类管理）
- [ ] cloudfunctions/habit/ (习惯管理）
- [ ] cloudfunctions/checkin/ (打卡功能）
- [ ] cloudfunctions/todos/ (待办管理）
- [ ] cloudfunctions/stats/ (统计功能）
- [ ] cloudfunctions/common/ (公共工具）

## 二、部署云函数

### 方法一：使用微信开发者工具（推荐）

1. **打开项目**
   - 用微信开发者工具打开项目目录 `habit-tracker-miniapp`

2. **部署所有云函数**
   - 在左侧项目文件树中找到 `cloudfunctions` 目录
   - 依次右键点击以下云函数文件夹，选择 **"上传并部署：云端安装依赖"**：
     - `common` (公共工具，需要先部署）
     - `user`
     - `category`
     - `habit`
     - `checkin`
     - `todos`
     - `stats`

3. **检查部署状态**
   - 点击左侧 **"云开发"** 按钮
   - 选择 **"云函数"** 标签
   - 确认所有云函数状态显示为 **"正常"**

### 方法二：使用命令行部署

```bash
# 安装云开发 CLI
npm install -g @cloudbase/cli

# 登录
cloudbase login

# 部署云函数（按顺序）
cd cloudfunctions/common && npm install && cd ../..
cd cloudfunctions/user && npm install && cd ../..
cd cloudfunctions/category && npm install && cd ../..
cd cloudfunctions/habit && npm install && cd ../..
cd cloudfunctions/checkin && npm install && cd ../..
cd cloudfunctions/todos && npm install && cd ../..
cd cloudfunctions/stats && npm install && cd ../..

# 使用云开发 CLI 上传
cloudbase functions:deploy cloudfunctions/common
cloudbase functions:deploy cloudfunctions/user
cloudbase functions:deploy cloudfunctions/category
cloudbase functions:deploy cloudfunctions/habit
cloudbase functions:deploy cloudfunctions/checkin
cloudbase functions:deploy cloudfunctions/todos
cloudbase functions:deploy cloudfunctions/stats
```

## 三、初始化数据库

### 1. 创建数据库集合

在微信开发者工具中：
1. 点击左侧 **"云开发"** 按钮
2. 选择 **"数据库"** 标签
3. 点击 **"+"** 创建以下集合：
   - `users`
   - `categories`
   - `habits`
   - `checkins`
   - `todos`

### 2. 配置数据库安全规则

在每个集合的 **"安全规则"** 中配置：

#### users 集合
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

#### categories 集合
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

#### habits 集合
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

#### checkins 集合
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

#### todos 集合
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

### 3. 创建数据库索引（优化性能）

#### users 集合
- 字段：`openid`，类型：唯一索引

#### categories 集合
- 复合索引：`openid` + `sortOrder`

#### habits 集合
- 复合索引：`openid` + `categoryId`
- 复合索引：`openid` + `active`
- 复合索引：`openid` + `active` + `important`

#### checkins 集合
- 复合索引：`openid` + `ymd`
- 复合索引：`habitId` + `ymd`
- 复合索引：`openid` + `habitId`

#### todos 集合
- 复合索引：`openid` + `completed`
- 复合索引：`openid` + `dueDate`
- 复合索引：`openid` + `priority`

## 四、功能测试

### 测试步骤

#### 1. 初始化测试

**目标**：验证用户信息初始化功能

**步骤**：
1. 打开小程序
2. 登录微信账号
3. 观察是否自动创建用户记录

**预期结果**：
- ✅ 登录成功
- ✅ 自动在 `users` 集合中创建用户记录
- ✅ 用户偏好设置已初始化（viewMode: 'category', showCompleted: false）

#### 2. 分类管理测试

**目标**：验证分类的创建、编辑、删除功能

**步骤**：
1. 进入首页，点击 **"管理分类"** 按钮
2. 点击 **"+ 预设分类"** 按钮
3. 选择几个预设分类并添加
4. 在分类管理页面测试：
   - 编辑分类名称、图标、颜色
   - 删除分类（如果该分类下有习惯，应提示无法删除）

**预期结果**：
- ✅ 预设分类成功添加
- ✅ 分类列表正确显示
- ✅ 编辑功能正常
- ✅ 删除功能正常（有检查）
- ✅ 分类统计信息正确

#### 3. 习惯创建测试

**目标**：验证习惯的创建和编辑功能

**步骤**：
1. 返回首页
2. 点击 **"+ 添加习惯"** 按钮
3. 填写习惯信息：
   - 名称：如"晨跑"
   - 选择分类
   - 设置时间规则（如：每日）
   - 设置固定时间（如：07:00）
   - 标记为重要
4. 保存习惯
5. 再次编辑习惯，修改信息
6. 测试删除习惯

**预期结果**：
- ✅ 习惯创建成功
- ✅ 习惯信息正确显示
- ✅ 编辑功能正常
- ✅ 删除功能正常
- ✅ 重要标记（小红旗）显示

#### 4. 打卡功能测试

**目标**：验证打卡、取消打卡、跳过功能

**步骤**：
1. 在首页查看今日习惯列表
2. 点击习惯的圆圈按钮进行打卡
3. 检查状态变化：
   - 圆圈变为绿色打勾
   - 显示打卡时间
   - 项目隐藏（如果 showCompleted 为 false）
4. 点击眼睛图标，显示已完成项
5. 点击绿色打勾，取消打卡
6. 长按习惯项，选择"跳过今天"
7. 检查跳过状态

**预期结果**：
- ✅ 打卡成功，状态更新
- ✅ 取消打卡成功
- ✅ 跳过功能正常
- ✅ 眼睛图标切换显示/隐藏
- ✅ 打卡时间显示正确

#### 5. 分类模式/时间模式切换测试

**目标**：验证两种视图模式的切换

**步骤**：
1. 在首页切换到 **"分类模式"**
2. 检查习惯按分类分组显示
3. 测试分类折叠/展开
4. 切换到 **"时间模式"**
5. 检查习惯按时间排序显示
6. 检查总体统计显示
7. 检查分类图标显示

**预期结果**：
- ✅ 分类模式正确分组
- ✅ 分类折叠/展开正常
- ✅ 时间模式正确排序
- ✅ 总体统计正确显示
- ✅ 分类图标正确显示

#### 6. 日期切换测试

**目标**：验证日期查看和切换功能

**步骤**：
1. 点击日期栏的 **"◀"** 按钮，查看昨天
2. 检查是否只显示（历史查看）
3. 点击 **"▶"** 按钮，返回今天
4. 多次切换日期

**预期结果**：
- ✅ 日期切换正常
- ✅ 历史数据正确显示
- ✅ 返回今天正常

#### 7. 待办功能测试

**目标**：验证待办的创建、编辑、完成、删除功能

**步骤**：
1. 切换到 **"待办"** Tab
2. 点击 **"+ 添加"** 按钮
3. 填写待办信息：
   - 标题：如"买牛奶"
   - 优先级：选择不同优先级
   - 标记为重要
   - 选择分类
   - 设置截止时间
4. 保存待办
5. 检查待办列表：
   - 按优先级分组显示
   - 重要标记显示
   - 截止时间显示
6. 点击复选框，完成待办
7. 检查待办移到"已完成"区域
8. 点击已完成待办的"恢复"按钮
9. 测试编辑和删除功能

**预期结果**：
- ✅ 待办创建成功
- ✅ 优先级分组正确
- ✅ 重要标记显示
- ✅ 完成状态切换正常
- ✅ 已完成区域显示
- ✅ 恢复功能正常
- ✅ 编辑和删除功能正常

#### 8. 搜索功能测试

**目标**：验证待办搜索功能

**步骤**：
1. 在待办页面创建多个待办
2. 在搜索框输入关键词
3. 点击搜索按钮

**预期结果**：
- ✅ 搜索结果正确
- ✅ 支持标题匹配

#### 9. 统计功能测试

**目标**：验证统计数据展示

**步骤**：
1. 切换到 **"统计"** Tab
2. 检查总体概况：
   - 今日完成情况
   - 本月完成率
   - 连续天数
   - 活跃习惯数
3. 检查分类统计：
   - 按分类显示完成率
   - 进度条显示
4. 检查排行榜：
   - 完成率排行
   - 前3名特殊颜色
5. 切换日期范围：
   - 本周/本月/本年/自定义

**预期结果**：
- ✅ 总体概况数据正确
- ✅ 分类统计正确
- ✅ 排行榜正确
- ✅ 日期范围切换正常

## 五、常见问题排查

### 问题1：云函数部署失败

**现象**：上传云函数时报错

**可能原因**：
1. 网络问题
2. 云开发环境未开通
3. 云函数代码有语法错误

**解决方法**：
1. 检查网络连接
2. 确认云开发环境已开通
3. 查看云函数代码是否有语法错误
4. 查看"云开发控制台 -> 云函数"中的错误日志

### 问题2：数据库权限错误

**现象**：操作数据库时报错"权限不足"

**可能原因**：
1. 数据库安全规则配置错误
2. 用户未登录

**解决方法**：
1. 检查数据库安全规则配置
2. 确认用户已登录（openid）
3. 在云开发控制台手动检查数据库权限

### 问题3：云函数调用失败

**现象**：调用云函数时报错

**可能原因**：
1. 云函数未部署
2. 云函数代码有运行时错误
3. 参数错误

**解决方法**：
1. 确认云函数已部署（状态为"正常"）
2. 查看"云开发控制台 -> 云函数"中的日志
3. 检查调用参数是否正确

### 问题4：数据未同步

**现象**：修改后数据未更新

**可能原因**：
1. 网络问题
2. 云函数调用失败
3. 未调用 setData 更新 UI

**解决方法**：
1. 检查网络连接
2. 查看云函数日志
3. 检查是否正确调用 setData
4. 手动下拉刷新

### 问题5：统计数据错误

**现象**：统计数据与实际不符

**可能原因**：
1. 统计缓存过期
2. 数据库数据异常

**解决方法**：
1. 重新加载统计数据
2. 在云开发控制台检查数据库数据
3. 清除缓存后重新计算

## 六、性能优化建议

### 1. 前端优化

- [ ] 实现本地缓存，减少云函数调用
- [ ] 添加下拉刷新和加载更多
- [ ] 使用骨架屏提升加载体验
- [ ] 优化图片和资源加载

### 2. 后端优化

- [ ] 使用数据库索引优化查询
- [ ] 实现统计数据缓存
- [ ] 批量操作使用事务
- [ ] 定期清理过期数据

### 3. 监控与日志

- [ ] 配置云函数监控告警
- [ ] 添加关键操作日志
- [ ] 定期查看错误日志
- [ ] 性能指标监控

## 七、上线准备

### 1. 代码检查

- [ ] 移除所有 console.log 和调试代码
- [ ] 检查所有错误处理
- [ ] 验证所有边界情况
- [ ] 完成代码审查

### 2. 测试验证

- [ ] 功能测试完成
- [ ] 兼容性测试（iOS/Android）
- [ ] 性能测试
- [ ] 用户体验测试

### 3. 文档完善

- [ ] 用户使用说明
- [ ] 运维文档
- [ ] 故障排查手册
- [ ] 版本更新日志

### 4. 提交审核

- [ ] 完善小程序信息
- [ ] 准备审核材料
- [ ] 提交微信审核
- [ ] 等待审核通过

## 八、维护与更新

### 日常维护

- 定期检查云函数运行状态
- 监控数据库使用情况
- 查看用户反馈
- 及时修复bug

### 版本更新

1. 修改版本号（app.json）
2. 更新更新日志（docs/changelog.md）
3. 测试新功能
4. 部署云函数
5. 提交小程序审核

### 数据备份

- 定期备份数据库
- 导出重要数据
- 验证备份数据完整性

## 九、联系方式

### 技术支持

- 微信云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- 微信云开发社区：https://developers.weixin.qq.com/community/cloud
- 项目文档：./docs/

### 问题反馈

- GitHub Issues：[项目地址]/issues
- 邮箱：[联系邮箱]

---

**最后更新**：2026-03-31
**版本**：v1.0.0
