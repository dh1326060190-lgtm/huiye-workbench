// ============================================
// 绘野工作台 - 任务管理模块
// ============================================

const Tasks = {
  // 任务分类
  CATEGORIES: [
    { id: 'shoot', name: '拍摄', emoji: '📷', color: 'tag-primary' },
    { id: 'edit', name: '剪辑', emoji: '✂️', color: 'tag-accent' },
    { id: 'publish', name: '发布', emoji: '📤', color: 'tag-success' },
    { id: 'operate', name: '运营', emoji: '📊', color: 'tag-warning' },
    { id: 'study', name: '学习', emoji: '📚', color: 'tag-primary' }
  ],

  // 优先级
  PRIORITIES: [
    { id: 'high', name: '高', class: 'priority-high' },
    { id: 'mid', name: '中', class: 'priority-mid' },
    { id: 'low', name: '低', class: 'priority-low' }
  ],

  currentFilter: 'all',

  init() {
    this.render();
    this.bindEvents();
  },

  bindEvents() {
    // 添加/保存/关闭/筛选按钮已改为 HTML onclick 绑定，兼容 OPPO 等国产浏览器
  },

  // 设置任务筛选
  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('.task-filter-chip').forEach(c => c.classList.remove('active'));
    const active = document.querySelector(`.task-filter-chip[data-filter="${filter}"]`);
    if (active) active.classList.add('active');
    this.renderList();
  },

  // 获取今日任务
  getTodayTasks() {
    const today = Store.today();
    return Store.get(Store.KEYS.TASKS).filter(t => t.date === today);
  },

  // 渲染整个模块
  render() {
    this.renderSummary();
    this.renderList();
  },

  // 渲染统计
  renderSummary() {
    const tasks = this.getTodayTasks();
    const done = tasks.filter(t => t.completed).length;
    const pending = tasks.length - done;
    const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

    document.getElementById('taskTotal').textContent = tasks.length;
    document.getElementById('taskDone').textContent = done;
    document.getElementById('taskPending').textContent = pending;
    document.getElementById('taskProgress').style.width = progress + '%';
    document.getElementById('taskProgressText').textContent = progress + '%';
  },

  // 渲染任务列表
  renderList() {
    const container = document.getElementById('taskList');
    let tasks = this.getTodayTasks();

    // 按筛选过滤
    if (this.currentFilter !== 'all') {
      if (this.currentFilter === 'pending') {
        tasks = tasks.filter(t => !t.completed);
      } else if (this.currentFilter === 'done') {
        tasks = tasks.filter(t => t.completed);
      } else {
        tasks = tasks.filter(t => t.category === this.currentFilter);
      }
    }

    // 排序：未完成在前，高优先级在前
    tasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pOrder = { high: 0, mid: 1, low: 2 };
      return pOrder[a.priority] - pOrder[b.priority];
    });

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="emoji">📋</div>
          <div class="text">${this.currentFilter === 'all' ? '今天还没有任务<br>点击右下角添加你的第一个任务' : '该分类暂无任务'}</div>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map(task => this.renderTaskItem(task)).join('');
  },

  // 渲染单个任务
  renderTaskItem(task) {
    const cat = this.CATEGORIES.find(c => c.id === task.category) || this.CATEGORIES[3];
    const pri = this.PRIORITIES.find(p => p.id === task.priority) || this.PRIORITIES[1];

    // 备注换行转<br>，让详细的操作指南分行显示
    const noteHtml = task.note
      ? this.escape(task.note).replace(/\n/g, '<br>')
      : '';

    return `
      <div class="task-item ${pri.class} ${task.completed ? 'completed' : ''}" data-id="${task.id}" onclick="Tasks.openTaskModal('${task.id}')">
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}" onclick="event.stopPropagation(); Tasks.toggleTask('${task.id}')"></div>
        <div class="task-content">
          <div class="task-title">${this.escape(task.title)}</div>
          ${noteHtml ? `<div class="task-note">${noteHtml}</div>` : ''}
          <div class="task-meta">
            <span class="tag ${cat.color}">${cat.emoji} ${cat.name}</span>
            <span class="tag">${pri.name}优</span>
            ${task.time ? `<span class="tag">⏰ ${task.time}</span>` : ''}
          </div>
        </div>
        <button class="btn btn-icon task-delete-btn" data-id="${task.id}" onclick="event.stopPropagation(); Tasks.deleteTask('${task.id}')" style="align-self:flex-start;">🗑</button>
      </div>
    `;
  },

  // 打开任务弹窗（新建/编辑）
  openTaskModal(taskId = null) {
    const overlay = document.getElementById('taskModalOverlay');
    const form = document.getElementById('taskForm');
    form.reset();

    if (taskId) {
      // 编辑模式
      const tasks = Store.get(Store.KEYS.TASKS);
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      document.getElementById('taskModalTitle').textContent = '编辑任务';
      document.getElementById('taskId').value = task.id;
      document.getElementById('taskTitle').value = task.title;
      document.getElementById('taskNote').value = task.note || '';
      document.getElementById('taskCategory').value = task.category;
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('taskTime').value = task.time || '';
    } else {
      // 新建模式
      document.getElementById('taskModalTitle').textContent = '新建任务';
      document.getElementById('taskId').value = '';
      document.getElementById('taskDate').value = Store.today();
    }

    overlay.classList.add('active');
  },

  closeTaskModal() {
    document.getElementById('taskModalOverlay').classList.remove('active');
  },

  // 保存任务
  saveTask() {
    const id = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) {
      showToast('请输入任务标题');
      return;
    }

    const taskData = {
      id: id || Store.genId(),
      title: title,
      note: document.getElementById('taskNote').value.trim(),
      category: document.getElementById('taskCategory').value,
      priority: document.getElementById('taskPriority').value,
      time: document.getElementById('taskTime').value,
      date: Store.today(),
      completed: false,
      createdAt: Date.now()
    };

    const tasks = Store.get(Store.KEYS.TASKS);

    if (id) {
      // 编辑
      const idx = tasks.findIndex(t => t.id === id);
      if (idx > -1) {
        taskData.completed = tasks[idx].completed;
        taskData.createdAt = tasks[idx].createdAt;
        tasks[idx] = taskData;
      }
    } else {
      // 新建
      tasks.push(taskData);
    }

    Store.set(Store.KEYS.TASKS, tasks);
    this.closeTaskModal();
    this.render();
    showToast(id ? '任务已更新' : '任务已创建');
  },

  // 切换完成状态
  toggleTask(taskId) {
    const tasks = Store.get(Store.KEYS.TASKS);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.completedAt = task.completed ? Date.now() : null;
      Store.set(Store.KEYS.TASKS, tasks);
      this.render();
      if (task.completed) {
        showToast('✅ 完成任务：' + task.title);
      }
    }
  },

  // 删除任务
  deleteTask(taskId) {
    if (!confirm('确定删除这个任务吗？')) return;
    let tasks = Store.get(Store.KEYS.TASKS);
    tasks = tasks.filter(t => t.id !== taskId);
    Store.set(Store.KEYS.TASKS, tasks);
    this.render();
    showToast('任务已删除');
  },

  // HTML转义
  escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // 初始化示例任务（首次使用）
  seedDemoTasks() {
    const tasks = Store.get(Store.KEYS.TASKS);
    if (tasks.length > 0) return;

    const demoTasks = [
      { id: Store.genId(), title: '拍摄收房开箱视频素材', note: '重点拍玄关和客厅光线', category: 'shoot', priority: 'high', time: '09:00', date: Store.today(), completed: false, createdAt: Date.now() },
      { id: Store.genId(), title: '剪辑昨日收房视频', note: '前3秒加入钩子文案', category: 'edit', priority: 'high', time: '14:00', date: Store.today(), completed: false, createdAt: Date.now() },
      { id: Store.genId(), title: '发布小红书图文笔记', note: '搭配5张高清图+详细文案', category: 'publish', priority: 'mid', time: '18:00', date: Store.today(), completed: false, createdAt: Date.now() },
      { id: Store.genId(), title: '回复评论区粉丝问题', category: 'operate', priority: 'mid', time: '20:00', date: Store.today(), completed: false, createdAt: Date.now() },
      { id: Store.genId(), title: '研究同赛道爆款视频结构', note: '拆解3条对标账号视频', category: 'study', priority: 'low', date: Store.today(), completed: false, createdAt: Date.now() }
    ];

    Store.set(Store.KEYS.TASKS, demoTasks);
  }
};
