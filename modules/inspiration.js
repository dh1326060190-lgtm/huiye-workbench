// ============================================
// 绘野工作台 - 每日灵感来源模块
// 小赵和小董的视觉新居 - 收房视频方向
// ============================================

const Inspiration = {
  // 灵感库（基于账号定位定制）
  LIBRARY: [
    // 选题方向
    { category: '选题方向', title: '收房验房全流程Vlog', content: '拍摄从拿钥匙到验房完成的全过程，重点展示专业验房工具使用和问题发现。可以做成系列"小赵和小董的收房日记"，用真实人设拉近距离。', tags: ['收房', '系列', '人设'] },
    { category: '选题方向', title: '不同户型收房对比', content: '同一时间段收的不同户型（毛坯/精装/老破小），对比验房重点差异。横向对比类内容完播率高。', tags: ['对比', '干货'] },
    { category: '选题方向', title: '收房后第一周做什么', content: '时间线叙事：收房→保洁→量房→设计方案→施工准备。用时间轴串联，每一步都有看点。', tags: ['时间线', '流程'] },

    // 拍摄手法
    { category: '拍摄手法', title: 'Before/After对比运镜', content: '同一机位、同一运镜路径拍摄收房前和装修后，剪辑时硬切制造强烈反差。这是改造类内容最有效的视觉钩子。', tags: ['运镜', '对比'] },
    { category: '拍摄手法', title: '一镜到底玄关展示', content: '从开门到客厅的一镜到底，配合稳定器运镜，展示空间动线。中间加入开门瞬间特写制造仪式感。', tags: ['一镜到底', '空间'] },
    { category: '拍摄手法', title: '延时摄影记���施工', content: '固定机位拍摄装修全过程延时，30天浓缩成30秒。建议每天同一时间拍摄，保证光线一致。', tags: ['延时', '记录'] },

    // 转场技巧
    { category: '转场技巧', title: '遮挡转场', content: '手掌/身体/物体遮挡镜头 → 移开时场景已变换。适合收房→装修→入住的时间跳跃。', tags: ['转场', '遮罩'] },
    { category: '转场技巧', title: '匹配剪辑', content: '上一个场景的动作延续到下一个场景。如：收房时开门 → 装修后开门，同一动作不同时空。', tags: ['转场', '匹配'] },
    { category: '转场技巧', title: '声音转场', content: '用持续的声音（如钥匙声、脚步声）连接两个场景。声音先行画面后至，制造期待感。', tags: ['转场', '声音'] },

    // 视觉设计
    { category: '视觉设计', title: '统一色调建立账号识别', content: '选择暖色调（米黄+木色）或冷色调（灰白+蓝）作为视频统一色调，从封面到画面保持一致，建立"视觉新居"的品牌识别。', tags: ['色彩', '品牌'] },
    { category: '视觉设计', title: '封面文字排版规范', content: '封面大字标题（≥画面1/4），用对比色描边保证可读性。统一字体和位置，形成系列感。建议左上角放系列编号。', tags: ['封面', '排版'] },
    { category: '视觉设计', title: '画面构图三分法', content: '拍摄时启用网格线，主体放在三分线交点。展示空间时用引导线构图（走廊、门窗框架）增强纵深感。', tags: ['构图', '美学'] },

    // 文案技巧
    { category: '文案技巧', title: '前3秒钩子公式', content: '公式1：数字+悬念"收房验房7个坑，第3个差点亏2万"。公式2：反常识"别急着收房！先做这件事"。公式3：情绪"收房当天我哭了"。', tags: ['钩子', '文案'] },
    { category: '文案技巧', title: '结尾互动话术', content: '"评论区告诉我你最想看哪个空间改造" / "关注小赵和小董，看视觉新居从毛坯到惊艳" / "下期预告：客厅爆改，别走开"。', tags: ['互动', '引导'] },
    { category: '文案技巧', title: '标题情绪词库', content: '收藏常用情绪词：震惊、后悔、差点、终于、绝了、谁懂、救命。搭配数字使用效果翻倍："收房后最后悔的3个决定"。', tags: ['标题', '情绪'] },

    // 运营策略
    { category: '运营策略', title: '发布时间测试', content: '测试不同时段发布效果：早7-9点（通勤）、午12-13点（午休）、晚18-22点（黄金时段）。记录每条发布时间和数据，找到你的最佳时段。', tags: ['发布', '数据'] },
    { category: '运营策略', title: '系列化内容规划', content: '把收房到入住做成系列"小赵和小董的视觉新居EP.01-10"，每集独立成篇又有连续性。系列化提升关注率和复访率。', tags: ['系列', '规划'] },
    { category: '运营策略', title: '评论区运营', content: '发布后1小时内积极回复评论，前10条评论影响推荐。预设3-5个互动话题引导讨论，如"你觉得这个空间怎么改最好看？"。', tags: ['评论', '互动'] }
  ],

  init() {
    this.renderDaily();
    this.renderLibrary();
    this.bindEvents();
  },

  bindEvents() {
    // 筛选和添加按钮已改为 HTML onclick 绑定，兼容 OPPO 等国产浏览器
  },

  // 设置灵感分类
  setCategory(category) {
    document.querySelectorAll('.insp-filter-chip').forEach(c => c.classList.remove('active'));
    const active = document.querySelector(`.insp-filter-chip[data-cat="${category}"]`);
    if (active) active.classList.add('active');
    this.renderLibrary(category);
  },

  // 获取每日推荐（基于日期种子随机选3条）
  getDailyRecommend() {
    const today = Store.today();
    const seed = today.split('-').join('') * 1;
    const shuffled = [...this.LIBRARY].sort((a, b) => {
      return ((seed + a.title.length) % 100) - ((seed + b.title.length) % 100);
    });
    return shuffled.slice(0, 3);
  },

  // 渲染每日推荐
  renderDaily() {
    const container = document.getElementById('dailyInspiration');
    const daily = this.getDailyRecommend();

    container.innerHTML = daily.map(item => `
      <div class="inspiration-card">
        <div class="insp-category">✨ ${item.category}</div>
        <div class="insp-title">${item.title}</div>
        <div class="insp-content">${item.content}</div>
        <div class="insp-footer">
          <div class="insp-tags">
            ${item.tags.map(t => `<span class="tag tag-primary">${t}</span>`).join('')}
          </div>
          <button class="btn btn-sm btn-outline" onclick="Inspiration.saveToFav('${item.title.replace(/'/g, "\\'")}')">☆ 收藏</button>
        </div>
      </div>
    `).join('');
  },

  // 渲染灵感库
  renderLibrary(category = 'all') {
    const container = document.getElementById('inspirationLibrary');
    let items = [...this.LIBRARY];

    // 合并用户自定义灵感
    const custom = Store.get(Store.KEYS.INSPIRATIONS);
    items = [...custom, ...items];

    if (category !== 'all') {
      items = items.filter(i => i.category === category);
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="emoji">💡</div>
          <div class="text">该分类暂无灵感<br>去热点板块发现更多二创素材</div>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map((item, idx) => `
      <div class="inspiration-card">
        <div class="insp-category">${this.getCategoryEmoji(item.category)} ${item.category}</div>
        <div class="insp-title">${this.escape(item.title)}</div>
        <div class="insp-content">${this.escape(item.content)}</div>
        <div class="insp-footer">
          <div class="insp-tags">
            ${(item.tags || []).map(t => `<span class="tag tag-primary">${this.escape(t)}</span>`).join('')}
            ${item.source ? `<span class="tag tag-accent">来自：${this.escape(item.source)}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  },

  getCategoryEmoji(cat) {
    const map = {
      '选题方向': '🎯',
      '拍摄手法': '📷',
      '转场技巧': '✨',
      '视觉设计': '🎨',
      '文案技巧': '✍️',
      '运营策略': '📊',
      '二创灵感': '💡'
    };
    return map[cat] || '💡';
  },

  // 收藏到自定义灵感
  saveToFav(title) {
    const item = this.LIBRARY.find(i => i.title === title);
    if (!item) return;

    const inspirations = Store.get(Store.KEYS.INSPIRATIONS);
    // 避免重复
    if (inspirations.some(i => i.title === item.title)) {
      showToast('已经在灵感库中了');
      return;
    }

    inspirations.unshift({
      id: Store.genId(),
      category: item.category,
      title: item.title,
      content: item.content,
      tags: item.tags,
      createdAt: Date.now()
    });

    Store.set(Store.KEYS.INSPIRATIONS, inspirations);
    showToast('⭐ 已收藏到灵感库');
  },

  openInspirationModal() {
    const title = prompt('输入灵感标题：');
    if (!title) return;
    const content = prompt('输入灵感内容：');
    if (!content) return;

    const inspirations = Store.get(Store.KEYS.INSPIRATIONS);
    inspirations.unshift({
      id: Store.genId(),
      category: '自定义',
      title: title,
      content: content,
      tags: ['自定义'],
      createdAt: Date.now()
    });

    Store.set(Store.KEYS.INSPIRATIONS, inspirations);
    this.renderLibrary();
    showToast('✅ 灵感已添加');
  },

  escape(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
