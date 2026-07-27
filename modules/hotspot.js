// ============================================
// 绘野工作台 - 抖音热点抓取模块
// 小赵和小董的视觉新居 - 收房视频方向
// ============================================

const Hotspot = {
  // 搜索关键词预设（基于账号定位）
  KEYWORDS: [
    { id: 'house', name: '收房', emoji: '🏠' },
    { id: 'renovate', name: '装修', emoji: '🔨' },
    { id: 'visual', name: '视觉设计', emoji: '🎨' },
    { id: 'furniture', name: '家居好物', emoji: '🛋' },
    { id: 'transition', name: '转场技巧', emoji: '✨' },
    { id: 'unbox', name: '开箱', emoji: '📦' }
  ],

  // 模拟热点视频数据（实际使用时替换为真实抓取）
  // 真实抓取需通过后端代理调用抖音网页版接口
  MOCK_VIDEOS: [
    {
      id: 'v1',
      title: '收房第一件事！验房师不会告诉你的7个细节，省下好几万',
      author: '老房改造日记',
      avatar: '👷',
      likes: 286000,
      comments: 8900,
      shares: 12000,
      thumbnail: '🏠',
      keyword: 'house',
      publishTime: '2天前',
      duration: '01:23',
      remixTips: '钩子强：「省下好几万」直击痛点。你可以改编为收房验房的本地化版本，加入你们自己的收房真实经历，前3秒用"差点被坑X万"制造悬念。'
    },
    {
      id: 'v2',
      title: '毛坯房变身记｜30天爆改60平老破小，邻居看了都眼红',
      author: '改造家小林',
      avatar: '🛠',
      likes: 458000,
      comments: 15000,
      shares: 28000,
      thumbnail: '✨',
      keyword: 'renovate',
      publishTime: '3天前',
      duration: '02:15',
      remixTips: '「30天」「60平」「老破小」三个标签信息密度高。可参考其时间线叙事结构，用Before/After对比做你们收房后的改造系列，强调"视觉新居"的反差感。'
    },
    {
      id: 'v3',
      title: '花200块把出租屋改成了ins风，室友以为我请了设计师',
      author: '租屋改造师',
      avatar: '🎨',
      likes: 520000,
      comments: 23000,
      shares: 35000,
      thumbnail: '🪟',
      keyword: 'visual',
      publishTime: '1天前',
      duration: '01:45',
      remixTips: '低预算+高反差是永恒爆款公式。你们可以拍"收房后花XXX元打造视觉新居"系列，用真实数字+前后对比，结尾加"关注看完整改造过程"引导。'
    },
    {
      id: 'v4',
      title: '收房当天我哭了...这些坑千万别踩！附避坑清单',
      author: '装修避坑指南',
      avatar: '⚠️',
      likes: 312000,
      comments: 18000,
      shares: 42000,
      thumbnail: '😢',
      keyword: 'house',
      publishTime: '5小时前',
      duration: '00:58',
      remixTips: '情绪钩子「我哭了」+干货「避坑清单」。可改编为你们的真实收房情绪日记，前3秒放最崩溃的瞬间，然后展开干货，结尾引导收藏清单。'
    },
    {
      id: 'v5',
      title: '这个转场太丝滑了！装修改造视频必备的5种运镜',
      author: '视频剪辑师阿杰',
      avatar: '🎬',
      likes: 198000,
      comments: 5600,
      shares: 15000,
      thumbnail: '🎥',
      keyword: 'transition',
      publishTime: '1天前',
      duration: '01:12',
      remixTips: '纯技巧类内容适合做二创素材库。建议你们收藏这类运镜技巧，应用到自己的收房改造视频中，提升画面质感。可做"学到了"系列技术复盘。'
    },
    {
      id: 'v6',
      title: '新房入住必买的10件神仙好物，第5个我后悔买晚了',
      author: '家居好物种草',
      avatar: '🛒',
      likes: 678000,
      comments: 32000,
      shares: 56000,
      thumbnail: '🛋',
      keyword: 'furniture',
      publishTime: '2天前',
      duration: '02:30',
      remixTips: '「后悔买晚了」制造好奇缺口。你们收房后可以拍真实好物开箱，用"入住X天后最离不开的N件好物"形式，真实体验比纯种草更有信任感。'
    },
    {
      id: 'v7',
      title: '验房全流程｜手把手教你检查这12个地方，开发商都怕你',
      author: '验房老司机',
      avatar: '🔧',
      likes: 234000,
      comments: 9800,
      shares: 31000,
      thumbnail: '📋',
      keyword: 'house',
      publishTime: '6小时前',
      duration: '03:20',
      remixTips: '教程类长视频，完播率好。你们可以拍自己的验房全过程，做成系列"小赵和小董的收房日记#1"，用真实人设拉近距离，比纯教程更有温度。'
    },
    {
      id: 'v8',
      title: '从收房到入住｜180天记录我们的第一个家',
      author: '小夫妻的装修日记',
      avatar: '💕',
      likes: 892000,
      comments: 56000,
      shares: 89000,
      thumbnail: '🏡',
      keyword: 'renovate',
      publishTime: '3天前',
      duration: '04:50',
      remixTips: '强人设+长周期记录=高粘性。这正是你们的账号方向！参考其叙事节奏：用时间轴串联回忆，配情绪BGM，结尾升华"家"的意义。你们的差异化在"视觉"二字，强调美学层面的改造。'
    }
  ],

  currentKeyword: 'all',
  searchQuery: '',

  init() {
    this.renderKeywords();
    this.renderVideos();
    this.bindEvents();
  },

  bindEvents() {
    // 搜索
    document.getElementById('hotSearchBtn').addEventListener('click', () => this.search());
    document.getElementById('hotSearchInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.search();
    });

    // 搜索和刷新按钮已改为 HTML onclick 绑定
  },

  // 刷新热点
  refresh() {
    showToast('🔄 正在获取最新热点...');
    setTimeout(() => {
      this.renderVideos();
      showToast('✅ 热点已更新');
    }, 1000);
  },

  // 渲染关键词筛选
  renderKeywords() {
    const container = document.getElementById('hotKeywords');
    const allChip = `<button class="filter-chip active" data-keyword="all" onclick="Hotspot.setKeyword('all')">全部</button>`;
    const chips = this.KEYWORDS.map(k =>
      `<button class="filter-chip" data-keyword="${k.id}" onclick="Hotspot.setKeyword('${k.id}')">${k.emoji} ${k.name}</button>`
    ).join('');
    container.innerHTML = allChip + chips;
  },

  // 设置关键词筛选
  setKeyword(keyword) {
    this.currentKeyword = keyword;
    const container = document.getElementById('hotKeywords');
    container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    const active = container.querySelector(`[data-keyword="${keyword}"]`);
    if (active) active.classList.add('active');
    this.renderVideos();
  },

  // 搜索
  search() {
    this.searchQuery = document.getElementById('hotSearchInput').value.trim().toLowerCase();
    this.renderVideos();
  },

  // 获取视频列表
  getVideos() {
    let videos = [...this.MOCK_VIDEOS];

    // 关键词筛选
    if (this.currentKeyword !== 'all') {
      videos = videos.filter(v => v.keyword === this.currentKeyword);
    }

    // 搜索筛选
    if (this.searchQuery) {
      videos = videos.filter(v =>
        v.title.toLowerCase().includes(this.searchQuery) ||
        v.author.toLowerCase().includes(this.searchQuery)
      );
    }

    return videos;
  },

  // 渲染视频列表
  renderVideos() {
    const container = document.getElementById('videoList');
    const videos = this.getVideos();

    if (videos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🔍</div>
          <div class="text">没有找到相关热点视频<br>试试其他关键词</div>
        </div>
      `;
      return;
    }

    container.innerHTML = videos.map(v => this.renderVideoCard(v)).join('');
  },

  // 渲染单个视频卡片
  renderVideoCard(v) {
    const favorites = Store.get(Store.KEYS.FAVORITES, []);
    const isFav = favorites.includes(v.id);

    return `
      <div class="video-card">
        <div class="video-thumb" onclick="">
          <span style="font-size:48px;">${v.thumbnail}</span>
          <div class="play-overlay">▶</div>
          <div class="video-stats">
            <span class="stat-badge">❤️ ${Store.formatNum(v.likes)}</span>
            <span class="stat-badge">💬 ${Store.formatNum(v.comments)}</span>
            <span class="stat-badge">⏱ ${v.duration}</span>
          </div>
        </div>
        <div class="video-info">
          <div class="video-title">${v.title}</div>
          <div class="video-author">${v.avatar} ${v.author} · ${v.publishTime}</div>
          <div class="video-actions">
            <button class="btn btn-sm btn-primary remix-btn" data-id="${v.id}" onclick="Hotspot.showRemixSuggestion('${v.id}')">💡 二创建议</button>
            <button class="btn btn-sm btn-outline favorite-btn" data-id="${v.id}" onclick="Hotspot.toggleFavorite('${v.id}')">
              ${isFav ? '⭐ 已收藏' : '☆ 收藏'}
            </button>
            <button class="btn btn-sm btn-outline open-video-btn" data-id="${v.id}" onclick="showToast('🔗 在抖音App中打开...')">🔗 打开</button>
          </div>
          <div id="remix-${v.id}" style="display:none;margin-top:10px;"></div>
        </div>
      </div>
    `;
  },

  // 显示二创建议
  showRemixSuggestion(videoId) {
    const video = this.MOCK_VIDEOS.find(v => v.id === videoId);
    if (!video) return;

    const container = document.getElementById(`remix-${videoId}`);
    const isVisible = container.style.display !== 'none';

    if (isVisible) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div class="remix-suggestion">
        <div class="remix-title">🎯 二创改编建议</div>
        <div class="remix-tips">${video.remixTips}</div>
        <div style="margin-top:10px;display:flex;gap:8px;">
          <button class="btn btn-sm btn-accent" onclick="Hotspot.saveInspiration('${video.id}')">📝 存为灵感</button>
          <button class="btn btn-sm btn-outline" onclick="Hotspot.copyRemix('${video.id}')">📋 复制文案</button>
        </div>
      </div>
    `;
  },

  // 收藏/取消收藏
  toggleFavorite(videoId) {
    let favorites = Store.get(Store.KEYS.FAVORITES, []);
    if (favorites.includes(videoId)) {
      favorites = favorites.filter(id => id !== videoId);
      showToast('已取消收藏');
    } else {
      favorites.push(videoId);
      showToast('⭐ 已收藏');
    }
    Store.set(Store.KEYS.FAVORITES, favorites);
    this.renderVideos();
  },

  // 存为灵感
  saveInspiration(videoId) {
    const video = this.MOCK_VIDEOS.find(v => v.id === videoId);
    if (!video) return;

    const inspirations = Store.get(Store.KEYS.INSPIRATIONS);
    inspirations.unshift({
      id: Store.genId(),
      category: '二创灵感',
      title: video.title,
      content: video.remixTips,
      source: video.author,
      tags: ['热点二创', this.KEYWORDS.find(k => k.id === video.keyword)?.name || ''],
      createdAt: Date.now()
    });
    Store.set(Store.KEYS.INSPIRATIONS, inspirations);
    showToast('✅ 已存入灵感库');
  },

  // 复制文案
  copyRemix(videoId) {
    const video = this.MOCK_VIDEOS.find(v => v.id === videoId);
    if (!video) return;
    const text = `${video.title}\n\n二创建议：${video.remixTips}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 已复制到剪贴板');
    }).catch(() => {
      showToast('复制失败，请手动选择');
    });
  },

  // 获取真实热点数据（预留接口，需后端代理）
  async fetchRealHotspots(keyword) {
    // 实际实现需要后端代理，避免CORS
    // 后端示例（Python Flask）:
    //
    // @app.route('/api/hotspots')
    // def hotspots():
    //     import requests
    //     url = 'https://www.douyin.com/aweme/v1/web/search/item/'
    //     params = {'keyword': request.args.get('keyword'), 'count': 20}
    //     headers = {'User-Agent': '...'}
    //     resp = requests.get(url, params=params, headers=headers)
    //     return jsonify(resp.json())
    //
    // 前端调用：
    // const resp = await fetch(`/api/hotspots?keyword=${keyword}`);
    // return await resp.json();

    showToast('⚠️ 真实数据接口待部署后端');
    return this.MOCK_VIDEOS;
  }
};
