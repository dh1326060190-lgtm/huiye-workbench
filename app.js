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
          if (name !== 'huiye-v2.0.0') {
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
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.switchPage(item.dataset.page);
      });
    });

    // 保存按钮已改为 HTML onclick 绑定
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
      inspiration: '💡 灵感来源'
    };
    document.getElementById('headerTitle').textContent = titles[page] || '绘野工作台';

    // 滚动到顶部
    document.querySelector('.app-main').scrollTop = 0;
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
