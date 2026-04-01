Component({
  properties: {
    currentPage: {
      type: String,
      value: ''
    },
    todoCount: {
      type: Number,
      value: 0
    }
  },

  lifetimes: {
    attached() {
      this.updateActiveTab();
    },
    show() {
      // 页面显示时更新高亮
      this.updateActiveTab();
    }
  },

  data: {
    tabs: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        icon: '🏠',
        badge: 0
      },
      {
        pagePath: 'pages/todos/todos',
        text: '待办',
        icon: '📝',
        badge: 0
      },
      {
        pagePath: 'pages/stats/stats',
        text: '统计',
        icon: '📊',
        badge: 0
      },
      {
        pagePath: 'pages/settings/settings',
        text: '设置',
        icon: '⚙️',
        badge: 0
      }
    ],
    activeTab: ''
  },

  observers: {
    'todoCount': function(val) {
      this.updateBadge(val);
    }
  },

  methods: {
    // 更新当前高亮的 tab
    updateActiveTab() {
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const currentRoute = pages[pages.length - 1].route;
        this.setData({ activeTab: currentRoute });
      }
    },

    updateBadge(count) {
      const tabs = this.data.tabs.map(tab => {
        if (tab.pagePath === 'pages/todos/todos') {
          return { ...tab, badge: count };
        }
        return tab;
      });
      this.setData({ tabs });
    },

    onTabClick(e) {
      const { path } = e.currentTarget.dataset;

      // 获取当前页面栈
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentRoute = currentPage.route;

      // 如果已经在目标页面，不做任何操作
      if (currentRoute === path) {
        return;
      }

      // 检查目标页面是否已在栈中
      const targetPageIndex = pages.findIndex(page => page.route === path);

      if (targetPageIndex >= 0) {
        // 如果目标页面已存在，使用 navigateBack 返回
        wx.navigateBack({
          delta: pages.length - 1 - targetPageIndex,
          fail: () => {
            wx.switchTab({
              url: `/${path}`
            });
          }
        });
      } else {
        // 如果目标页面不在栈中，使用 switchTab
        wx.switchTab({
          url: `/${path}`,
          fail: () => {
            wx.navigateTo({
              url: `/${path}`
            });
          }
        });
      }
    }
  }
});
