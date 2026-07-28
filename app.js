// ============================================
// 绘野工作台 - 主应用入口
// ============================================

const App = {
  currentPage: 'tasks',

  init() {
    // 强制清除旧版 Service Worker 缓存
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name !== 'huiye-v13.0.0') {
            caches.delete(name);
            console.log('[App] 清除旧缓存:', name);
          }
        });
      });
    }

    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister()); // 先注销旧的
      }).then(() => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('[App] SW 注册成功 v2');
            reg.update();
          })
          .catch(err => console.warn('[App] SW 注册失败:', err));
      });
    }

    // 全局触摸修复
    this.fixTouch();

    // 初始化各模块
    Tasks.seedDemoTasks();
    Review.seedDemoReview();
    Tasks.init();
    Hotspot.init();
    Review.init();
    Inspiration.init();
    Planner.init();

    // 绑定导航
    this.bindNav();

    // 显示日期
    this.updateDate();

    // 检测首次使用
    this.checkFirstUse();
  },

  // 全局触摸修复：解决 OPPO/UC/夸克等浏览器点击不响应问题
  fixTouch() {
    document.addEventListener('touchstart', function(e) {
      // 不做任何阻止，只是让浏览器正确识别可交互元素
    }, { passive: true });
  },

  bindNav() {
    // 底部导航已改为 HTML onclick="App.switchPage(xxx)" 绑定
    // 弹窗背景关闭保留（点击半透明区域关闭）
    document.getElementById('taskModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'taskModalOverlay') Tasks.closeTaskModal();
    });

    document.getElementById('reviewModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'reviewModalOverlay') Review.closeReviewModal();
    });
  },

  switchPage(page) {
    this.currentPage = page;

    // 切换页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');

    // 切换导航
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // 更新标题
    const titles = {
      tasks: '📋 今日任务',
      hotspot: '🔥 热点追踪',
      review: '📊 内容复盘',
      inspiration: '💡 灵感来源',
      planner: '📅 内容规划'
    };
    document.getElementById('headerTitle').textContent = titles[page] || '绘野工作台';

    // 滚动到顶部
    document.querySelector('.app-main').scrollTop = 0;

    // 切换页面时重新渲染对应模块
    if (page === 'planner' && Planner) {
      Planner.renderPage();
    }
    if (page === 'tasks' && Tasks) {
      Tasks.render();
    }
    if (page === 'review' && Review) {
      Review.renderList();
    }
    if (page === 'inspiration' && Inspiration) {
      Inspiration.render();
    }
  },

  updateDate() {
    const now = new Date();
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 星期${days[now.getDay()]}`;
    document.getElementById('headerDate').textContent = dateStr;
  },

  checkFirstUse() {
    const key = 'huiye_first_use';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, Date.now().toString());
      setTimeout(() => {
        showToast('👋 欢迎使用绘野工作台！已为你生成示例数据，可在此基础上开始创作');
      }, 500);
    }
  },

  // 导出全部数据到剪贴板
  exportData() {
    const data = {
      tasks: Store.get(Store.KEYS.TASKS),
      reviews: Store.get(Store.KEYS.REVIEWS),
      inspirations: Store.get(Store.KEYS.INSPIRATIONS),
      favorites: Store.get(Store.KEYS.FAVORITES),
      plans: Store.get(Store.KEYS.PLANS),
      settings: Store.get(Store.KEYS.SETTINGS),
      exportTime: new Date().toISOString()
    };
    const json = JSON.stringify(data);
    navigator.clipboard.writeText(json).then(() => {
      showToast('✅ 数据已复制到剪贴板，粘贴到备忘录保存');
    }).catch(() => {
      // 降级方案：用 textarea
      const ta = document.createElement('textarea');
      ta.value = json;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✅ 数据已复制到剪贴板，粘贴到备忘录保存');
    });
  },

  // 从剪贴板导入数据
  importData() {
    navigator.clipboard.readText().then(text => {
      try {
        const data = JSON.parse(text);
        if (!data.exportTime && !data.reviews && !data.tasks) {
          showToast('❌ 剪贴板内容不是有效的备份数据');
          return;
        }
        if (data.tasks) Store.set(Store.KEYS.TASKS, data.tasks);
        if (data.reviews) Store.set(Store.KEYS.REVIEWS, data.reviews);
        if (data.inspirations) Store.set(Store.KEYS.INSPIRATIONS, data.inspirations);
        if (data.favorites) Store.set(Store.KEYS.FAVORITES, data.favorites);
        if (data.plans) Store.set(Store.KEYS.PLANS, data.plans);
        if (data.settings) Store.set(Store.KEYS.SETTINGS, data.settings);
        showToast('✅ 数据导入成功！正在刷新...');
        setTimeout(() => location.reload(), 1000);
      } catch(e) {
        showToast('❌ 数据格式错误，请确保复制了完整的备份数据');
      }
    }).catch(() => {
      showToast('❌ 无法读取剪贴板，请先复制备份数据');
    });
  }
};

// Toast 全局函数
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => App.init());
