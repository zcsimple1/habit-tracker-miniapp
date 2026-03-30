# 习惯打卡系统 V2 设计方案

## 一、需求概述

### 核心需求
1. **分类管理**：支持多分类（上班、下班、儿子、女儿、家务等）
2. **多项目打卡**：每个分类下可有多条打卡项目
3. **时间规则**：
   - 固定时间打卡（如：早上9点、晚上8点）
   - 工作日/周末区分
   - 循环规则（每日、工作日、每周指定日期）
   - 起始时间和结束时间
4. **智能显示**：
   - 首页只显示当天需要打卡的内容
   - 已打卡项目可隐藏
   - 隐藏列表中可取消打卡记录
5. **统计功能**：保持原有的连续天数、完成率等统计
6. **重要标记**：添加习惯时可设置为"重要"，列表项右侧显示小红旗 🚩 标识
7. **历史查看**：首页支持左右滑动切换日期，查看任意一天的打卡记录
8. **当日跳过**：长按列表项可跳过当日打卡，跳过后当日不再显示，不影响连续统计

---

## 二、数据模型设计

### 2.1 分类（Category）

```javascript
{
  _id: "cat_xxx",           // 分类ID
  openid: "user_openid",    // 用户ID
  name: "上班内容",          // 分类名称
  icon: "briefcase",        // 图标（可选）
  color: "#4f46e5",         // 颜色
  sortOrder: 1,             // 排序权重
  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

### 2.2 打卡项目（Habit）

```javascript
{
  _id: "habit_xxx",         // 项目ID
  openid: "user_openid",    // 用户ID
  categoryId: "cat_xxx",    // 所属分类ID
  
  // 基本信息
  name: "写日报",            // 项目名称
  description: "",          // 描述（可选）
  
  // 时间规则
  timeRule: {
    type: "daily" | "weekdays" | "weekend" | "weekly" | "custom",
    // daily: 每日
    // weekdays: 仅工作日（周一到周五）
    // weekend: 仅周末（周六周日）
    // weekly: 每周指定日期（如每周一、三、五）
    // custom: 自定义日期
    
    weekDays: [1, 3, 5],    // 仅当 type="weekly" 时有效，1=周一，7=周日
    customDates: [],        // 仅当 type="custom" 时有效，具体日期数组
    
    fixedTime: "09:00",     // 固定打卡时间（可选，如 "09:00"）
    timeRange: {            // 时间范围（可选）
      start: "08:00",
      end: "10:00"
    },
    
    startDate: "2026-01-01", // 开始日期（可选）
    endDate: "2026-12-31"    // 结束日期（可选）
  },
  
  // 提醒设置（未来扩展）
  reminder: {
    enabled: false,
    time: "09:00",
    advanceMinutes: 10
  },
  
  // 重要标记
  important: false,         // 是否为重要项目，true 时显示小红旗
  
  // 状态
  active: true,             // 是否启用
  sortOrder: 1,             // 排序权重
  
  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

### 2.3 打卡记录（Checkin）

```javascript
{
  _id: "checkin_xxx",       // 记录ID，格式：${openid}_${habitId}_${ymd}
  openid: "user_openid",
  habitId: "habit_xxx",
  
  ymd: "2026-03-30",        // 打卡日期
  time: "09:15:30",         // 打卡时间（时分秒）
  timestamp: 1234567890,    // 打卡时间戳
  
  // 跳过标记
  skipped: false,           // true 表示当日跳过，不纳入统计
  
  // 额外信息（可选）
  note: "",                 // 备注
  location: null,          // 位置（未来扩展）
  
  createdAt: 1234567890
}
```

### 2.4 本地缓存结构（Storage）

```javascript
{
  categories: [],           // 分类列表
  habits: [],               // 项目列表
  checkins: {
    [habitId]: {
      [ymd]: {
        time: "09:15:30",
        timestamp: 1234567890
      }
    }
  },
  lastSyncTime: 1234567890  // 最后同步时间
}
```

---

## 三、核心算法设计

### 3.1 判断某项目是否在指定日期显示

```javascript
/**
 * 判断项目在指定日期是否需要打卡
 * @param {Object} habit - 项目对象
 * @param {String} ymd - 日期 YYYY-MM-DD
 * @returns {Boolean}
 */
function shouldShowOnDate(habit, ymd) {
  // 1. 项目未启用，不显示
  if (!habit.active) return false;
  
  // 2. 检查日期范围
  if (habit.timeRule.startDate && ymd < habit.timeRule.startDate) return false;
  if (habit.timeRule.endDate && ymd > habit.timeRule.endDate) return false;
  
  // 3. 检查循环规则
  const date = new Date(ymd);
  const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
  
  switch (habit.timeRule.type) {
    case 'daily':
      return true;
      
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
      
    case 'weekend':
      return dayOfWeek === 0 || dayOfWeek === 6;
      
    case 'weekly':
      return habit.timeRule.weekDays.includes(dayOfWeek);
      
    case 'custom':
      return habit.timeRule.customDates.includes(ymd);
      
    default:
      return true;
  }
}
```

### 3.2 获取今日需要打卡的项目列表

```javascript
/**
 * 获取今日需要打卡的项目（按分类分组）
 * @param {Boolean} hideCompleted - 是否隐藏已完成
 * @returns {Array} 分类数组，每个分类包含项目列表
 */
function getTodayHabits(hideCompleted = true) {
  const today = toYMD(new Date());
  const categories = listCategories();
  const habits = listHabits();
  
  return categories.map(cat => {
    const categoryHabits = habits
      .filter(h => h.categoryId === cat._id)
      .filter(h => shouldShowOnDate(h, today))
      .filter(h => !hideCompleted || !isChecked(h._id, today))
      .map(h => ({
        ...h,
        checked: isChecked(h._id, today),
        categoryName: cat.name,
        categoryColor: cat.color
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    
    return {
      ...cat,
      habits: categoryHabits
    };
  }).filter(cat => cat.habits.length > 0);
}
```

### 3.3 获取已隐藏的打卡记录

```javascript
/**
 * 获取今日已打卡但已隐藏的项目
 * @returns {Array}
 */
function getHiddenCheckins() {
  const today = toYMD(new Date());
  const categories = listCategories();
  const habits = listHabits();
  
  return categories.map(cat => {
    const hiddenHabits = habits
      .filter(h => h.categoryId === cat._id)
      .filter(h => isChecked(h._id, today))
      .map(h => ({
        ...h,
        checked: true,
        checkinTime: getCheckinTime(h._id, today),
        categoryName: cat.name,
        categoryColor: cat.color
      }));
    
    return {
      ...cat,
      habits: hiddenHabits
    };
  }).filter(cat => cat.habits.length > 0);
}
```

---

## 四、预设分类与排序规则

### 4.1 预设分类

系统提供以下预设分类模板，用户可选择使用：

```javascript
const PRESET_CATEGORIES = [
  {
    name: '工作',
    icon: 'briefcase',
    color: '#3b82f6',
    description: '工作任务、会议、日报等'
  },
  {
    name: '健康',
    icon: 'heart',
    color: '#ef4444',
    description: '运动、健身、饮食等'
  },
  {
    name: '学习',
    icon: 'book',
    color: '#8b5cf6',
    description: '阅读、课程、技能学习等'
  },
  {
    name: '家庭',
    icon: 'home',
    color: '#f59e0b',
    description: '家务、陪伴家人等'
  },
  {
    name: '孩子',
    icon: 'users',
    color: '#10b981',
    description: '接送孩子、辅导作业等'
  },
  {
    name: '财务',
    icon: 'wallet',
    color: '#06b6d4',
    description: '记账、理财、账单支付等'
  },
  {
    name: '个人成长',
    icon: 'star',
    color: '#ec4899',
    description: '冥想、反思、日记等'
  },
  {
    name: '社交',
    icon: 'message-circle',
    color: '#f97316',
    description: '联系朋友、社交活动等'
  },
  {
    name: '其它',
    icon: 'more-horizontal',
    color: '#6b7280',
    description: '其他未分类的打卡项目'
  }
];
```

**使用流程**：
1. 首次进入"分类管理"页面时，显示"添加预设分类"按钮
2. 点击后展示预设分类列表，可多选添加
3. 添加后可编辑或删除

### 4.2 排序规则

#### 同一分类内的项目排序
1. **按时间排序**：
   - 有固定时间的项目，按时间升序排列（如 08:00 → 09:00 → 18:00）
   - 没有固定时间的项目，排在所有有时间项目的后面
   - 时间相同或都没有时间，按创建时间排序

```javascript
function sortHabitsByTime(habits) {
  return habits.sort((a, b) => {
    const timeA = a.timeRule?.fixedTime || '';
    const timeB = b.timeRule?.fixedTime || '';
    
    // 都有时间，按时间排序
    if (timeA && timeB) {
      return timeA.localeCompare(timeB);
    }
    
    // 一个有时间，一个没有，有时间的排前面
    if (timeA && !timeB) return -1;
    if (!timeA && timeB) return 1;
    
    // 都没有时间，按创建时间排序
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}
```

#### 分类排序
- 用户可手动拖拽排序
- 默认按创建时间排序

## 五、UI/UX 设计

### 5.1 排序模式设计

#### 两种排序模式

用户可在今日打卡页面切换排序模式：

**模式 1：按分类分组（默认）**
```
┌─────────────────────────────────┐
│  今日打卡              [👁]     │
│  ◀ 2026年3月30日 周一 ▶         │
│  📋 分类模式 | 时间模式          │
├─────────────────────────────────┤
│  ┌──────────────────────────┐    │
│  │ 🏢 工作 (3项待完成)    ▼  │    │
│  ├──────────────────────────┤    │
│  │ ○ 08:00 早会       🚩   │    │
│  │ ○ 09:30 提交周报         │    │
│  │ ○ 写日报                 │    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ ❤️ 健康 (2项待完成)    ▼  │    │
│  ├──────────────────────────┤    │
│  │ ○ 07:00 晨跑        🚩   │    │
│  │ ○ 健身                   │    │
│  └──────────────────────────┘    │
└─────────────────────────────────┘
```

**模式 2：按时间排序**
```
┌─────────────────────────────────┐
│  今日打卡              [👁]     │
│  ◀ 2026年3月30日 周一 ▶         │
│  📅 时间模式 | 分类模式          │
│  已完成 1/9 项                  │  ← 总体统计
├─────────────────────────────────┤
│  ○ [❤️] 07:00 晨跑        🚩   │
│  ○ [🏢] 08:00 早会              │
│  ○ [🏢] 09:30 提交周报          │
│  ○ [👶] 16:30 接女儿放学        │
│  ○ [🏢] 写日报                 │
│  ○ [❤️] 健身                   │
│  ○ [👶] 讲睡前故事              │
└─────────────────────────────────┘
```

**眼睛打开时（显示已打卡/已跳过项）**：
```
┌─────────────────────────────────┐
│  今日打卡              [👁]     │  ← 睁眼状态
│  ◀ 2026年3月30日 周一 ▶         │
│  📋 分类模式 | 时间模式          │
├─────────────────────────────────┤
│  ┌──────────────────────────┐    │
│  │ 🏢 工作 (3项待完成)    ▼  │    │
│  ├──────────────────────────┤    │
│  │ ○ 08:00 早会       🚩   │    │
│  │ ○ 09:30 提交周报         │    │
│  │ ⊘ 写日报  （已跳过）     │    │  ← 灰色+删除线
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ ❤️ 健康 (1项待完成)    ▼  │    │
│  ├──────────────────────────┤    │
│  │ ✓ 07:00 晨跑        🚩   │    │  ← 绿色背景
│  │ ○ 健身                   │    │
│  └──────────────────────────┘    │
└─────────────────────────────────┘
```

#### 切换功能实现

```javascript
// 保存用户偏好
const VIEW_MODES = {
  CATEGORY: 'category',  // 按分类分组
  TIME: 'time'           // 按时间排序
};

Page({
  data: {
    viewMode: 'category', // 默认按分类
    habits: []
  },
  
  // 切换排序模式
  toggleViewMode() {
    const newMode = this.data.viewMode === 'category' ? 'time' : 'category';
    this.setData({ viewMode: newMode });
    
    // 保存用户偏好
    wx.setStorageSync('viewMode', newMode);
    
    // 重新渲染
    this.loadHabits();
  },
  
  // 获取排序后的数据
  getSortedHabits(habits) {
    if (this.data.viewMode === 'time') {
      // 按时间排序
      return this.sortByTime(habits);
    } else {
      // 按分类分组
      return this.groupByCategory(habits);
    }
  },
  
  // 按时间排序
  sortByTime(habits) {
    return habits.sort((a, b) => {
      const timeA = a.timeRule?.fixedTime || '99:99';
      const timeB = b.timeRule?.fixedTime || '99:99';
      return timeA.localeCompare(timeB);
    });
  },
  
  // 按分类分组
  groupByCategory(habits) {
    const grouped = {};
    habits.forEach(habit => {
      if (!grouped[habit.categoryId]) {
        grouped[habit.categoryId] = [];
      }
      grouped[habit.categoryId].push(habit);
    });
    
    // 分类内按时间排序
    Object.keys(grouped).forEach(catId => {
      grouped[catId].sort((a, b) => {
        const timeA = a.timeRule?.fixedTime || '99:99';
        const timeB = b.timeRule?.fixedTime || '99:99';
        return timeA.localeCompare(timeB);
      });
    });
    
    return grouped;
  }
});
```

### 5.2 页面结构

#### 首页（打卡页）- 分类模式
```
┌─────────────────────────────────┐
│  今日打卡              [👁]     │  ← 闭眼=隐藏已打卡，睁眼=显示
│  ◀ 2026年3月30日 周一 ▶         │  ← 左右箭头切换历史日期
│  📋 分类模式 | 时间模式          │
├─────────────────────────────────┤
│  ┌──────────────────────────┐    │
│  │ 🏢 工作 3/3项        ▼  │    │  ← 已完成/总数 + 折叠箭头
│  ├──────────────────────────┤    │
│  │ ○ 08:00 早会       🚩   │    │  ← 重要项红旗
│  │ ○ 09:30 提交周报         │    │
│  │ ○ 写日报                 │    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ ❤️ 健康 1/2项        ▼  │    │  ← 已完成/总数
│  ├──────────────────────────┤    │
│  │ ☐ 07:00 晨跑       [打卡] │    │
│  │ ☐ 健身             [打卡] │    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ 👶 孩子 4/4项        ▼  │    │  ← 已完成/总数
│  ├──────────────────────────┤    │
│  │ ☐ 07:30 送儿子上学 [打卡] │    │
│  │ ☐ 16:30 接女儿放学 [打卡] │    │
│  │ ☐ 19:00 检查作业   [打卡] │    │
│  │ ☐ 讲睡前故事       [打卡] │    │
│  └──────────────────────────┘    │
│                                 │
│  [显示已隐藏 (3)]                │
│                                 │
│  [📝 待办]  [🏠 首页]  [📊 统计] │
└─────────────────────────────────┘
```

#### 首页（打卡页）- 时间模式
```
┌─────────────────────────────────┐
│  今日打卡              [👁]     │
│  ◀ 2026年3月30日(今天)周一 ▶   │  ← 点击日期可打开日历选择
│  📅 时间模式 | 分类模式          │
├─────────────────────────────────┤
│  已完成 1/9 项                  │  ← 总体统计（白色区域顶部）
│                                 │
│  ☐ [❤️] 07:00 晨跑      [打卡]  │
│  ☐ [👶] 07:30 送儿子上学[打卡]  │
│  ☐ [🏢] 08:00 早会      [打卡]  │
│  ☐ [🏢] 09:30 提交周报  [打卡]  │
│  ☐ [👶] 16:30 接女儿放学[打卡]  │
│  ☐ [👶] 19:00 检查作业  [打卡]  │
│  ☐ [🏢] 写日报         [打卡]   │
│  ☐ [❤️] 健身           [打卡]   │
│  ☐ [👶] 讲睡前故事     [打卡]   │
└─────────────────────────────────┘
```

**日期选择器说明**：
- 日期显示在紫色header区域下方（分类模式和时间模式共用）
- 左右箭头切换前后一天（圆形按钮，hover时放大）
- 中间日期可点击，弹出日历选择器
- 日历显示当前月份，可点击任意日期快速跳转
- 今天的日期显示"今天"徽章，历史日期显示"查看"徽章
│                                 │
│  [显示已隐藏 (3)]                │
│                                 │
│  [📝 待办]  [🏠 首页]  [📊 统计] │
└─────────────────────────────────┘
```

#### 已隐藏打卡记录页
```
┌─────────────────────────────────┐
│  已完成的打卡              [返回]│
│  2026年3月30日 周一               │
├─────────────────────────────────┤
│  ┌──────────────────────────┐    │
│  │ 🏢 上班内容              │    │
│  ├──────────────────────────┤    │
│  │ ☑ 早会 (09:00)    [取消] │    │
│  │ ☑ 发送邮件 (10:30)[取消] │    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ 👧 女儿                  │    │
│  ├──────────────────────────┤    │
│  │ ☑ 送上学 (08:00)  [取消] │    │
│  └──────────────────────────┘    │
└─────────────────────────────────┘
```

#### 分类管理页
```
┌─────────────────────────────────┐
│  分类管理                  [完成]│
├─────────────────────────────────┤
│  ┌──────────────────────────┐    │
│  │ 🏢 上班内容    [编辑][删除]│    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ 🏠 下班内容    [编辑][删除]│    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ 👦 儿子        [编辑][删除]│    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ 👧 女儿        [编辑][删除]│    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ 🏡 家务        [编辑][删除]│    │
│  └──────────────────────────┘    │
│                                 │
│  [+ 新建分类]                    │
└─────────────────────────────────┘
```

#### 项目编辑页
```
┌─────────────────────────────────┐
│  编辑打卡项目              [完成]│
├─────────────────────────────────┤
│  项目名称                        │
│  ┌──────────────────────────┐    │
│  │ 写日报                    │    │
│  └──────────────────────────┘    │
│                                 │
│  所属分类                        │
│  ┌──────────────────────────┐    │
│  │ 🏢 上班内容          [▼]  │    │
│  └──────────────────────────┘    │
│                                 │
│  循环规则                        │
│  ○ 每日                          │
│  ● 仅工作日（周一至周五）        │
│  ○ 仅周末（周六周日）            │
│  ○ 每周指定日期                  │
│    □ 一 □ 二 □ 三 □ 四 □ 五     │
│    □ 六 □ 日                     │
│  ○ 自定义日期                    │
│                                 │
│  固定打卡时间（可选）            │
│  ┌──────────────────────────┐    │
│  │ 09:00                     │    │
│  └──────────────────────────┘    │
│                                 │
│  有效期（可选）                  │
│  □ 设置有效期                    │
│  开始日期：2026-01-01            │
│  结束日期：2026-12-31            │
│                                 │
│  [保存项目]                      │
└─────────────────────────────────┘
```

### 5.3 交互设计

1. **打卡操作**：
   - 点击列表项左侧圆圈 → 立即打卡，圆圈变为绿色打勾
   - 打卡后项目自动隐藏
   - 显示 Toast 提示"打卡成功"

2. **取消打卡**：
   - 打开眼睛图标显示已打卡项，点击绿色打勾的圆圈即可取消
   - 取消后项目恢复到待打卡列表

3. **显示/隐藏切换（眼睛图标）**：
   - 标题栏右侧眼睛图标，统一控制已打卡项的显示
   - 默认闭眼：不显示已打卡项，页面更简洁
   - 点击睁眼：显示已打卡项（绿色背景 + 绿色勾），方便用户确认或取消
   - 再点击闭眼：重新隐藏

4. **当日跳过**：
   - 长按列表项 → 弹出操作菜单：「跳过今天」「编辑」
   - 选择"跳过今天" → 该项目当日不再显示，不影响连续打卡统计
   - 跳过记录存储为 skipped 状态，历史查看中可看到标记
   - 跳过后的项目可通过眼睛图标看到（灰色样式，与已打卡区分）

5. **重要标记（小红旗）**：
   - 添加/编辑习惯时，有一个"标记为重要"开关
   - 设为重要后，列表项右侧显示小红旗 🚩
   - 重要项目始终排在同分类内非重要项目的前面
   - 重要的项目时间颜色加深/加粗，视觉上突出

6. **历史日期查看**：
   - 日期栏左右两侧有箭头，点击可切换日期
   - 支持左右滑动切换日期
   - 非当日查看时，页面顶部显示"非当日，仅查看"提示
   - 历史日期下可查看当天的打卡记录，但不能修改

7. **排序模式切换**：
   - 点击标题栏模式切换按钮
   - 在"分类模式"和"时间模式"之间切换
   - 切换后自动保存用户偏好
   - 下次打开页面自动应用上次的模式

8. **分类折叠**：
   - 分类模式下，点击分类标题栏可折叠/展开该分类
   - 折叠箭头指示当前状态
   - 分类卡片标题显示：已完成数/总数（如：3/3项）

9. **总体统计显示**：
   - 分类模式：每个分类卡片标题显示"已完成数/总数"
   - 时间模式：在日期下方显示总体统计"已完成 X/Y 项"
   - 实时更新：打卡/取消打卡后自动更新统计数字

10. **分类管理**：
   - 支持拖拽排序
   - 支持编辑名称、图标、颜色
   - 删除分类时提示"是否同时删除该分类下的所有项目"
   - 支持添加预设分类

### 5.4 时间模式下的分类图标显示

在"时间模式"下，每个打卡项前面会显示分类图标，帮助用户快速识别：

```javascript
// 分类图标映射
const CATEGORY_ICONS = {
  '工作': '🏢',
  '健康': '❤️',
  '学习': '📚',
  '家庭': '🏠',
  '孩子': '👶',
  '财务': '💰',
  '个人成长': '⭐',
  '社交': '💬',
  '其它': '📌'
};

// WXML 模板
<view class="habit-item">
  <view class="habit-icon">{{categoryIcon}}</view>
  <view class="habit-time">{{time}}</view>
  <view class="habit-name">{{name}}</view>
  <button class="checkin-btn">打卡</button>
</view>
```

---

## 六、统计功能设计

### 6.1 统计页面结构

```
┌─────────────────────────────────┐
│  统计中心                        │
├─────────────────────────────────┤
│  📅 选择日期范围                  │
│  ○ 本周  ● 本月  ○ 本年  ○ 自定义│
├─────────────────────────────────┤
│  📊 总体概况                      │
│  ┌──────────────────────────┐    │
│  │ 本月完成率: 85%           │    │
│  │ 总打卡次数: 127 次        │    │
│  │ 活跃天数: 28 天           │    │
│  └──────────────────────────┘    │
│                                 │
│  🏆 完成率排行                   │
│  ┌──────────────────────────┐    │
│  │ 1. 晨跑 (健康)     100%  │    │
│  │ 2. 写日报 (工作)   95%   │    │
│  │ 3. 接孩子 (孩子)   92%   │    │
│  │ ...                      │    │
│  └──────────────────────────┘    │
│                                 │
│  📈 趋势图                        │
│  [本周完成趋势图表]              │
│                                 │
│  📂 按分类查看                    │
│  ┌──────────────────────────┐    │
│  │ 🏢 工作: 89% (27/30)     │    │
│  │ ❤️ 健康: 82% (24/30)     │    │
│  │ 👶 孩子: 95% (28/30)     │    │
│  └──────────────────────────┘    │
└─────────────────────────────────┘
```

### 6.2 统计维度

#### 单个项目统计
```javascript
{
  habitId: "habit_xxx",
  habitName: "晨跑",
  categoryName: "健康",
  
  // 连续性统计
  currentStreak: 15,        // 当前连续天数
  longestStreak: 30,        // 最长连续天数
  
  // 完成率统计
  totalDays: 100,            // 应打卡总天数
  completedDays: 85,         // 已打卡天数
  completionRate: 85,        // 完成率 %
  
  // 时段统计
  averageTime: "07:15",     // 平均打卡时间
  mostFrequentTime: "07:00", // 最常打卡时间
  
  // 月度统计
  thisMonth: {
    total: 28,
    completed: 26,
    rate: 93
  },
  
  // 周度统计
  thisWeek: {
    total: 7,
    completed: 6,
    rate: 86
  },
  
  // 历史最佳
  bestMonth: {
    month: "2026-02",
    rate: 98
  }
}
```

#### 分类统计
```javascript
{
  categoryId: "cat_xxx",
  categoryName: "健康",
  categoryColor: "#ef4444",
  
  // 该分类下所有项目的汇总
  totalHabits: 5,
  activeHabits: 4,
  
  // 完成率
  thisMonth: {
    total: 120,           // 总应打卡次数
    completed: 102,       // 已完成次数
    rate: 85
  },
  
  // 分类下各项目排行
  habitRanking: [
    { name: "晨跑", rate: 100 },
    { name: "健身", rate: 80 },
    { name: "喝水", rate: 75 }
  ]
}
```

#### 整体统计
```javascript
{
  // 总体概况
  totalHabits: 12,          // 总项目数
  activeHabits: 10,         // 活跃项目数
  totalCategories: 5,       // 分类数
  
  // 打卡统计
  todayCompleted: 8,        // 今日已完成
  todayTotal: 10,           // 今日总数
  todayRate: 80,            // 今日完成率
  
  thisMonthCompleted: 224,  // 本月已完成
  thisMonthTotal: 280,      // 本月总数
  thisMonthRate: 80,        // 本月完成率
  
  // 连续性
  longestStreak: {
    habitName: "晨跑",
    days: 100
  },
  
  // 活跃度
  activeDaysThisMonth: 25,  // 本月活跃天数
  activeDaysThisYear: 89    // 本年活跃天数
}
```

### 6.3 统计页面功能

1. **日期范围选择**：
   - 快捷选项：今日、本周、本月、本年
   - 自定义日期范围

2. **图表展示**：
   - 完成趋势折线图（使用 ECharts）
   - 分类占比饼图
   - 连续打卡热力图（类似 GitHub）

3. **排行榜**：
   - 完成率排行（本月）
   - 连续天数排行
   - 进步最快排行

4. **详细数据**：
   - 点击项目查看详细统计
   - 查看历史打卡记录日历

---

## 七、分享功能设计

### 7.1 分享卡片生成

#### 分享类型

1. **成就分享**（单个项目）
   - 坚持打卡 N 天
   - 连续打卡 N 天
   - 月度完成率 N%

2. **汇总分享**（分类或整体）
   - 本月完成率
   - 本月打卡次数
   - 活跃天数

#### 分享卡片模板

**模板 1：连续打卡成就**
```
┌───────────────────────────────┐
│  🎉 已连续打卡 100 天！         │
├───────────────────────────────┤
│                               │
│  🏃 晨跑                        │
│  分类：健康                     │
│                               │
│  📅 2025.12.20 - 2026.03.30   │
│                               │
│  💪 坚持就是胜利！               │
│                               │
│  ┌─────────┐  ┌─────────┐    │
│  │ 今日 1/1 │  │本月 100%│    │
│  └─────────┘  └─────────┘    │
│                               │
│  [小程序码]                     │
│  扫码一起打卡                    │
└───────────────────────────────┘
```

**模板 2：月度总结**
```
┌───────────────────────────────┐
│  📊 2026年3月打卡报告            │
├───────────────────────────────┤
│                               │
│  ✅ 完成率: 85%                 │
│  📅 活跃天数: 28 天             │
│  🎯 打卡次数: 127 次            │
│                               │
│  🏆 最佳项目:                    │
│  晨跑 (100%)                   │
│  写日报 (95%)                  │
│  接孩子 (92%)                  │
│                               │
│  🔥 最长连续: 15 天              │
│  项目: 晨跑                     │
│                               │
│  [小程序码]                     │
│  习惯打卡，遇见更好的自己        │
└───────────────────────────────┘
```

**模板 3：分类成就**
```
┌───────────────────────────────┐
│  ❤️ 健康打卡报告                │
├───────────────────────────────┤
│                               │
│  本月完成率: 90%               │
│  活跃项目: 4 个                │
│                               │
│  项目列表：                     │
│  ✓ 晨跑 (100%)                │
│  ✓ 喝水 (85%)                 │
│  ✓ 健身 (80%)                 │
│  ✓ 冥想 (95%)                 │
│                               │
│  💪 健康生活，从坚持开始        │
│                               │
│  [小程序码]                     │
│  扫码开始健康打卡               │
└───────────────────────────────┘
```

### 7.2 分享功能实现

#### 技术方案

1. **Canvas 绘制**：
   - 使用小程序 Canvas API 绘制分享卡片
   - 支持自定义背景、字体、颜色

2. **模板配置**：
   - 预设 3 种模板
   - 模板可配置参数（标题、数据、颜色等）

3. **生成流程**：
   ```javascript
   async function generateShareImage(options) {
     const { type, habitId, dateRange } = options;
     
     // 1. 获取统计数据
     const stats = await getHabitStats(habitId, dateRange);
     
     // 2. 选择模板
     const template = selectTemplate(type, stats);
     
     // 3. Canvas 绘制
     const canvas = createCanvasContext('shareCanvas');
     await drawTemplate(canvas, template, stats);
     
     // 4. 导出图片
     const tempFilePath = await canvasToTempFilePath(canvas);
     
     return tempFilePath;
   }
   ```

#### 分享入口

1. **项目详情页**：
   - "分享"按钮 → 选择分享类型（成就/月度总结）
   - 生成分享卡片 → 保存到相册/分享到微信

2. **统计页面**：
   - "分享报告"按钮
   - 生成月度/年度总结卡片

3. **打卡成功后**：
   - 弹窗提示"分享你的成就"
   - 快速生成连续打卡天数分享卡

### 7.3 分享卡片组件

```javascript
// components/share-card/share-card.js
Component({
  properties: {
    // 分享类型
    type: {
      type: String,
      value: 'achievement' // achievement | monthly | category
    },
    
    // 数据
    data: {
      type: Object,
      value: {}
    },
    
    // 主题色
    theme: {
      type: String,
      value: '#4f46e5'
    }
  },
  
  methods: {
    async generateImage() {
      // Canvas 绘制逻辑
    },
    
    async saveToAlbum() {
      // 保存到相册
      const filePath = await this.generateImage();
      await wx.saveImageToPhotosAlbum({ filePath });
    },
    
    async shareToWeChat() {
      // 分享到微信
      const filePath = await this.generateImage();
      wx.shareAppMessage({
        imageUrl: filePath,
        title: '我的打卡成就'
      });
    }
  }
});
```

### 7.4 分享数据结构

```javascript
{
  type: 'achievement',      // 分享类型
  habitId: 'habit_xxx',     // 项目ID
  
  // 成就数据
  achievement: {
    type: 'streak',         // streak | completion | monthly
    value: 100,             // 数值
    unit: '天',             // 单位
    title: '连续打卡',       // 标题
    subtitle: '晨跑',        // 副标题
    description: '坚持就是胜利！'
  },
  
  // 日期范围
  dateRange: {
    start: '2025-12-20',
    end: '2026-03-30'
  },
  
  // 额外数据
  stats: {
    todayRate: 100,
    monthRate: 100
  },
  
  // 样式配置
  theme: {
    primaryColor: '#ef4444',
    backgroundColor: '#fff',
    textColor: '#333'
  }
}
```

---

## 五、数据库表结构

### 5.1 云数据库集合

#### categories 集合
- 安全规则：用户只能访问自己的分类

#### habits 集合
- 索引：`categoryId`（用于查询某分类下的项目）
- 索引：`openid + active`（用于查询活跃项目）
- 安全规则：用户只能访问自己的项目

#### checkins 集合
- 索引：`openid + ymd`（用于查询某天的打卡记录）
- 索引：`habitId + ymd`（用于查询某项目的打卡记录）
- 安全规则：用户只能访问自己的打卡记录

---

## 六、云函数设计

### 6.1 category 云函数

```javascript
// actions: list, create, update, delete, reorder
```

### 6.2 habit 云函数

```javascript
// actions: list, listByCategory, create, update, delete, reorder
```

### 6.3 checkin 云函数

```javascript
// actions: 
// - checkin: 打卡
// - uncheckin: 取消打卡
// - getToday: 获取今日打卡情况
// - getHistory: 获取历史记录
```

---

## 八、设计预览文件

### 已完成的预览页面

| 页面名称 | 文件名 | 说明 |
|---------|---------|------|
| 分类模式首页 | index-category.html | 按分类分组，支持折叠、日期选择 |
| 时间模式首页 | index-time.html | 按时间排序，显示分类图标、总体统计 |
| 统计中心 | stats.html | 总体概况、完成率排行、趋势图、分类统计 |
| 项目编辑 | habit-edit.html | 编辑/新建习惯，设置时间规则、重要标记 |
| 分类管理 | category-manage.html | 分类列表、预设分类添加 |
| 预设分类选择器 | preset-categories.html | 快速选择添加预设分类 |
| 已完成记录 | hidden.html | 查看和取消已完成的打卡记录 |
| 连续打卡成就卡片 | share-achievement.html | Canvas生成的成就分享卡片 |
| 月度总结卡片 | share-monthly.html | Canvas生成的月度报告卡片 |
| 预览导航 | index.html | 所有预览页面的导航入口 |

### UI/UX 改进记录

1. **日期选择器优化**
   - ✅ 左右箭头使用圆形按钮，hover时放大效果
   - ✅ 中间日期可点击，弹出日历选择器
   - ✅ 日历显示完整月份，支持点击任意日期
   - ✅ 分类模式和时间模式共用同一日期选择器
   - ✅ 今天显示"今天"徽章，历史显示"查看"徽章

2. **分类模式优化**
   - ✅ 折叠箭头自动推到分类标题行最右侧（使用 margin-left: auto）
   - ✅ 分类标题显示"已完成/总数"统计
   - ✅ 折叠/展开动画流畅

3. **时间模式优化**
   - ✅ 总体统计移到白色内容区域最上方
   - ✅ 显示分类图标，便于快速识别
   - ✅ 按时间排序，无固定时间的项目排在后面

4. **交互优化**
   - ✅ 打卡后项目自动隐藏
   - ✅ 眼睛图标统一控制显示/隐藏
   - ✅ 重要项目显示小红旗 🚩
   - ✅ 统计数字实时更新

---

## 九、实现计划

### Phase 1：数据模型与基础功能（1-2天）
- [ ] 数据库表创建与安全规则配置
- [ ] 云函数开发（category, habit, checkin）
- [ ] 本地存储结构更新
- [ ] 基础服务层开发
- [ ] **预设分类功能（包含9个预设分类）**

### Phase 2：分类管理功能（1天）
- [ ] 分类列表页
- [ ] 分类编辑页
- [ ] 分类删除与排序
- [ ] **预设分类选择器**

### Phase 3：项目管理功能（1-2天）
- [ ] 项目列表页（按分类分组）
- [ ] 项目编辑页（包含时间规则设置）
- [ ] 项目删除与排序
- [ ] **时间排序功能**

### Phase 4：打卡核心功能（1-2天）
- [ ] 首页重构（按分类显示）
- [ ] **排序模式切换功能（分类模式 ⇄ 时间模式）**
- [ ] **时间模式下的分类图标显示**
- [ ] 打卡/取消打卡功能
- [ ] 已隐藏列表页
- [ ] 智能显示逻辑
- [ ] **用户偏好保存（排序模式等）**

### Phase 5：统计功能（1-2天）
- [ ] 统计页面重构
- [ ] **多维度统计**（总体、分类、单个项目）
- [ ] **趋势图表**（使用 ECharts）
- [ ] 排行榜功能
- [ ] 历史打卡日历

### Phase 6：分享功能（1天）
- [ ] **分享卡片模板设计**
- [ ] **Canvas 绘制功能**
- [ ] 分享入口（项目详情、统计页）
- [ ] 保存到相册
- [ ] 分享到微信

### Phase 7：优化与测试（1天）
- [ ] UI/UX 优化
- [ ] 性能优化
- [ ] 功能测试
- [ ] Bug 修复

**预计总工期：7-10 天**

---

## 八、数据迁移方案

### 从 V1 迁移到 V2

1. **创建默认分类**：为每个用户创建"默认"分类
2. **迁移习惯数据**：将 V1 的 habits 迁移到新表，并关联到默认分类
3. **迁移打卡记录**：数据结构兼容，无需特殊处理

```javascript
async function migrateV1ToV2() {
  // 1. 创建默认分类
  const defaultCategory = await createCategory({
    name: '默认分类',
    icon: 'star',
    color: '#4f46e5'
  });
  
  // 2. 迁移习惯
  const oldHabits = await db.collection('habits').get();
  for (const habit of oldHabits.data) {
    await db.collection('habits_v2').add({
      data: {
        ...habit,
        categoryId: defaultCategory._id,
        timeRule: { type: 'daily' },
        active: true
      }
    });
  }
}
```

---

## 九、未来扩展功能

1. **提醒功能**：
   - 定时提醒（使用小程序订阅消息）
   - 位置提醒（到达某地点自动提醒）

2. **数据分析**：
   - 月度/年度报告
   - 最佳打卡时段分析
   - 连续完成奖励
   - **AI 智能分析**（预测完成率、建议调整时间）

3. **社交功能**：
   - 家庭共享（家庭成员可见）
   - 打卡动态分享
   - 互相监督
   - **分享到朋友圈**（使用小程序 share-to-timeline）
   - **打卡圈子**（类似社区功能）

4. **高级功能**：
   - 打卡模板（快速创建常用打卡项）
   - 批量操作
   - 数据导出（Excel/PDF）
   - 语音打卡
   - **分享卡片模板市场**（用户可下载更多模板）
   - **自定义分享卡片**（用户上传背景图）
   - **打卡成就系统**（勋章、等级）
   - **打卡挑战赛**（与他人 PK）

5. **智能功能**：
   - 智能推荐打卡时间（基于历史数据）
   - 自动生成打卡计划
   - 智能调整提醒时间
   - **智能分享文案生成**（AI 生成激励文案）

---

## 十、技术选型

### 前端
- 微信小程序原生开发
- 组件库：WeUI
- 图表：ECharts for 小程序（统计页）
- **Canvas API**（分享卡片生成）

### 后端
- CloudBase 云开发
- 数据库：文档数据库（NoSQL）
- 云函数：Node.js 16.13
- 存储：本地缓存 + 云端同步

### 工具
- 日期处理：dayjs（轻量级）
- 状态管理：小程序页面 data
- **图表库**：ECharts for 微信小程序
- **图片处理**：小程序 Canvas API

---

## 十一、注意事项

1. **性能优化**：
   - 本地缓存优先，减少云端请求
   - 使用分页加载历史记录
   - 图片懒加载
   - **Canvas 绘制优化**（分享卡片）
   - **图表渲染优化**

2. **用户体验**：
   - 骨架屏加载
   - 下拉刷新
   - 错误提示友好
   - 操作可撤销
   - **分享卡片美观度**
   - **统计图表交互流畅**

3. **数据安全**：
   - 敏感数据加密
   - 定期备份数据
   - 防止恶意请求
   - **分享数据脱敏**（不泄露敏感信息）

4. **兼容性**：
   - 支持小程序基础库 2.0+
   - 适配各种屏幕尺寸
   - 深色模式支持
   - **Canvas 兼容性处理**

5. **分享功能注意事项**：
   - 小程序码有效期管理
   - 分享图片大小控制（建议 < 500KB）
   - 分享图片尺寸适配（建议 750x1334）
   - 文案内容审核合规
