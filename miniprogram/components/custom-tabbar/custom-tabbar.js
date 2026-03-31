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
    ]
  },

  observers: {
    'todoCount': function(val) {
      this.updateBadge(val);
    }
  },

  methods: {
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

      // 使用 reLaunch 替换当前页面栈
      wx.reLaunch({
        url: `/${path}`
      });
    }
  }
});
