// ============================================
// 绘野工作台 - 内容复盘模块 v3
// 链接分析 + 数据诊断 + AI优化建议
// ============================================

const Review = {
  currentReview: null,
  autoAnalyze: null,

  init() {
    this.renderList();
  },

  // ========== 从链接提取信息 ==========
  extractFromLink() {
    const link = document.getElementById('videoLink').value.trim();
    if (!link) return;

    // 提取抖音标题（从分享文案中）
    const titleMatch = link.match(/抖音，看看(.+?)的作品/);
    if (titleMatch) {
      // 提取作品描述
    }

    // 从分享文案提取标题
    const descMatch = link.match(/看看[^的]*的作品[：:]*\s*(.+?)\s*#/);
    if (descMatch) {
      document.getElementById('videoTitle').value = descMatch[1].trim();
      showToast('? 已提取视频标题');
    }

    // 判断平台
    if (link.includes('douyin.com') || link.includes('v.douyin')) {
      document.getElementById('reviewPlatform').value = 'douyin';
    } else if (link.includes('xiaohongshu') || link.includes('xhslink')) {
      document.getElementById('reviewPlatform').value = 'xiaohongshu';
    }
  },

  // ========== 渲染复盘列表 ==========
  renderList() {
    const container = document.getElementById('reviewList');
    const reviews = Store.get(Store.KEYS.REVIEWS);

    if (reviews.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="emoji">?</div><div class="text">还没有复盘记录<br>粘贴视频链接+输入数据，秒出分析报告</div></div>`;
      return;
    }

    reviews.sort((a, b) => b.createdAt - a.createdAt);
    let html = this.renderTrend(reviews);
    html += reviews.map(r => this.renderReviewCard(r)).join('');
    container.innerHTML = html;
  },

  // ========== 趋势图 ==========
  renderTrend(reviews) {
    const recent = reviews.slice(0, 7).reverse();
    if (recent.length < 2) return '';

    const totalViews = recent.reduce((s, r) => s + (r.data?.views || 0), 0);
    const avgViews = Math.round(totalViews / recent.length);
    const totalLikes = recent.reduce((s, r) => s + (r.data?.likes || 0), 0);
    const avgLikeRate = totalViews > 0 ? (totalLikes / totalViews * 100).toFixed(1) : '0';
    const maxBar = Math.max(...recent.map(r => r.data?.views || 0), 1);

    return `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <span class="card-title">? 近7条趋势</span>
          <span style="font-size:12px;color:var(--text-muted);">共${reviews.length}条</span>
        </div>
        <div class="data-grid" style="margin-bottom:12px;">
          <div class="data-item"><div class="data-num">${Store.formatNum(avgViews)}</div><div class="data-label">均播放</div></div>
          <div class="data-item"><div class="data-num">${avgLikeRate}%</div><div class="data-label">均点赞率</div></div>
          <div class="data-item"><div class="data-num">${reviews.filter(r => (r.data?.views||0) > avgViews).length}/${recent.length}</div><div class="data-label">高于均值</div></div>
          <div class="data-item"><div class="data-num">${recent.length}</div><div class="data-label">总作品</div></div>
        </div>
        <div style="display:flex;align-items:flex-end;gap:4px;height:60px;padding:0 4px;">
          ${recent.map(r => {
            const h = Math.max((r.data?.views || 0) / maxBar * 100, 4);
            const color = (r.data?.views || 0) >= avgViews ? 'var(--primary)' : 'var(--text-muted)';
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
              <div style="font-size:9px;color:var(--text-muted);">${Store.formatNum(r.data?.views||0)}</div>
              <div style="width:100%;height:${h}%;background:${color};border-radius:3px 3px 0 0;min-height:4px;"></div>
              <div style="font-size:9px;color:var(--text-muted);max-width:40px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Store.formatTime(r.createdAt)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  // ========== 渲染复盘卡片（含完整AI分析） ==========
  renderReviewCard(r) {
    const data = r.data || {};
    const analysis = this.analyze(data, r.videoTitle || '');

    return `
      <div class="review-card">
        <div class="review-header">
          <div style="flex:1;min-width:0;">
            <div class="review-title">${this.escape(r.videoTitle || '未命名')}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
              ${r.platform === 'douyin' ? '? 抖音' : r.platform === 'xiaohongshu' ? '? 小红书' : '? 其他'}
              · ${Store.formatTime(r.createdAt)}
            </div>
          </div>
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:24px;font-weight:700;color:${analysis.grade === 'A' ? 'var(--success)' : analysis.grade === 'B' ? 'var(--primary-light)' : analysis.grade === 'C' ? 'var(--warning)' : 'var(--danger)'};">${analysis.grade}</div>
            <div style="font-size:10px;color:var(--text-muted);">${analysis.label}</div>
          </div>
        </div>

        <div class="data-grid">
          <div class="data-item"><div class="data-num">${Store.formatNum(data.views || 0)}</div><div class="data-label">播放</div></div>
          <div class="data-item"><div class="data-num" style="color:${analysis.likeRate >= 5 ? 'var(--success)' : analysis.likeRate >= 3 ? 'var(--warning)' : 'var(--danger)'}">${analysis.likeRate}%</div><div class="data-label">点赞率</div></div>
          <div class="data-item"><div class="data-num" style="color:${analysis.commentRate >= 1 ? 'var(--success)' : 'var(--warning)'}">${analysis.commentRate}%</div><div class="data-label">评论率</div></div>
          <div class="data-item"><div class="data-num">${Store.formatNum(data.shares || 0)}</div><div class="data-label">转发</div></div>
        </div>

        ${r.note ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;padding:8px;background:var(--bg-input);border-radius:8px;">? ${this.escape(r.note)}</div>` : ''}

        <div class="optimization-box">
          <div class="opt-title">? AI分析报告</div>
          <div class="opt-content">${analysis.report}</div>
        </div>

        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn btn-sm btn-outline" onclick="Review.openReviewModal('${r.id}')">?? 编辑</button>
          <button class="btn btn-sm btn-outline" onclick="Review.deleteReview('${r.id}')">? 删除</button>
        </div>
      </div>`;
  },

  // ========== AI分析引擎 ==========
  analyze(data, title) {
    const views = data.views || 0;
    const likes = data.likes || 0;
    const comments = data.comments || 0;
    const shares = data.shares || 0;

    const likeRate = views > 0 ? parseFloat((likes / views * 100).toFixed(1)) : 0;
    const commentRate = views > 0 ? parseFloat((comments / views * 100).toFixed(1)) : 0;
    const shareRate = views > 0 ? parseFloat((shares / views * 100).toFixed(1)) : 0;
    const engagement = likeRate + commentRate * 3 + shareRate * 2;

    let grade, label;
    if (engagement >= 8) { grade = 'A'; label = '优质'; }
    else if (engagement >= 5) { grade = 'B'; label = '良好'; }
    else if (engagement >= 2) { grade = 'C'; label = '一般'; }
    else { grade = 'D'; label = '待提升'; }

    // 生成完整分析报告
    const parts = [];

    // 1. 数据诊断
    parts.push('<strong>? 数据诊断</strong>');
    if (views === 0) {
      parts.push('暂无播放数据');
    } else {
      if (likeRate < 3) parts.push(`点赞率 <b style="color:var(--danger)">${likeRate}%</b>（目标>5%）—— 观众看了但没被打动，缺少情绪共鸣或实用干货`);
      else if (likeRate >= 5) parts.push(`点赞率 <b style="color:var(--success)">${likeRate}%</b> 达标！内容价值感受到认可`);
      else parts.push(`点赞率 <b style="color:var(--warning)">${likeRate}%</b> 中等，试试加入"反常识"或"强烈对比"激发点赞欲`);

      if (commentRate < 0.5) parts.push(`评论率 <b style="color:var(--danger)">${commentRate}%</b>（目标>1%）—— 结尾没有有效互动引导`);
      else if (commentRate >= 1) parts.push(`评论率 <b style="color:var(--success)">${commentRate}%</b> 达标！内容引发了讨论`);

      if (shareRate < 0.3) parts.push(`转发率 <b style="color:var(--warning)">${shareRate}%</b> 偏低 —— 内容缺少"转发给朋友"的价值感`);
    }

    // 2. 标题诊断
    parts.push('<br><strong>? 标题诊断</strong>');
    const titleAnalysis = this.analyzeTitle(title);
    parts.push(titleAnalysis);

    // 3. 具体优化方案
    parts.push('<br><strong>? 下次优化方案</strong>');
    const optPlan = this.generateOptimizationPlan(data, title);
    parts.push(optPlan);

    return {
      likeRate, commentRate, shareRate, engagement,
      grade, label,
      advice: parts.join('<br>'),
      report: parts.join('<br>')
    };
  },

  // ========== 标题分析 ==========
  analyzeTitle(title) {
    if (!title) return '未提供标题';

    const issues = [];
    const goods = [];

    // 检查是否有数字
    if (/\d/.test(title)) goods.push('? 包含数字，增强可信度');
    else issues.push('? 缺少具体数字，建议加入如「3个方法」「7个细节」');

    // 检查是否有情绪词
    const emotionWords = /千万别|必看|后悔|哭了|绝了|震惊|救命|谁懂|终于|差点|亏了/;
    if (emotionWords.test(title)) goods.push('? 有情绪钩子');
    else issues.push('? 缺少情绪词，建议加入「千万别」「后悔」「差点」等');

    // 检查是否有悬念
    const suspense = /这个|第.*个|竟然|没想到|原来|其实/;
    if (suspense.test(title)) goods.push('? 有悬念引导');
    else issues.push('? 可加入「第X个最坑」制造好奇缺口');

    // 检查长度
    if (title.length > 30) issues.push('?? 标题偏长（>30字），建议精简到20字以内');
    else if (title.length < 10) issues.push('?? 标题偏短，信息量不足');

    return [...goods, ...issues].join('<br>');
  },

  // ========== 优化方案生成 ==========
  generateOptimizationPlan(data, title) {
    const views = data.views || 0;
    const likes = data.likes || 0;
    const comments = data.comments || 0;
    const tips = [];

    // 前3秒建议
    tips.push('① <b>前3秒</b>：把视频中最震撼的画面剪到开头，配冲突字幕。不要铺垫，直接给冲突。');

    // 标题改写
    if (title) {
      const rewritten = this.rewriteTitle(title);
      tips.push(`② <b>标题改写</b>：试试「${rewritten}」`);
    }

    // 互动引导
    if (comments <= 1) {
      tips.push('③ <b>互动引导</b>：结尾加「你们遇到过吗？评论区说说」比求赞有效3倍。发布后自己先评论一条带节奏。');
    }

    // 系列化建议
    if (title && (title.includes('收房') || title.includes('验房'))) {
      tips.push('④ <b>系列化</b>：这条可以做成「收房避坑」系列 EP.01，每期一个主题（空鼓/渗水/门窗/电路），建立追更预期。');
    }

    // 封面建议
    tips.push('⑤ <b>封面</b>：大字标题占画面1/4以上，用对比色描边，手机小图也能看清。');

    // 发布时间
    tips.push('⑥ <b>发布时间</b>：建议晚 18:00-21:00 发布，这个时段家居类内容打开率最高。');

    return tips.join('<br>');
  },

  // ========== 标题改写引擎 ==========
  rewriteTitle(title) {
    // 基于账号定位的标题优化
    const patterns = [
      { regex: /收房/, replacement: '收房' },
      { regex: /验房/, replacement: '验房' },
      { regex: /千万别/, replacement: '千万别' },
      { regex: /避坑/, replacement: '避坑' },
    ];

    // 添加数字钩子
    if (!/\d/.test(title)) {
      if (title.includes('收房')) {
        return title.replace('收房', '收房必查的5个地方') + '，第3个最容易被坑';
      }
      if (title.includes('验房')) {
        return title.replace('验房', '验房师教的7个细节') + '，开发商最怕你查';
      }
      return '90%的人都不知道：' + title;
    }

    // 加情绪钩子
    if (!/千万别|后悔|差点|亏了/.test(title)) {
      return title.replace(/！|。|$/, '，差点亏了2万！');
    }

    // 加系列编号
    if (!/EP|第.*期/.test(title)) {
      return '【EP.01】' + title;
    }

    return title;
  },

  // ========== 弹窗 ==========
  openReviewModal(reviewId = null) {
    const overlay = document.getElementById('reviewModalOverlay');

    if (reviewId) {
      const reviews = Store.get(Store.KEYS.REVIEWS);
      const r = reviews.find(rr => rr.id === reviewId);
      if (!r) return;
      document.getElementById('reviewModalTitle').textContent = '编辑复盘';
      document.getElementById('reviewId').value = r.id;
      document.getElementById('videoTitle').value = r.videoTitle || '';
      document.getElementById('videoLink').value = r.videoLink || '';
      document.getElementById('reviewPlatform').value = r.platform || 'douyin';
      document.getElementById('reviewNote').value = r.note || '';
      document.getElementById('dataViews').value = r.data?.views || '';
      document.getElementById('dataLikes').value = r.data?.likes || '';
      document.getElementById('dataComments').value = r.data?.comments || '';
      document.getElementById('dataShares').value = r.data?.shares || '';
      document.getElementById('publishTime').value = r.publishTime || '';
      this.currentReview = r;
      this.autoAnalyze = this.analyze(r.data || {}, r.videoTitle || '');
    } else {
      document.getElementById('reviewModalTitle').textContent = '? 新建复盘';
      document.getElementById('reviewId').value = '';
      document.getElementById('reviewForm').reset();
      document.getElementById('reviewPlatform').value = 'douyin';
      this.currentReview = null;
      this.autoAnalyze = null;
    }

    document.getElementById('liveAnalysis').innerHTML = '';
    document.getElementById('liveAnalysis').style.display = 'none';

    overlay.classList.add('active');
    this.bindLiveInput();
  },

  closeReviewModal() {
    document.getElementById('reviewModalOverlay').classList.remove('active');
    this.currentReview = null;
    this.autoAnalyze = null;
  },

  // ========== 实时输入分析 ==========
  bindLiveInput() {
    const handler = () => {
      const data = {
        views: parseInt(document.getElementById('dataViews').value) || 0,
        likes: parseInt(document.getElementById('dataLikes').value) || 0,
        comments: parseInt(document.getElementById('dataComments').value) || 0,
        shares: parseInt(document.getElementById('dataShares').value) || 0
      };
      const title = document.getElementById('videoTitle').value.trim();

      if (data.views > 0 || data.likes > 0) {
        this.autoAnalyze = this.analyze(data, title);
        const el = document.getElementById('liveAnalysis');
        el.style.display = 'block';
        el.innerHTML = `
          <div class="optimization-box">
            <div class="opt-title">? 实时分析 <span class="tag tag-accent">${this.autoAnalyze.grade}级</span></div>
            <div style="display:flex;gap:16px;margin:8px 0;font-size:13px;">
              <span>? 点赞率 <b style="color:${this.autoAnalyze.likeRate >= 5 ? 'var(--success)' : this.autoAnalyze.likeRate >= 3 ? 'var(--warning)' : 'var(--danger)'}">${this.autoAnalyze.likeRate}%</b></span>
              <span>? 评论率 <b style="color:${this.autoAnalyze.commentRate >= 1 ? 'var(--success)' : 'var(--warning)'}">${this.autoAnalyze.commentRate}%</b></span>
              <span>? 互动分 <b>${this.autoAnalyze.engagement.toFixed(1)}</b></span>
            </div>
            <div class="opt-content" style="font-size:12px;line-height:1.8;">${this.autoAnalyze.report}</div>
          </div>
        `;
      }
    };

    ['dataViews','dataLikes','dataComments','dataShares','videoTitle'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.removeEventListener('input', handler);
        el.addEventListener('input', handler);
      }
    });
  },

  // ========== 智能粘贴 ==========
  smartPaste() {
    navigator.clipboard.readText().then(text => {
      if (!text.trim()) { showToast('? 剪贴板为空'); return; }

      // 先尝试填入链接
      if (text.includes('douyin.com') || text.includes('v.douyin') || text.includes('xiaohongshu')) {
        document.getElementById('videoLink').value = text.trim();
        this.extractFromLink();
        showToast('? 已识别视频链接并提取标题');
      }

      // 提取数字
      const nums = text.match(/\d[\d,.]*[万wW]?/g);
      if (nums && nums.length >= 2) {
        const parsed = nums.map(n => {
          n = n.replace(/,/g, '');
          if (/[万wW]$/.test(n)) return Math.round(parseFloat(n) * 10000);
          return parseInt(n) || 0;
        }).filter(n => n > 0);
        const sorted = [...parsed].sort((a, b) => b - a);
        if (sorted.length >= 4) {
          document.getElementById('dataViews').value = sorted[0];
          document.getElementById('dataLikes').value = sorted[1];
          document.getElementById('dataComments').value = sorted[2];
          document.getElementById('dataShares').value = sorted[3];
          document.getElementById('dataViews').dispatchEvent(new Event('input'));
          showToast('? 已自动解析播放/点赞/评论/转发');
        }
      }
    }).catch(() => showToast('?? 无法读取剪贴板'));
  },

  // ========== 保存 ==========
  saveReview() {
    const id = document.getElementById('reviewId').value;
    const title = document.getElementById('videoTitle').value.trim();
    const link = document.getElementById('videoLink').value.trim();
    const platform = document.getElementById('reviewPlatform').value;
    const note = document.getElementById('reviewNote').value.trim();
    const publishTime = document.getElementById('publishTime').value;

    const data = {
      views: parseInt(document.getElementById('dataViews').value) || 0,
      likes: parseInt(document.getElementById('dataLikes').value) || 0,
      comments: parseInt(document.getElementById('dataComments').value) || 0,
      shares: parseInt(document.getElementById('dataShares').value) || 0
    };

    if (data.views === 0 && data.likes === 0) {
      showToast('?? 请至少输入播放量和点赞数');
      return;
    }

    const finalTitle = title || (platform === 'douyin' ? '抖音作品' : '小红书笔记');

    const reviewData = {
      id: id || Store.genId(),
      videoTitle: finalTitle,
      videoLink: link,
      platform: platform,
      note: note,
      data: data,
      publishTime: publishTime || null,
      createdAt: id ? (Store.get(Store.KEYS.REVIEWS).find(r => r.id === id)?.createdAt || Date.now()) : Date.now()
    };

    const reviews = Store.get(Store.KEYS.REVIEWS);
    if (id) {
      const idx = reviews.findIndex(r => r.id === id);
      if (idx > -1) reviews[idx] = reviewData;
    } else {
      reviews.unshift(reviewData);
    }

    Store.set(Store.KEYS.REVIEWS, reviews);
    this.closeReviewModal();
    this.renderList();
    showToast(id ? '? 复盘已更新' : '? 分析报告已生成');
  },

  deleteReview(reviewId) {
    if (!confirm('确定删除？')) return;
    let reviews = Store.get(Store.KEYS.REVIEWS);
    reviews = reviews.filter(r => r.id !== reviewId);
    Store.set(Store.KEYS.REVIEWS, reviews);
    this.renderList();
    showToast('已删除');
  },

  escape(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  seedDemoReview() {
    if (Store.get(Store.KEYS.REVIEWS).length > 0) return;
    Store.set(Store.KEYS.REVIEWS, [{
      id: Store.genId(),
      videoTitle: '收房千万别先签字！90%的业主都踩过这个坑',
      videoLink: 'https://v.douyin.com/9zSZMLBFJgo/',
      platform: 'douyin',
      note: '前3秒可以更快切入问题画面',
      data: { views: 550, likes: 6, comments: 1, shares: 1 },
      publishTime: '18:00',
      createdAt: Date.now() - 86400000
    }]);
  }
};
