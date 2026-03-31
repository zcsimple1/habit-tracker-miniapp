# 云环境配置与部署指南

## 前提条件

确保已完成以下步骤：
- ✅ 微信开发者工具已安装
- ✅ 项目已导入开发者工具
- ✅ AppID 已配置：`wx980f2fed4c1f4905`

---

## 步骤 1：开通云开发环境

### 1.1 登录微信开发者工具
- 点击右上角"登录"按钮
- 使用微信扫码登录

### 1.2 开通云开发
- **方式一：通过云开发按钮**
  1. 点击开发者工具顶部菜单栏的 **"云开发"**
  2. 如果已开通，直接跳到步骤 2
  3. 如果未开通，点击 **"开通"**

- **方式二：通过控制台**
  1. 访问 [腾讯云控制台](https://tcb.cloud.tencent.com/dev?envId=zcsimple1-yun001-5fwuf5q0949ed7d#/)
  2. 使用微信扫码登录

### 1.3 创建/选择环境

**创建新环境：**
```
环境名称: zcsimple1-yun001
基础版: 免费版（适合测试）
按量计费: 开启
```

**使用已有环境：**
- 确认环境 ID：`zcsimple1-yun001-5fwuf5q0949ed7d`

---

## 步骤 2：配置开发者工具的云环境

### 2.1 打开云开发设置
1. 点击 **工具栏** → **云开发设置**
2. 或者点击项目右上角的 **"云开发"图标**

### 2.2 选择环境
- 在弹出的对话框中，选择环境：`zcsimple1-yun001`
- 点击 **"确定"**

### 2.3 验证配置
- 打开控制台（Console）
- 应该看到类似输出：
  ```
  cloud sdk (build ts 1670494204239) injection skipped for sdk version 3.15.1
  ```

**如果还是报错 `env not exists`：**
- 检查环境 ID 是否正确
- 确认云环境已成功开通
- 尝试重启开发者工具

---

## 步骤 3：创建数据库集合

### 3.1 打开云开发控制台
1. 点击 **"云开发"** 按钮
2. 进入云开发控制台

### 3.2 创建数据库集合
在 **数据库** 标签页，依次创建以下集合：

| 集合名称 | 说明 |
|---------|------|
| `users` | 用户信息和偏好设置 |
| `categories` | 分类数据 |
| `habits` | 习惯/打卡项目 |
| `checkins` | 打卡记录 |
| `todos` | 待办事项 |

**创建步骤：**
1. 点击 **"+"** 添加集合
2. 输入集合名称
3. 点击 **"确定"**

### 3.3 配置数据库安全规则

**users 集合：**
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

**categories 集合：**
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

**habits 集合：**
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

**checkins 集合：**
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

**todos 集合：**
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

### 3.4 创建数据库索引（可选，推荐）

**checkins 集合：**
```
索引名: habit_ymd
字段: habitId, ymd
类型: 普通索引
```

**todos 集合：**
```
索引名: dueDate
字段: dueDate
类型: 普通索引
```

---

## 步骤 4：部署云函数

### 4.1 部署 common 云函数（必须最先部署）

**操作步骤：**
1. 在项目目录中找到 `cloudfunctions/common`
2. **右键点击** `common` 文件夹
3. 选择 **"上传并部署：云端安装依赖"**
4. 等待部署完成（查看底部日志）

**预期输出：**
```
[云函数] common 部署成功
```

### 4.2 批量部署其他云函数

**操作步骤：**
1. 在项目目录中找到 `cloudfunctions` 根目录
2. **右键点击** `cloudfunctions` 文件夹
3. 选择 **"上传并部署：云端安装依赖"**
4. 等待所有云函数部署完成

**或者逐个部署：**
依次右键以下文件夹，选择"上传并部署：云端安装依赖"：
- `user`
- `category`
- `habit`
- `checkin`
- `todos`
- `stats`

### 4.3 验证云函数部署

**在云开发控制台验证：**
1. 点击 **"云函数"** 标签页
2. 确认以下云函数都已部署：
  - ✅ common
  - ✅ user
  - ✅ category
  - ✅ habit
  - ✅ checkin
  - ✅ todos
  - ✅ stats

---

## 步骤 5：测试云函数

### 5.1 重新编译小程序
1. 点击开发者工具顶部的 **"编译"** 按钮
2. 等待编译完成

### 5.2 查看控制台输出

**正常输出（无错误）：**
```
[Perf] App.onLaunch took XXms
```

**如果还有错误：**

**错误：`cloud.callFunction:fail Error: errCode: -501000`**
- 原因：云环境未配置或环境 ID 错误
- 解决：回到步骤 2，重新配置云环境

**错误：`cloud.callFunction:fail Error: errCode: -504001`**
- 原因：云函数未部署
- 解决：回到步骤 4，重新部署对应的云函数

**错误：`timeout`**
- 原因：云函数执行超时
- 解决：在云开发控制台 → 云函数 → 配置 → 超时时间设置为 60 秒

---

## 步骤 6：功能测试

### 6.1 测试首页（习惯打卡）
1. 首次打开应该自动创建用户记录
2. 尝试添加分类
3. 尝试添加习惯
4. 尝试打卡

### 6.2 测试待办页面
1. 尝试添加待办
2. 尝试标记完成
3. 尝试删除待办

### 6.3 测试统计页面
1. 查看统计数据
2. 查看分类统计

---

## 常见问题

### Q1: 控制台显示 `env not exists`
**A:** 检查以下几点：
- app.js 中的 env 是否正确：`zcsimple1-yun001-5fwuf5q0949ed7d`
- 云开发是否已开通
- 是否在开发者工具中选择了正确的环境

### Q2: 云函数部署失败
**A:** 可能的原因：
- 网络问题 → 检查网络连接
- Node.js 版本不兼容 → 使用微信开发者工具内置的 Node.js
- 依赖安装失败 → 检查 package.json 配置

### Q3: 数据库操作失败
**A:** 检查：
- 数据库集合是否创建
- 安全规则是否配置正确
- 用户是否已登录（需要有 openid）

### Q4: 如何查看云函数日志
**A:**
1. 打开云开发控制台
2. 点击 **"云函数"** 标签页
3. 点击对应的云函数
4. 点击 **"日志"** 查看

### Q5: 如何重置数据库
**A:** 警告：会清空所有数据！
1. 打开云开发控制台 → 数据库
2. 点击集合名称
3. 点击 **"清空"**

---

## 云开发控制台链接

- **控制台首页**: https://tcb.cloud.tencent.com/dev?envId=zcsimple1-yun001-5fwuf5q0949ed7d#/
- **数据库管理**: https://tcb.cloud.tencent.com/dev?envId=zcsimple1-yun001-5fwuf5q0949ed7d#/database
- **云函数管理**: https://tcb.cloud.tencent.com/dev?envId=zcsimple1-yun001-5fwuf5q0949ed7d#/functions
- **存储管理**: https://tcb.cloud.tencent.com/dev?envId=zcsimple1-yun001-5fwuf5q0949ed7d#/storage

---

## 下一步

完成以上步骤后：
1. 小程序应该可以正常运行
2. 可以开始完整功能测试
3. 参考 `docs/deploy-and-test-guide.md` 进行详细测试

---

## 技术支持

- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [云开发文档](https://docs.cloudbase.net/)
- [错误代码查询](https://docs.cloudbase.net/error-code/)
