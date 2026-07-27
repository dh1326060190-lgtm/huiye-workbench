// ============================================
// 绘野工作台 - 内容复盘模块 v2
// 极简录入 + 智能数据分析
// ============================================

const Review = {
  currentReview: null,
  autoAnalyze: null, // 实时分析结果

  init() {
    this.renderList();
  },

  // ========== 渲染复盘列表 ==========
  renderList() {
    const container = document.getElementById('reviewList');
    const reviews = Store.get(Store.KEYS.REVIEWS);

    if (reviews.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="emoji">📊</div><div class="text">还没有复盘记录<br>发布后花30秒复盘，数据会告诉你如何优化</div></div>`;
      return;
    }

    reviews.sort((a, b) => b.createdAt - a.createdAt);

    // 趋势概要
    let trendHtml = this.renderTrend(reviews);
    container.innerHTML = trendHtml + reviews.map(r => this.renderReviewCard(r)).join('');
  },

  // 趋势概要
  renderTrend(reviews) {
    const recent = reviews.slice(0, 7).reverse(); // 最近7条，时间正序
    if (recent.length < 2) return '';

    const totalViews = recent.reduce((s, r) => s + (r.data?.views || 0), 0);
    const avgViews = Math.round(totalViews / recent.length);
    const totalLikes = recent.reduce((s, r) => s + (r.data?.likes || 0), 0);
    const avgLikeRate = totalViews > 0 ? (totalLikes / totalViews * 100).toFixed(1) : '0';

    const maxBar = Math.max(...recent.map(r => r.data?.views || 0), 1);

    return `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header">
          <span class="card-title">📈 近7条趋势</span>
          <span style="font-size:12px;color:var(--text-muted);">共${reviews.length}条复盘</span>
        </div>
        <div class="data-grid" style="margin-bottom:12px;">
          <div class="data-item">
            <div class="data-num">${Store.formatNum(avgViews)}</div>
            <div class="data-label">均播放</div>
          </div>
          <div class="data-item">
            <div class="data-num">${avgLikeRate}%</div>
            <div class="data-label">均点赞率</div>
          </div>
          <div class="data-item">
            <div class="data-num">${reviews.filter(r => (r.data?.views||0) > avgViews).length}/${recent.length}</div>
            <div class="data-label">高于均值</div>
          </div>
          <div class="data-item">
            <div class="data-num">${recent.length}</div>
            <div class="data-label">总作品</div>
          </div>
        </div>
        <!-- 简易柱状图 -->
        <div style="display:flex;align-items:flex-end;gap:4px;height:60px;padding:0 4px;">
          ${recent.map(r => {
            const h = Math.max((r.data?.views || 0) / maxBar * 100, 4);
            const color = (r.data?.views || 0) >= avgViews ? 'var(--primary)' : 'var(--text-muted)';
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
              <div style="font-size:9px;color:var(--text-muted);">${Store.formatNum(r.data?.views||0)}</div>
              <div style="width:100%;height:${h}%;background:${color};border-radius:3px 3px 0 0;min-height:4px;"></div>
              <div style="font-size:9px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40px;">${Store.formatTime(r.createdAt)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  },

  // 渲染复盘卡片
  renderReviewCard(r) {
    const data = r.data || {};
    const analysis = this.analyze(data);
    const rateColor = (v, g, b) => v >= g ? 'var(--success)' : v >= b ? 'var(--warning)' : 'var(--danger)';

    return `
      <div class="review-card">
        <div class="review-header">
          <div style="flex:1;min-width:0;">
            <div class="review-title">${this.escape(r.videoTitle || '未命名')}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
              ${r.platform === 'douyin' ? '🎵 抖音' : r.platform === 'xiaohongshu' ? '📕 小红书' : '📱 其他'}
              · ${Store.formatTime(r.createdAt)}
              ${r.publishTime ? ' · ⏰ ' + r.publishTime : ''}
            </div>
          </div>
          <div style="text-align:center;flex-shrink:0;">
            <div style="font-size:24px;font-weight:700;color:${analysis.grade === 'A' ? 'var(--success)' : analysis.grade === 'B' ? 'var(--primary-light)' : analysis.grade === 'C' ? 'var(--warning)' : 'var(--danger)'};">${analysis.grade}</div>
            <div style="font-size:10px;color:var(--text-muted);">${analysis.label}</div>
          </div>
        </div>

        <div class="data-grid">
          <div class="data-item">
            <div class="data-num">${Store.formatNum(data.views || 0)}</div>
            <div class="data-label">播放</div>
          </div>
          <div class="data-item">
            <div class="data-num" style="color:${rateColor(analysis.likeRate, 5, 3)}">${analysis.likeRate}%</div>
            <div class="data-label">点赞率</div>
          </div>
          <div class="data-item">
            <div class="data-num" style="color:${rateColor(analysis.commentRate, 1, 0.5)}">${analysis.commentRate}%</div>
            <div class="data-label">评论率</div>
          </div>
          <div class="data-item">
            <div class="data-num">${Store.formatNum(data.shares || 0)}</div>
            <div class="data-label">转发</div>
          </div>
        </div>

        ${r.note ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;padding:8px;background:var(--bg-input);border-radius:8px;">📝 ${this.escape(r.note)}</div>` : ''}

        <div class="optimization-box">
          <div class="opt-title">⚡ 数据分析</div>
          <div class="opt-content">${analysis.advice}</div>
        </div>

        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="btn btn-sm btn-outline" onclick="Review.openReviewModal('${r.id}')">✏️ 编辑</button>
          <button class="btn btn-sm btn-outline" onclick="Review.deleteReview('${r.id}')">🗑 删除</button>
        </div>
      </div>
    `;
  },

  // ========== 数据分析引擎 ==========
  analyze(data) {
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

    const advices = [];
    if (views === 0) {
      advices.push('暂无播放数据');
    } else {
      if (likeRate < 3) advices.push(`点赞率${likeRate}%偏低（目标>5%）。建议加强内容价值感：在视频中给出"马上能用的干货"或"强烈的情绪共鸣"。`);
      else if (likeRate >= 5) advices.push(`点赞率${likeRate}%不错！继续保持这种内容风格。`);
      else advices.push(`点赞率${likeRate}%中等，有提升空间。尝试在内容中加入"反常识"或"强烈对比"元素激发点赞欲。`);

      if (commentRate < 0.5) advices.push(`评论率${commentRate}%偏低（目标>1%）。试试结尾加一句争议性提问或"评论区告诉我..."引导互动。`);
      else if (commentRate >= 1) advices.push(`评论率${commentRate}%表现好！说明内容引发了讨论，继续保持互动引导。`);

      if (shareRate > 0.5) advices.push(`转发率高说明内容有收藏/分享价值，这类"有用"的内容建议多做。`);
      if (shares === 0 && views > 500) advices.push('转发为0，内容缺少"值得分享"的价值点。考虑加入"转发给正在装修的朋友"等引导。');

      // 综合建议
      if (engagement < 3) {
        advices.push('整体互动偏低，建议回顾：1）前3秒是否抓人 2）中间是否有信息密度 3）结尾是否有明确CTA。');
      }
    }

    return {
      likeRate, commentRate, shareRate, engagement,
      grade, label,
      advice: advices.length > 0 ? advices.map((a, i) => `${i + 1}. ${a}`).join('<br>') : '✅ 数据表现不错，继续保持！'
    };
  },

  // ========== 弹窗：极简录入 ==========
  openReviewModal(reviewId = null) {
    const overlay = document.getElementById('reviewModalOverlay');
    this.currentReview = { scores: {} };
    this.autoAnalyze = null;

    if (reviewId) {
      const reviews = Store.get(Store.KEYS.REVIEWS);
      const r = reviews.find(rr => rr.id === reviewId);
      if (!r) return;
      document.getElementById('reviewModalTitle').textContent = '编辑复盘';
      document.getElementById('reviewId').value = r.id;
      document.getElementById('videoTitle').value = r.videoTitle || '';
      document.getElementById('reviewPlatform').value = r.platform || 'douyin';
      document.getElementById('reviewNote').value = r.note || '';
      document.getElementById('dataViews').value = r.data?.views || '';
      document.getElementById('dataLikes').value = r.data?.likes || '';
      document.getElementById('dataComments').value = r.data?.comments || '';
      document.getElementById('dataShares').value = r.data?.shares || '';
      document.getElementById('publishTime').value = r.publishTime || '';
      this.currentReview = r;
      this.autoAnalyze = this.analyze(r.data || {});
    } else {
      document.getElementById('reviewModalTitle').textContent = '⚡ 快速复盘';
      document.getElementById('reviewId').value = '';
      document.getElementById('reviewForm').reset();
      document.getElementById('reviewPlatform').value = 'douyin';
    }

    // 清除实时预览
    document.getElementById('liveAnalysis').innerHTML = '';
    document.getElementById('liveAnalysis').style.display = 'none';

    overlay.classList.add('active');

    // 绑定实时输入分析
    this.bindLiveInput();
  },

  closeReviewModal() {
    document.getElementById('reviewModalOverlay').classList.remove('active');
    this.currentReview = null;
    this.autoAnalyze = null;
  },

  // 实时输入分析：输入数字后即时显示分析结果
  bindLiveInput() {
    const inputs = ['dataViews', 'dataLikes', 'dataComments', 'dataShares'];
    const handler = () => {
      const data = {
        views: parseInt(document.getElementById('dataViews').value) || 0,
        likes: parseInt(document.getElementById('dataLikes').value) || 0,
        comments: parseInt(document.getElementById('dataComments').value) || 0,
        shares: parseInt(document.getElementById('dataShares').value) || 0
      };
      if (data.views > 0 || data.likes > 0) {
        this.autoAnalyze = this.analyze(data);
        const el = document.getElementById('liveAnalysis');
        el.style.display = 'block';
        el.innerHTML = `
          <div class="optimization-box">
            <div class="opt-title">📊 实时分析 <span class="tag tag-accent">${this.autoAnalyze.grade}级</span></div>
            <div style="display:flex;gap:16px;margin:8px 0;font-size:13px;">
              <span>👍 点赞率 <b style="color:${this.autoAnalyze.likeRate >= 5 ? 'var(--success)' : this.autoAnalyze.likeRate >= 3 ? 'var(--warning)' : 'var(--danger)'}">${this.autoAnalyze.likeRate}%</b></span>
              <span>💬 评论率 <b style="color:${this.autoAnalyze.commentRate >= 1 ? 'var(--success)' : 'var(--warning)'}">${this.autoAnalyze.commentRate}%</b></span>
              <span>🔗 互动分 <b>${this.autoAnalyze.engagement.toFixed(1)}</b></span>
            </div>
            <div class="opt-content">${this.autoAnalyze.advice}</div>
          </div>
        `;
      }
    };
    inputs.forEach(id => {
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
      if (!text.trim()) {
        showToast('📋 剪贴板为空，请先从抖音复制作品数据');
        return;
      }
      // 尝试解析粘贴内容中的数字
      const nums = text.match(/\d[\d,.]*[万wW]?/g);
      if (nums && nums.length >= 2) {
        const parsed = nums.map(n => {
          n = n.replace(/,/g, '');
          if (n.endsWith('万') || n.endsWith('w') || n.endsWith('W')) return Math.round(parseFloat(n) * 10000);
          return parseInt(n) || 0;
        }).filter(n => n > 0);

        // 按大小排序，最大的是播放量
        const sorted = [...parsed].sort((a, b) => b - a);
        if (sorted.length >= 4) {
          document.getElementById('dataViews').value = sorted[0];
          document.getElementById('dataLikes').value = sorted[1];
          document.getElementById('dataComments').value = sorted[2];
          document.getElementById('dataShares').value = sorted[3];
          showToast('✅ 已智能解析剪贴板数据，请核对');
          // 触发实时分析
          document.getElementById('dataViews').dispatchEvent(new Event('input'));
        } else if (sorted.length >= 2) {
          document.getElementById('dataViews').value = sorted[0];
          document.getElementById('dataLikes').value = sorted[1];
          showToast('⚠️ 只识别到部分数据，请补充评论和转发数');
          document.getElementById('dataViews').dispatchEvent(new Event('input'));
        } else {
          showToast('⚠️ 未能识别有效数字，请手动输入');
        }
      } else {
        showToast('⚠️ 剪贴板内容无有效数字，请从抖音作品详情页复制');
      }
    }).catch(() => {
      showToast('⚠️ 无法读取剪贴板，请手动输入数据');
    });
  },

  // ========== 保存复盘 ==========
  saveReview() {
    const id = document.getElementById('reviewId').value;
    const title = document.getElementById('videoTitle').value.trim();
    const platform = document.getElementById('reviewPlatform').value;
    const note = document.getElementById('reviewNote').value.trim();
    const publishTime = document.getElementById('publishTime').value;

    const data = {
      views: parseInt(document.getElementById('dataViews').value) || 0,
      likes: parseInt(document.getElementById('dataLikes').value) || 0,
      comments: parseInt(document.getElementById('dataComments').value) || 0,
      shares: parseInt(document.getElementById('dataShares').value) || 0
    };

    // 无标题时自动生成
    const finalTitle = title || (platform === 'douyin' ? '抖音作品' : '小红书笔记') + ' · ' + Store.today();

    if (data.views === 0 && data.likes === 0) {
      showToast('⚠️ 请至少输入播放量和点赞数');
      return;
    }

    const reviewData = {
      id: id || Store.genId(),
      videoTitle: finalTitle,
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
    showToast(id ? '✅ 复盘已更新' : '✅ 复盘已保存');
  },

  deleteReview(reviewId) {
    if (!confirm('确定删除这条复盘吗？')) return;
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
      videoTitle: '收房第一天｜验房差点被坑，这5个地方一定要查！',
      platform: 'douyin',
      note: '前3秒节奏可以更快，封面文字太小',
      data: { views: 12300, likes: 680, comments: 45, shares: 32 },
      publishTime: '18:30',
      createdAt: Date.now() - 86400000
    }]);
  }
};
