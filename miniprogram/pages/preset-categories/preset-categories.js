const { PRESET_CATEGORIES } = require('../../utils/preset-categories.js')

Page({
  data: {
    recommendedCategories: [
      { id: 'work', name: '工作', icon: '🏢', desc: '工作任务、会议、日报等', bgColor: '#eff6ff', selected: false },
      { id: 'health', name: '健康', icon: '❤️', desc: '运动、健身、饮食等', bgColor: '#fef2f2', selected: false },
      { id: 'child', name: '孩子', icon: '👶', desc: '接送孩子、辅导作业等', bgColor: '#f0fdf4', selected: false },
      { id: 'study', name: '学习', icon: '📚', desc: '阅读、课程、技能学习等', bgColor: '#f5f3ff', selected: false }
    ],
    otherCategories: [
      { id: 'family', name: '家庭', icon: '🏠', desc: '家务、陪伴家人等', bgColor: '#fef3c7', selected: false },
      { id: 'other', name: '其它', icon: '📦', desc: '其它分类', bgColor: '#f3f4f6', selected: false }
    ],
    selectedCount: 0,
    loading: false
  },

  onLoad() {
    // 预设分类不需要从数据库加载，直接显示
  },

  // 切换选择
  onToggleCategory(e) {
    const { id } = e.currentTarget.dataset;
    this.toggleCategoryById(id);
  },

  // 根据 ID 切换选择
  toggleCategoryById(id) {
    const recommendedCategories = this.data.recommendedCategories.map(cat => {
      if (cat.id === id) {
        return { ...cat, selected: !cat.selected };
      }
      return cat;
    });

    const otherCategories = this.data.otherCategories.map(cat => {
      if (cat.id === id) {
        return { ...cat, selected: !cat.selected };
      }
      return cat;
    });

    const selectedCount = recommendedCategories.filter(c => c.selected).length +
                       otherCategories.filter(c => c.selected).length;

    this.setData({ recommendedCategories, otherCategories, selectedCount });
  },

  // 清空选择
  onClear() {
    const recommendedCategories = this.data.recommendedCategories.map(cat => ({
      ...cat,
      selected: false
    }));
    const otherCategories = this.data.otherCategories.map(cat => ({
      ...cat,
      selected: false
    }));

    this.setData({ recommendedCategories, otherCategories, selectedCount: 0 });
  },

  // 确认添加
  async onConfirm() {
    if (this.data.selectedCount === 0) {
      wx.showToast({
        title: '请至少选择一个分类',
        icon: 'none'
      });
      return;
    }

    if (this.data.loading) return;

    this.setData({ loading: true });
    wx.showLoading({ title: '初始化中...' });

    try {
      // 预设分类不需要保存到数据库
      // 只保存用户的自定义分类
      // 此页面仅用于展示预设分类，点击后直接返回

      wx.hideLoading();
      wx.showToast({
        title: '分类已启用',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('初始化失败:', err);
      wx.hideLoading();
      this.setData({ loading: false });

      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  }
});
