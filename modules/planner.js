// ============================================
// 绘野工作台 - 内容规划模块
// 小赵和小董的视觉新居 - 收房视频方向
// 功能：周更2条视频智能规划 + 复盘驱动优化 + 热点驱动剪辑
// ============================================

const Planner = {
  // 选题池（按周轮换，每4周一个循环）
  TOPIC_POOL: [
    // 验房干货类
    { topic: '收房验房避坑指南：开发商最怕你查的这7个地方', keyword: 'house' },
    { topic: '新房交付一定要检查的12个细节，第8个90%的人忽略', keyword: 'house' },
    { topic: '收房当天我们发现了什么问题？全程实录', keyword: 'house' },
    // 装修记录类
    { topic: '毛坯房装修第X天：水电改造全记录', keyword: 'renovate' },
    { topic: '装修中最容易超预算的5个项目，我们踩坑了', keyword: 'renovate' },
    { topic: '装修日记：从设计图到实景的惊人变化', keyword: 'renovate' },
    // 视觉设计类
    { topic: '2026年最火的3种装修风格，我们选了这种', keyword: 'visual' },
    { topic: '60平怎么装出120平的视觉效果？设计师告诉你', keyword: 'visual' },
    { topic: '收房后的色彩搭配方案，邻居都来抄作业', keyword: 'visual' },
    // 好物推荐类
    { topic: '收房后我们买的10件神器，每件都好用到哭', keyword: 'furniture' },
    { topic: '装修必买清单：这些钱绝对不能省', keyword: 'furniture' },
    { topic: '入住一个月后，最不后悔的5个装修决定', keyword: 'furniture' },
  ],

  // 通用拍摄建议（无复盘时使用）
  DEFAULT_SHOOTING_NOTES: [
    '前3秒用最冲击的画面/问题开场，快速抓住注意力',
    '拍摄时保持画面稳定，使用三脚架或稳定器',
    '每个关键点配合特写镜头展示细节',
    '结尾设置互动钩子（提问/投票/福利），引导评论',
    '注意光线和收音质量，避免背光和嘈杂环境',
  ],

  // 通用剪辑建议（无热点匹配时使用）
  DEFAULT_EDITING_NOTES: [
    '前3秒不放片头logo，直接进入核心内容',
    '关键数据/步骤用大字弹幕强调',
    '节奏紧凑，每个镜头不超过3-5秒',
    '片尾加入关注引导动画和往期推荐',
    '使用热门BGM，音量不要盖过人声',
  ],

  // ============ 初始化 ============
  init() {
    this.renderPage();
  },

  // ============ 获取本周一日期 ============
  getWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // 周一=0
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  },

  // ============ 获取周日日期 ============
  getWeekEnd(weekStart) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  },

  // ============ 日期格式化（月日） ============
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  },

  // ============ 星期几 ============
  getDayOfWeek(dateStr) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const d = new Date(dateStr + 'T00:00:00');
    return days[d.getDay()];
  },

  // ============ 获取当前计划数据 ============
  getPlanData() {
    const data = Store.get(Store.KEYS.PLANS, null);
    const weekStart = this.getWeekStart();

    // 如果没数据或跨周了，返回空结构
    if (!data || data.weekStart !== weekStart) {
      return {
        weekStart: weekStart,
        videos: []
      };
    }
    return data;
  },

  // ============ 保存计划数据 ============
  savePlanData(data) {
    Store.set(Store.KEYS.PLANS, data);
  },

  // ============ 获取最新复盘 ============
  getLastReview() {
    const reviews = Store.get(Store.KEYS.REVIEWS);
    if (reviews.length === 0) return null;
    reviews.sort((a, b) => b.createdAt - a.createdAt);
    return reviews[0];
  },

  // ============ 获取匹配的热点视频 ============
  getMatchingHotspots(keyword) {
    if (!Hotspot || !Hotspot.MOCK_VIDEOS) return [];
    return Hotspot.MOCK_VIDEOS
      .filter(v => v.keyword === keyword || keyword === 'all')
      .sort((a, b) => (b.likes + b.comments * 3 + b.shares * 2) - (a.likes + a.comments * 3 + a.shares * 2))
      .slice(0, 3);
  },

  // ============ 智能选题生成 ============
  generateTopic(index, lastReview, hotspots) {
    // index: 0=第一条视频, 1=第二条视频
    const weekNum = parseInt(this.getWeekStart().split('-')[2]) || 1;

    if (index === 0) {
      // 第一条视频：复盘驱动（40%）+ 选题池（60%）
      if (lastReview && lastReview.data) {
        const { views, likes, comments, shares } = lastReview.data;
        const likeRate = views > 0 ? (likes / views * 100) : 0;
        const commentRate = views > 0 ? (comments / views * 100) : 0;
        const shareRate = views > 0 ? (shares / views * 100) : 0;

        // 找最弱的数据维度
        const metrics = [
          { name: 'like', value: likeRate, keyword: 'house' },
          { name: 'comment', value: commentRate, keyword: 'renovate' },
          { name: 'share', value: shareRate, keyword: 'visual' },
        ];
        metrics.sort((a, b) => a.value - b.value);
        const weakest = metrics[0];

        if (weakest.value < 2) {
          // 数据确实弱，针对性选题
          const poolItem = this.TOPIC_POOL.find(t => t.keyword === weakest.keyword);
          if (poolItem) {
            const reason = weakest.name === 'like' ? '上期点赞率偏低，本期加强情绪钩子' :
                           weakest.name === 'comment' ? '上期评论率偏低，本期侧重互动话题' :
                           '上期转发率偏低，本期侧重实用干货';
            return {
              topic: poolItem.topic,
              source: 'review',
              reason: reason,
              keyword: poolItem.keyword
            };
          }
        }
      }
      // 复盘数据不错或无复盘 → 选题池
      const poolIdx = (weekNum + index) % this.TOPIC_POOL.length;
      const poolItem = this.TOPIC_POOL[poolIdx];
      return {
        topic: poolItem.topic,
        source: 'pool',
        reason: '按本周选题轮换推荐',
        keyword: poolItem.keyword
      };
    } else {
      // 第二条视频：热点驱动（50%）+ 选题池（50%）
      if (hotspots && hotspots.length > 0) {
        const top = hotspots[0];
        // 基于热点标题改写
        const hotTopic = '热点趋势：' + top.title.substring(0, 20) + '...我们的版本';
        return {
          topic: hotTopic,
          source: 'hotspot',
          reason: '参考本周最热视频「' + top.author + '」的选题方向',
          keyword: top.keyword,
          hotspotIds: [top.id]
        };
      }
      const poolIdx = (weekNum + index + 3) % this.TOPIC_POOL.length;
      const poolItem = this.TOPIC_POOL[poolIdx];
      return {
        topic: poolItem.topic,
        source: 'pool',
        reason: '按本周选题轮换推荐',
        keyword: poolItem.keyword
      };
    }
  },

  // ============ 生成拍摄注意点 ============
  generateShootingNotes(lastReview) {
    const notes = [];

    if (!lastReview || !lastReview.data) {
      return this.DEFAULT_SHOOTING_NOTES.join('\n');
    }

    const { views, likes, comments, shares } = lastReview.data;
    const likeRate = views > 0 ? (likes / views * 100) : 0;
    const commentRate = views > 0 ? (comments / views * 100) : 0;
    const shareRate = views > 0 ? (shares / views * 100) : 0;

    if (likeRate < 3) {
      notes.push('⚠️ 上期点赞率偏低(' + likeRate.toFixed(1) + '%)：本期前3秒必须用最强冲突画面或悬念问题开场');
      notes.push('💡 拍摄时多录2-3个「表情反应」镜头（惊讶/无奈/开心），剪辑时作为情绪钩子');
    } else {
      notes.push('✅ 上期点赞率不错(' + likeRate.toFixed(1) + '%)：保持前3秒抓人策略，继续用真实情绪打动观众');
    }

    if (commentRate < 0.5) {
      notes.push('⚠️ 上期评论率偏低(' + commentRate.toFixed(1) + '%)：本期结尾设计互动提问（如「你们觉得呢？」「投票选A还是B？」）');
      notes.push('💡 拍摄时预留一个「面向镜头提问」的镜头，放在片尾');
    } else {
      notes.push('✅ 上期评论互动良好(' + commentRate.toFixed(1) + '%)：继续保持互动引导');
    }

    if (shareRate < 0.3) {
      notes.push('⚠️ 上期转发率偏低(' + shareRate.toFixed(1) + '%)：本期加入「转发给需要的朋友/家人」话术');
      notes.push('💡 内容增加实用清单/检查表类信息，这类内容转发率通常更高');
    }

    if (lastReview.publishTime) {
      notes.push('📊 上期发布时间：' + lastReview.publishTime + '，本期建议同样在晚间18:00-21:00发布');
    }

    if (lastReview.videoTitle && lastReview.videoTitle.length > 25) {
      notes.push('💡 上期标题偏长(' + lastReview.videoTitle.length + '字)，本期标题控制在15-25字，更容易被完整阅读');
    }

    if (notes.length < 3) {
      notes.push('📷 保持画面稳定，注意光线和收音');
      notes.push('🎬 多角度拍摄同一场景（全景+中景+特写），给剪辑留素材');
    }

    return notes.join('\n');
  },

  // ============ 生成剪辑注意点 ============
  generateEditingNotes(hotspots, keyword) {
    const notes = [];

    if (hotspots && hotspots.length > 0) {
      notes.push('🔥 参考本周热点视频的剪辑技巧：');

      hotspots.forEach((h, i) => {
        // 从remixTips中提取剪辑相关建议
        const tips = h.remixTips;
        // 提取包含剪辑关键词的句子
        const editKeywords = ['前3秒', '转场', '字幕', 'BGM', '节奏', '片尾', '封面', '对比', '变速', '卡点', '音效'];
        const lines = tips.split(/[。！，]/);
        const relevantLines = lines.filter(l =>
          editKeywords.some(kw => l.includes(kw))
        );
        if (relevantLines.length > 0) {
          notes.push('  ' + (i + 1) + '. [' + h.author + '] ' + relevantLines[0].trim());
        }
      });

      if (notes.length === 1) {
        // 没有提取到剪辑相关建议，用通用的
        notes.pop();
      }
    }

    // 通用剪辑建议
    const generalTips = [
      '前3秒不放片头logo，直接进入最精彩内容',
      '关键步骤/数据用大字弹幕强调，停留1.5-2秒',
      '每个镜头控制在3-5秒，总时长60-90秒最佳',
      '片尾加入关注引导和往期视频推荐',
      '使用热门BGM，音量设置为背景音的30-40%',
      '添加字幕，关键句放大加粗变色',
    ];

    // 混合通用建议
    const remaining = 6 - notes.length;
    if (remaining > 0) {
      notes.push('\n📋 通用剪辑建议：');
      generalTips.slice(0, remaining).forEach(t => notes.push('  · ' + t));
    }

    return notes.join('\n');
  },

  // ============ 生成本周计划 ============
  generatePlan() {
    const weekStart = this.getWeekStart();
    const lastReview = this.getLastReview();

    // 确定2条视频的日期
    // 视频1：周一拍摄 → 周二剪辑 → 周三发布（工作日黄金时段）
    // 视频2：周三拍摄 → 周四剪辑 → 周五发布（周五晚流量高峰）
    // 周末休息，不安排发布
    const video1 = {
      shoot: this._addDays(weekStart, 0),   // 周一拍摄
      edit: this._addDays(weekStart, 1),     // 周二剪辑
      publish: this._addDays(weekStart, 2),  // 周三发布
    };
    const video2 = {
      shoot: this._addDays(weekStart, 2),    // 周三拍摄
      edit: this._addDays(weekStart, 3),      // 周四剪辑
      publish: this._addDays(weekStart, 4),   // 周五发布
    };

    // 获取热点数据
    const allHotspots = Hotspot && Hotspot.MOCK_VIDEOS ? [...Hotspot.MOCK_VIDEOS]
      .sort((a, b) => (b.likes + b.comments * 3 + b.shares * 2) - (a.likes + a.comments * 3 + a.shares * 2))
      : [];

    // 生成视频1选题
    const topic1 = this.generateTopic(0, lastReview, allHotspots);
    const hotspots1 = this.getMatchingHotspots(topic1.keyword);

    // 生成视频2选题
    const topic2 = this.generateTopic(1, lastReview, allHotspots);
    const hotspots2 = this.getMatchingHotspots(topic2.keyword);

    const videos = [
      {
        id: 'plan_' + Store.genId(),
        topic: topic1.topic,
        topicSource: topic1.source,
        topicReason: topic1.reason,
        scheduled: video1,
        status: 'planned',
        shootingNotes: this.generateShootingNotes(lastReview),
        editingNotes: this.generateEditingNotes(hotspots1, topic1.keyword),
        linkedReviewId: lastReview ? lastReview.id : null,
        linkedHotspotIds: topic1.hotspotIds || hotspots1.slice(0, 2).map(h => h.id),
        linkedTaskIds: [],
        customNote: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'plan_' + Store.genId(),
        topic: topic2.topic,
        topicSource: topic2.source,
        topicReason: topic2.reason,
        scheduled: video2,
        status: 'planned',
        shootingNotes: this.generateShootingNotes(lastReview),
        editingNotes: this.generateEditingNotes(hotspots2, topic2.keyword),
        linkedReviewId: lastReview ? lastReview.id : null,
        linkedHotspotIds: topic2.hotspotIds || hotspots2.slice(0, 2).map(h => h.id),
        linkedTaskIds: [],
        customNote: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    ];

    // 自动创建关联任务
    videos.forEach(v => {
      this.createLinkedTasks(v);
    });

    const planData = {
      weekStart: weekStart,
      videos: videos,
    };

    this.savePlanData(planData);
    this.renderPage();
    showToast('✅ 本周计划已生成！已自动创建拍摄/剪辑/发布任务');
  },

  // ============ 辅助：日期加减 ============
  _addDays(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },

  // ============ 自动创建关联任务 ============
  createLinkedTasks(plan) {
    if (!Tasks) return;

    const tasks = Store.get(Store.KEYS.TASKS);
    const taskIds = [];

    // 拍摄任务
    const shootTask = {
      id: Store.genId(),
      title: '🎬 拍摄：' + plan.topic.substring(0, 30),
      note: plan.shootingNotes.split('\n').slice(0, 3).join('；'),
      category: 'shoot',
      priority: 'high',
      time: '10:00',
      done: false,
      date: plan.scheduled.shoot,
      createdAt: Date.now(),
    };
    tasks.push(shootTask);
    taskIds.push(shootTask.id);

    // 剪辑任务
    const editTask = {
      id: Store.genId(),
      title: '✂️ 剪辑：' + plan.topic.substring(0, 30),
      note: plan.editingNotes.split('\n').slice(0, 3).join('；'),
      category: 'edit',
      priority: 'high',
      time: '14:00',
      done: false,
      date: plan.scheduled.edit,
      createdAt: Date.now(),
    };
    tasks.push(editTask);
    taskIds.push(editTask.id);

    // 发布任务
    const publishTask = {
      id: Store.genId(),
      title: '📤 发布：' + plan.topic.substring(0, 30),
      note: '建议发布时间 18:00-21:00',
      category: 'publish',
      priority: 'high',
      time: '19:00',
      done: false,
      date: plan.scheduled.publish,
      createdAt: Date.now(),
    };
    tasks.push(publishTask);
    taskIds.push(publishTask.id);

    Store.set(Store.KEYS.TASKS, tasks);
    plan.linkedTaskIds = taskIds;
  },

  // ============ 推进状态 ============
  updateStatus(planId, newStatus) {
    const data = this.getPlanData();
    const plan = data.videos.find(v => v.id === planId);
    if (!plan) return;

    plan.status = newStatus;
    plan.updatedAt = Date.now();
    this.savePlanData(data);

    // 自动更新关联任务的完成状态
    if (newStatus === 'shooting' && plan.linkedTaskIds.length > 0) {
      this._completeTask(plan.linkedTaskIds[0]); // 拍摄任务完成
    } else if (newStatus === 'editing' && plan.linkedTaskIds.length > 1) {
      this._completeTask(plan.linkedTaskIds[1]); // 剪辑任务完成
    } else if (newStatus === 'published') {
      // 完成所有关联任务
      plan.linkedTaskIds.forEach(tid => this._completeTask(tid));
      // 提示创建复盘
      setTimeout(() => {
        if (confirm('🎉 视频已发布！是否立即创建复盘记录？')) {
          Review.openReviewModal();
          // 自动填入视频标题
          setTimeout(() => {
            const titleInput = document.getElementById('videoTitle');
            if (titleInput && plan.topic) {
              titleInput.value = plan.topic;
            }
          }, 300);
        }
      }, 500);
    }

    this.renderPage();
    showToast('✅ 状态已更新：' + this._statusLabel(newStatus));
  },

  // ============ 辅助：完成任务 ============
  _completeTask(taskId) {
    if (!Tasks) return;
    const tasks = Store.get(Store.KEYS.TASKS);
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.done) {
      task.done = true;
      Store.set(Store.KEYS.TASKS, tasks);
    }
  },

  // ============ 状态标签映射 ============
  _statusLabel(status) {
    const map = {
      'planned': '计划中',
      'shooting': '拍摄中',
      'editing': '剪辑中',
      'published': '已发布'
    };
    return map[status] || status;
  },

  _statusEmoji(status) {
    const map = {
      'planned': '📋',
      'shooting': '📷',
      'editing': '✂️',
      'published': '✅'
    };
    return map[status] || '📋';
  },

  _statusColor(status) {
    const map = {
      'planned': '#9ca3af',
      'shooting': '#3b82f6',
      'editing': '#f59e0b',
      'published': '#10b981'
    };
    return map[status] || '#9ca3af';
  },

  // ============ 渲染整个页面 ============
  renderPage() {
    const container = document.getElementById('plannerContent');
    if (!container) return;

    const data = this.getPlanData();
    const weekStart = data.weekStart;
    const weekEnd = this.getWeekEnd(weekStart);
    const videos = data.videos;
    const doneCount = videos.filter(v => v.status === 'published').length;

    let html = '';

    // 周概览卡片
    html += '\
      <div class="plan-week-card">\
        <div class="plan-week-header">\
          <div>\
            <div class="plan-week-title">📅 本周规划</div>\
            <div class="plan-week-date">' + this.formatDate(weekStart) + ' - ' + this.formatDate(weekEnd) + '</div>\
          </div>\
          <div class="plan-week-stats">\
            <div class="plan-stat">\
              <span class="plan-stat-num">' + doneCount + '</span>\
              <span class="plan-stat-label">/2 已发布</span>\
            </div>\
          </div>\
        </div>\
        <div class="plan-progress">\
          <div class="plan-progress-bar">\
            <div class="plan-progress-fill" style="width:' + (doneCount / 2 * 100) + '%"></div>\
          </div>\
          <span class="plan-progress-text">' + (doneCount === 2 ? '🎉 本周任务完成！' : (doneCount === 0 ? '新的一周，加油！' : '进度 ' + (doneCount/2*100) + '%')) + '</span>\
        </div>\
      </div>';

    if (videos.length === 0) {
      // 空状态
      html += '\
        <div class="plan-empty">\
          <div class="plan-empty-emoji">📅</div>\
          <div class="plan-empty-text">本周还没有规划</div>\
          <div class="plan-empty-sub">点击下方按钮，智能生成一周2更的内容计划<br>系统会根据上期复盘和热点趋势自动推荐选题</div>\
        </div>';
    } else {
      // 视频计划列表
      html += '<div class="plan-video-list">';
      videos.forEach((v, i) => {
        html += this._renderPlanCard(v, i);
      });
      html += '</div>';
    }

    // 操作按钮
    html += '\
      <div class="plan-actions">\
        <button class="btn btn-primary btn-block plan-gen-btn" onclick="Planner.generatePlan()" style="min-height:48px;">\
          ' + (videos.length > 0 ? '🔄 重新生成本周计划' : '🚀 智能生成本周计划') + '\
        </button>\
        ' + (videos.length > 0 ? '<p class="plan-hint">💡 重新生成将保留已关联的复盘数据，并更新选题和优化建议</p>' : '<p class="plan-hint">💡 基于上期复盘数据 + 本周热点趋势 + 选题轮换，智能推荐2条视频选题</p>') + '\
      </div>';

    container.innerHTML = html;
  },

  // ============ 渲染单张计划卡片 ============
  _renderPlanCard(plan, index) {
    const statusLabel = this._statusLabel(plan.status);
    const statusEmoji = this._statusEmoji(plan.status);
    const statusColor = this._statusColor(plan.status);

    // 下一步状态
    const nextStatuses = {
      'planned': [{ key: 'shooting', label: '📷 开始拍摄' }],
      'shooting': [{ key: 'editing', label: '✂️ 开始剪辑' }],
      'editing': [{ key: 'published', label: '📤 标记已发布' }],
      'published': [],
    };
    const nextBtns = nextStatuses[plan.status] || [];

    // 拍摄注意点是否展开
    const shootingNotesHtml = plan.shootingNotes
      ? plan.shootingNotes.split('\n').map(line => '<div class="plan-note-line">' + this._escapeHtml(line) + '</div>').join('')
      : '';

    // 剪辑注意点
    const editingNotesHtml = plan.editingNotes
      ? plan.editingNotes.split('\n').map(line => '<div class="plan-note-line">' + this._escapeHtml(line) + '</div>').join('')
      : '';

    // 选题来源标签
    const sourceLabels = {
      'review': '📊 复盘优化',
      'hotspot': '🔥 热点追踪',
      'pool': '🎯 选题轮换',
      'custom': '✏️ 自定义',
    };
    const sourceLabel = sourceLabels[plan.topicSource] || '';

    let html = '\
      <div class="plan-card" id="plan-' + plan.id + '">\
        <div class="plan-card-header">\
          <div class="plan-card-badge" style="background:' + statusColor + '">' + statusEmoji + ' ' + statusLabel + '</div>\
          <span class="plan-card-source">' + sourceLabel + '</span>\
        </div>\
        <div class="plan-card-topic">🎬 视频' + (index + 1) + '：' + this._escapeHtml(plan.topic) + '</div>\
        <div class="plan-card-reason">' + (plan.topicReason || '') + '</div>\
        <div class="plan-card-schedule">\
          <div class="plan-schedule-item">\
            <span class="plan-schedule-icon">📷</span>\
            <span>' + this.formatDate(plan.scheduled.shoot) + ' ' + this.getDayOfWeek(plan.scheduled.shoot) + ' 拍摄</span>\
          </div>\
          <div class="plan-schedule-item">\
            <span class="plan-schedule-icon">✂️</span>\
            <span>' + this.formatDate(plan.scheduled.edit) + ' ' + this.getDayOfWeek(plan.scheduled.edit) + ' 剪辑</span>\
          </div>\
          <div class="plan-schedule-item">\
            <span class="plan-schedule-icon">📤</span>\
            <span>' + this.formatDate(plan.scheduled.publish) + ' ' + this.getDayOfWeek(plan.scheduled.publish) + ' 发布</span>\
          </div>\
        </div>';

    // 拍摄注意点（折叠面板）
    if (shootingNotesHtml) {
      html += '\
        <div class="plan-notes-section">\
          <button class="plan-notes-toggle" onclick="Planner._toggleNotes(\'' + plan.id + '-shoot\')">\
            <span>📷 拍摄注意��</span>\
            <span class="plan-notes-arrow" id="plan-arrow-' + plan.id + '-shoot\">▼</span>\
          </button>\
          <div class="plan-notes-content" id="plan-notes-' + plan.id + '-shoot" style="display:none;">\
            ' + shootingNotesHtml + '\
          </div>\
        </div>';
    }

    // 剪辑注意点（折叠面板）
    if (editingNotesHtml) {
      html += '\
        <div class="plan-notes-section">\
          <button class="plan-notes-toggle" onclick="Planner._toggleNotes(\'' + plan.id + '-edit\')">\
            <span>✂️ 剪辑注意点</span>\
            <span class="plan-notes-arrow" id="plan-arrow-' + plan.id + '-edit\">▼</span>\
          </button>\
          <div class="plan-notes-content" id="plan-notes-' + plan.id + '-edit" style="display:none;">\
            ' + editingNotesHtml + '\
          </div>\
        </div>';
    }

    // 状态推进按钮
    if (nextBtns.length > 0) {
      html += '<div class="plan-card-actions">';
      nextBtns.forEach(btn => {
        html += '<button class="btn btn-sm btn-primary" onclick="Planner.updateStatus(\'' + plan.id + '\', \'' + btn.key + '\')">' + btn.label + '</button>';
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  },

  // ============ 折叠面板切换 ============
  _toggleNotes(id) {
    const content = document.getElementById('plan-notes-' + id);
    const arrow = document.getElementById('plan-arrow-' + id);
    if (!content || !arrow) return;

    if (content.style.display === 'none') {
      content.style.display = 'block';
      arrow.textContent = '▲';
    } else {
      content.style.display = 'none';
      arrow.textContent = '▼';
    }
  },

  // ============ HTML 转义 ============
  _escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};
