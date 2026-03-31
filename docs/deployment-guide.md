# 云函数部署指南

## 一、环境准备

### 1. 开通云开发
1. 打开微信开发者工具
2. 进入项目设置 → 云开发设置
3. 点击"开通"按钮
4. 选择按量付费或套餐包（按量付费有免费额度）

### 2. 初始化云开发
1. 在开发者工具中点击"云开发"按钮
2. 创建云开发环境（环境名称建议：habit-tracker-dev）
3. 复制环境ID

### 3. 配置 project.config.json
```json
{
  "cloudbaseRoot": "./cloudfunctions/",
  "cloudfunctionRoot": "./cloudfunctions/",
  "cloudbaseRoot": "./cloudfunctions/",
  "miniprogramRoot": "./miniprogram/",
  "cloudbaseRoot": "./cloudfunctions/",
  "projectname": "habit-tracker",
  "appid": "你的小程序appid",
  "cloudfunctionRoot": "./cloudfunctions/"
}
```

## 二、数据库安全规则配置

### 1. 在云开发控制台配置安全规则

进入云开发控制台 → 数据库 → 安全规则

#### users 集合安全规则
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

#### categories 集合安全规则
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

#### habits 集合安全规则
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

#### checkins 集合安全规则
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

#### todos 集合安全规则
```json
{
  "read": "auth.openid == doc.openid",
  "write": "auth.openid == doc.openid"
}
```

### 2. 创建数据库索引

#### categories 集合索引
```
索引1: openid_1 (openid)
索引2: openid_sortOrder (openid, sortOrder)
```

#### habits 集合索引
```
索引1: openid_categoryId (openid, categoryId)
索引2: openid_active (openid, active)
索引3: openid_active_important (openid, active, important)
```

#### checkins 集合索引
```
索引1: openid_ymd (openid, ymd)
索引2: habitId_ymd (habitId, ymd)
索引3: openid_habitId (openid, habitId)
```

#### todos 集合索引
```
索引1: openid_completed (openid, completed)
索引2: openid_dueDate (openid, dueDate)
索引3: openid_priority (openid, priority)
```

## 三、云函数部署步骤

### 1. 安装依赖
在云开发根目录执行：
```bash
cd cloudfunctions/common
npm install
```

对每个云函数重复上述步骤（common, user, category, habit, checkin, stats, todos）

或者使用批量安装：
```bash
cd cloudfunctions
for dir in common user category habit checkin stats todos; do
  cd $dir && npm install && cd ..
done
```

### 2. 上传并部署云函数

在微信开发者工具中：

1. 右键点击云函数目录
2. 选择"上传并部署：云端安装依赖"
3. 等待上传完成

**部署顺序建议**：
1. 先部署 `common`（被其他云函数依赖）
2. 再部署 `user`
3. 然后部署 `category`, `habit`, `checkin`, `stats`, `todos`

### 3. 测试云函数

#### 测试 login 云函数
```javascript
wx.cloud.callFunction({
  name: 'login',
  success: res => {
    console.log('openid:', res.result.openid)
  }
})
```

#### 测试 user 云函数
```javascript
// 获取用户信息
wx.cloud.callFunction({
  name: 'user',
  data: {
    action: 'getProfile'
  },
  success: res => {
    console.log('用户信息:', res.result.data)
  }
})
```

#### 测试 category 云函数
```javascript
// 获取预设分类
wx.cloud.callFunction({
  name: 'category',
  data: {
    action: 'getPresets'
  },
  success: res => {
    console.log('预设分类:', res.result.data)
  }
})

// 创建分类
wx.cloud.callFunction({
  name: 'category',
  data: {
    action: 'create',
    data: {
      name: '测试分类',
      icon: '🏢',
      color: '#3b82f6'
    }
  },
  success: res => {
    console.log('创建成功:', res.result.data)
  }
})
```

#### 测试 habit 云函数
```javascript
// 创建习惯
wx.cloud.callFunction({
  name: 'habit',
  data: {
    action: 'create',
    data: {
      categoryId: '分类ID',
      name: '晨跑',
      timeRule: {
        type: 'daily',
        fixedTime: '07:00'
      },
      important: true
    }
  },
  success: res => {
    console.log('创建成功:', res.result.data)
  }
})

// 获取今日习惯
wx.cloud.callFunction({
  name: 'habit',
  data: {
    action: 'getTodayHabits',
    data: {
      hideCompleted: true
    }
  },
  success: res => {
    console.log('今日习惯:', res.result.data)
  }
})
```

#### 测试 checkin 云函数
```javascript
// 打卡
wx.cloud.callFunction({
  name: 'checkin',
  data: {
    action: 'checkin',
    data: {
      habitId: '习惯ID',
      note: '心情不错'
    }
  },
  success: res => {
    console.log('打卡成功:', res.result.data)
  }
})

// 获取今日打卡
wx.cloud.callFunction({
  name: 'checkin',
  data: {
    action: 'getToday'
  },
  success: res => {
    console.log('今日打卡:', res.result.data)
  }
})
```

#### 测试 todos 云函数
```javascript
// 创建待办
wx.cloud.callFunction({
  name: 'todos',
  data: {
    action: 'create',
    data: {
      title: '买牛奶',
      priority: 'normal',
      dueTime: '18:00'
    }
  },
  success: res => {
    console.log('创建成功:', res.result.data)
  }
})

// 获取待办列表
wx.cloud.callFunction({
  name: 'todos',
  data: {
    action: 'list',
    data: {
      completed: false
    }
  },
  success: res => {
    console.log('待办列表:', res.result.data)
  }
})
```

#### 测试 stats 云函数
```javascript
// 获取总体统计
wx.cloud.callFunction({
  name: 'stats',
  data: {
    action: 'getOverview',
    data: {
      range: 'month'
    }
  },
  success: res => {
    console.log('统计信息:', res.result.data)
  }
})
```

## 四、常见问题

### 1. 云函数上传失败
- 检查网络连接
- 检查云开发环境是否正确配置
- 检查云函数依赖是否正确安装

### 2. 数据库权限错误
- 检查安全规则是否正确配置
- 检查 openid 是否正确获取

### 3. 云函数调用超时
- 检查云函数逻辑是否有死循环
- 检查数据库查询是否有性能问题
- 考虑使用分页或索引优化

### 4. 依赖安装失败
- 删除 node_modules 和 package-lock.json
- 重新执行 npm install
- 或使用淘宝镜像：`npm install --registry=https://registry.npmmirror.com`

## 五、监控与调试

### 1. 查看云函数日志
进入云开发控制台 → 云函数 → 日志

### 2. 查看数据库操作
进入云开发控制台 → 数据库

### 3. 性能监控
进入云开发控制台 → 监控中心

## 六、下一步

1. ✅ 部署所有云函数
2. ✅ 配置数据库安全规则和索引
3. ⏳ 前端页面开发（集成云函数调用）
4. ⏳ 功能测试和调试
5. ⏳ 性能优化和上线准备
