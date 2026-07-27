// ============================================
// 绘野工作台 - 内容复盘模块
// 小赵和小董的视觉新居
// ============================================

const Review = {
  // 复盘评分维度
  DIMENSIONS: [
    { id: 'topic', name: '选题方向', desc: '选题是否贴合受众需求' },
    { id: 'title', name: '标题文案', desc: '是否有吸引点击的钩子' },
    { id: 'cover', name: '封面设计', desc: '封面是否足够吸睛' },
    { id: 'rhythm', name: '节奏把控', desc: '前3秒是否抓住注意力' },
    { id: 'hook', name: '钩子设置', desc: '是否有留存和完播的钩子' },
    { id: 'cta', name: '互动引导', desc: '是否有效引导评论/关注' }
  ],

  currentReview: null,

  init() {
    this.bindEvents();
    this.renderList();
  },

  bindEvents() {
    // 添加/保存/关闭/截图上传按钮已改为 HTML onclick 绑定，兼容 OPPO 等国产浏览器

    // 评分星星
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('star') && e.target.dataset.dim) {
        this.setScore(e.target.dataset.dim, parseInt(e.target.dataset.score));
      }
    });
  },

  // 渲染复盘列表
  renderList() {
    const container = document.getElementById('reviewList');
    const reviews = Store.get(Store.KEYS.REVIEWS);

    if (reviews.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="emoji">📊</div>
          <div class="text">还没有复盘记录<br>每次发布后及时复盘，持续优化内容</div>
        </div>
      `;
      return;
    }

    // 按时间倒序
    reviews.sort((a, b) => b.createdAt - a.createdAt);

    container.innerHTML = reviews.map(r => this.renderReviewCard(r)).join('');
  },

  // 渲染复盘卡片
  renderReviewCard(r) {
    const avgScore = this.calcAvgScore(r.scores);
    const optSuggestion = this.generateOptimization(r);

    return `
      <div class="review-card">
        <div class="review-header">
          <div>
            <div class="review-title">${this.escape(r.videoTitle || '未命名复盘')}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
              ${r.platform === 'douyin' ? '🎵 抖音' : r.platform === 'xiaohongshu' ? '📕 小红书' : '📱 其他'} ·
              ${Store.formatTime(r.createdAt)}
            </div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:24px;font-weight:700;color:${avgScore >= 4 ? 'var(--success)' : avgScore >= 3 ? 'var(--warning)' : 'var(--danger)'};">${avgScore.toFixed(1)}</div>
            <div style="font-size:10px;color:var(--text-muted);">综合分</div>
          </div>
        </div>

        ${r.data ? `
        <div class="data-grid">
          <div class="data-item">
            <div class="data-num">${Store.formatNum(r.data.views || 0)}</div>
            <div class="data-label">播放</div>
          </div>
          <div class="data-item">
            <div class="data-num">${Store.formatNum(r.data.likes || 0)}</div>
            <div class="data-label">点赞</div>
          </div>
          <div class="data-item">
            <div class="data-num">${Store.formatNum(r.data.comments || 0)}</div>
            <div class="data-label">评论</div>
          </div>
          <div class="data-item">
            <div class="data-num">${Store.formatNum(r.data.shares || 0)}</div>
            <div class="data-label">转发</div>
          </div>
        </div>
        ` : ''}

        <div class="score-grid">
          ${this.DIMENSIONS.map(d => `
            <div class="score-item">
              <div class="score-label">${d.name}</div>
              <div class="score-stars">
                ${[1,2,3,4,5].map(n => `<span class="star ${n <= (r.scores?.[d.id] || 0) ? 'active' : ''}">★</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        ${r.note ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;padding:8px;background:var(--bg-input);border-radius:8px;">📝 ${this.escape(r.note)}</div>` : ''}

        <div class="optimization-box">
          <div class="opt-title">⚡ 优化建议</div>
          <div class="opt-content">${optSuggestion}</div>
        </div>

        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn btn-sm btn-outline review-edit-btn" data-id="${r.id}" onclick="Review.openReviewModal('${r.id}')">✏️ 编辑</button>
          <button class="btn btn-sm btn-outline review-delete-btn" data-id="${r.id}" onclick="Review.deleteReview('${r.id}')">🗑 删除</button>
        </div>
      </div>
    `;
  },

  // 打开复盘弹窗
  openReviewModal(reviewId = null) {
    const overlay = document.getElementById('reviewModalOverlay');
    const form = document.getElementById('reviewForm');
    form.reset();

    if (reviewId) {
      const reviews = Store.get(Store.KEYS.REVIEWS);
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return;

      document.getElementById('reviewModalTitle').textContent = '编辑复盘';
      document.getElementById('reviewId').value = review.id;
      document.getElementById('videoTitle').value = review.videoTitle || '';
      document.getElementById('reviewPlatform').value = review.platform || 'douyin';
      document.getElementById('reviewNote').value = review.note || '';

      // 填充数据
      if (review.data) {
        document.getElementById('dataViews').value = review.data.views || '';
        document.getElementById('dataLikes').value = review.data.likes || '';
        document.getElementById('dataComments').value = review.data.comments || '';
        document.getElementById('dataShares').value = review.data.shares || '';
      }

      // 填充评分
      this.currentReview = review;
      this.renderStars(review.scores || {});
    } else {
      document.getElementById('reviewModalTitle').textContent = '新建复盘';
      document.getElementById('reviewId').value = '';
      this.currentReview = { scores: {} };
      this.renderStars({});
    }

    overlay.classList.add('active');
  },

  closeReviewModal() {
    document.getElementById('reviewModalOverlay').classList.remove('active');
    this.currentReview = null;
  },

  // 渲染评分星星
  renderStars(scores) {
    const container = document.getElementById('reviewScores');
    container.innerHTML = this.DIMENSIONS.map(d => `
      <div class="score-item">
        <div class="score-label">${d.name}<br><span style="font-size:10px;color:var(--text-muted);">${d.desc}</span></div>
        <div class="score-stars" data-dim="${d.id}">
          ${[1,2,3,4,5].map(n => `<span class="star ${n <= (scores[d.id] || 0) ? 'active' : ''}" data-dim="${d.id}" data-score="${n}">★</span>`).join('')}
        </div>
      </div>
    `).join('');
  },

  // 设置评分
  setScore(dim, score) {
    if (!this.currentReview) this.currentReview = { scores: {} };
    if (!this.currentReview.scores) this.currentReview.scores = {};
    this.currentReview.scores[dim] = score;

    // 更新星星显示
    const container = document.querySelector(`.score-stars[data-dim="${dim}"]`);
    if (container) {
      container.querySelectorAll('.star').forEach((star, idx) => {
        star.classList.toggle('active', idx < score);
      });
    }
  },

  // 处理截图上传 - 使用 Tesseract.js 本地OCR识别
  async handleScreenshot(event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast('🔍 正在加载识别引擎...');

    try {
      // 动态加载 Tesseract.js，多 CDN 源自动切换
      if (!window.Tesseract) {
        showToast('📦 首次使用需下载中文语言包（约10MB），请稍候...');
        const urls = [
          'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js',
          'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.0/tesseract.min.js'
        ];
        let loaded = false;
        for (const url of urls) {
          try {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = url;
              script.onload = resolve;
              script.onerror = () => reject(new Error('CDN load failed'));
              document.head.appendChild(script);
              setTimeout(() => reject(new Error('timeout')), 15000);
            });
            loaded = true;
            console.log('[OCR] Tesseract 加载成功:', url);
            break;
          } catch (e) {
            console.warn('[OCR] CDN 加载失败:', url, e.message);
          }
        }
        if (!loaded) throw new Error('所有 CDN 源加载失败，请检查网络');
      }

      showToast('🔍 正在识别截图中的数字...');

      // 将图片转为可处理的URL
      const imageUrl = URL.createObjectURL(file);

      // 使用 Tesseract 识别中文+数字
      const result = await Tesseract.recognize(imageUrl, 'chi_sim', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            showToast('🔍 识别中 ' + Math.round(m.progress * 100) + '%...');
          }
        }
      });

      URL.revokeObjectURL(imageUrl);

      // 从识别结果中提取数字
      const text = result.data.text;
      console.log('[OCR] 识别原文:', text);

      const data = this.parseScreenshotData(text);

      // 显示截图预览，方便对照输入
      const preview = document.getElementById('screenshotPreview');
      const img = document.getElementById('screenshotImg');
      img.src = imageUrl;
      preview.style.display = 'block';
      document.getElementById('uploadIcon').textContent = '✅';
      document.getElementById('uploadText').innerHTML = '截图已上传<br><small>下方可对照手动输入</small>';

      document.getElementById('dataViews').value = data.views;
      document.getElementById('dataLikes').value = data.likes;
      document.getElementById('dataComments').value = data.comments;
      document.getElementById('dataShares').value = data.shares;

      const hasData = data.views > 0 || data.likes > 0;
      showToast(hasData ? '✅ 识别完成！请核对数字，可手动修改' : '⚠️ 未能自动识别数字，请对照截图手动输入');
    } catch (err) {
      console.error('[OCR] 识别失败:', err);
      // OCR 失败时至少显示截图预览
      const file = document.getElementById('screenshotInput').files[0];
      if (file) {
        const fallbackUrl = URL.createObjectURL(file);
        const preview = document.getElementById('screenshotPreview');
        const img = document.getElementById('screenshotImg');
        img.src = fallbackUrl;
        preview.style.display = 'block';
        document.getElementById('uploadIcon').textContent = '📸';
        document.getElementById('uploadText').innerHTML = '截图已上传<br><small>请对照下方手动输入数据</small>';
      }
      showToast('⚠️ 自动识别暂不可用，请对照截图手动输入');
    }
  },

  // 从OCR识别文本中解析抖音数据
  // 抖音截图通常包含: 播放量 点赞 评论 分享
  parseScreenshotData(text) {
    const result = { views: 0, likes: 0, comments: 0, shares: 0 };

    // 清理文本，保留中文字符和数字
    const cleaned = text.replace(/\s+/g, ' ');

    // 策略1: 匹配 "播放" 后面的数字（抖音截图常见格式）
    const playPatterns = [
      /播放[:\s]*(\d[\d,.]*[万wW]?)/i,
      /播放量[:\s]*(\d[\d,.]*[万wW]?)/i,
      /浏览[:\s]*(\d[\d,.]*[万wW]?)/i,
    ];
    for (const p of playPatterns) {
      const m = cleaned.match(p);
      if (m) { result.views = this.parseNumber(m[1]); break; }
    }

    // 策略2: 匹配 "点赞" / "赞"
    const likePatterns = [
      /点赞[:\s]*(\d[\d,.]*[万wW]?)/i,
      /赞[:\s]*(\d[\d,.]*[万wW]?)/i,
      /❤[:\s]*(\d[\d,.]*[万wW]?)/i,
    ];
    for (const p of likePatterns) {
      const m = cleaned.match(p);
      if (m) { result.likes = this.parseNumber(m[1]); break; }
    }

    // 策略3: 匹配 "评论"
    const commentPatterns = [
      /评论[:\s]*(\d[\d,.]*[万wW]?)/i,
      /💬[:\s]*(\d[\d,.]*[万wW]?)/i,
    ];
    for (const p of commentPatterns) {
      const m = cleaned.match(p);
      if (m) { result.comments = this.parseNumber(m[1]); break; }
    }

    // 策略4: 匹配 "分享" / "转发"
    const sharePatterns = [
      /分享[:\s]*(\d[\d,.]*[万wW]?)/i,
      /转发[:\s]*(\d[\d,.]*[万wW]?)/i,
      /🔗[:\s]*(\d[\d,.]*[万wW]?)/i,
    ];
    for (const p of sharePatterns) {
      const m = cleaned.match(p);
      if (m) { result.shares = this.parseNumber(m[1]); break; }
    }

    // 兜底：如果关键词匹配失败，尝试从文本中按顺序提取所有数字
    // 抖音截图通常按 播放→点赞→评论→分享 的顺序排列
    if (result.views === 0 && result.likes === 0) {
      const allNums = cleaned.match(/\d[\d,.]*[万wW]?/g);
      if (allNums && allNums.length >= 4) {
        const nums = allNums.map(n => this.parseNumber(n));
        // 最大的一般是播放量
        const sorted = [...nums].sort((a, b) => b - a);
        result.views = sorted[0] || 0;
        result.likes = sorted[1] || 0;
        result.comments = sorted[2] || 0;
        result.shares = sorted[3] || 0;
      }
    }

    return result;
  },

  // 解析数字（支持万、千、逗号分隔等格式）
  parseNumber(str) {
    if (!str) return 0;
    str = str.replace(/,/g, '');
    if (str.endsWith('万') || str.endsWith('w') || str.endsWith('W')) {
      return Math.round(parseFloat(str) * 10000);
    }
    return parseInt(str) || 0;
  },

  // 计算平均分
  calcAvgScore(scores) {
    if (!scores) return 0;
    const vals = Object.values(scores).filter(v => v > 0);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  },

  // 生成优化建议
  generateOptimization(review) {
    const tips = [];
    const scores = review.scores || {};

    this.DIMENSIONS.forEach(d => {
      const score = scores[d.id] || 0;
      if (score > 0 && score <= 2) {
        tips.push(this.getLowScoreTip(d.id, d.name));
      }
    });

    // 数据分析建议
    if (review.data) {
      const { views, likes, comments, shares } = review.data;
      if (views > 0) {
        const likeRate = (likes / views * 100).toFixed(1);
        const commentRate = (comments / views * 100).toFixed(1);

        if (parseFloat(likeRate) < 3) {
          tips.push(`点赞率${likeRate}%偏低（建议>5%），内容价值感不足，加强情绪共鸣或实用干货。`);
        }
        if (parseFloat(commentRate) < 0.5) {
          tips.push(`评论率${commentRate}%偏低（建议>1%），缺少互动钩子，试试结尾抛出开放性问题。`);
        }
      }
    }

    if (tips.length === 0) {
      return '✅ 各维度表现不错！继续保持当前节奏，尝试在选题创新上突破，挖掘更多收房相关的内容角度。';
    }

    return tips.map((t, i) => `${i + 1}. ${t}`).join('<br>');
  },

  // 低分维度建议
  getLowScoreTip(dimId, dimName) {
    const tips = {
      topic: `<strong>${dimName}</strong>：研究同赛道近7天爆款选题，找到收房/装修领域的高热度话题，结合你们"视觉新居"定位做差异化切入。`,
      title: `<strong>${dimName}</strong>：标题加入数字、悬念或情绪词。参考公式："数字+结果+悬念"如"收房验房7个细节，第3个差点亏2万"。`,
      cover: `<strong>${dimName}</strong>：封面用高对比度+大字标题，Before/After对比图最吸睛。建议用统一色调建立账号视觉识别。`,
      rhythm: `<strong>${dimName}</strong>：前3秒必须出现冲突/悬念/结果。把视频中最精彩的画面剪到开头，避免慢热铺垫。`,
      hook: `<strong>${dimName}</strong>：每15秒设一个信息点或转折，保持观众注意力。中间加入"别划走，重点来了"等留存话术。`,
      cta: `<strong>${dimName}</strong>：结尾明确引导互动，如"评论区告诉我你最想看哪个空间改造"或"关注看完整系列"。`
    };
    return tips[dimId] || `${dimName}需要优化`;
  },

  // 保存复盘
  saveReview() {
    const id = document.getElementById('reviewId').value;
    const title = document.getElementById('videoTitle').value.trim();

    if (!title) {
      showToast('请输入视频标题');
      return;
    }

    if (!this.currentReview || !this.currentReview.scores) {
      showToast('请至少给一个维度评分');
      return;
    }

    const hasScores = Object.values(this.currentReview.scores).some(v => v > 0);
    if (!hasScores) {
      showToast('请至少给一个维度评分');
      return;
    }

    const reviewData = {
      id: id || Store.genId(),
      videoTitle: title,
      platform: document.getElementById('reviewPlatform').value,
      note: document.getElementById('reviewNote').value.trim(),
      scores: this.currentReview.scores,
      data: {
        views: parseInt(document.getElementById('dataViews').value) || 0,
        likes: parseInt(document.getElementById('dataLikes').value) || 0,
        comments: parseInt(document.getElementById('dataComments').value) || 0,
        shares: parseInt(document.getElementById('dataShares').value) || 0
      },
      createdAt: id ? (Store.get(Store.KEYS.REVIEWS).find(r => r.id === id)?.createdAt || Date.now()) : Date.now()
    };

    const reviews = Store.get(Store.KEYS.REVIEWS);
    if (id) {
      const idx = reviews.findIndex(r => r.id === id);
      if (idx > -1) reviews[idx] = reviewData;
    } else {
      reviews.push(reviewData);
    }

    Store.set(Store.KEYS.REVIEWS, reviews);
    this.closeReviewModal();
    this.renderList();
    showToast(id ? '复盘已更新' : '复盘已保存');
  },

  // 删除复盘
  deleteReview(reviewId) {
    if (!confirm('确定删除这条复盘吗？')) return;
    let reviews = Store.get(Store.KEYS.REVIEWS);
    reviews = reviews.filter(r => r.id !== reviewId);
    Store.set(Store.KEYS.REVIEWS, reviews);
    this.renderList();
    showToast('复盘已删除');
  },

  escape(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  // 初始化示例复盘
  seedDemoReview() {
    const reviews = Store.get(Store.KEYS.REVIEWS);
    if (reviews.length > 0) return;

    const demoReview = {
      id: Store.genId(),
      videoTitle: '收房第一天｜验房差点被坑，这5个地方一定要查！',
      platform: 'douyin',
      note: '视频前3秒节奏可以更快，封面文字太小看不清。',
      scores: { topic: 4, title: 3, cover: 2, rhythm: 3, hook: 3, cta: 2 },
      data: { views: 12300, likes: 680, comments: 45, shares: 32 },
      createdAt: Date.now() - 86400000
    };

    Store.set(Store.KEYS.REVIEWS, [demoReview]);
  }
};
