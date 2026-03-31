/**
 * 预设分类配置
 * 这些分类硬编码在代码中，不存储到数据库
 * 数据库只存储用户自定义的分类
 */

// 预设分类列表
export const PRESET_CATEGORIES = [
  {
    id: 'work',
    name: '工作',
    icon: '🏢',
    color: '#eff6ff',
    bgColor: '#3b82f6',
    desc: '工作任务、会议、日报等'
  },
  {
    id: 'health',
    name: '健康',
    icon: '❤️',
    color: '#fef2f2',
    bgColor: '#ef4444',
    desc: '运动、健身、饮食等'
  },
  {
    id: 'child',
    name: '孩子',
    icon: '👶',
    color: '#f0fdf4',
    bgColor: '#10b981',
    desc: '接送孩子、辅导作业等'
  },
  {
    id: 'study',
    name: '学习',
    icon: '📚',
    color: '#f5f3ff',
    bgColor: '#8b5cf6',
    desc: '阅读、课程、技能学习等'
  },
  {
    id: 'family',
    name: '家庭',
    icon: '🏠',
    color: '#fef3c7',
    bgColor: '#f59e0b',
    desc: '家务、陪伴家人等'
  },
  {
    id: 'other',
    name: '其它',
    icon: '📦',
    color: '#f3f4f6',
    bgColor: '#6b7280',
    desc: '其它分类'
  }
]

/**
 * 获取所有分类（预设 + 自定义）
 * @param {Array} customCategories - 用户自定义分类
 * @returns {Array} 所有分类
 */
export function getAllCategories(customCategories = []) {
  // 预设分类保持固定
  const presets = PRESET_CATEGORIES.map(cat => ({
    ...cat,
    isPreset: true
  }))

  // 自定义分类
  const custom = customCategories.map(cat => ({
    ...cat,
    isPreset: false
  }))

  return [...presets, ...custom]
}

/**
 * 根据ID获取分类
 * @param {string} categoryId - 分类ID
 * @param {Array} customCategories - 用户自定义分类
 * @returns {Object|null} 分类对象
 */
export function getCategoryById(categoryId, customCategories = []) {
  // 先在预设分类中查找
  const preset = PRESET_CATEGORIES.find(cat => cat.id === categoryId)
  if (preset) {
    return { ...preset, isPreset: true }
  }

  // 再在自定义分类中查找
  const custom = customCategories.find(cat => cat._id === categoryId)
  if (custom) {
    return { ...custom, isPreset: false }
  }

  return null
}

/**
 * 获取分类图标
 * @param {string} categoryId - 分类ID
 * @param {Array} customCategories - 用户自定义分类
 * @returns {string} 图标
 */
export function getCategoryIcon(categoryId, customCategories = []) {
  const category = getCategoryById(categoryId, customCategories)
  return category ? category.icon : '📦'
}

/**
 * 获取分类颜色
 * @param {string} categoryId - 分类ID
 * @param {Array} customCategories - 用户自定义分类
 * @returns {string} 颜色
 */
export function getCategoryColor(categoryId, customCategories = []) {
  const category = getCategoryById(categoryId, customCategories)
  return category ? category.color : '#f3f4f6'
}

/**
 * 检查是否为预设分类
 * @param {string} categoryId - 分类ID
 * @returns {boolean}
 */
export function isPresetCategory(categoryId) {
  return PRESET_CATEGORIES.some(cat => cat.id === categoryId)
}
