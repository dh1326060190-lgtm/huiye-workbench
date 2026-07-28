// ============================================
// 绘野工作台 - 抖音热点抓取模块
// 小赵和小董的视觉新居 - 收房视频方向
// ============================================

const Hotspot = {
  KEYWORDS: [
    { id: 'house', name: '收房', emoji: '🏠' },
    { id: 'renovate', name: '装修', emoji: '🔨' },
    { id: 'visual', name: '视觉设计', emoji: '🎨' },
    { id: 'furniture', name: '家居好物', emoji: '🛋' },
    { id: 'transition', name: '转场技巧', emoji: '✨' },
    { id: 'unbox', name: '开箱', emoji: '📦' }
  ],

  MOCK_VIDEOS: [
    {
      id: 'v1',
      title: '精装房收房验房全流程！7个地方开发商最怕你查',
      author: '验房老徐',
      avatar: '🔧',
      likes: 323000,
      comments: 12000,
      shares: 18000,
      thumbnail: '���',
      keyword: 'house',
      douyinUrl: 'https://www.douyin.com/search/精装房收房验房全流程',
      publishTime: '3小时前',
      duration: '02:48',
      remixTips: '避坑类内容是家居垂类互动率最高的题材（平均8.2%）。小赵和小董可以拍"收房第一天验房日记"，前3秒展示最严重的验房问题（如空鼓/渗水），中间逐项讲解，结尾提供验房清单福利引导关注。'
    },
    {
      id: 'v2',
      title: '毛坯房到入住全过程！180天记录从收房到惊艳蜕变',
      author: '小夫妻装修记',
      avatar: '💕',
      likes: 892000,
      comments: 56000,
      shares: 89000,
      thumbnail: '🏡',
      keyword: 'renovate',
      douyinUrl: 'https://www.douyin.com/search/毛坯房到入住全过程180天记录',
      publishTime: '2天前',
      duration: '04:50',
      remixTips: '完工案例展示类内容通过「毛坯→成品」完整链路建立信任，是转化率最高的题材。你们完全可以做"小赵和小董的视觉新居"系列：收房→设计→施工→软装→入住，每期一个节点，系列化运营提升关注率。'
    },
    {
      id: 'v3',
      title: '装修避坑！水电改造5个隐形收费，差点多花2万',
      author: '透明装老徐',
      avatar: '⚠️',
      likes: 456000,
      comments: 23000,
      shares: 35000,
      thumbnail: '⚡',
      keyword: 'renovate',
      douyinUrl: 'https://www.douyin.com/search/装修避坑水电改造隐形收费',
      publishTime: '1天前',
      duration: '01:35',
      remixTips: '避坑指南用「错误示范+正确做法」对比呈现，互动率远超均值。你们收房后进入装修阶段可以拍"收房后装修踩坑日记"，每期一个主题（水电/泥瓦/木工），真实经历最打动人。'
    },
    {
      id: 'v4',
      title: '2026极简中古风火了！收房后这样装邻居都来抄作业',
      author: '设计师童姐',
      avatar: '🎨',
      likes: 287000,
      comments: 9800,
      shares: 22000,
      thumbnail: '🪑',
      keyword: 'visual',
      douyinUrl: 'https://www.douyin.com/search/2026极简中古风装修设计',
      publishTime: '4小时前',
      duration: '02:10',
      remixTips: '设计师干货类内容吸引高净值用户。结合2026年流行趋势（极简中古风/轻法式复古/智能整装），你们可以拍"收房后，设计师告诉你今年最火的3种风格怎么选"，展现专业审美。'
    },
    {
      id: 'v5',
      title: '工地巡检实录！卫生间防水这样做才靠谱',
      author: 'BOSS直巡',
      avatar: '👷',
      likes: 198000,
      comments: 7600,
      shares: 12000,
      thumbnail: '🛠',
      keyword: 'renovate',
      douyinUrl: 'https://www.douyin.com/search/工地巡检卫生间防水施工',
      publishTime: '12小时前',
      duration: '01:50',
      remixTips: '工地巡检类内容通过展示实时施工场景建立信任。你们可以在装修过程中拍"工地巡检Vlog"，真实记录每个施工节点，既建立专业形象又积累素材。'
    },
    {
      id: 'v6',
      title: '收房后第一件事！90后小夫妻的改造清单，每件都好用',
      author: '家居好物阿杰',
      avatar: '🛒',
      likes: 678000,
      comments: 32000,
      shares: 56000,
      thumbnail: '🛋',
      keyword: 'furniture',
      douyinUrl: 'https://www.douyin.com/search/收房后改造清单家居好物',
      publishTime: '2天前',
      duration: '02:30',
      remixTips: '好物推荐结合真实使用场景。你们可以拍"收房后我们买了这10件好东西"，用你们的真实体验做背书，比纯种草更有说服力。'
    },
    {
      id: 'v7',
      title: '收房当天哭了3次...新房交付一定要检查这12个地方',
      author: '装修避坑指南',
      avatar: '😢',
      likes: 312000,
      comments: 18000,
      shares: 42000,
      thumbnail: '📋',
      keyword: 'house',
      douyinUrl: 'https://www.douyin.com/search/收房当天新房交付检查清单',
      publishTime: '6小时前',
      duration: '03:20',
      remixTips: '情绪+干货双钩子。你们可以拍"收房当天我们经历了什么"，前3秒放最情绪化的瞬间，中间干货输出，结尾升华"家"的意义。这是你们账号差异化最大的方向——用真情实感做内容。'
    },
    {
      id: 'v8',
      title: '小户型收纳绝了！30平装出60平效果，设计师手把手教',
      author: '收纳设计师',
      avatar: '📐',
      likes: 523000,
      comments: 21000,
      shares: 38000,
      thumbnail: '🏘',
      keyword: 'visual',
      douyinUrl: 'https://www.douyin.com/search/小户型收纳30平装出60平效果',
      publishTime: '1天前',
      duration: '02:05',
      remixTips: '小户型收纳是刚需内容，Z世代（占家居消费人群62%）最关注空间利用率。你们收房后可以拍"60平怎么装出120平的视觉效果"，强调"视觉新居"的品牌定位。'
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
    document.getElementById('hotSearchBtn').addEventListener('click', () => this.search());
    document.getElementById('hotSearchInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.search();
    });
  },

  refresh() {
    showToast('🔄 正在获取最新热点...');
    setTimeout(() => {
      this.renderVideos();
      showToast('✅ 热点已更新');
    }, 1000);
  },

  renderKeywords() {
    const container = document.getElementById('hotKeywords');
    const allChip = '<button class="filter-chip active" data-keyword="all" onclick="Hotspot.setKeyword(\'all\')">全部</button>';
    const chips = this.KEYWORDS.map(k =>
      '<button class="filter-chip" data-keyword="' + k.id + '" onclick="Hotspot.setKeyword(\'' + k.id + '\')">' + k.emoji + ' ' + k.name + '</button>'
    ).join('');
    container.innerHTML = allChip + chips;
  },

  setKeyword(keyword) {
    this.currentKeyword = keyword;
    const container = document.getElementById('hotKeywords');
    container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    const active = container.querySelector('[data-keyword="' + keyword + '"]');
    if (active) active.classList.add('active');
    this.renderVideos();
  },

  search() {
    this.searchQuery = document.getElementById('hotSearchInput').value.trim().toLowerCase();
    this.renderVideos();
  },

  getVideos() {
    let videos = [...this.MOCK_VIDEOS];
    if (this.currentKeyword !== 'all') {
      videos = videos.filter(v => v.keyword === this.currentKeyword);
    }
    if (this.searchQuery) {
      videos = videos.filter(v =>
        v.title.toLowerCase().includes(this.searchQuery) ||
        v.author.toLowerCase().includes(this.searchQuery)
      );
    }
    return videos;
  },

  renderVideos() {
    const container = document.getElementById('videoList');
    const videos = this.getVideos();
    if (videos.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="emoji">🔍</div><div class="text">没有找到相关热点视频<br>试试其他关键词</div></div>';
      return;
    }
    container.innerHTML = videos.map(v => this.renderVideoCard(v)).join('');
  },

  renderVideoCard(v) {
    const favorites = Store.get(Store.KEYS.FAVORITES, []);
    const isFav = favorites.includes(v.id);
    return '<div class="video-card">' +
      '<div class="video-thumb" onclick="Hotspot.openVideo(\'' + v.id + '\')">' +
      '<span style="font-size:48px;">' + v.thumbnail + '</span>' +
      '<div class="play-overlay">▶</div>' +
      '<div class="video-stats">' +
      '<span class="stat-badge">❤️ ' + Store.formatNum(v.likes) + '</span>' +
      '<span class="stat-badge">💬 ' + Store.formatNum(v.comments) + '</span>' +
      '<span class="stat-badge">⏱ ' + v.duration + '</span>' +
      '</div></div>' +
      '<div class="video-info">' +
      '<div class="video-title">' + v.title + '</div>' +
      '<div class="video-author">' + v.avatar + ' ' + v.author + ' · ' + v.publishTime + '</div>' +
      '<div class="video-actions">' +
      '<button class="btn btn-sm btn-primary remix-btn" onclick="Hotspot.showRemixSuggestion(\'' + v.id + '\')">二创建议</button>' +
      '<button class="btn btn-sm btn-outline" onclick="Hotspot.toggleFavorite(\'' + v.id + '\')">' + (isFav ? '已收藏' : '收藏') + '</button>' +
      '<button class="btn btn-sm btn-outline" onclick="Hotspot.openVideo(\'' + v.id + '\')">打开抖音</button>' +
      '</div>' +
      '<div id="remix-' + v.id + '" style="display:none;margin-top:10px;"></div>' +
      '</div></div>';
  },

  showRemixSuggestion(videoId) {
    const video = this.MOCK_VIDEOS.find(v => v.id === videoId);
    if (!video) return;
    const container = document.getElementById('remix-' + videoId);
    if (container.style.display !== 'none') {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';
    container.innerHTML = '<div class="remix-suggestion">' +
      '<div class="remix-title">🎯 二创改编建议</div>' +
      '<div class="remix-tips">' + video.remixTips + '</div>' +
      '<div style="margin-top:10px;display:flex;gap:8px;">' +
      '<button class="btn btn-sm btn-accent" onclick="Hotspot.saveInspiration(\'' + videoId + '\')">📝 存为灵感</button>' +
      '<button class="btn btn-sm btn-outline" onclick="Hotspot.copyRemix(\'' + videoId + '\')">📋 复制文案</button>' +
      '</div></div>';
  },

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

  copyRemix(videoId) {
    const video = this.MOCK_VIDEOS.find(v => v.id === videoId);
    if (!video) return;
    const text = video.title + '\\n\\n二创建议：' + video.remixTips;
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 已复制到剪贴板');
    }).catch(() => {
      showToast('复制失败，请手动选择');
    });
  },

  // 打开视频 - 优先用真实视频ID直接跳转，否则用标题精准搜索
  openVideo(videoId) {
    const video = this.MOCK_VIDEOS.find(v => v.id === videoId);
    if (!video) {
      showToast('视频不存在');
      return;
    }

    // 提取视频完整标题
    const rawTitle = video.title.trim();
    const encodedTitle = encodeURIComponent(rawTitle);

    // 判断是否有真实视频ID（douyin video ID 通常是15~20位数字）
    let targetAppUrl, targetWebUrl;
    if (video.realVideoId && /^\d{15,20}$/.test(video.realVideoId)) {
      // 有真实视频ID：直接打开视频详情页
      targetAppUrl = 'snssdk1128://aweme/detail/' + video.realVideoId;
      targetWebUrl = 'https://www.douyin.com/video/' + video.realVideoId;
      showToast('正在打开抖音视频...');
    } else {
      // 没有真实ID：用完整标题做精准搜索（优于之前的截断关键词搜索）
      // 优先使用预设的 douyinUrl 搜索链接
      if (video.douyinUrl && video.douyinUrl.indexOf('douyin.com/search/') !== -1) {
        targetWebUrl = video.douyinUrl + '?type=video';
      } else {
        targetWebUrl = 'https://www.douyin.com/search/' + encodedTitle + '?type=video';
      }
      targetAppUrl = 'snssdk1128://search/' + encodedTitle + '?type=video';
      showToast('正在打开抖音搜索...');
    }

    // 用 location.href 方式唤起 App（比 iframe 兼容性更好）
    var startTime = Date.now();
    window.location.href = targetAppUrl;

    // 如果2.5秒后页面还没跳走（App没被唤起），打开网页版
    var fallbackTimer = setTimeout(function() {
      if (Date.now() - startTime < 2600) {
        window.open(targetWebUrl, '_blank');
      }
    }, 2500);

    // 页面失焦/隐藏时清除回退定时器
    var cleanup = function() {
      clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', cleanup);
      window.removeEventListener('blur', cleanup);
      window.removeEventListener('pagehide', cleanup);
    };
    document.addEventListener('visibilitychange', cleanup);
    window.addEventListener('blur', cleanup);
    window.addEventListener('pagehide', cleanup);

    // 6秒后强制清理
    setTimeout(cleanup, 6000);
  },

  // 打开抖音搜索关键词（保留兼容）
  openInDouyin(keyword) {
    const kwMap = {
      'house': '收房验房',
      'renovate': '装修改造',
      'visual': '视觉设计装修',
      'furniture': '家居好物',
      'transition': '转场技巧',
      'unbox': '开箱测评'
    };
    const searchWord = kwMap[keyword] || keyword;
    const url = 'https://www.douyin.com/search/' + encodeURIComponent(searchWord);
    const schemeUrl = 'snssdk1128://search/' + encodeURIComponent(searchWord);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = schemeUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
      window.open(url, '_blank');
    }, 3000);
  },

  async fetchRealHotspots(keyword) {
    showToast('⚠️ 真实数据接口待部署后端');
    return this.MOCK_VIDEOS;
  }
};
