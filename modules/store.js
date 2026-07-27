// ============================================
// 绘野工作台 - 本地数据存储模块
// ============================================

const Store = {
  KEYS: {
    TASKS: 'huiye_tasks',
    REVIEWS: 'huiye_reviews',
    INSPIRATIONS: 'huiye_inspirations',
    SETTINGS: 'huiye_settings',
    FAVORITES: 'huiye_favorites',
    PLANS: 'huiye_plans'
  },

  // 通用读取
  get(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn('[Store] 读取失败:', key, e);
      return defaultValue;
    }
  },

  // 通用写入
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[Store] 写入失败:', key, e);
      return false;
    }
  },

  // 通用删除
  remove(key) {
    localStorage.removeItem(key);
  },

  // 生成唯一ID
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // 获取今天日期字符串
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // 格式化数字
  formatNum(num) {
    if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num);
  },

  // 格式化时间
  formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
};

// 初始化默认设置
if (!localStorage.getItem(Store.KEYS.SETTINGS)) {
  Store.set(Store.KEYS.SETTINGS, {
    accountName: '小赵和小董的视觉新居',
    platforms: ['douyin', 'xiaohongshu'],
    contentFocus: '收房视频',
    createdAt: Date.now()
  });
}
