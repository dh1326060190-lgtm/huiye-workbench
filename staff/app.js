/* =========================================================================
 * 内销跟单工作台 —— 应用逻辑 app.js
 * 依赖 store.js（WB.store / WB.util）
 * ========================================================================= */
(function (global) {
  'use strict';
  var WB = global.WB = global.WB || {};
  var store = WB.store, util = WB.util, esc = util.esc;

  /* ============================ UI 基础组件 ============================ */
  var ui = WB.ui = {};

  ui.toast = function (msg, type) {
    var root = document.getElementById('toastRoot');
    var t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = '.3s'; }, 2600);
    setTimeout(function () { t.remove(); }, 3000);
  };

  ui.open = function (opt) {
    var root = document.getElementById('modalRoot');
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    var modal = document.createElement('div');
    modal.className = 'modal' + (opt.size ? ' ' + opt.size : '');
    modal.innerHTML =
      '<div class="modal-head"><h3>' + esc(opt.title || '') + '</h3><button class="modal-close">×</button></div>' +
      '<div class="modal-body">' + (opt.body || '') + '</div>' +
      (opt.footer ? '<div class="modal-foot"></div>' : '');
    mask.appendChild(modal);
    root.appendChild(mask);
    var close = function () { mask.remove(); };
    modal.querySelector('.modal-close').onclick = close;
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    if (opt.footer) {
      var f = modal.querySelector('.modal-foot');
      opt.footer.forEach(function (b) {
        var el = document.createElement('button');
        el.className = 'btn ' + (b.cls || '');
        el.textContent = b.label;
        el.onclick = function () { b.onClick && b.onClick(close); };
        f.appendChild(el);
      });
    }
    return { close: close, modal: modal, mask: mask };
  };

  ui.alert = function (msg) {
    ui.open({ title: '提示', body: '<p style="line-height:1.7">' + esc(msg) + '</p>', footer: [{ label: '知道了', cls: 'primary', onClick: function (c) { c(); } }] });
  };

  ui.confirm = function (msg) {
    return new Promise(function (resolve) {
      ui.open({
        title: '确认操作', size: 'sm', body: '<p style="line-height:1.7">' + esc(msg) + '</p>',
        footer: [
          { label: '取消', onClick: function (c) { c(); resolve(false); } },
          { label: '确定', cls: 'primary', onClick: function (c) { c(); resolve(true); } }
        ]
      });
    });
  };

  // 通用表单
  ui.form = function (opt) {
    var fields = opt.fields, values = opt.values || {};
    var html = '<form id="frm"><div class="form-grid">';
    fields.forEach(function (f) {
      if (f.section) { html += '<div class="sec-title">' + esc(f.section) + '</div>'; return; }
      var val = values[f.name] !== undefined && values[f.name] !== null ? values[f.name] : '';
      html += '<div class="field ' + (f.full ? 'full' : '') + '">';
      html += '<label>' + esc(f.label) + (f.required ? '<span class="req">*</span>' : '') + '</label>';
      if (f.type === 'html') {
        html += f.html || '';
      } else if (f.type === 'textarea') {
        html += '<textarea data-f="' + f.name + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(val) + '</textarea>';
      } else if (f.type === 'select') {
        html += '<select data-f="' + f.name + '">' +
          (f.options || []).map(function (o) { return '<option ' + (o === val ? 'selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
      } else if (f.type === 'files') {
        html += '<input type="file" multiple data-f="' + f.name + '" class="file-input"/>';
        html += '<div class="file-list" data-fl="' + f.name + '"></div>';
      } else {
        var t = f.type === 'date' ? 'date' : (f.type === 'number' ? 'number' : 'text');
        html += '<input data-f="' + f.name + '" type="' + t + '" value="' + esc(val) + '" placeholder="' +
          esc(f.placeholder || '') + '" ' + (f.readonly ? 'readonly' : '') + (f.list ? ' list="dl_' + f.name + '"' : '') + '/>';
      }
      html += '</div>';
    });
    fields.forEach(function (f) { if (f.list) html += '<datalist id="dl_' + f.name + '">' + f.list.map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist>'; });
    html += '</div></form>';

    var pending = {};
    function renderFiles(name) {
      var fl = modalEl.querySelector('[data-fl="' + name + '"]');
      var arr = pending[name] || [];
      fl.innerHTML = arr.map(function (x, i) {
        return '<span class="file-chip"><a data-open="' + i + '">' + esc(x.name) + '</a><span class="del" data-del="' + i + '">✕</span></span>';
      }).join('');
      fl.querySelectorAll('[data-open]').forEach(function (a) {
        a.onclick = function () { openFile(arr[+a.dataset.open]); };
      });
      fl.querySelectorAll('[data-del]').forEach(function (d) {
        d.onclick = function () { arr.splice(+d.dataset.del, 1); renderFiles(name); };
      });
    }
    var m = ui.open({
      title: opt.title, size: opt.size || 'lg', body: html,
      footer: [
        { label: '取消', onClick: function (c) { c(); } },
        {
          label: '保存', cls: 'primary', onClick: function (c) {
            var formEl = modalEl.querySelector('#frm');
            var out = {}, ok = true;
            fields.forEach(function (f) {
              if (f.section) return;
              if (f.type === 'files') { out[f.name] = pending[f.name] ? pending[f.name].slice() : (values[f.name] || []); return; }
              var el = formEl.querySelector('[data-f="' + f.name + '"]');
              out[f.name] = el ? el.value : '';
              if (f.required && !out[f.name]) { ok = false; if (el) el.style.borderColor = '#e11d48'; }
            });
            if (!ok) { ui.toast('请填写必填项', 'err'); return; }
            var r = opt.onSubmit ? opt.onSubmit(out) : true;
            if (r && r.then) { r.then(function (res) { if (res !== false) c(); }); }
            else if (r !== false) { c(); }
          }
        }
      ]
    });
    var modalEl = m.modal;
    fields.forEach(function (f) {
      if (f.type === 'files') {
        pending[f.name] = (values[f.name] || []).slice();
        renderFiles(f.name);
        var input = modalEl.querySelector('[data-f="' + f.name + '"]');
        input.addEventListener('change', function (e) {
          [].forEach.call(e.target.files, function (file) {
            var r = new FileReader();
            r.onload = function () { pending[f.name].push({ name: file.name, type: file.type, size: file.size, data: r.result }); renderFiles(f.name); };
            r.readAsDataURL(file);
          });
          input.value = '';
        });
      }
    });
    if (opt.onMount) opt.onMount(modalEl, m, pending);
    return m;
  };

  function downloadData(name, type, data) {
    var a = document.createElement('a'); a.href = data; a.download = name || 'file';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function openFile(f) {
    if (!f) return;
    if (f.data) { downloadData(f.name, f.type, f.data); return; }
    if (f.fileId) {
      if (typeof indexedDB === 'undefined') { ui.toast('当前环境不支持打开附件', 'err'); return; }
      store.getFile(f.fileId).then(function (d) {
        if (d) downloadData(f.name, f.type, d); else ui.toast('附件已丢失，可能换过浏览器', 'err');
      }).catch(function () { ui.toast('打开附件失败', 'err'); });
      return;
    }
    ui.toast('无法打开该附件', 'err');
  }

  /* ============================ 常用渲染辅助 ============================ */
  function badge(status) { return '<span class="badge b-' + util.statusColor(status) + '">' + esc(status) + '</span>'; }
  function tag(t) { return t ? '<span class="tag">' + esc(t) + '</span>' : ''; }
  function pbar(p) { p = Math.max(0, Math.min(100, Number(p) || 0)); return '<div class="pbar"><i style="width:' + p + '%"></i></div> ' + p + '%'; }

  // 通用表格
  function tableView(headers, rows, cls) {
    var h = '<thead><tr>' + headers.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr></thead>';
    var body = rows.length ? '<tbody>' + rows.join('') + '</tbody>' : '<tbody><tr><td class="empty" colspan="' + headers.length + '">暂无数据</td></tr></tbody>';
    return '<div class="table-wrap"><table class="tbl ' + (cls || '') + '">' + h + body + '</table></div>';
  }

  // 客户下拉名列表
  function customerNames() { return store.list('customers').map(function (c) { return c.name; }); }
  // 已有产品等去重
  function uniq(key) {
    var s = {}; store.list('orders').forEach(function (o) { if (o[key]) s[o[key]] = 1; });
    return Object.keys(s);
  }

  // 动态加载外部脚本（OCR 引擎等）
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ============================ 常量 ============================ */
  var ORDER_STATUS = ['新订单', '待确认', '待排产', '生产中', '待验货', '待发货', '已发货', '已完成', '已取消'];
  var STATUS_NEXT = { '新订单': '待确认', '待确认': '待排产', '待排产': '生产中', '生产中': '待验货', '待验货': '待发货', '待发货': '已发货', '已发货': '已完成' };
  var PROD_NODES = ['已排产', '原料到位', '生产中', '半成品', '质检中', '生产完成'];
  var SHIP_STATUS = ['待发货', '已发货', '运输中', '已签收'];
  var SHIP_NEXT = { '待发货': '已发货', '已发货': '运输中', '运输中': '已签收' };
  var REC_STATUS = ['未对账', '已对账待回款', '部分回款', '全款结清'];
  var EXC_TYPES = ['生产延期', '质量问题', '错货', '少货', '客户退货', '换货', '补单', '客诉'];
  var EXC_PROGRESS = ['待处理', '处理中', '已解决', '闭环归档'];
  var RETURN_STATUS = ['待处理', '处理中', '已退款', '已换货', '已关闭'];
  var RETURN_NEXT = { '待处理': '处理中', '处理中': '已退款', '已退款': '已关闭', '已换货': '已关闭' };
  var RETURN_REASONS = ['质量问题', '错发', '少发', '客户不想要', '型号不符', '破损', '其他'];
  var RETURN_HANDLING = ['退款', '换货', '补发', '待确认'];
  var RETURN_TYPES = ['关联订单', '独立退货'];
  var CUST_LEVELS = ['新客户', '普通客户', '老客户', '核心客户'];

  /* ============================ 订单模块 ============================ */
  var orderFilters = { kw: '', status: '', customer: '', paid: '', due: '', salesman: '', deliverFrom: '', deliverTo: '' };
  window._preset = null;

  function orderFields(vals, isNew) {
    vals = vals || {};
    return [
      { section: '基础信息' },
      { name: 'no', label: '订单编号', readonly: true, placeholder: isNew ? '保存后自动生成' : '' },
      { name: 'date', label: '订单日期', type: 'date', required: true },
      { name: 'customer', label: '客户名称', list: customerNames(), required: true },
      { name: 'contact', label: '客户联系人' },
      { name: 'phone', label: '联系电话' },
      { name: 'address', label: '客户地址', full: true },
      { name: 'salesman', label: '销售业务员', list: store.list('orders').map(function (o) { return o.salesman; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }) },
      { section: '产品信息' },
      { name: 'product', label: '产品名称', list: uniq('product'), required: true },
      { name: 'spec', label: '规格型号', list: uniq('spec') },
      { name: 'itemNo', label: '品号', list: uniq('itemNo') },
      { name: 'model', label: '型号', list: uniq('model') },
      { name: 'unit', label: '单位', list: uniq('unit') },
      { name: 'material', label: '材质', list: uniq('material') },
      { name: 'color', label: '颜色' },
      { name: 'qty', label: '下单数量', type: 'number', required: true },
      { name: 'total', label: '总价', type: 'number', required: true, hint: '无需填写单价，直接录入订单总价即可' },
      { name: 'remark', label: '备注（客户特殊要求）', type: 'textarea', full: true },
      { section: '订单状态与关键节点' },
      { name: 'status', label: '订单状态', type: 'select', options: ORDER_STATUS },
      { name: 'deliverDate', label: '要求交货期', type: 'date', required: true },
      { name: 'actualDeliverDate', label: '实际交货日', type: 'date' },
      { name: 'shippedQty', label: '已出货数量', type: 'number' },
      { name: 'unshippedQty', label: '未出货数量', type: 'number' },
      { name: 'confirmTime', label: '客户确认时间', type: 'date' },
      { name: 'scheduleTime', label: '工厂排产时间', type: 'date' },
      { name: 'startTime', label: '开工时间', type: 'date' },
      { name: 'expectFinish', label: '预计完工时间', type: 'date' },
      { name: 'actualFinish', label: '实际完工时间', type: 'date' },
      { section: '款项信息' },
      { name: 'prepay', label: '预付金额', type: 'number' },
      { name: 'rest', label: '尾款金额', type: 'number' },
      { name: 'received', label: '已收款', type: 'number' },
      { name: 'unpaid', label: '未收款', readonly: true },
      { name: 'payMethod', label: '付款方式', list: ['银行转账', '微信', '支付宝', '现金', '月结'] },
      { section: '附件上传' },
      { name: 'attachments', label: '客户订单截图/合同/报价单/图纸', type: 'files', full: true }
    ];
  }

  function orderRecompute(out) {
    if (out.items && out.items.length) {
      // 含多行明细：数量/金额为明细求和；已取消明细（canceled）不计入汇总
      var act = out.items.filter(function (it) { return !it.canceled; });
      out.qty = act.reduce(function (a, it) { return a + util.num(it.qty); }, 0);
      out.total = +act.reduce(function (a, it) { return a + util.num(it.total); }, 0).toFixed(2);
    } else {
      // 单行订单：不再由「单价×数量」推算，直接采用录入的总价；单价仅作展示用途
      out.qty = util.num(out.qty);
      out.total = +util.num(out.total).toFixed(2);
    }
    out.prepay = util.num(out.prepay); out.rest = util.num(out.rest);
    out.received = util.num(out.received);
    if (out.received > out.total) out.received = out.total;  // 已收款不超过总价（#8）
    out.unpaid = Math.max(0, +(out.total - out.received).toFixed(2));
    autoShipStatus(out);
  }
  // 返回订单明细数组：新导入/多行订单用 items；老订单（无 items）由标量字段合成单行
  function orderItems(o) {
    if (o.items && o.items.length) return o.items;
    return [{ itemNo: o.itemNo, product: o.product, spec: o.spec, model: o.model, unit: o.unit, material: o.material, color: o.color, qty: o.qty, price: o.price, total: o.total, shippedQty: o.shippedQty, unshippedQty: o.unshippedQty, actualDeliverDate: o.actualDeliverDate, remark: o.remark }];
  }
  // 删除订单并级联清理关联的生产跟进 / 发货物流 / 对账记录
  function deleteOrder(id) {
    store.remove('orders', id);
    store.list('productions').filter(function (p) { return p.orderId === id; }).forEach(function (p) { store.remove('productions', p.id); });
    store.list('shipments').filter(function (s) { return s.orderId === id; }).forEach(function (s) { store.remove('shipments', s.id); });
    store.list('reconciliations').filter(function (r) { return r.orderId === id; }).forEach(function (r) { store.remove('reconciliations', r.id); });
  }
  // 已出货 = 总数（未出货≤0 且数量>0）且当前状态在「已发货」之前时，自动置为「已发货」
  // 不动 已发货/已完成/已取消，也不回退已处于「已发货」之后的状态
  function autoShipStatus(o) {
    var idx = ORDER_STATUS.indexOf(o.status);
    var shipIdx = ORDER_STATUS.indexOf('已发货');
    var qty = util.num(o.qty), sh = util.num(o.shippedQty), un = util.num(o.unshippedQty);
    // 非负兜底 + 已出货须≈总数量（防止未出货为负/已出货超量误判「已发货」）
    sh = Math.max(0, sh); un = Math.max(0, un);
    var fullyShipped = qty > 0 && sh >= qty - 0.001 && sh <= qty + 0.001 && un <= 0.001;
    if (fullyShipped && idx >= 0 && idx < shipIdx) o.status = '已发货';
  }
  // 发货/签收后：按该订单全部发货记录汇总回写订单出货数（含明细级），并联动状态（#3/#4）
  function refreshOrderAfterShip(oid, signTime) {
    var o = store.get('orders', oid); if (!o) return;
    var ships = store.list('shipments').filter(function (s) { return s.orderId === oid; });
    var sumShipped = util.sum(ships, 'shipQty');

    // 按明细汇总累计已发量（新发货记录带 items；旧记录降级为订单级，不影响明细列）
    var itemShipped = {};
    ships.forEach(function (s) {
      if (s.items && s.items.length) {
        s.items.forEach(function (it) { itemShipped[it.idx] = (itemShipped[it.idx] || 0) + util.num(it.shipQty); });
      }
    });
    var its = orderItems(o);
    its.forEach(function (it, idx) {
      it.shippedQty = util.num(itemShipped[idx]);
      it.unshippedQty = Math.max(0, util.num(it.qty) - it.shippedQty);
    });

    o.shippedQty = sumShipped;
    o.unshippedQty = Math.max(0, util.num(o.qty) - sumShipped);
    if (o.status === '待发货') o.status = '已发货';  // 发货即进入已发货（支持分批发货）
    autoShipStatus(o);
    if (signTime) {
      var allSigned = ships.length > 0 && ships.every(function (s) { return s.status === '已签收'; });
      if (allSigned && sumShipped >= util.num(o.qty)) {
        o.status = '已完成';
        o.actualDeliverDate = util.fmtDate(signTime) || util.today();
      }
    }
    store.update('orders', oid, o);
  }

  // 修复订单/明细的出货数量一致性：未出 = max(0, 数量 - 已出)，避免导入或旧数据出现"已出6/未出0"这类错误
  // 存在按明细发货记录时，以实际发货记录为权威来源回写明细分 shippedQty/unshippedQty
  function repairOrderShipQty() {
    store.list('orders').forEach(function (o) {
      var changed = false;
      var ships = store.list('shipments').filter(function (s) { return s.orderId === o.id; });
      var itemShipped = {};
      var hasItemShipments = false;
      ships.forEach(function (s) {
        if (s.items && s.items.length) {
          hasItemShipments = true;
          s.items.forEach(function (it) { itemShipped[it.idx] = (itemShipped[it.idx] || 0) + util.num(it.shipQty); });
        }
      });
      var its = orderItems(o);
      its.forEach(function (it, idx) {
        if (it.canceled) {
          if (util.num(it.unshippedQty) !== 0) { it.unshippedQty = 0; changed = true; }
        } else {
          var shipped = hasItemShipments ? util.num(itemShipped[idx]) : util.num(it.shippedQty);
          if (hasItemShipments && util.num(it.shippedQty) !== shipped) { it.shippedQty = shipped; changed = true; }
          var calc = Math.max(0, util.num(it.qty) - shipped);
          if (util.num(it.unshippedQty) !== calc) { it.unshippedQty = calc; changed = true; }
        }
      });
      var calcOrder = Math.max(0, util.num(o.qty) - util.num(o.shippedQty));
      if (util.num(o.unshippedQty) !== calcOrder) { o.unshippedQty = calcOrder; changed = true; }
      if (changed) store.update('orders', o.id, o);
    });
  }

  // #7 订单编辑后，联动更新关联的生产跟进/发货物流/对账回款中的快照字段（数量/交期/金额/客户/产品），
  // 避免订单改了金额/交期后，关联模块仍显示旧值造成「两处真相」。发货的 shipQty/remainQty 为实际发生值，不覆盖。
  function syncOrderSnapshot(orderId) {
    var o = store.get('orders', orderId); if (!o) return;
    var qty = util.num(o.qty), total = util.num(o.total);
    store.list('productions').filter(function (p) { return p.orderId === orderId; }).forEach(function (p) {
      store.update('productions', p.id, { no: o.no, customer: o.customer, product: o.product, qty: qty, deliverDate: o.deliverDate });
    });
    store.list('shipments').filter(function (s) { return s.orderId === orderId; }).forEach(function (s) {
      store.update('shipments', s.id, { no: o.no, customer: o.customer, product: o.product });
    });
    store.list('reconciliations').filter(function (r) { return r.orderId === orderId; }).forEach(function (r) {
      var received = util.num(r.received);
      var patch = { no: o.no, customer: o.customer, amount: total, reconAmount: total };
      if (r.status === '全款结清' || r.status === '已对账待回款') {
        patch.status = (received >= total - 0.001) ? '全款结清' : '已对账待回款';
      }
      store.update('reconciliations', r.id, patch);
    });
  }

  function openOrderForm(id, preset, onSaved) {
    var isNew = !id;
    var fromPending = preset ? preset._fromPending : null;
    var colleagueId = preset ? preset._colleagueId : null;
    var v = isNew ? Object.assign({ date: util.today(), status: '新订单', salesman: '陈晓' }, preset || {}) : JSON.parse(JSON.stringify(store.get('orders', id)));
    delete v._fromPending;
    delete v._colleagueId;
    if (isNew && !v.no) v.no = store.nextOrderNo();
    // 日期字段统一归一化：导入时若存成 Date 对象或 ISO 时间串，原生 date 输入无法识别，会显示空
    ['date', 'deliverDate', 'actualDeliverDate', 'confirmTime', 'scheduleTime', 'startTime', 'expectFinish', 'actualFinish'].forEach(function (f) {
      if (v[f]) v[f] = util.fmtDate(v[f]);
    });
    ui.form({
      title: isNew ? '新增订单' : '编辑订单 · ' + v.no,
      fields: orderFields(v, isNew), values: v, size: 'lg',
      onMount: function (modalEl) {
        function recalc() {
          var q = util.num(modalEl.querySelector('[data-f="qty"]').value);
          var tot = util.num(modalEl.querySelector('[data-f="total"]').value);
          var rec = util.num(modalEl.querySelector('[data-f="received"]').value);
          if (rec > tot) rec = tot;  // 已收款不超过总价（展示用，#8）
          modalEl.querySelector('[data-f="unpaid"]').value = Math.max(0, tot - rec).toFixed(2);
          // 已出货 → 自动推算未出货（仅当用户未手动填写时）
          var shEl = modalEl.querySelector('[data-f="shippedQty"]');
          var unEl = modalEl.querySelector('[data-f="unshippedQty"]');
          if (shEl && unEl) {
            var sh = util.num(shEl.value);
            unEl.value = Math.max(0, q - sh).toFixed(0);
          }
        }
        ['qty', 'total', 'received', 'shippedQty'].forEach(function (n) {
          var el = modalEl.querySelector('[data-f="' + n + '"]');
          if (el) el.addEventListener('input', recalc);
        });
        // 选客户自动带入
        var cInput = modalEl.querySelector('[data-f="customer"]');
        cInput.addEventListener('change', function () {
          var c = store.list('customers').find(function (x) { return x.name === cInput.value; });
          if (c) {
            if (!modalEl.querySelector('[data-f="contact"]').value) modalEl.querySelector('[data-f="contact"]').value = c.contact || '';
            if (!modalEl.querySelector('[data-f="phone"]').value) modalEl.querySelector('[data-f="phone"]').value = c.phone || '';
            if (!modalEl.querySelector('[data-f="address"]').value) modalEl.querySelector('[data-f="address"]').value = c.address || '';
          }
        });
        recalc();
      },
      onSubmit: function (out) {
        // 多行明细订单：编辑时保留原明细，标量字段不作为金额来源
        if (!isNew && v.items && v.items.length) out.items = v.items;
        // 表单不再录入单价；编辑导入订单时保留原有的单价，供详情页展示
        if (!isNew && v.price != null && out.price == null) out.price = v.price;
        orderRecompute(out);
        return util.persistFiles(out.attachments).then(function (atts) {
          out.attachments = atts;
          if (isNew) { store.add('orders', out); ui.toast('订单已创建：' + out.no, 'ok'); }
          else { store.update('orders', id, out); ui.toast('订单已保存', 'ok'); }
          if (fromPending) { store.update('pendings', fromPending, { status: '已转采购', toOrderNo: out.no }); }
          syncOrderSnapshot(id || out.id);  // #7 订单金额/交期改动后同步关联快照
          // 进入生产中自动建生产跟进
          if (out.status === '生产中' && !store.list('productions').find(function (p) { return p.orderId === (id || out.id); })) {
            var o = store.list('orders').find(function (x) { return x.no === out.no; });
            if (o) store.add('productions', { orderId: o.id, no: o.no, customer: o.customer, product: o.product, qty: o.qty, deliverDate: o.deliverDate, node: '生产中', percent: 0, abnormal: '', logs: [] });
          }
          if (colleagueId) markColleagueImported([colleagueId]);
          if (onSaved) onSaved(out);
          renderView();
        });
      }
    });
  }

  function orderAdvance(id) {
    var o = store.get('orders', id); if (!o) return;
    var next = STATUS_NEXT[o.status];
    if (!next) { ui.toast(o.status === '已取消' ? '已取消订单不可推进' : '已完成，无需推进', 'warn'); return; }
    var patch = { status: next };
    if (next === '生产中' && !o.startTime) patch.startTime = util.today();
    store.update('orders', id, patch);
    if (next === '生产中' && !store.list('productions').find(function (p) { return p.orderId === id; })) {
      store.add('productions', { orderId: id, no: o.no, customer: o.customer, product: o.product, qty: o.qty, deliverDate: o.deliverDate, node: '生产中', percent: 0, abnormal: '', logs: [] });
    }
    ui.toast('状态已推进：' + o.status + ' → ' + next, 'ok');
    renderView();
  }

  function orderCopy(id) {
    var o = store.get('orders', id); if (!o) return;
    var c = JSON.parse(JSON.stringify(o));
    delete c.id; delete c.createdAt; delete c.updatedAt;
    c.no = store.nextOrderNo(); c.date = util.today(); c.status = '新订单';
    c.confirmTime = c.scheduleTime = c.startTime = c.actualFinish = '';
    c.received = 0; c.unpaid = c.total;
    store.add('orders', c); store.log('复制', 'orders', c);
    ui.toast('已复制为同款新订单：' + c.no, 'ok');
    renderView();
  }

  function orderDetail(id) {
    var o = store.get('orders', id); if (!o) return;
    var att = (o.attachments || []).map(function (a, i) { return '<span class="file-chip"><a data-dl="' + i + '">' + esc(a.name) + '</a></span>'; }).join('');
    var rel = '';
    var p = store.list('productions').find(function (x) { return x.orderId === id; });
    var s = store.list('shipments').filter(function (x) { return x.orderId === id; });
    var r = store.list('reconciliations').find(function (x) { return x.orderId === id; });
    var ns = store.list('noships').filter(function (x) { return x.orderId === id; });
    rel += p ? '<div>· 生产跟进：' + badge(p.node) + ' ' + p.percent + '%</div>' : '<div>· 生产跟进：未建立</div>';
    rel += '<div>· 发货记录：' + (s.length ? s.length + ' 笔' : '未发货') + '</div>';
    rel += '<div>· 无单出货（关联）：' + (ns.length ? ns.map(function (x) { return '<a href="#/noship" style="color:#2f6fed">' + esc(x.no) + '</a>'; }).join('、') : '无') + '</div>';
    rel += r ? '<div>· 对账状态：' + badge(r.status) + '</div>' : '';
    var its = orderItems(o);
    var itemsHtml = its.length > 1 ? ('<h4 style="margin:16px 0 6px;color:#2f6fed">订单明细（' + its.length + ' 项' + (its.some(function (x) { return x.canceled; }) ? '，含已取消' : '') + '）</h4>' +
      '<div class="table-wrap"><table class="tbl"><tr><th>品号</th><th>品名</th><th>规格</th><th>型号</th><th>单位</th><th>数量</th><th>含税单价</th><th>金额</th><th>出货</th><th>操作</th></tr>' +
      its.map(function (it, idx) {
        var rowCls = it.canceled ? ' class="row-canceled"' : '';
        var op = it.canceled
          ? '<span class="tag" style="background:#eef0f3;color:#9aa6b5">已取消</span> <button class="btn sm" data-restore-item="' + idx + '">恢复</button>'
          : '<button class="btn sm danger" data-cancel-item="' + idx + '">单笔取消</button>';
        var shipCell = it.canceled ? '<span class="tag" style="background:#eef0f3;color:#9aa6b5">已取消</span>'
          : shipInfo({ shippedQty: it.shippedQty, unshippedQty: it.unshippedQty });
        return '<tr' + rowCls + '><td>' + esc(it.itemNo || '') + '</td><td>' + esc(it.product || '') + '</td><td>' + esc(it.spec || '') + '</td><td>' + esc(it.model || '') + '</td><td>' + esc(it.unit || '') + '</td>' +
          '<td class="nowrap">' + util.num(it.qty) + (it.unit ? ' ' + esc(it.unit) : '') + '</td>' +
          '<td class="nowrap">' + util.money(it.price) + '</td>' +
          '<td class="nowrap">' + util.money(it.total) + '</td>' +
          '<td class="nowrap">' + shipCell + '</td>' +
          '<td class="nowrap">' + op + '</td></tr>';
      }).join('') + '</table></div>') : '';
    var body =
      '<div class="detail"><dl>' +
      '<dt>订单编号</dt><dd>' + esc(o.no) + '</dd>' +
      '<dt>订单日期</dt><dd>' + esc(util.fmtDateView(o.date)) + '</dd>' +
      '<dt>客户</dt><dd>' + esc(o.customer) + ' / ' + esc(o.contact) + ' / ' + esc(o.phone) + '</dd>' +
      '<dt>地址</dt><dd>' + esc(o.address) + '</dd>' +
      '<dt>业务员</dt><dd>' + esc(o.salesman) + '</dd>' +
      '<dt>产品</dt><dd>' + esc(o.product) + ' ' + esc(o.spec) + ' ' + esc(o.material) + ' ' + esc(o.color) + '</dd>' +
      '<dt>品号/型号/单位</dt><dd>' + (o.itemNo ? esc(o.itemNo) + ' ' : '') + (o.model ? esc(o.model) + ' ' : '') + (o.unit ? esc(o.unit) : '') + (o.itemNo || o.model || o.unit ? '' : '—') + '</dd>' +
      '<dt>数量/单价</dt><dd>' + o.qty + (o.unit ? ' ' + esc(o.unit) : '') + ' × ' + util.money((util.num(o.price) || (util.num(o.qty) ? +(o.total / o.qty).toFixed(2) : 0))) + ' = ' + util.money(o.total) + '</dd>' +
      '<dt>状态</dt><dd>' + badge(o.status) + '</dd>' +
      '<dt>交货期</dt><dd>计划 ' + esc(util.fmtDateView(o.deliverDate)) + (o.actualDeliverDate ? '｜实际 ' + esc(util.fmtDateView(o.actualDeliverDate)) : '') + '</dd>' +
      '<dt>出货</dt><dd>' + shipInfo(o) + '</dd>' +
      '<dt>已收款</dt><dd>' + util.money(o.received) + ' / 未收 ' + util.money(o.unpaid) + '（' + esc(o.payMethod) + '）</dd>' +
      '<dt>关键节点</dt><dd>确认 ' + esc(o.confirmTime) + '｜排产 ' + esc(o.scheduleTime) + '｜开工 ' + esc(o.startTime) + '｜预计完工 ' + esc(o.expectFinish) + '｜实际完工 ' + esc(o.actualFinish) + '</dd>' +
      '<dt>备注</dt><dd>' + esc(o.remark) + '</dd>' +
      '<dt>附件</dt><dd>' + (att || '无') + '</dd>' +
      '</dl></div>' + itemsHtml + '<h4 style="margin:16px 0 6px;color:#2f6fed">关联信息</h4>' + rel;
    var m = ui.open({ title: '订单详情 · ' + o.no, body: body, size: 'lg', footer: [{ label: '关闭', cls: 'primary', onClick: function (c) { c(); } }] });
    m.modal.querySelectorAll('[data-dl]').forEach(function (a) { a.onclick = function () { openFile(o.attachments[+a.dataset.dl]); }; });
    // 单笔取消明细：保留已发部分 / 未发部分取消；完全未发的明细取消后保留文字并置灰，不计入订单数量金额
    m.modal.querySelectorAll('[data-cancel-item]').forEach(function (btn) {
      btn.onclick = function () {
        if (!o.items) return;
        var idx = +btn.getAttribute('data-cancel-item');
        var it = o.items[idx];
        if (!it || it.canceled) return;
        var ship = util.num(it.shippedQty), un = util.num(it.unshippedQty);
        if (un <= 0) { ui.toast('该明细已全部发货，无可取消的未发数量', 'err'); return; }
        var verb = ship > 0
          ? ('已发 ' + ship + (it.unit ? ' ' + it.unit : '') + ' 保留，未发 ' + un + (it.unit ? ' ' + it.unit : '') + ' 取消')
          : ('未发 ' + un + (it.unit ? ' ' + it.unit : '') + ' 整笔取消（保留记录并置灰）');
        ui.confirm('确定取消这笔明细的未发部分？\n' + verb + '\n取消后订单数量/金额/出货将重新计算。').then(function (ok) {
          if (!ok) return;
          if (ship > 0) {
            // 已发部分保留，仅把未发部分从订单中扣除（数量/金额按已发部分重算）
            it._origQty = it.qty; it._origTotal = it.total;
            var ratio = it.qty > 0 ? ship / it.qty : 0;
            it.qty = ship;
            it.total = +(util.num(it.total) * ratio).toFixed(2);
            it.shippedQty = ship; it.unshippedQty = 0;
          } else {
            // 全部未发：标记作废（保留文字、置灰显示，不计入订单汇总）
            it.canceled = true;
            it.shippedQty = 0; it.unshippedQty = 0;
          }
          var act = o.items.filter(function (x) { return !x.canceled; });
          if (act.length) {
            var fa = act[0];
            o.product = fa.product + (act.length > 1 ? ' 等' + act.length + '项' : '');
            o.spec = fa.spec || ''; o.itemNo = fa.itemNo || ''; o.model = fa.model || ''; o.unit = fa.unit || '';
          } else {
            o.product = '（整单已取消）'; o.spec = ''; o.itemNo = ''; o.model = ''; o.unit = '';
          }
          o.shippedQty = +act.reduce(function (a, x) { return a + util.num(x.shippedQty); }, 0).toFixed(0);
          o.unshippedQty = +act.reduce(function (a, x) { return a + util.num(x.unshippedQty); }, 0).toFixed(0);
          orderRecompute(o);
          store.update('orders', o.id, o);
          store.log('取消明细', 'orders', o);
          ui.toast('已取消该明细的未发部分，订单已重新计算', 'ok');
          renderOrders();
          m.close();
          orderDetail(o.id);
        });
      };
    });
    // 恢复已取消明细：撤销取消，数量/金额/出货重新计入订单
    m.modal.querySelectorAll('[data-restore-item]').forEach(function (btn) {
      btn.onclick = function () {
        if (!o.items) return;
        var idx = +btn.getAttribute('data-restore-item');
        var it = o.items[idx];
        if (!it || !it.canceled) return;
        ui.confirm('确定恢复这笔已取消的明细？\n恢复后数量/金额/出货将重新计入订单。').then(function (ok) {
          if (!ok) return;
          it.canceled = false;
          if (it._origQty != null) { it.qty = it._origQty; it.total = it._origTotal; delete it._origQty; delete it._origTotal; }
          var ship = util.num(it.shippedQty);
          it.unshippedQty = Math.max(0, util.num(it.qty) - ship);
          var act = o.items.filter(function (x) { return !x.canceled; });
          var fa = act[0];
          o.product = fa.product + (act.length > 1 ? ' 等' + act.length + '项' : '');
          o.spec = fa.spec || ''; o.itemNo = fa.itemNo || ''; o.model = fa.model || ''; o.unit = fa.unit || '';
          o.shippedQty = +act.reduce(function (a, x) { return a + util.num(x.shippedQty); }, 0).toFixed(0);
          o.unshippedQty = +act.reduce(function (a, x) { return a + util.num(x.unshippedQty); }, 0).toFixed(0);
          orderRecompute(o);
          store.update('orders', o.id, o);
          store.log('恢复明细', 'orders', o);
          ui.toast('已恢复该明细，订单已重新计算', 'ok');
          renderOrders();
          m.close();
          orderDetail(o.id);
        });
      };
    });
  }

  function shipInfo(o) {
    var s = util.num(o.shippedQty), u = util.num(o.unshippedQty);
    if (!s && !u) return '<span style="color:#9aa6b5">—</span>';
    return '已出 ' + s + ' / 未出 ' + u;
  }

  function renderOrders() {
    var view = document.getElementById('view');
    if (window._preset) { Object.assign(orderFilters, window._preset); window._preset = null; }
    var customers = customerNames();
    var orders = store.list('orders');
    var salesmen = []; orders.forEach(function (o) { if (o.salesman && salesmen.indexOf(o.salesman) < 0) salesmen.push(o.salesman); });
    // 筛选
    var flt = orderFilters;
    var filtered = orders.filter(function (o) {
      if (flt.kw && (o.no + o.customer + o.product + o.phone).toLowerCase().indexOf(flt.kw.toLowerCase()) < 0) return false;
      if (flt.status && o.status !== flt.status) return false;
      if (flt.customer && o.customer !== flt.customer) return false;
      if (flt.salesman && (o.salesman || '') !== flt.salesman) return false;
      if (flt.paid === 'paid' && o.unpaid > 0) return false;
      if (flt.paid === 'unpaid' && o.unpaid <= 0) return false;
      if (flt.due) {
        var d = util.daysBetween(o.deliverDate, util.today());
        if (d === null || o.status === '已完成' || o.status === '已取消') return false; // 无交期或已完结不计入
        if (flt.due === 'overdue' && d >= 0) return false;   // 已逾期：交期已过
        if (flt.due === 'soon' && (d < 0 || d > 3)) return false; // 临期≤3天
      }
      if (flt.deliverFrom || flt.deliverTo) {           // 交期区间筛选
        if (!o.deliverDate) return false;
        if (flt.deliverFrom && o.deliverDate < flt.deliverFrom) return false;
        if (flt.deliverTo && o.deliverDate > flt.deliverTo) return false;
      }
      return true;
    });
    var rows = filtered.map(function (o) {
      var warn = '';
      var its = orderItems(o);
      var d = util.daysBetween(o.deliverDate, util.today());
      if (o.status !== '已完成' && o.status !== '已取消' && d !== null && d < 0) warn = 'row-danger';
      else if (o.status !== '已完成' && o.status !== '已取消' && d !== null && d <= 3) warn = 'row-warn';
      return '<tr class="' + warn + '" data-id="' + o.id + '">' +
        '<td><input type="checkbox" class="chk" data-id="' + o.id + '"></td>' +
        '<td class="nowrap">' + esc(o.no) + '</td>' +
        '<td class="nowrap">' + esc(util.fmtDateView(o.date)) + '</td>' +
        '<td>' + esc(o.customer) + '</td>' +
        '<td>' + esc(o.salesman || '—') + '</td>' +
        '<td>' + esc(o.product) + (o.itemNo ? ' <span style="color:#7a8699">[' + esc(o.itemNo) + ']</span>' : '') + (o.model ? ' ' + esc(o.model) : '') + (o.unit ? ' <span style="color:#7a8699">' + esc(o.unit) + '</span>' : '') + (its.length > 1 ? ' <span class="tag">' + its.length + '项</span>' : '') + '</td>' +
        '<td class="nowrap">' + o.qty + (o.unit ? ' ' + esc(o.unit) : '') + '</td>' +
        '<td class="nowrap">' + util.money(o.total) + '</td>' +
        '<td>' + badge(o.status) + '</td>' +
        '<td class="nowrap">' + esc(util.fmtDateView(o.deliverDate)) + '</td>' +
        '<td class="nowrap">' + (o.unpaid > 0 ? '<span style="color:#e11d48">' + util.money(o.unpaid) + '</span>' : '<span style="color:#16a34a">已结清</span>') + '</td>' +
        '<td class="nowrap">' + shipInfo(o) + '</td>' +
        '<td class="nowrap">' +
        '<button class="btn sm" data-act="detail">详情</button> ' +
        '<button class="btn sm" data-act="edit">编辑</button> ' +
        '<button class="btn sm primary" data-act="advance">推进</button> ' +
        '<button class="btn sm" data-act="copy">复制</button> ' +
        '<button class="btn sm danger" data-act="del">删</button></td></tr>';
    });
    var html =
      '<div class="toolbar">' +
      '<button class="btn primary" data-act="add">＋ 新增订单</button>' +
      '<button class="btn" data-act="import">Excel批量录单</button>' +
      '<input class="input" style="width:200px" placeholder="搜索编号/客户/产品/手机" data-kw value="' + esc(flt.kw) + '">' +
      '<select class="input" data-fstatus><option value="">全部状态</option>' + ORDER_STATUS.map(function (s) { return '<option ' + (flt.status === s ? 'selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
      '<select class="input" data-fcust><option value="">全部客户</option>' + customers.map(function (c) { return '<option ' + (flt.customer === c ? 'selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<select class="input" data-fsalesman><option value="">全部业务</option>' + salesmen.map(function (s) { return '<option ' + (flt.salesman === s ? 'selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select>' +
      '<select class="input" data-fpaid><option value="">回款状态</option><option value="unpaid" ' + (flt.paid === 'unpaid' ? 'selected' : '') + '>未回款</option><option value="paid" ' + (flt.paid === 'paid' ? 'selected' : '') + '>已回款</option></select>' +
      '<select class="input" data-fdue><option value="">交期状态</option><option value="overdue" ' + (flt.due === 'overdue' ? 'selected' : '') + '>已逾期</option><option value="soon" ' + (flt.due === 'soon' ? 'selected' : '') + '>临期≤3天</option></select>' +
      '<span style="white-space:nowrap">交期 <input type="date" class="input" data-dfrom value="' + esc(flt.deliverFrom) + '" style="width:138px"> ~ <input type="date" class="input" data-dto value="' + esc(flt.deliverTo) + '" style="width:138px"></span>' +
      '<div class="spacer"></div>' +
      '<button class="btn" data-act="export">导出CSV</button>' +
      '<button class="btn" data-act="print">打印</button>' +
      '</div>' +
      '<div id="batchBar" class="toolbar hidden"><span style="color:#2f6fed;font-weight:600">已选 <b id="selCnt">0</b> 单</span>' +
      '<select class="input" id="batchStatus"><option value="">批量改状态…</option>' + ORDER_STATUS.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select>' +
      '<button class="btn sm" data-act="batch-status">应用</button>' +
      '<button class="btn sm" data-act="batch-export">导出选中</button>' +
      '<button class="btn sm" data-act="batch-remark">批量备注</button>' +
      '<button class="btn sm" data-act="batch-remind">批量提醒</button>' +
      '<button class="btn sm danger" data-act="batch-delete">批量删除</button></div>' +
      tableView(['', '订单编号', '下单日期', '客户', '业务', '产品', '数量', '金额', '状态', '交货期', '未收款', '出货', '操作'], rows);

    view.innerHTML = html;

    // 事件
    view.querySelector('[data-act="add"]').onclick = function () { openOrderForm(); };
    view.querySelector('[data-act="import"]').onclick = importOrdersModal;
    view.querySelector('[data-act="export"]').onclick = function () { exportOrders(filtered); };
    view.querySelector('[data-act="print"]').onclick = function () { printOrders(filtered); };
    var kw = view.querySelector('[data-kw]');
    kw.oninput = function () { flt.kw = kw.value; renderOrders(); var ni = view.querySelector('[data-kw]'); if (ni) { ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); } };
    view.querySelector('[data-fstatus]').onchange = function (e) { flt.status = e.target.value; renderOrders(); };
    view.querySelector('[data-fcust]').onchange = function (e) { flt.customer = e.target.value; renderOrders(); };
    view.querySelector('[data-fsalesman]').onchange = function (e) { flt.salesman = e.target.value; renderOrders(); };
    view.querySelector('[data-fpaid]').onchange = function (e) { flt.paid = e.target.value; renderOrders(); };
    view.querySelector('[data-fdue]').onchange = function (e) { flt.due = e.target.value; renderOrders(); };
    view.querySelector('[data-dfrom]').onchange = function (e) { flt.deliverFrom = e.target.value; renderOrders(); };
    view.querySelector('[data-dto]').onchange = function (e) { flt.deliverTo = e.target.value; renderOrders(); };

    // 批量
    var chks = [].slice.call(view.querySelectorAll('.chk'));
    function refreshSel() {
      var sel = chks.filter(function (c) { return c.checked; });
      document.getElementById('batchBar').classList.toggle('hidden', sel.length === 0);
      document.getElementById('selCnt').textContent = sel.length;
      var ca = document.getElementById('chkAll');
      if (ca) { ca.checked = sel.length > 0 && sel.length === chks.length; ca.indeterminate = sel.length > 0 && sel.length < chks.length; }
    }
    chks.forEach(function (c) { c.onchange = refreshSel; });
    // 表头全选
    var headChk = view.querySelector('.tbl thead th');
    if (headChk) { headChk.innerHTML = '<input type="checkbox" id="chkAll" title="全选/取消">'; }
    var chkAll = view.querySelector('#chkAll');
    if (chkAll) chkAll.onchange = function () { chks.forEach(function (c) { c.checked = chkAll.checked; }); refreshSel(); };
    var batchStatus = view.querySelector('#batchStatus');
    view.querySelector('[data-act="batch-status"]').onclick = function () {
      if (!batchStatus.value) return ui.toast('请选择目标状态', 'warn');
      var sel = chks.filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.id; });
      sel.forEach(function (id) { store.update('orders', id, { status: batchStatus.value }); });
      ui.toast('已更新 ' + sel.length + ' 单状态', 'ok'); renderOrders();
    };
    view.querySelector('[data-act="batch-delete"]').onclick = function () {
      var sel = chks.filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.id; });
      if (!sel.length) return ui.toast('请先勾选要删除的订单', 'warn');
      ui.confirm('确定删除选中的 ' + sel.length + ' 张订单？关联的生产/发货/对账记录也会一并删除。').then(function (ok) {
        if (!ok) return;
        sel.forEach(function (id) { deleteOrder(id); });
        ui.toast('已删除 ' + sel.length + ' 张订单', 'ok'); renderOrders();
      });
    };
    view.querySelector('[data-act="batch-export"]').onclick = function () {
      var sel = chks.filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.id; });
      exportOrders(orders.filter(function (o) { return sel.indexOf(o.id) >= 0; }));
    };
    view.querySelector('[data-act="batch-remark"]').onclick = async function () {
      var sel = chks.filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.id; });
      var txt = prompt('批量备注内容（将追加到选中订单备注）：'); if (!txt) return;
      sel.forEach(function (id) { var o = store.get('orders', id); store.update('orders', id, { remark: (o.remark ? o.remark + '；' : '') + txt }); });
      ui.toast('已为 ' + sel.length + ' 单添加备注', 'ok'); renderOrders();
    };
    view.querySelector('[data-act="batch-remind"]').onclick = function () {
      ui.toast('已向相关客户/工厂发送提醒（演示）', 'ok');
    };

    // 行操作
    view.querySelector('.table-wrap').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]'); if (!btn) return;
      var tr = btn.closest('tr'); var id = tr.dataset.id;
      var act = btn.dataset.act;
      if (act === 'detail') orderDetail(id);
      else if (act === 'edit') openOrderForm(id);
      else if (act === 'advance') orderAdvance(id);
      else if (act === 'copy') orderCopy(id);
      else if (act === 'del') { ui.confirm('确定删除该订单？关联的生产/发货/对账记录也会一并删除。').then(function (ok) { if (ok) { deleteOrder(id); ui.toast('已删除'); renderOrders(); } }); }
    });
  }

  var ORDER_COLS = ['订单编号', '订单日期', '客户', '业务员', '品号', '品名', '规格', '型号', '单位', '数量', '含税单价', '含税总价', '计划交货日', '实际交货日', '已出货数量', '未出货数量', '状态', '联系人', '电话', '地址', '材质', '颜色', '已收款', '未收款', '付款方式', '备注'];
  function orderRowObj(o, it) {
    it = it || orderItems(o)[0];
    return {
      '订单编号': o.no, '订单日期': o.date, '客户': o.customer, '业务员': o.salesman,
      '品号': it.itemNo, '品名': it.product, '规格': it.spec, '型号': it.model, '单位': it.unit,
      '数量': it.qty, '含税单价': it.price, '含税总价': it.total,
      '计划交货日': o.deliverDate, '实际交货日': it.actualDeliverDate,
      '已出货数量': it.shippedQty, '未出货数量': it.unshippedQty, '状态': o.status,
      '联系人': o.contact, '电话': o.phone, '地址': o.address, '材质': o.material, '颜色': o.color,
      '已收款': o.received, '未收款': o.unpaid, '付款方式': o.payMethod, '备注': it.remark || o.remark
    };
  }
  function exportOrders(list) {
    // 按明细展开（一行一项），与导入模板一致，可往返
    var rows = [];
    list.forEach(function (o) { orderItems(o).filter(function (it) { return !it.canceled; }).forEach(function (it) { rows.push(orderRowObj(o, it)); }); });
    util.exportCSV('订单导出_' + util.today(), ORDER_COLS, rows);
    ui.toast('已导出 ' + rows.length + ' 行（' + list.length + ' 张订单）', 'ok');
  }
  function printOrders(list) {
    var head = ORDER_COLS.map(function (c) { return '<th>' + c + '</th>'; }).join('');
    var body = [];
    list.forEach(function (o) { orderItems(o).filter(function (it) { return !it.canceled; }).forEach(function (it) { var r = orderRowObj(o, it); body.push('<tr>' + ORDER_COLS.map(function (c) { return '<td>' + esc(r[c]) + '</td>'; }).join('') + '</tr>'); }); });
    util.printHTML('订单列表', '<h2>订单列表（' + util.today() + '）</h2><div class="mb">' + list.length + ' 张订单 / ' + body.length + ' 行</div><table><tr>' + head + '</tr>' + body.join('') + '</table>');
  }

  /* ============================ Excel/CSV 批量录单 ============================ */
  // 新版导入模板（与「订单导入模板.xlsx」一致，共 18 列）
  var IMPORT_HEADERS = ['订单编号', '业务', '下单日期', '客户', '品号', '品名', '规格', '型号', '单位', '订单数量', '含税单价(元)', '含税总价(元)', '计划交货日', '实际交货日', '已出货数量', '未出货数量', '订单状态', '备注'];
  // 列名别名：兼容旧模板 / 用户微调过的表头
  var HEADER_ALIAS = {
    '订单编号': ['订单编号', '订单号', '单号'],
    '业务': ['业务', '业务员', '销售业务员', '跟单'],
    '下单日期': ['下单日期', '订单日期', '日期'],
    '客户': ['客户', '客户名称', '购方'],
    '品号': ['品号', '货号', '物料编码', '产品编码'],
    '品名': ['品名', '产品名称', '品项', '名称'],
    '规格': ['规格', '规格型号'],
    '型号': ['型号', '机型'],
    '单位': ['单位', '计量单位'],
    '订单数量': ['订单数量', '数量', '下单数量'],
    '含税单价(元)': ['含税单价(元)', '含税单价', '单价'],
    '含税总价(元)': ['含税总价(元)', '含税总价', '总价', '金额'],
    '计划交货日': ['计划交货日', '要求交货期', '交货期', '交期'],
    '实际交货日': ['实际交货日', '实际交期'],
    '已出货数量': ['已出货数量', '已发货数量', '出货数量'],
    '未出货数量': ['未出货数量', '未发货数量'],
    '订单状态': ['订单状态', '状态'],
    '备注': ['备注', '说明', '备注说明']
  };

  function parseCSV(text) {
    text = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else {
        if (ch === '"') q = true;
        else if (ch === ',') { row.push(cur); cur = ''; }
        else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
        else cur += ch;
      }
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function downloadTemplate() {
    var sample = {
      '订单编号': '', '业务': '陈晓', '下单日期': util.today(), '客户': '示例客户（请替换）',
      '品号': 'P-001', '品名': '不锈钢螺丝', '规格': 'M6×20', '型号': 'A型', '单位': '个',
      '订单数量': 500, '含税单价(元)': 3.5, '含税总价(元)': 1750, '计划交货日': util.today(),
      '实际交货日': '', '已出货数量': 0, '未出货数量': 500, '订单状态': '新订单', '备注': '客户特殊要求'
    };
    util.exportXLSX('订单导入模板', IMPORT_HEADERS, [sample]);
  }

  // 把表头数组映射为 {标准列名: 列索引}
  function mapHeaders(headerCells) {
    var headers = headerCells.map(function (h) { return (h === null || h === undefined ? '' : String(h)).trim(); });
    var idx = {};
    Object.keys(HEADER_ALIAS).forEach(function (std) {
      var aliases = HEADER_ALIAS[std];
      for (var i = 0; i < headers.length; i++) {
        if (aliases.indexOf(headers[i]) >= 0) { idx[std] = i; break; }
      }
    });
    return idx;
  }

  // 读取 xlsx/xls 文件，返回 { headers:[...], rows:[[...],...] }
  function readSheetFile(buf) {
    var wb = XLSX.read(buf, { type: 'array', cellDates: true });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var range = XLSX.utils.decode_range(ws['!ref']);
    var out = [];
    for (var r = range.s.r; r <= range.e.r; r++) {
      var row = [];
      for (var c = range.s.c; c <= range.e.c; c++) {
        var cell = ws[XLSX.utils.encode_cell({ r: r, c: c })];
        row.push(cell ? cell.v : '');
      }
      out.push(row);
    }
    return out;
  }

  function importOrdersModal(opts) {
    opts = opts || {};
    var fromPending = opts.fromPending;
    var title = fromPending ? '待转采购 · Excel / CSV 转采购' : 'Excel / CSV 批量录单';
    var body = '<div style="line-height:1.8">' +
      (fromPending ? '<p style="color:#0366d6;font-weight:500">当前为「转采购」模式：导入后，该待转采购会自动标记为「已转采购」，并把订单截图带到新订单。</p>' : '') +
      '<p>① 先下载模板，按列填写后上传 <b>Excel(.xlsx/.xls) 或 CSV（UTF-8）</b>（列名已适配「订单导入模板.xlsx」，可缺列，顺序不限）。</p>' +
      '<button class="btn sm" id="dlTpl">下载导入模板(.xlsx)</button> ' +
      '<p style="margin-top:12px">② 上传文件：</p>' +
      '<input type="file" id="csvFile" accept=".xlsx,.xls,.csv,text/csv" class="input" style="width:100%">' +
      '<div id="impPreview" style="margin-top:12px"></div></div>';
    var m = ui.open({ title: title, size: 'lg', body: body, footer: [
      { label: '取消', onClick: function (c) { c(); } },
      { label: '确认导入', cls: 'primary', onClick: function (c) { doImport(c); } }
    ] });
    var parsed = null;
    m.modal.querySelector('#dlTpl').onclick = downloadTemplate;
    m.modal.querySelector('#csvFile').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var raw;
          if (/\.(xlsx|xls)$/i.test(f.name)) raw = readSheetFile(rd.result);
          else raw = parseCSV(rd.result);
          parsed = buildParsed(raw);
          showPreview(parsed);
        } catch (err) { ui.toast('解析失败：' + err.message, 'err'); }
      };
      if (/\.(xlsx|xls)$/i.test(f.name)) rd.readAsArrayBuffer(f); else rd.readAsText(f, 'utf-8');
    });
    function showPreview(p) {
      var box = m.modal.querySelector('#impPreview');
      if (!p || !p.rows.length) { box.innerHTML = '<p style="color:#e11d48">未解析到有效数据行</p>'; return; }
      var head = p.headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('');
      var bodyRows = p.rows.slice(0, 10).map(function (r) {
        return '<tr>' + p.headers.map(function (h, idx) { return '<td>' + esc(r[idx] || '') + '</td>'; }).join('') + '</tr>';
      }).join('');
      box.innerHTML = '<p style="color:#16a34a;margin-bottom:6px">解析到 <b>' + p.rows.length + '</b> 条数据（预览前10条）：</p><div class="table-wrap"><table class="tbl"><tr>' + head + '</tr>' + bodyRows + '</table></div>';
    }
    function doImport(close) {
      if (!parsed || !parsed.rows.length) { ui.toast('请先上传有效文件', 'warn'); return; }
      var idx = mapHeaders(parsed.headers);
      if (idx['客户'] == null) { ui.toast('未找到“客户”列，请检查模板表头', 'err'); return; }
      // 按订单号分组：一个订单号 = 一张订单（含多行明细）；续行订单号为空时继承上一行
      // 续行通常只有品名/数量、客户列为空，故以「客户 或 品名/数量」判定为有效行，避免丢掉明细
      var groups = {}, lastNo = '';
      parsed.rows.forEach(function (r) {
        function g(std) { return idx[std] != null ? String(r[idx[std]] || '').trim() : ''; }
        var cust = g('客户');
        var hasLine = g('品名') || g('订单数量');
        if (!cust && !hasLine) return;
        var no = g('订单编号') || lastNo;
        if (!no) no = store.nextOrderNo();
        lastNo = no;
        (groups[no] || (groups[no] = [])).push(r);
      });
      var cnt = 0;
      var importedNos = [];
      Object.keys(groups).forEach(function (no) {
        importedNos.push(no);
        var rows = groups[no];
        var first = rows[0];
        function gf(std) { return idx[std] != null ? String(first[idx[std]] || '').trim() : ''; }
        var items = rows.map(function (r) {
          function g(std) { return idx[std] != null ? String(r[idx[std]] || '').trim() : ''; }
          var qty = util.num(g('订单数量'));
          var price = util.num(g('含税单价(元)'));
          var totalRaw = g('含税总价(元)');
          var total = totalRaw ? util.num(totalRaw) : +(qty * price).toFixed(2);
          var shipped = util.num(g('已出货数量'));
          return {
            itemNo: g('品号'), product: g('品名'), spec: g('规格'), model: g('型号'), unit: g('单位'),
            qty: qty, price: price, total: total,
            shippedQty: shipped, unshippedQty: Math.max(0, qty - shipped),
            actualDeliverDate: util.fmtDate(g('实际交货日')), remark: g('备注')
          };
        });
        var sumQty = items.reduce(function (a, it) { return a + it.qty; }, 0);
        var sumTotal = +items.reduce(function (a, it) { return a + it.total; }, 0).toFixed(2);
        var sumShipped = items.reduce(function (a, it) { return a + it.shippedQty; }, 0);
        var sumUnshipped = items.reduce(function (a, it) { return a + it.unshippedQty; }, 0);
        var f = items[0];
        var ord = {
          no: no,
          date: util.fmtDate(gf('下单日期')) || util.today(),
          customer: gf('客户'),
          contact: '', phone: '', address: '',
          salesman: gf('业务'),
          items: items,
          qty: sumQty, total: sumTotal,
          product: f.product + (items.length > 1 ? ' 等' + items.length + '项' : ''),
          spec: f.spec, itemNo: f.itemNo, model: f.model, unit: f.unit, material: '', color: '',
          status: gf('订单状态') || '新订单',
          deliverDate: util.fmtDate(gf('计划交货日')) || util.today(),
          remark: gf('备注'),
          actualDeliverDate: util.fmtDate(gf('实际交货日')),
          shippedQty: sumShipped, unshippedQty: sumUnshipped,
          prepay: 0, rest: sumTotal, received: 0, unpaid: sumTotal, payMethod: '银行转账', attachments: []
        };
        // 已出货=总数且状态在「已发货」之前则自动置已发货（与手动表单同一逻辑）
        autoShipStatus(ord);
        // 飞书导入按订单号去重：已存在同单号则合并更新，避免重复追加
        var exist = store.list('orders').find(function (o) { return (o.no || '') === no; });
        if (exist) {
          var merged = Object.assign({}, exist, ord);
          merged.id = exist.id;
          store.update('orders', exist.id, merged);
        } else {
          store.add('orders', ord);
        }
        cnt++;
      });
      if (!cnt) { ui.toast('没有可导入的行（请检查“客户”列）', 'err'); return; }
      if (fromPending) {
        var pending = store.get('pendings', fromPending);
        if (pending) {
          store.update('pendings', fromPending, { status: '已转采购', toOrderNo: importedNos[0] || '' });
          // 把待转的订单截图/附件同步到第一张新订单
          if (pending.attachments && pending.attachments.length && importedNos.length) {
            var ord = store.list('orders').find(function (o) { return o.no === importedNos[0]; });
            if (ord) {
              util.persistFiles(pending.attachments).then(function (atts) {
                store.update('orders', ord.id, { attachments: (ord.attachments || []).concat(atts) });
              });
            }
          }
          ui.toast('成功导入 ' + cnt + ' 张订单，待转 ' + pending.no + ' 已标记「已转采购」', 'ok');
        } else {
          ui.toast('成功导入 ' + cnt + ' 张订单（多行明细已按订单号合并）', 'ok');
        }
        close(); renderPending();
      } else {
        ui.toast('成功导入 ' + cnt + ' 张订单（多行明细已按订单号合并）', 'ok');
        close(); renderOrders();
      }
    }
  }
  function buildParsed(rows) {
    if (!rows || rows.length < 2) return { headers: [], rows: [] };
    var headers = rows[0].map(function (h) { return (h === null || h === undefined ? '' : String(h)).trim(); });
    var dataRows = rows.slice(1).filter(function (r) { return r.some(function (c) { return c !== null && c !== undefined && String(c).trim(); }); });
    return { headers: headers, rows: dataRows };
  }

  /* ============================ 生产跟进 ============================ */
  function renderProduction() {
    var view = document.getElementById('view');
    var list = store.list('productions');
    var orders = store.list('orders');
    function orderOf(id) { return orders.find(function (o) { return o.id === id; }); }
    var rows = list.map(function (p) {
      var o = orderOf(p.orderId);
      var d = util.daysBetween(p.deliverDate, util.today());
      var cls = (p.node !== '生产完成' && d !== null && d < 0) ? 'row-danger' : (p.node !== '生产完成' && d !== null && d <= 3 ? 'row-warn' : '');
      var delay = (p.node !== '生产完成' && d !== null) ? (d < 0 ? '<span style="color:#e11d48">逾期' + (-d) + '天</span>' : (d <= 3 ? '<span style="color:#f59e0b">剩' + d + '天</span>' : '剩' + d + '天')) : (p.node === '生产完成' ? '已完成' : '');
      return '<tr class="' + cls + '">' +
        '<td class="nowrap">' + esc(p.no) + '</td>' +
        '<td>' + esc(p.customer) + '</td>' +
        '<td>' + esc(p.product) + '</td>' +
        '<td class="nowrap">' + p.qty + '</td>' +
        '<td class="nowrap">' + esc(util.fmtDateView(p.deliverDate)) + '</td>' +
        '<td><select class="input sm" data-node="' + p.id + '">' + PROD_NODES.map(function (n) { return '<option ' + (n === p.node ? 'selected' : '') + '>' + n + '</option>'; }).join('') + '</select></td>' +
        '<td style="min-width:140px">' + pbar(p.percent) + '</td>' +
        '<td>' + (p.abnormal ? '<span style="color:#e11d48">' + esc(p.abnormal) + '</span>' : '正常') + '</td>' +
        '<td>' + delay + '</td>' +
        '<td class="nowrap"><button class="btn sm" data-act="update" data-id="' + p.id + '">更新进度</button> <button class="btn sm" data-act="log" data-id="' + p.id + '">跟进日志</button></td></tr>';
    });
    var html =
      '<div class="toolbar"><span style="color:#7a8699">关联订单自动绑定；距离交货期≤3天标黄，逾期标红。</span>' +
      '<div class="spacer"></div><button class="btn" data-act="export">导出CSV</button></div>' +
      tableView(['订单号', '客户', '产品', '数量', '交货期', '生产节点', '进度', '异常', '预警', '操作'], rows);
    view.innerHTML = html;
    view.querySelector('[data-act="export"]').onclick = function () {
      util.exportCSV('生产跟进_' + util.today(), ['订单号', '客户', '产品', '数量', '交货期', '节点', '进度%', '异常'],
        list.map(function (p) { return { '订单号': p.no, '客户': p.customer, '产品': p.product, '数量': p.qty, '交货期': p.deliverDate, '节点': p.node, '进度%': p.percent, '异常': p.abnormal }; }));
    };
    view.querySelectorAll('[data-node]').forEach(function (s) {
      s.onchange = function () {
        var patch = { node: s.value };
        if (s.value === '生产完成') patch.percent = 100;  // 仅完成时强制100，其余保留原进度，避免误清空（#2）
        store.update('productions', s.dataset.node, patch);
        ui.toast('节点已更新', 'ok'); renderProduction();
      };
    });
    view.querySelector('.table-wrap').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]'); if (!btn || btn.dataset.act === 'export') return;
      var id = btn.dataset.id;
      if (btn.dataset.act === 'update') prodUpdate(id);
      else if (btn.dataset.act === 'log') prodLog(id);
    });
  }

  function prodUpdate(id) {
    var p = store.get('productions', id); if (!p) return;
    ui.form({
      title: '更新生产进度 · ' + p.no, size: 'lg',
      fields: [
        { name: 'node', label: '生产节点', type: 'select', options: PROD_NODES },
        { name: 'percent', label: '进度百分比', type: 'number' },
        { name: 'abnormal', label: '生产异常（缺料/延期/返工）', type: 'textarea', full: true },
        { name: 'logText', label: '本次跟进记录（可选）', type: 'textarea', full: true }
      ],
      values: { node: p.node, percent: p.percent, abnormal: p.abnormal },
      onSubmit: function (out) {
        var patch = { node: out.node, percent: util.num(out.percent) };
        if (out.abnormal) patch.abnormal = out.abnormal;
        if (out.node === '生产完成' && !patch.percent) patch.percent = 100;
        var logs = (p.logs || []).slice();
        if (out.logText) logs.unshift({ time: Date.now(), text: out.logText });
        patch.logs = logs;
        store.update('productions', id, patch);
        // 同步订单状态
        if (out.node === '生产完成') { var o = store.get('orders', p.orderId); if (o && o.status === '生产中') store.update('orders', p.orderId, { status: '待验货', actualFinish: util.today() }); }
        ui.toast('进度已更新', 'ok'); renderProduction();
      }
    });
  }
  function prodLog(id) {
    var p = store.get('productions', id); if (!p) return;
    var logs = (p.logs || []).map(function (l) { return '<div class="timeline"><div class="ev"><small>' + util.fmtDateTime(l.time) + '</small><div>' + esc(l.text) + '</div></div></div>'; }).join('') || '<p style="color:#7a8699">暂无记录</p>';
    ui.open({
      title: '跟进日志 · ' + p.no, size: 'lg', body: logs +
        '<div style="margin-top:14px"><textarea id="newLog" class="input" style="height:70px;width:100%" placeholder="输入本次对接工厂/沟通进度记录…"></textarea></div>',
      footer: [
        { label: '取消', onClick: function (c) { c(); } },
        { label: '保存记录', cls: 'primary', onClick: function (c) {
          var t = document.getElementById('newLog').value; if (!t) { c(); return; }
          var ls = (p.logs || []).slice(); ls.unshift({ time: Date.now(), text: t });
          store.update('productions', id, { logs: ls }); c(); ui.toast('已记录', 'ok'); renderProduction();
        } }
      ]
    });
  }

  /* ============================ 发货物流 ============================ */
  function shipRemain(orderId) {
    var o = store.get('orders', orderId); if (!o) return 0;
    var sent = util.sum(store.list('shipments').filter(function (s) { return s.orderId === orderId; }), 'shipQty');
    return Math.max(0, o.qty - sent);
  }
  function shipItemNo(s) {
    if (!s.items || !s.items.length) return '-';
    var nos = s.items.map(function (it) { return it.shipNo; }).filter(Boolean);
    if (!nos.length) return '-';
    var uniq = nos.filter(function (v, i, a) { return a.indexOf(v) === i; });
    return uniq.join('、') || '-';
  }
  function renderShipment() {
    var view = document.getElementById('view');
    var list = store.list('shipments');
    var orders = store.list('orders');
    var rows = list.map(function (s) {
      return '<tr>' +
        '<td class="nowrap">' + esc(s.no) + '</td>' +
        '<td>' + esc(s.customer) + '</td>' +
        '<td>' + esc(s.product) + '</td>' +
        '<td>' + esc(shipItemNo(s)) + '</td>' +
        '<td class="nowrap">' + s.shipQty + ' / 余' + s.remainQty + '</td>' +
        '<td class="nowrap">' + esc(util.fmtDateView(s.shipDate)) + '</td>' +
        '<td>' + esc(s.warehouse) + '</td>' +
        '<td>' + esc(s.method) + '</td>' +
        '<td>' + esc(s.company) + '</td>' +
        '<td class="nowrap">' + esc(s.tracking) + '</td>' +
        '<td>' + badge(s.status) + '</td>' +
        '<td>' + (s.abnormal ? '<span style="color:#e11d48">' + esc(s.abnormal) + '</span>' : '-') + '</td>' +
        '<td class="nowrap"><button class="btn sm" data-act="advance" data-id="' + s.id + '">推进</button> <button class="btn sm" data-act="sign" data-id="' + s.id + '">签收</button> <button class="btn sm danger" data-act="del" data-id="' + s.id + '">删</button></td></tr>';
    });
    view.innerHTML =
      '<div class="toolbar"><button class="btn primary" data-act="add">＋ 新增发货（支持分批发货）</button>' +
      '<div class="spacer"></div><button class="btn" data-act="export">导出CSV</button></div>' +
      tableView(['订单号', '客户', '产品', '发货单号', '发货/余', '发货日', '仓库', '方式', '物流公司', '物流单号', '状态', '异常', '操作'], rows);
    view.querySelector('[data-act="add"]').onclick = shipForm;
    view.querySelector('[data-act="export"]').onclick = function () {
      util.exportCSV('发货物流_' + util.today(), ['订单号', '客户', '产品', '发货单号', '发货量', '剩余', '发货日', '方式', '物流公司', '单号', '状态'],
        list.map(function (s) { return { '订单号': s.no, '客户': s.customer, '产品': s.product, '发货单号': shipItemNo(s), '发货量': s.shipQty, '剩余': s.remainQty, '发货日': s.shipDate, '方式': s.method, '物流公司': s.company, '单号': s.tracking, '状态': s.status }; }));
    };
    view.querySelector('.table-wrap').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]'); if (!btn) return;
      var id = btn.dataset.id, s = store.get('shipments', id);
      if (btn.dataset.act === 'advance') {
        var nx = SHIP_NEXT[s.status];
        if (!nx) return ui.toast('已是最终状态', 'warn');
        store.update('shipments', id, { status: nx });
        if (nx === '已签收') store.update('shipments', id, { signTime: util.today(), signer: s.customer });
        ui.toast('物流状态：' + s.status + ' → ' + nx, 'ok'); renderShipment();
      } else if (btn.dataset.act === 'sign') { shipSign(id); }
      else if (btn.dataset.act === 'del') { ui.confirm('删除该发货记录？').then(function (ok) { if (ok) { store.remove('shipments', id); ui.toast('已删除'); renderShipment(); } }); }
    });
  }
  function shipForm() {
    // 列出仍可继续发货的订单：生产中/待验货/待发货/已发货 且 未发余量 > 0（已发完的不再占下拉）
    var orders = store.list('orders').filter(function (o) { return ['生产中', '待验货', '待发货', '已发货'].indexOf(o.status) >= 0 && shipRemain(o.id) > 0; });
    if (!orders.length) { ui.alert('没有可发货的订单（需处于生产中/待验货/待发货/已发货状态，且还有未发余量）'); return; }
    var noToId = {}; orders.forEach(function (o) { noToId[o.no] = o.id; });
    var shipModalEl;
    ui.form({
      title: '新增发货（按明细发货）', size: 'lg',
      fields: [
        { name: 'no', label: '关联订单号', type: 'select', options: orders.map(function (o) { return o.no + '【' + o.status + '】余' + shipRemain(o.id); }), required: true },
        { name: 'itemsHtml', label: '按明细填写本次发货数量', type: 'html', full: true, html: '<div id="ship-items-wrap"><p style="color:#9aa6b5">请先选择关联订单号</p></div>' },
        { name: 'shipQty', label: '本次发货总量', type: 'number', readonly: true },
        { name: 'shipDate', label: '发货日期', type: 'date' },
        { name: 'warehouse', label: '发货仓库', list: ['主仓', '外仓', '工厂直发'] },
        { name: 'method', label: '发货方式', type: 'select', options: ['整车', '零担', '快递'] },
        { name: 'company', label: '物流公司', list: ['顺丰速运', '德邦物流', '中通快递', '京东物流'] },
        { name: 'tracking', label: '物流单号' },
        { name: 'attachments', label: '送货单/物流底单', type: 'files', full: true }
      ],
      values: { shipDate: util.today(), method: '整车', warehouse: '主仓' },
      onMount: function (modalEl) {
        shipModalEl = modalEl;
        var noSel = modalEl.querySelector('[data-f="no"]');
        var totalEl = modalEl.querySelector('[data-f="shipQty"]');
        var wrap = modalEl.querySelector('#ship-items-wrap');
        function updateTotal() {
          var total = 0;
          modalEl.querySelectorAll('.ship-item-qty').forEach(function (inp) { total += util.num(inp.value); });
          totalEl.value = total;
        }
        function renderItems() {
          var no = (noSel.value.match(/^(.+?)【/) || ['', noSel.value])[1];
          var oid = noToId[no];
          var o = store.get('orders', oid);
          if (!o) { wrap.innerHTML = '<p style="color:#9aa6b5">请先选择关联订单号</p>'; return; }
          var its = orderItems(o);
          // 以实际发货记录（含明细）作为未出量的权威来源，避免订单里存储的 shippedQty 与真实发货不一致导致全选无效
          var ships = store.list('shipments').filter(function (s) { return s.orderId === o.id; });
          var itemShipped = {};
          var hasItemShipments = false;
          ships.forEach(function (s) {
            if (s.items && s.items.length) {
              hasItemShipments = true;
              s.items.forEach(function (it) { itemShipped[it.idx] = (itemShipped[it.idx] || 0) + util.num(it.shipQty); });
            }
          });
          var sumUn = 0;
          var rowsHtml = its.map(function (it, idx) {
            var shipped = hasItemShipments ? util.num(itemShipped[idx]) : util.num(it.shippedQty);
            var un = Math.max(0, util.num(it.qty) - shipped);
            sumUn += un;
            return '<tr><td>' + esc(it.itemNo || '') + '</td><td>' + esc(it.product || '') + '</td><td>' + esc(it.spec || '') + '</td><td>' + esc(it.model || '') + '</td><td>' + esc(it.unit || '') + '</td>' +
              '<td class="nowrap">' + util.num(it.qty) + (it.unit ? ' ' + esc(it.unit) : '') + '</td>' +
              '<td class="nowrap">' + un + (it.unit ? ' ' + esc(it.unit) : '') + '</td>' +
              '<td><input type="number" class="ship-item-qty" data-idx="' + idx + '" data-itemno="' + esc(it.itemNo || '') + '" data-product="' + esc(it.product || '') + '" data-qty="' + util.num(it.qty) + '" data-un="' + un + '" min="0" max="' + un + '" placeholder="0" value="" style="width:90px"/></td>' +
              '<td><input type="text" class="ship-item-no" data-idx="' + idx + '" placeholder="发货单号" style="width:120px"/></td></tr>';
          }).join('');
          var remain = shipRemain(oid);
          var warnCls = remain !== sumUn ? 'color:#e11d48' : 'color:#7a8699';
          wrap.innerHTML = '<div style="margin-bottom:8px;' + warnCls + '">订单剩余 <b>' + remain + '</b> ' + (o.unit || '') + '，当前明细未出合计 <b>' + sumUn + '</b> ' + (o.unit || '') + (remain !== sumUn ? '（明细与订单级剩余不一致，请检查历史发货数据）' : '') + '</div>' +
            '<div style="display:flex;gap:8px;margin-bottom:8px"><button type="button" class="btn sm primary" id="ship-select-all">全选（本次发货=未出）</button><button type="button" class="btn sm" id="ship-clear-all">清空</button></div>' +
            '<div class="table-wrap"><table class="tbl"><thead><tr><th>品号</th><th>品名</th><th>规格</th><th>型号</th><th>单位</th><th>数量</th><th>未出</th><th>本次发货</th><th>发货单号</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
          modalEl.querySelectorAll('.ship-item-qty').forEach(function (inp) { inp.addEventListener('input', updateTotal); });
          var selAllBtn = modalEl.querySelector('#ship-select-all');
          if (selAllBtn) selAllBtn.onclick = function () {
            var filled = 0;
            modalEl.querySelectorAll('.ship-item-qty').forEach(function (inp) { var v = inp.dataset.un || ''; if (v) { inp.value = v; filled += util.num(v); } });
            updateTotal();
            if (filled <= 0) ui.toast('当前明细未出量均为 0，无需发货', 'warn');
          };
          var clearAllBtn = modalEl.querySelector('#ship-clear-all');
          if (clearAllBtn) clearAllBtn.onclick = function () {
            modalEl.querySelectorAll('.ship-item-qty').forEach(function (inp) { inp.value = ''; });
            updateTotal();
          };
          updateTotal();
        }
        noSel.addEventListener('change', renderItems);
        renderItems();
      },
      onSubmit: function (out) {
        try {
          var no = (out.no.match(/^(.+?)【/) || ['', out.no])[1];
          var oid = noToId[no];
          var remain = shipRemain(oid);
          var totalShip = util.num(out.shipQty);
          if (totalShip <= 0) { ui.toast('请至少填写一项发货数量', 'err'); return false; }
          if (totalShip > remain) { ui.toast('发货总量超出订单剩余未发 ' + remain, 'err'); return false; }
          var o = store.get('orders', oid); if (!o) { ui.toast('订单不存在', 'err'); return false; }
          var itemShips = [];
          var overItems = [];
          shipModalEl.querySelectorAll('.ship-item-qty').forEach(function (inp) {
            var q = util.num(inp.value);
            if (q > 0) {
              var un = +inp.dataset.un;
              if (q > un) overItems.push(esc(inp.dataset.itemno || inp.dataset.product || '某项'));
              var shipNoInp = shipModalEl.querySelector('.ship-item-no[data-idx="' + inp.dataset.idx + '"]');
              var shipNo = shipNoInp ? shipNoInp.value.trim() : '';
              itemShips.push({ idx: +inp.dataset.idx, itemNo: inp.dataset.itemno, product: inp.dataset.product, qty: +inp.dataset.qty, shipQty: q, shipNo: shipNo });
            }
          });
          if (overItems.length) { ui.toast('以下项本次发货量超过未出量：' + overItems.join('、'), 'err'); return false; }
          var newRemain = remain - totalShip;
          return util.persistFiles(out.attachments).then(function (atts) {
            store.add('shipments', { orderId: oid, no: no, customer: o.customer, product: o.product, shipQty: totalShip, remainQty: newRemain, items: itemShips, shipDate: out.shipDate, warehouse: out.warehouse, method: out.method, tracking: out.tracking, company: out.company, status: '已发货', signTime: '', signer: '', abnormal: '', attachments: atts });
            refreshOrderAfterShip(oid);  // 回写订单出货数 + 联动状态（#3/#4）
            ui.toast('发货记录已保存', 'ok'); renderShipment();
          }).catch(function (e) { ui.toast('保存失败：' + (e && e.message ? e.message : String(e)), 'err'); });
        } catch (e) {
          ui.toast('保存异常：' + (e && e.message ? e.message : String(e)), 'err');
          console.error(e);
          return false;
        }
      }
    });
  }
  function shipSign(id) {
    var s = store.get('shipments', id); if (!s) return;
    ui.form({
      title: '客户签收 · ' + s.no, size: 'sm',
      fields: [
        { name: 'signTime', label: '签收时间', type: 'date' },
        { name: 'signer', label: '签收人' },
        { name: 'abnormal', label: '异常备注（破损/少货/延迟）', type: 'textarea', full: true }
      ],
      values: { signTime: util.today(), signer: s.customer },
      onSubmit: function (out) {
        store.update('shipments', id, { status: '已签收', signTime: out.signTime, signer: out.signer, abnormal: out.abnormal });
        refreshOrderAfterShip(s.orderId, out.signTime);  // 回写出货数 + 全部签收且发满则置已完成（#3/#4）
        ui.toast('已签收', 'ok'); renderShipment();
      }
    });
  }

  /* ============================ 无单出货 ============================ */
  // 出库单号：WX + 年月(YYYYMM) + 当月4位流水（按现有最大流水+1，避免删除中间单后重号）
  function nextNoShipNo() {
    var d = new Date();
    var ym = '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2);
    var prefix = 'WX' + ym;
    var max = 0;
    store.list('noships').forEach(function (o) {
      if ((o.no || '').indexOf(prefix) === 0) {
        var n = parseInt((o.no + '').slice(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return prefix + ('000' + (max + 1)).slice(-4);
  }
  // 退货单号：TH + 年月(YYYYMM) + 当月4位流水
  function nextReturnNo() {
    var d = new Date();
    var ym = '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2);
    var prefix = 'TH' + ym;
    var max = 0;
    store.list('returns').forEach(function (o) {
      if ((o.no || '').indexOf(prefix) === 0) {
        var n = parseInt((o.no + '').slice(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return prefix + ('000' + (max + 1)).slice(-4);
  }
  // 待转采购编号：PD + 年月(YYYYMM) + 当月4位流水
  function nextPendingNo() {
    var d = new Date();
    var ym = '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2);
    var prefix = 'PD' + ym;
    var max = 0;
    store.list('pendings').forEach(function (o) {
      if ((o.no || '').indexOf(prefix) === 0) {
        var n = parseInt((o.no + '').slice(prefix.length), 10);
        if (!isNaN(n) && n > max) max = n;
      }
    });
    return prefix + ('000' + (max + 1)).slice(-4);
  }
  // 无单出货的产品明细（自由录入，不关联订单）
  function noShipProductSummary(items) {
    var its = items && items.length ? items : [];
    if (!its.length) return '-';
    var names = its.map(function (it) { return it.product || '未命名'; }).filter(Boolean);
    var head = names.slice(0, 2).join('、');
    return head + (names.length > 2 ? ' 等' + names.length + '项' : '');
  }
  function renderNoShip() {
    var view = document.getElementById('view');
    var list = store.list('noships');
    var rows = list.map(function (s) {
      return '<tr>' +
        '<td class="nowrap">' + esc(s.no) + '</td>' +
        '<td>' + esc(s.customer) + '</td>' +
        '<td>' + (s.type ? '<span class="tag">' + esc(s.type) + '</span>' : '-') + '</td>' +
        '<td>' + (s.notifier ? esc(s.notifier) : '<span style="color:#9aa6b5">—</span>') + '</td>' +
        '<td>' + (s.reason ? esc(s.reason) : (s.type ? esc(s.type) : '<span style="color:#9aa6b5">—</span>')) + '</td>' +
        '<td>' + (s.orderNo ? '<a href="#/orders" style="color:#2f6fed">' + esc(s.orderNo) + '</a>' : '<span style="color:#9aa6b5">—</span>') + '</td>' +
        '<td>' + esc(noShipProductSummary(s.items)) + '</td>' +
        '<td class="nowrap">' + util.num(s.shipQty) + ' ' + esc(s.unit || '') + '</td>' +
        '<td class="nowrap">' + (s.total ? util.money(s.total) : '-') + '</td>' +
        '<td class="nowrap">' + esc(util.fmtDateView(s.shipDate)) + '</td>' +
        '<td>' + esc(s.warehouse) + '</td>' +
        '<td>' + esc(s.method) + '</td>' +
        '<td>' + esc(s.company) + '</td>' +
        '<td class="nowrap">' + esc(s.tracking) + '</td>' +
        '<td>' + badge(s.status) + '</td>' +
        '<td>' + (s.abnormal ? '<span style="color:#e11d48">' + esc(s.abnormal) + '</span>' : '-') + '</td>' +
        '<td class="nowrap"><button class="btn sm" data-act="advance" data-id="' + s.id + '">推进</button> <button class="btn sm" data-act="sign" data-id="' + s.id + '">签收</button> <button class="btn sm danger" data-act="del" data-id="' + s.id + '">删</button></td></tr>';
    });
    view.innerHTML =
      '<div class="toolbar"><button class="btn primary" data-act="add">＋ 新增无单出货</button>' +
      '<button class="btn" data-act="import">批量导入</button>' +
      '<button class="btn" data-act="tpl">下载模板</button>' +
      '<div class="spacer"></div><button class="btn" data-act="export">导出CSV</button></div>' +
      tableView(['出库单号', '收货客户', '类型', '通知出货人', '发货原因', '关联订单', '产品', '出货量', '金额', '出货日', '仓库', '方式', '物流公司', '物流单号', '状态', '异常', '操作'], rows);
    view.querySelector('[data-act="add"]').onclick = noShipForm;
    view.querySelector('[data-act="import"]').onclick = importNoShipModal;
    view.querySelector('[data-act="tpl"]').onclick = downloadNoShipTemplate;
    view.querySelector('[data-act="export"]').onclick = function () {
      util.exportCSV('无单出货_' + util.today(), ['出库单号', '收货客户', '类型', '通知出货人', '发货原因', '关联订单', '产品', '出货量', '金额', '出货日', '仓库', '方式', '物流公司', '单号', '状态'],
        list.map(function (s) {
          return { '出库单号': s.no, '收货客户': s.customer, '类型': s.type || '', '通知出货人': s.notifier || '', '发货原因': s.reason || s.type || '', '关联订单': s.orderNo || '', '产品': noShipProductSummary(s.items), '出货量': s.shipQty, '金额': s.total || '', '出货日': s.shipDate, '仓库': s.warehouse, '方式': s.method, '物流公司': s.company, '单号': s.tracking, '状态': s.status };
        }));
    };
    view.querySelector('.table-wrap').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]'); if (!btn) return;
      var id = btn.dataset.id, s = store.get('noships', id);
      if (btn.dataset.act === 'advance') {
        var nx = SHIP_NEXT[s.status];
        if (!nx) return ui.toast('已是最终状态', 'warn');
        store.update('noships', id, { status: nx });
        if (nx === '已签收') store.update('noships', id, { signTime: util.today(), signer: s.customer });
        ui.toast('物流状态：' + s.status + ' → ' + nx, 'ok'); renderNoShip();
      } else if (btn.dataset.act === 'sign') { noShipSign(id); }
      else if (btn.dataset.act === 'del') { ui.confirm('删除该无单出货记录？').then(function (ok) { if (ok) { store.remove('noships', id); ui.toast('已删除'); renderNoShip(); } }); }
    });
  }
  function noShipForm() {
    var modalEl;
    var ordersForLink = store.list('orders');
    ui.form({
      title: '新增无单出货（可选关联订单）', size: 'lg',
      fields: [
        { name: 'no', label: '出库单号', readonly: true, placeholder: '保存后自动生成' },
        { name: 'customer', label: '收货客户', type: 'text', list: customerNames(), required: true },
        { name: 'notifier', label: '通知出货人', type: 'text' },
        { name: 'type', label: '出货类型', type: 'select', options: ['样品', '赠品', '备品', '其他'], required: true },
        { name: 'orderRef', label: '关联订单（可选）', type: 'select', options: ['（不关联）'].concat(ordersForLink.map(function (o) { return o.no + '（' + o.customer + '）'; })), hint: '关联后可在订单详情中查看此无单出货，但不会回写订单出货数' },
        { name: 'itemsHtml', label: '产品明细（可添加多行）', type: 'html', full: true, html: '<div id="noship-items-wrap"></div>' },
        { name: 'shipQty', label: '出货总数量', type: 'number', readonly: true },
        { name: 'shipDate', label: '出货日期', type: 'date', required: true },
        { name: 'warehouse', label: '出货仓库', type: 'select', options: ['主仓', '外仓', '工厂直发'] },
        { name: 'method', label: '出货方式', type: 'select', options: ['整车', '零担', '快递'] },
        { name: 'company', label: '物流公司', type: 'text', list: ['顺丰速运', '德邦物流', '中通快递', '京东物流'] },
        { name: 'tracking', label: '物流单号' },
        { name: 'remark', label: '备注', type: 'textarea', full: true },
        { name: 'attachments', label: '送货单/物流底单', type: 'files', full: true }
      ],
      values: { shipDate: util.today(), type: '样品', warehouse: '主仓', method: '整车' },
      onMount: function (mEl) {
        modalEl = mEl;
        // 选中关联订单时，自动带出收货客户（若客户未填）
        var orderSel = mEl.querySelector('[data-f="orderRef"]');
        if (orderSel) orderSel.addEventListener('change', function () {
          var v = orderSel.value;
          if (v && v !== '（不关联）') {
            var no = v.split('（')[0];
            var o = ordersForLink.find(function (x) { return x.no === no; });
            var custEl = mEl.querySelector('[data-f="customer"]');
            if (o && custEl && !custEl.value) custEl.value = o.customer;
          }
        });
        var wrap = mEl.querySelector('#noship-items-wrap');
        var totalEl = mEl.querySelector('[data-f="shipQty"]');
        var items = [{ product: '', spec: '', model: '', unit: '', qty: '' }];
        function recalc() {
          var total = items.reduce(function (a, it) { return a + util.num(it.qty); }, 0);
          var unit = items.length && items[0].unit ? items[0].unit : '';
          if (totalEl) { totalEl.value = total; totalEl.dataset.unit = unit; }
          return total;
        }
        function render() {
          var rowsHtml = items.map(function (it, idx) {
            return '<tr>' +
              '<td><input class="nsi" data-k="product" data-i="' + idx + '" value="' + esc(it.product || '') + '" placeholder="品名"/></td>' +
              '<td><input class="nsi" data-k="spec" data-i="' + idx + '" value="' + esc(it.spec || '') + '" placeholder="规格"/></td>' +
              '<td><input class="nsi" data-k="model" data-i="' + idx + '" value="' + esc(it.model || '') + '" placeholder="型号"/></td>' +
              '<td><input class="nsi" data-k="unit" data-i="' + idx + '" value="' + esc(it.unit || '') + '" placeholder="单位" style="width:64px"/></td>' +
              '<td><input class="nsi" data-k="qty" data-i="' + idx + '" type="number" min="0" value="' + esc(it.qty || '') + '" placeholder="0" style="width:80px"/></td>' +
              '<td><button type="button" class="btn sm danger" data-del="' + idx + '">✕</button></td></tr>';
          }).join('');
          wrap.innerHTML =
            '<div style="display:flex;gap:8px;margin-bottom:8px"><button type="button" class="btn sm primary" id="nsi-add">＋ 添加一行</button><span style="color:#9aa6b5;align-self:center" id="nsi-total"></span></div>' +
            '<div class="table-wrap"><table class="tbl"><thead><tr><th>品名</th><th>规格</th><th>型号</th><th>单位</th><th>数量</th><th>操作</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
          wrap.querySelectorAll('.nsi').forEach(function (inp) {
            inp.addEventListener('input', function () {
              var i = +inp.dataset.i, k = inp.dataset.k;
              items[i][k] = inp.value;
              if (k === 'qty' || k === 'unit') {
                var t = recalc();
                var tt = wrap.querySelector('#nsi-total');
                if (tt) tt.textContent = '合计：' + t + ' ' + (items[0] && items[0].unit ? items[0].unit : '');
              }
            });
          });
          wrap.querySelectorAll('[data-del]').forEach(function (b) {
            b.onclick = function () {
              if (items.length <= 1) { ui.toast('至少保留一行明细', 'warn'); return; }
              items.splice(+b.dataset.del, 1); render();
            };
          });
          var addBtn = wrap.querySelector('#nsi-add');
          if (addBtn) addBtn.onclick = function () { items.push({ product: '', spec: '', model: '', unit: '', qty: '' }); render(); };
          var t = recalc();
          var tt = wrap.querySelector('#nsi-total');
          if (tt) tt.textContent = '合计：' + t + ' ' + (items[0] && items[0].unit ? items[0].unit : '');
        }
        render();
      },
      onSubmit: function (out) {
        try {
          // 从 DOM 收集明细
          var itemRows = modalEl.querySelectorAll('#noship-items-wrap tbody tr');
          var items = [];
          itemRows.forEach(function (tr) {
            var get = function (k) { var e = tr.querySelector('[data-k="' + k + '"]'); return e ? e.value.trim() : ''; };
            var qty = util.num(get('qty'));
            if (get('product') || qty > 0) {
              items.push({ product: get('product'), spec: get('spec'), model: get('model'), unit: get('unit'), qty: qty });
            }
          });
          if (!items.length) { ui.toast('请至少填写一行产品明细', 'err'); return false; }
          var totalQty = items.reduce(function (a, it) { return a + util.num(it.qty); }, 0);
          if (totalQty <= 0) { ui.toast('出货总数量需大于 0', 'err'); return false; }
          var unit = items[0] && items[0].unit ? items[0].unit : '';
          return util.persistFiles(out.attachments).then(function (atts) {
            var no = nextNoShipNo();
            // 解析关联订单：选项为 "单号（客户）"，取单号反查 id（软关联，不回写订单出货数）
            var orderId = '', orderNo = '';
            if (out.orderRef && out.orderRef !== '（不关联）') {
              orderNo = out.orderRef.split('（')[0];
              var linked = ordersForLink.find(function (x) { return x.no === orderNo; });
              if (linked) orderId = linked.id;
            }
            store.add('noships', {
              no: no, customer: out.customer, type: out.type, notifier: out.notifier || '', orderId: orderId, orderNo: orderNo, items: items,
              shipQty: totalQty, unit: unit, shipDate: out.shipDate, warehouse: out.warehouse,
              method: out.method, company: out.company, tracking: out.tracking, remark: out.remark,
              status: '已发货', signTime: '', signer: '', abnormal: '', attachments: atts
            });
            ui.toast('无单出货已保存：' + no + (orderNo ? '（关联 ' + orderNo + '）' : ''), 'ok'); renderNoShip();
          }).catch(function (e) { ui.toast('保存失败：' + (e && e.message ? e.message : String(e)), 'err'); });
        } catch (e) {
          ui.toast('保存异常：' + (e && e.message ? e.message : String(e)), 'err');
          console.error(e);
          return false;
        }
      }
    });
  }
  function noShipSign(id) {
    var s = store.get('noships', id); if (!s) return;
    ui.form({
      title: '客户签收 · ' + s.no, size: 'sm',
      fields: [
        { name: 'signTime', label: '签收时间', type: 'date' },
        { name: 'signer', label: '签收人' },
        { name: 'abnormal', label: '异常备注（破损/少货/延迟）', type: 'textarea', full: true }
      ],
      values: { signTime: util.today(), signer: s.customer },
      onSubmit: function (out) {
        store.update('noships', id, { status: '已签收', signTime: out.signTime, signer: out.signer, abnormal: out.abnormal });
        ui.toast('已签收', 'ok'); renderNoShip();
      }
    });
  }

  // ===== 无单出货批量导入（对齐用户「无订单发货模板.xls」14 列结构）=====
  var NOSHIP_HEADER_ALIAS = {
    '发货日期': ['发货日期', '出货日期', '日期'],
    '发货单号': ['发货单号', '单号', '出库单号'],
    '通知出货人': ['通知出货人', '出货人', '通知人', '业务员'],
    '收货客户': ['收货客户', '客户', '客户名称', '购方'],
    '品号': ['品号', '货号', '物料编码', '产品编码'],
    '品名': ['品名', '产品名称', '品项', '名称'],
    '规格': ['规格', '规格型号'],
    '型号': ['型号', '机型'],
    '单位': ['单位', '计量单位'],
    '发货数量': ['发货数量', '数量'],
    '含税单价(元)': ['含税单价(元)', '含税单价', '单价'],
    '含税总价(元)': ['含税总价(元)', '含税总价', '总价', '金额'],
    '发货原因': ['发货原因', '原因', '出货原因', '类型'],
    '备注': ['备注', '说明']
  };
  var NOSHIP_TYPE_SET = ['样品', '赠品', '备品', '其他'];
  function mapNoShipHeaders(headerCells) {
    var headers = headerCells.map(function (h) { return (h === null || h === undefined ? '' : String(h)).trim(); });
    var idx = {};
    Object.keys(NOSHIP_HEADER_ALIAS).forEach(function (std) {
      var aliases = NOSHIP_HEADER_ALIAS[std];
      for (var i = 0; i < headers.length; i++) {
        if (aliases.indexOf(headers[i]) >= 0) { idx[std] = i; break; }
      }
    });
    return idx;
  }
  function downloadNoShipTemplate() {
    var headers = ['发货日期', '发货单号', '通知出货人', '收货客户', '品号', '品名', '规格', '型号', '单位', '发货数量', '含税单价(元)', '含税总价(元)', '发货原因', '备注'];
    var sample = { '发货日期': util.today(), '发货单号': '', '通知出货人': '', '收货客户': '示例客户（请替换）', '品号': 'P-001', '品名': '不锈钢螺丝', '规格': 'M6×20', '型号': 'A型', '单位': '个', '发货数量': 100, '含税单价(元)': 3.5, '含税总价(元)': 350, '发货原因': '样品', '备注': '' };
    util.exportXLSX('无订单发货导入模板', headers, [sample]);
  }
  function importNoShipModal() {
    var body = '<div style="line-height:1.8">' +
      '<p>① 请按模板列填写后上传 <b>Excel(.xlsx/.xls) 或 CSV（UTF-8）</b>。表头列：' +
      '发货日期 / 发货单号 / 通知出货人 / 收货客户 / 品号 / 品名 / 规格 / 型号 / 单位 / 发货数量 / 含税单价(元) / 含税总价(元) / 发货原因 / 备注。</p>' +
      '<button class="btn sm" id="dlTpl2">下载导入模板(.xlsx)</button> ' +
      '<p style="margin-top:12px">② 上传文件：</p>' +
      '<input type="file" id="nsFile" accept=".xlsx,.xls,.csv,text/csv" class="input" style="width:100%">' +
      '<div id="nsPreview" style="margin-top:12px"></div></div>';
    var m = ui.open({ title: '无单出货 · 批量导入', size: 'lg', body: body, footer: [
      { label: '取消', onClick: function (c) { c(); } },
      { label: '确认导入', cls: 'primary', onClick: function (c) { doImport(c); } }
    ] });
    var parsed = null;
    m.modal.querySelector('#dlTpl2').onclick = downloadNoShipTemplate;
    m.modal.querySelector('#nsFile').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var raw = /\.(xlsx|xls)$/i.test(f.name) ? readSheetFile(rd.result) : parseCSV(rd.result);
          parsed = buildParsed(raw);
          showPreview(parsed);
        } catch (err) { ui.toast('解析失败：' + err.message, 'err'); }
      };
      if (/\.(xlsx|xls)$/i.test(f.name)) rd.readAsArrayBuffer(f); else rd.readAsText(f, 'utf-8');
    });
    function showPreview(p) {
      var box = m.modal.querySelector('#nsPreview');
      if (!p || !p.rows.length) { box.innerHTML = '<p style="color:#e11d48">未解析到有效数据行</p>'; return; }
      var head = p.headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('');
      var bodyRows = p.rows.slice(0, 10).map(function (r) {
        return '<tr>' + p.headers.map(function (h, idx) { return '<td>' + esc(r[idx] || '') + '</td>'; }).join('') + '</tr>';
      }).join('');
      box.innerHTML = '<p style="color:#16a34a;margin-bottom:6px">解析到 <b>' + p.rows.length + '</b> 条数据（预览前10条）：</p><div class="table-wrap"><table class="tbl"><tr>' + head + '</tr>' + bodyRows + '</table></div>';
    }
    function doImport(close) {
      if (!parsed || !parsed.rows.length) { ui.toast('请先上传有效文件', 'warn'); return; }
      var idx = mapNoShipHeaders(parsed.headers);
      if (idx['收货客户'] == null && idx['品名'] == null) { ui.toast('未找到“收货客户”或“品名”列，请检查模板表头', 'err'); return; }
      // 按发货单号分组：相同单号→一张出库单（多行明细）；单号为空→每行独立（自动编号 WX…）
      var groups = {}, autoCount = 0;
      parsed.rows.forEach(function (r) {
        function g(std) { return idx[std] != null ? String(r[idx[std]] || '').trim() : ''; }
        var cust = g('收货客户'), prod = g('品名'), qty = util.num(g('发货数量'));
        if (!cust && !prod && !qty) return;
        var no = g('发货单号');
        if (!no) no = '__AUTO__' + (++autoCount);
        (groups[no] || (groups[no] = [])).push(r);
      });
      var cnt = 0, skipped = 0;
      Object.keys(groups).forEach(function (no) {
        var rows = groups[no];
        var items = [];
        var notifier = '', reason = '', shipDate = '', remark = '', unit = '', firstCustomer = '';
        rows.forEach(function (r) {
          function g(std) { return idx[std] != null ? String(r[idx[std]] || '').trim() : ''; }
          var qty = util.num(g('发货数量'));
          if (!g('品名') && qty <= 0) return;
          var price = util.num(g('含税单价(元)'));
          var totalRaw = g('含税总价(元)');
          var total = totalRaw ? util.num(totalRaw) : +(qty * price).toFixed(2);
          items.push({
            itemNo: g('品号'), product: g('品名'), spec: g('规格'), model: g('型号'), unit: g('单位'),
            qty: qty, price: price, total: total, shippedQty: 0, unshippedQty: qty
          });
          if (!firstCustomer && g('收货客户')) firstCustomer = g('收货客户');
          if (!notifier) notifier = g('通知出货人');
          if (!reason) reason = g('发货原因');
          if (!shipDate) shipDate = util.fmtDate(g('发货日期'));
          if (!remark) remark = g('备注');
          if (!unit) unit = g('单位');
        });
        if (!items.length || !firstCustomer) { skipped++; return; }
        var shipQty = items.reduce(function (a, it) { return a + it.qty; }, 0);
        var total = +items.reduce(function (a, it) { return a + (it.total || 0); }, 0).toFixed(2);
        var type = NOSHIP_TYPE_SET.indexOf(reason) >= 0 ? reason : '其他';
        var realNo = (no.indexOf('__AUTO__') === 0) ? nextNoShipNo() : no;
        store.add('noships', {
          no: realNo, customer: firstCustomer, type: type, reason: reason, notifier: notifier,
          orderId: '', orderNo: '', items: items,
          shipQty: shipQty, unit: unit, total: total, shipDate: shipDate,
          warehouse: '', method: '', company: '', tracking: '',
          remark: remark, status: '已发货', signTime: '', signer: '', abnormal: '', attachments: []
        });
        cnt++;
      });
      ui.toast('导入完成：新增 ' + cnt + ' 条无单出货' + (skipped ? '，跳过 ' + skipped + ' 条无效行' : ''), 'ok');
      close(); renderNoShip();
    }
  }

  /* ============================ 客户档案 ============================ */
  function renderCustomers() {
    var view = document.getElementById('view');
    var list = store.list('customers');
    var orders = store.list('orders');
    // 同步累计
    list.forEach(function (c) {
      var co = orders.filter(function (o) { return o.customer === c.name; });
      c.totalOrders = co.length;
      c.totalAmount = util.sum(co, 'total');
    });
    var rows = list.map(function (c) {
      return '<tr data-id="' + c.id + '">' +
        '<td>' + esc(c.name) + '</td>' +
        '<td>' + esc(c.region) + '</td>' +
        '<td>' + esc(c.contact) + ' / ' + esc(c.phone) + '</td>' +
        '<td>' + esc(c.wechat) + '</td>' +
        '<td>' + tag(c.level) + '</td>' +
        '<td class="nowrap">' + util.money(c.totalAmount) + '</td>' +
        '<td class="nowrap">' + c.totalOrders + '</td>' +
        '<td>' + esc(c.credit) + '</td>' +
        '<td class="nowrap"><button class="btn sm" data-act="detail">详情</button> <button class="btn sm" data-act="edit">编辑</button> <button class="btn sm danger" data-act="del">删</button></td></tr>';
    });
    view.innerHTML =
      '<div class="toolbar"><button class="btn primary" data-act="add">＋ 新增客户</button>' +
      '<input class="input" style="width:220px" placeholder="搜索客户名/手机" data-kw>' +
      '<div class="spacer"></div><button class="btn" data-act="export">导出CSV</button></div>' +
      tableView(['客户名称', '地区', '联系人/电话', '微信', '分级', '累计金额', '订单数', '回款信誉', '操作'], rows);
    view.querySelector('[data-act="add"]').onclick = customerForm;
    view.querySelector('[data-act="export"]').onclick = function () {
      util.exportCSV('客户档案_' + util.today(), ['客户', '地区', '联系人', '电话', '微信', '地址', '分级', '首次合作', '累计金额', '订单数', '信誉'],
        list.map(function (c) { return { '客户': c.name, '地区': c.region, '联系人': c.contact, '电话': c.phone, '微信': c.wechat, '地址': c.address, '分级': c.level, '首次合作': c.firstCoop, '累计金额': c.totalAmount, '订单数': c.totalOrders, '信誉': c.credit }; }));
    };
    var kw = view.querySelector('[data-kw]');
    kw.oninput = function () {
      var v = kw.value.toLowerCase();
      view.querySelectorAll('.table-wrap tbody tr').forEach(function (tr) {
        tr.style.display = tr.textContent.toLowerCase().indexOf(v) >= 0 ? '' : 'none';
      });
    };
    view.querySelector('.table-wrap').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]'); if (!btn) return;
      var id = btn.closest('tr').dataset.id;
      if (btn.dataset.act === 'edit') customerForm(id);
      else if (btn.dataset.act === 'detail') customerDetail(id);
      else if (btn.dataset.act === 'del') { ui.confirm('删除客户？关联订单不删除。').then(function (ok) { if (ok) { store.remove('customers', id); ui.toast('已删除'); renderCustomers(); } }); }
    });
  }
  function customerForm(id) {
    var v = id ? JSON.parse(JSON.stringify(store.get('customers', id))) : { firstCoop: util.today(), level: '新客户' };
    ui.form({
      title: id ? '编辑客户' : '新增客户', size: 'lg',
      fields: [
        { section: '基础信息' },
        { name: 'name', label: '客户名称', required: true },
        { name: 'region', label: '所属地区', list: ['华南', '华东', '华北', '华中', '西南', '西北', '东北', '海外'] },
        { name: 'contact', label: '联系人' },
        { name: 'phone', label: '电话' },
        { name: 'wechat', label: '微信' },
        { name: 'address', label: '详细收货地址', full: true },
        { section: '分级与合作' },
        { name: 'level', label: '客户分级', type: 'select', options: CUST_LEVELS },
        { name: 'firstCoop', label: '首次合作时间', type: 'date' },
        { name: 'credit', label: '回款信誉', list: ['优', '良', '中', '差'] },
        { section: '偏好与禁忌' },
        { name: 'prefer', label: '客户偏好（专属报价/常规产品）', type: 'textarea', full: true },
        { name: 'taboo', label: '禁忌', type: 'textarea', full: true },
        { name: 'habit', label: '对接习惯', type: 'textarea', full: true }
      ],
      values: v,
      onSubmit: function (out) {
        if (id) { store.update('customers', id, out); ui.toast('已保存', 'ok'); }
        else { store.add('customers', out); ui.toast('客户已添加', 'ok'); }
        renderCustomers();
      }
    });
  }
  function customerDetail(id) {
    var c = store.get('customers', id); if (!c) return;
    var cos = store.list('orders').filter(function (o) { return o.customer === c.name; });
    var rel = cos.length ? cos.map(function (o) { return '<div>· ' + esc(o.no) + ' ' + badge(o.status) + ' ' + util.money(o.total) + '</div>'; }).join('') : '<div>暂无订单</div>';
    var body = '<div class="detail"><dl>' +
      '<dt>客户名称</dt><dd>' + esc(c.name) + '</dd>' +
      '<dt>地区</dt><dd>' + esc(c.region) + '</dd>' +
      '<dt>联系人</dt><dd>' + esc(c.contact) + ' / ' + esc(c.phone) + '</dd>' +
      '<dt>微信</dt><dd>' + esc(c.wechat) + '</dd>' +
      '<dt>地址</dt><dd>' + esc(c.address) + '</dd>' +
      '<dt>分级</dt><dd>' + tag(c.level) + '</dd>' +
      '<dt>首次合作</dt><dd>' + esc(c.firstCoop) + '</dd>' +
      '<dt>累计金额</dt><dd>' + util.money(c.totalAmount) + '（' + c.totalOrders + ' 单）</dd>' +
      '<dt>信誉</dt><dd>' + esc(c.credit) + '</dd>' +
      '<dt>偏好</dt><dd>' + esc(c.prefer) + '</dd>' +
      '<dt>禁忌</dt><dd>' + esc(c.taboo) + '</dd>' +
      '<dt>对接习惯</dt><dd>' + esc(c.habit) + '</dd></dl></div>' +
      '<h4 style="margin:16px 0 6px;color:#2f6fed">历史订单</h4>' + rel;
    ui.open({ title: '客户详情 · ' + c.name, body: body, size: 'lg', footer: [{ label: '关闭', cls: 'primary', onClick: function (c2) { c2(); } }] });
  }

  /* ============================ 对账回款 ============================ */
  function ensureRecon() {
    var orders = store.list('orders');
    var recs = store.list('reconciliations');
    orders.forEach(function (o) {
      if (!recs.find(function (r) { return r.orderId === o.id; })) {
        recs.push({ id: store.uid(), orderId: o.id, no: o.no, customer: o.customer, amount: o.total, shippedAmount: 0, reconAmount: o.total, status: o.unpaid <= 0 ? '全款结清' : '已对账待回款', period: 30, periodDue: '', receiveRecords: [], createdAt: Date.now() });
      }
    });
    store.save('reconciliations', recs);
  }
  function syncReceived(rec) {
    var total = util.sum(rec.receiveRecords || [], 'amount');
    var r = store.update('reconciliations', rec.id, { received: total });
    var status = total >= rec.amount ? '全款结清' : (total > 0 ? '部分回款' : rec.status);
    store.update('reconciliations', rec.id, { status: status });
    var o = store.get('orders', rec.orderId);
    if (o) store.update('orders', rec.orderId, { received: total, unpaid: +(o.total - total).toFixed(2) });
  }
  function renderReconciliation() {
    ensureRecon();
    var view = document.getElementById('view');
    var list = store.list('reconciliations');
    var rows = list.map(function (r) {
      var due = r.periodDue ? util.daysBetween(r.periodDue, util.today()) : null;
      var warn = (r.status !== '全款结清' && due !== null && due < 0) ? 'row-danger' : (r.status !== '全款结清' && due !== null && due <= 3 ? 'row-warn' : '');
      return '<tr class="' + warn + '" data-id="' + r.id + '">' +
        '<td class="nowrap">' + esc(r.no) + '</td>' +
        '<td>' + esc(r.customer) + '</td>' +
        '<td class="nowrap">' + util.money(r.amount) + '</td>' +
        '<td class="nowrap">' + util.money(r.shippedAmount) + '</td>' +
        '<td>' + badge(r.status) + '</td>' +
        '<td class="nowrap">' + util.money(util.sum(r.receiveRecords || [], 'amount')) + '</td>' +
        '<td class="nowrap">' + (r.periodDue || '-') + '</td>' +
        '<td class="nowrap"><button class="btn sm" data-act="receive">回款</button> <button class="btn sm" data-act="edit">编辑</button> <button class="btn sm" data-act="report">月报</button></td></tr>';
    });
    view.innerHTML =
      '<div class="toolbar"><span style="color:#7a8699">账期到期未回款自动标红；支持回款记录与月度对账报表。</span>' +
      '<div class="spacer"></div><button class="btn" data-act="export">导出CSV</button></div>' +
      tableView(['订单号', '客户', '订单金额', '已发货额', '对账状态', '已回款', '账期到期', '操作'], rows);
    view.querySelector('[data-act="export"]').onclick = function () {
      util.exportCSV('对账回款_' + util.today(), ['订单号', '客户', '金额', '已发货', '状态', '已回款', '到期'],
        list.map(function (r) { return { '订单号': r.no, '客户': r.customer, '金额': r.amount, '已发货': r.shippedAmount, '状态': r.status, '已回款': util.sum(r.receiveRecords || [], 'amount'), '到期': r.periodDue }; }));
    };
    view.querySelector('.table-wrap').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]'); if (!btn) return;
      var id = btn.closest('tr').dataset.id, r = store.get('reconciliations', id);
      if (btn.dataset.act === 'receive') reconReceive(id);
      else if (btn.dataset.act === 'edit') reconEdit(id);
      else if (btn.dataset.act === 'report') monthlyReport(r.customer);
    });
  }
  function reconReceive(id) {
    var r = store.get('reconciliations', id); if (!r) return;
    ui.form({
      title: '登记回款 · ' + r.no, size: 'sm',
      fields: [
        { name: 'date', label: '回款日期', type: 'date' },
        { name: 'amount', label: '回款金额', type: 'number', required: true },
        { name: 'method', label: '回款方式', list: ['银行转账', '微信', '支付宝', '现金', '支票'] },
        { name: 'voucher', label: '转账凭证（截图）', type: 'files' }
      ],
      values: { date: util.today(), method: '银行转账' },
      onSubmit: function (out) {
        return util.persistFiles(out.voucher || []).then(function (vs) {
          var recs = (r.receiveRecords || []).slice();
          recs.push({ date: out.date, amount: util.num(out.amount), method: out.method, voucher: vs[0] || null });
          store.update('reconciliations', id, { receiveRecords: recs });
          syncReceived(store.get('reconciliations', id));
          ui.toast('回款已登记', 'ok'); renderReconciliation();
        });
      }
    });
  }
  function reconEdit(id) {
    var r = store.get('reconciliations', id); if (!r) return;
    ui.form({
      title: '编辑对账 · ' + r.no, size: 'sm',
      fields: [
        { name: 'status', label: '对账状态', type: 'select', options: REC_STATUS },
        { name: 'period', label: '账期(天)', type: 'number' },
        { name: 'periodDue', label: '账期到期日', type: 'date' }
      ],
      values: { status: r.status, period: r.period, periodDue: r.periodDue },
      onSubmit: function (out) { store.update('reconciliations', id, { status: out.status, period: util.num(out.period), periodDue: out.periodDue }); ui.toast('已保存', 'ok'); renderReconciliation(); }
    });
  }
  function monthlyReport(customer) {
    var recs = store.list('reconciliations').filter(function (r) { return !customer || r.customer === customer; });
    var head = ['订单号', '客户', '订单金额', '对账金额', '已回款', '未回款', '状态'].map(function (c) { return '<th>' + c + '</th>'; }).join('');
    var body = recs.map(function (r) {
      var rec = util.sum(r.receiveRecords || [], 'amount');
      return '<tr><td>' + esc(r.no) + '</td><td>' + esc(r.customer) + '</td><td>' + util.money(r.amount) + '</td><td>' + util.money(r.reconAmount) + '</td><td>' + util.money(rec) + '</td><td>' + util.money(r.amount - rec) + '</td><td>' + esc(r.status) + '</td></tr>';
    }).join('');
    util.printHTML('月度对账报表' + (customer ? ' · ' + customer : ''), '<h2>月度对账明细' + (customer ? '（' + esc(customer) + '）' : '（全部客户）') + '</h2><div class="mb">生成日期：' + util.today() + '，共 ' + recs.length + ' 单</div><table><tr>' + head + '</tr>' + body + '</table>');
  }

  /* ============================ 异常售后 ============================ */
  function renderException() {
    var view = document.getElementById('view');
    var list = store.list('exceptions');
    var rows = list.map(function (e) {
      var warn = (e.progress === '待处理' || e.progress === '处理中') ? 'row-warn' : '';
      return '<tr class="' + warn + '" data-id="' + e.id + '">' +
        '<td>' + badge(e.type) + '</td>' +
        '<td class="nowrap">' + esc(e.no || '-') + '</td>' +
        '<td>' + esc(e.desc) + '</td>' +
        '<td class="nowrap">' + esc(e.time) + '</td>' +
        '<td>' + esc(e.party) + '</td>' +
        '<td>' + badge(e.progress) + '</td>' +
        '<td class="nowrap"><button class="btn sm" data-act="edit">编辑</button> <button class="btn sm" data-act="advance">推进</button> <button class="btn sm danger" data-act="del">删</button></td></tr>';
    });
    view.innerHTML =
      '<div class="toolbar"><button class="btn primary" data-act="add">＋ 新增异常</button>' +
      '<div class="spacer"></div><button class="btn" data-act="export">导出CSV</button></div>' +
      tableView(['类型', '订单号', '问题描述', '发生时间', '对接方', '处理进度', '操作'], rows);
    view.querySelector('[data-act="add"]').onclick = excForm;
    view.querySelector('[data-act="export"]').onclick = function () {
      util.exportCSV('异常售后_' + util.today(), ['类型', '订单号', '描述', '时间', '对接方', '方案', '进度'],
        list.map(function (e) { return { '类型': e.type, '订单号': e.no, '描述': e.desc, '时间': e.time, '对接方': e.party, '方案': e.solution, '进度': e.progress }; }));
    };
    view.querySelector('.table-wrap').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-act]'); if (!btn) return;
      var id = btn.closest('tr').dataset.id, e = store.get('exceptions', id);
      if (btn.dataset.act === 'edit') excForm(id);
      else if (btn.dataset.act === 'advance') {
        var idx = EXC_PROGRESS.indexOf(e.progress);
        if (idx < EXC_PROGRESS.length - 1) { store.update('exceptions', id, { progress: EXC_PROGRESS[idx + 1] }); ui.toast('进度：' + e.progress + ' → ' + EXC_PROGRESS[idx + 1], 'ok'); renderException(); }
        else ui.toast('已是最终状态', 'warn');
      } else if (btn.dataset.act === 'del') { ui.confirm('删除该异常记录？').then(function (ok) { if (ok) { store.remove('exceptions', id); ui.toast('已删除'); renderException(); } }); }
    });
  }
  function excForm(id) {
    var v = id ? JSON.parse(JSON.stringify(store.get('exceptions', id))) : { progress: '待处理', time: util.today() };
    var orders = store.list('orders');
    ui.form({
      title: id ? '编辑异常' : '新增异常', size: 'lg',
      fields: [
        { name: 'type', label: '异常类型', type: 'select', options: EXC_TYPES },
        { name: 'no', label: '关联订单号', list: orders.map(function (o) { return o.no; }) },
        { name: 'desc', label: '问题描述', type: 'textarea', full: true, required: true },
        { name: 'time', label: '发生时间', type: 'date' },
        { name: 'party', label: '对接工厂/客户' },
        { name: 'solution', label: '处理方案', type: 'textarea', full: true },
        { name: 'progress', label: '处理进度', type: 'select', options: EXC_PROGRESS }
      ],
      values: v,
      onSubmit: function (out) { if (id) { store.update('exceptions', id, out); } else { store.add('exceptions', out); } ui.toast('已保存', 'ok'); renderException(); }
    });
  }

  /* ============================ 退货管理 ============================ */
  function returnItemSummary(items) {
    var its = items && items.length ? items : [];
    if (!its.length) return '-';
    var names = its.map(function (it) { return it.product || '未命名'; }).filter(Boolean);
    var head = names.slice(0, 2).join('、');
    return head + (names.length > 2 ? ' 等' + names.length + '项' : '');
  }
  function renderReturns() {
    var view = document.getElementById('view');
    var list = store.list('returns');
    var rows = list.map(function (r) {
      var warn = (r.status === '待处理' || r.status === '处理中') ? 'row-warn' : '';
      return '<tr class="' + warn + '" data-id="' + r.id + '">' +
        '<td class="nowrap">' + esc(r.no) + '</td>' +
        '<td>' + esc(r.type || '-') + '</td>' +
        '<td>' + (r.orderNo ? '<a href="#/orders" style="color:#2f6fed">' + esc(r.orderNo) + '</a>' : '<span style="color:#9aa6b5">—</span>') + '</td>' +
        '<td>' + esc(r.customer) + '</td>' +
        '<td>' + esc(returnItemSummary(r.items)) + '</td>' +
        '<td class="nowrap">' + util.money(r.totalAmount || 0) + '</td>' +
        '<td class="nowrap">' + esc(util.fmtDateView(r.date)) + '</td>' +
        '<td>' + badge(r.status) + '</td>' +
        '<td>' + esc(r.handling || '-') + '</td>' +
        '<td class="nowrap"><button class="btn sm" data-act="edit">编辑</button> <button class="btn sm" data-act="advance">推进</button> <button class="btn sm danger" data-act="del">删</button></td></tr>';
    });
    view.innerHTML =
      '<div class="toolbar"><button class="btn primary" data-act="add">＋ 新增退货</button>' +
      '<div class="spacer"></div><button class="btn" data-act="export">导出CSV</button></div>' +
      tableView(['退货单号', '退货类型', '关联订单', '客户', '退货产品', '退货金额', '退货日期', '状态', '处理方式', '操作'], rows);
    view.querySelector('[data-act="add"]').onclick = function () { returnForm(); };
    view.querySelector('[data-act="export"]').onclick = function () {
      util.exportCSV('退货管理_' + util.today(), ['退货单号', '退货类型', '关联订单', '客户', '退货产品', '退货金额', '退货日期', '状态', '处理方式', '退货原因'],
        list.map(function (r) { return { '退货单号': r.no, '退货类型': r.type || '', '关联订单': r.orderNo || '', '客户': r.customer, '退货产品': returnItemSummary(r.items), '退货金额': r.totalAmount || 0, '退货日期': r.date, '状态': r.status, '处理方式': r.handling || '', '退货原因': r.reason || '' }; }));
    };
    view.querySelector('.table-wrap').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-act]'); if (!btn) return;
      var id = btn.closest('tr').dataset.id, r = store.get('returns', id);
      if (btn.dataset.act === 'edit') returnForm(id);
      else if (btn.dataset.act === 'advance') {
        var nx = RETURN_NEXT[r.status];
        if (!nx) return ui.toast('已是最终状态', 'warn');
        store.update('returns', id, { status: nx });
        ui.toast('状态：' + r.status + ' → ' + nx, 'ok'); renderReturns();
      } else if (btn.dataset.act === 'del') { ui.confirm('删除该退货记录？').then(function (ok) { if (ok) { store.remove('returns', id); ui.toast('已删除'); renderReturns(); } }); }
    });
  }
  function returnForm(id) {
    var v = id ? JSON.parse(JSON.stringify(store.get('returns', id))) : { date: util.today(), status: '待处理', type: '关联订单', handling: '待确认' };
    var orders = store.list('orders');
    if (id && v.orderNo) {
      v.orderInput = v.orderNo;
    }
    var modalEl;
    ui.form({
      title: id ? '编辑退货' : '新增退货', size: 'lg',
      fields: [
        { name: 'type', label: '退货类型', type: 'select', options: RETURN_TYPES, required: true },
        { name: 'orderInput', label: '关联订单号（关联订单类型时必填）', type: 'text', placeholder: '输入订单号，存在则自动带出客户与明细', list: orders.map(function (o) { return o.no; }) },
        { name: 'customer', label: '客户', type: 'text', list: customerNames(), required: true },
        { name: 'no', label: '退货单号', readonly: true, placeholder: '保存后自动生成' },
        { name: 'date', label: '退货日期', type: 'date', required: true },
        { name: 'reason', label: '退货原因', type: 'select', options: RETURN_REASONS },
        { name: 'itemsHtml', label: '退货明细（可添加/删除行）', type: 'html', full: true, html: '<div id="return-items-wrap"></div>' },
        { name: 'totalQty', label: '退货总数量', type: 'number', readonly: true },
        { name: 'totalAmount', label: '退货总金额', type: 'number', readonly: true },
        { name: 'refundAmount', label: '实际退款金额', type: 'number' },
        { name: 'handling', label: '处理方式', type: 'select', options: RETURN_HANDLING },
        { name: 'remark', label: '备注', type: 'textarea', full: true },
        { name: 'attachments', label: '退货凭证', type: 'files', full: true }
      ],
      values: v,
      onMount: function (mEl) {
        modalEl = mEl;
        var typeSel = mEl.querySelector('[data-f="type"]');
        var orderInputEl = mEl.querySelector('[data-f="orderInput"]');
        var customerEl = mEl.querySelector('[data-f="customer"]');
        var wrap = mEl.querySelector('#return-items-wrap');
        var totalQtyEl = mEl.querySelector('[data-f="totalQty"]');
        var totalAmtEl = mEl.querySelector('[data-f="totalAmount"]');
        var items = (v.items && v.items.slice()) || [{ itemNo: '', product: '', spec: '', model: '', unit: '', qty: '', price: '', amount: '', reason: '', remark: '' }];
        var isLinkInit = typeSel.value === '关联订单';
        orderInputEl.closest('.field').style.display = isLinkInit ? 'block' : 'none';
        if (!isLinkInit) orderInputEl.value = '';
        function recalc() {
          var tq = 0, ta = 0;
          items.forEach(function (it) {
            var q = util.num(it.qty), p = util.num(it.price);
            var amt = +(q * p).toFixed(2);
            it.amount = amt;
            tq += q; ta += amt;
          });
          if (totalQtyEl) totalQtyEl.value = tq;
          if (totalAmtEl) totalAmtEl.value = +ta.toFixed(2);
          return { tq: tq, ta: ta };
        }
        function renderItems() {
          var rowsHtml = items.map(function (it, idx) {
            return '<tr>' +
              '<td><input class="ri" data-k="itemNo" data-i="' + idx + '" value="' + esc(it.itemNo || '') + '" placeholder="品号" style="width:90px"/></td>' +
              '<td><input class="ri" data-k="product" data-i="' + idx + '" value="' + esc(it.product || '') + '" placeholder="品名"/></td>' +
              '<td><input class="ri" data-k="spec" data-i="' + idx + '" value="' + esc(it.spec || '') + '" placeholder="规格"/></td>' +
              '<td><input class="ri" data-k="model" data-i="' + idx + '" value="' + esc(it.model || '') + '" placeholder="型号"/></td>' +
              '<td><input class="ri" data-k="unit" data-i="' + idx + '" value="' + esc(it.unit || '') + '" placeholder="单位" style="width:60px"/></td>' +
              '<td><input class="ri" data-k="qty" data-i="' + idx + '" type="number" min="0" value="' + esc(it.qty || '') + '" placeholder="0" style="width:70px"/></td>' +
              '<td><input class="ri" data-k="price" data-i="' + idx + '" type="number" min="0" value="' + esc(it.price || '') + '" placeholder="0" style="width:80px"/></td>' +
              '<td class="nowrap">' + util.money(it.amount || 0) + '</td>' +
              '<td><input class="ri" data-k="reason" data-i="' + idx + '" value="' + esc(it.reason || '') + '" placeholder="原因" style="width:90px"/></td>' +
              '<td><input class="ri" data-k="remark" data-i="' + idx + '" value="' + esc(it.remark || '') + '" placeholder="备注" style="width:100px"/></td>' +
              '<td><button type="button" class="btn sm danger" data-del="' + idx + '">✕</button></td></tr>';
          }).join('');
          wrap.innerHTML =
            '<div style="display:flex;gap:8px;margin-bottom:8px"><button type="button" class="btn sm primary" id="ri-add">＋ 添加一行</button><span style="color:#9aa6b5;align-self:center" id="ri-total"></span></div>' +
            '<div class="table-wrap"><table class="tbl"><thead><tr><th>品号</th><th>品名</th><th>规格</th><th>型号</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th><th>退货原因</th><th>备注</th><th>操作</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
          wrap.querySelectorAll('.ri').forEach(function (inp) {
            inp.addEventListener('input', function () {
              var i = +inp.dataset.i, k = inp.dataset.k;
              items[i][k] = inp.value;
              if (k === 'qty' || k === 'price') { recalc(); }
            });
          });
          wrap.querySelectorAll('[data-del]').forEach(function (b) {
            b.onclick = function () {
              if (items.length <= 1) { ui.toast('至少保留一行明细', 'warn'); return; }
              items.splice(+b.dataset.del, 1); renderItems();
            };
          });
          var addBtn = wrap.querySelector('#ri-add');
          if (addBtn) addBtn.onclick = function () { items.push({ itemNo: '', product: '', spec: '', model: '', unit: '', qty: '', price: '', amount: '', reason: '', remark: '' }); renderItems(); };
          var t = recalc();
          var tt = wrap.querySelector('#ri-total');
          if (tt) tt.textContent = '合计：' + t.tq + ' 件 · ' + util.money(t.ta);
        }
        function loadOrderItems() {
          var orderNo = (orderInputEl.value || '').trim();
          var o = orders.find(function (x) { return x.no === orderNo; });
          if (!o) return;
          if (customerEl && !customerEl.value) customerEl.value = o.customer;
          if (o.items && o.items.length) {
            items = o.items.map(function (it) {
              return { itemNo: it.itemNo || '', product: it.product || '', spec: it.spec || '', model: it.model || '', unit: it.unit || '', qty: '', price: it.price || '', amount: '', reason: '', remark: '' };
            });
          }
          renderItems();
        }
        orderInputEl.addEventListener('change', loadOrderItems);
        orderInputEl.addEventListener('blur', loadOrderItems);
        typeSel.addEventListener('change', function () {
          var isLink = typeSel.value === '关联订单';
          orderInputEl.closest('.field').style.display = isLink ? 'block' : 'none';
          if (!isLink) orderInputEl.value = '';
        });
        if (v.type === '关联订单' && !id) { loadOrderItems(); }
        renderItems();
      },
      onSubmit: function (out) {
        try {
          var itemRows = modalEl.querySelectorAll('#return-items-wrap tbody tr');
          var items = [];
          itemRows.forEach(function (tr) {
            var get = function (k) { var e = tr.querySelector('[data-k="' + k + '"]'); return e ? e.value.trim() : ''; };
            var qty = util.num(get('qty')), price = util.num(get('price'));
            if (get('product') || qty > 0) {
              items.push({ itemNo: get('itemNo'), product: get('product'), spec: get('spec'), model: get('model'), unit: get('unit'), qty: qty, price: price, amount: +(qty * price).toFixed(2), reason: get('reason'), remark: get('remark') });
            }
          });
          if (!items.length) { ui.toast('请至少填写一行退货明细', 'err'); return false; }
          if (out.type === '关联订单' && !out.orderInput) { ui.toast('关联订单类型必须填写订单号', 'err'); return false; }
          var totalQty = items.reduce(function (a, it) { return a + util.num(it.qty); }, 0);
          var totalAmount = +items.reduce(function (a, it) { return a + (Number(it.amount) || 0); }, 0).toFixed(2);
          if (totalQty <= 0) { ui.toast('退货总数量需大于 0', 'err'); return false; }
          var orderId = '', orderNo = '';
          if (out.orderInput) {
            orderNo = out.orderInput.trim();
            var linked = orders.find(function (x) { return x.no === orderNo; });
            if (linked) orderId = linked.id;
          }
          return util.persistFiles(out.attachments).then(function (atts) {
            var payload = {
              type: out.type, customer: out.customer, date: out.date, reason: out.reason,
              items: items, totalQty: totalQty, totalAmount: totalAmount,
              refundAmount: util.num(out.refundAmount), handling: out.handling,
              remark: out.remark, attachments: atts,
              orderId: orderId, orderNo: orderNo
            };
            if (id) {
              store.update('returns', id, payload);
              ui.toast('退货单已保存：' + (v.no || ''), 'ok');
            } else {
              payload.no = nextReturnNo();
              payload.status = '待处理';
              var added = store.add('returns', payload);
              ui.toast('退货单已创建：' + added.no, 'ok');
            }
            renderReturns();
          }).catch(function (e) { ui.toast('保存失败：' + (e && e.message ? e.message : String(e)), 'err'); });
        } catch (e) {
          ui.toast('保存异常：' + (e && e.message ? e.message : String(e)), 'err');
          console.error(e);
          return false;
        }
      }
    });
  }

  /* ============================ 待转采购（含截图 OCR 识别） ============================ */
  var PENDING_SOURCES = ['飞书', '微信', '电话', '口头', '邮件', '其他'];
  var PENDING_STATUS = ['待转', '已转采购'];

  // 从 OCR 文本中解析待转采购字段（适配业务 ERP 截图）
  function parsePendingFromOCR(text) {
    var info = { rawText: text };
    if (!text) return info;
    // 客户名称：优先取“订货客户/客户/客户名称”后的值，过滤掉代码
    var cm = text.match(/(?:订货客户|客户名称|客户)[:：\s]+([A-Za-z0-9\s\u4e00-\u9fa5\-.]+?)(?:\s+|$)/);
    if (cm) info.customer = cm[1].trim().replace(/^R?\d+\s*/, '').trim();
    // 订单/单据编号
    var nm = text.match(/(?:单据编号|客户订单|订单号|单号)[:：\s]+([A-Za-z0-9\-]+)/);
    if (nm) info.orderNo = nm[1].trim();
    // 交货/发货日期
    var dm = text.match(/(?:交货日期|发货日期|要求交货期|交期)[:：\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    if (dm) info.deliverDate = dm[1].replace(/\//g, '-');
    // 总数量
    var qm = text.match(/(?:总数量|数量合计|合计数量)[:：\s]*(\d+(?:\.\d+)?)/);
    if (qm) info.qty = parseFloat(qm[1]);

    // 表格明细：找“序号/料号/名称”表头，取第一行有效数据作为主产品
    var lines = text.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var headerIdx = -1;
    for (var i = 0; i < lines.length; i++) {
      if (/序号/.test(lines[i]) && /料号/.test(lines[i]) && /名称/.test(lines[i])) { headerIdx = i; break; }
    }
    if (headerIdx >= 0) {
      for (var j = headerIdx + 1; j < lines.length && j < headerIdx + 6; j++) {
        var parts = lines[j].split(/\s+/).filter(Boolean);
        // 料号通常是纯数字，名称是中文，规格较长
        if (parts.length >= 3 && /^\d{6,}$/.test(parts[0]) && /[\u4e00-\u9fa5]/.test(parts[1])) {
          info.itemNo = parts[0];
          info.product = parts[1];
          info.spec = parts.slice(2).join(' ').replace(/外购.*$/, '').trim();
          if (!info.qty) {
            for (var k = parts.length - 1; k >= 0; k--) { if (/^\d+$/.test(parts[k])) { info.qty = parseFloat(parts[k]); break; } }
          }
          break;
        }
      }
    }
    // 若没解析出产品，用原文前 20 字兜底
    if (!info.product) info.product = text.slice(0, 20).replace(/\s+/g, ' ');
    return info;
  }

  // 执行 OCR 并回填到待转表单
  function runOCR(file, mEl, pending) {
    var status = mEl.querySelector('#pending-ocr-status');
    if (status) status.textContent = '正在加载 OCR 引擎…';
    loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js')
      .then(function () {
        if (status) status.textContent = '正在识别文字，首次使用需下载语言包，请稍候…';
        return Tesseract.recognize(file, 'chi_sim+eng');
      })
      .then(function (result) {
        var text = (result && result.data && result.data.text) || '';
        if (status) status.textContent = '识别完成，已自动填单';
        var info = parsePendingFromOCR(text);
        fillPendingForm(mEl, info, file, pending);
        ui.toast('截图识别完成，已自动填单', 'ok');
      })
      .catch(function (e) {
        var msg = e && e.message ? e.message : String(e);
        if (status) status.textContent = '识别失败：' + msg;
        ui.toast('截图识别失败：' + msg, 'err');
        console.error(e);
      });
  }

  // 把 OCR 结果回填到 pendingForm 的字段，并把截图自动加入附件
  function fillPendingForm(mEl, info, file, pending) {
    function set(name, val) {
      var el = mEl.querySelector('[data-f="' + name + '"]');
      if (el && val !== undefined && val !== null && val !== '') el.value = val;
    }
    set('customer', info.customer);
    set('product', info.product);
    set('spec', info.spec);
    set('qty', info.qty);
    set('deliverDate', info.deliverDate);
    if (info.rawText) set('rawText', info.rawText);
    if (info.orderNo) {
      var remarkEl = mEl.querySelector('[data-f="remark"]');
      if (remarkEl && !remarkEl.value) remarkEl.value = '业务单号：' + info.orderNo;
      else if (remarkEl) remarkEl.value += '；业务单号：' + info.orderNo;
    }
    function renderPendingFiles() {
      var fl = mEl.querySelector('[data-fl="attachments"]');
      if (!fl) return;
      fl.innerHTML = pending.attachments.map(function (x, i) {
        return '<span class="file-chip"><a data-open="' + i + '">' + esc(x.name) + '</a><span class="del" data-del="' + i + '">✕</span></span>';
      }).join('');
      fl.querySelectorAll('[data-open]').forEach(function (a) {
        a.onclick = function () { openFile(pending.attachments[+a.dataset.open]); };
      });
      fl.querySelectorAll('[data-del]').forEach(function (d) {
        d.onclick = function () { pending.attachments.splice(+d.dataset.del, 1); renderPendingFiles(); };
      });
    }
    if (file && pending && pending.attachments) {
      var reader = new FileReader();
      reader.onload = function () {
        // 截图直接转存 IndexedDB，不在表单 model 里留 base64，避免保存前 localStorage 被撑爆
        util.persistFiles([{ name: file.name, type: file.type, size: file.size, data: reader.result }])
          .then(function (atts) {
            var a = atts[0];
            // 两条通道（IndexedDB / localStorage）都没存下 → 只剩内联 base64，
            // 大图绝不能塞进记录里（会撑爆 localStorage 把业务数据一起搞丢）
            if (a && a.data && a.data.length > 1024 * 1024) {
              ui.toast('浏览器存储受限，这张图没能暂存：请用 Chrome/Edge 普通窗口打开工作台', 'warn');
              return;
            }
            pending.attachments.push(a);
            renderPendingFiles();
          }).catch(function (e) {
            ui.toast('截图暂存失败：' + (e && e.message ? e.message : String(e)), 'err');
          });
      };
      reader.readAsDataURL(file);
    }
  }

  /* ============================ 待转采购 ============================ */
  // 「是否下单采购」：业务手动选，存本地，不做任何自动判断
  var NEED_BUY_OPTS = ['未填', '需要', '不需要'];
  function needBuyVal(v) { return v === '需要' || v === '不需要' ? v : ''; }
  function needBuySelect(v) {
    var cur = needBuyVal(v);
    var color = cur === '不需要' ? '#b5730f' : (cur === '需要' ? '#2f6df6' : '#9aa6b5');
    var bcolor = cur === '不需要' ? '#f0d7ab' : (cur === '需要' ? '#d7e4ff' : '#d0d7de');
    return '<select class="np-sel" style="border:1px solid ' + bcolor + ';border-radius:4px;color:' + color + ';padding:2px 4px;font-size:12px;background:#fff">' +
      NEED_BUY_OPTS.map(function (o) { return '<option' + ((o === '未填' ? '' : o) === cur ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
      '</select>';
  }

  function renderPending() {
    var view = document.getElementById('view');
    var list = store.list('pendings');
    var rows = list.map(function (p) {
      var warn = p.status === '待转' ? 'row-warn' : '';
      var raw = (p.rawText || '').replace(/\s+/g, ' ').trim();
      var rawShort = raw.length > 18 ? raw.slice(0, 18) + '…' : raw;
      var att = (p.attachments && p.attachments.length) ? ' 📎' : '';
      var fimgs = (p.feishuImgs && p.feishuImgs.length) ? ' <span title="飞书原图">📷' + p.feishuImgs.length + '</span>' : '';
      return '<tr class="' + warn + '" data-id="' + p.id + '">' +
        '<td class="nowrap">' + esc(p.no) + '</td>' +
        '<td>' + esc(p.source || '-') + '</td>' +
        '<td>' + esc(p.customer) + '</td>' +
        '<td>' + esc(p.product) + '</td>' +
        '<td class="nowrap">' + util.num(p.qty) + (p.unit ? ' ' + esc(p.unit) : '') + '</td>' +
        '<td class="nowrap">' + (p.deliverDate ? esc(util.fmtDateView(p.deliverDate)) : '-') + '</td>' +
        '<td class="nowrap">' + (p.amount ? util.money(p.amount) : '-') + '</td>' +
        '<td>' + badge(p.status) + '</td>' +
        '<td class="nowrap">' + needBuySelect(p.needBuy) + '</td>' +
        '<td>' + esc(rawShort) + att + fimgs + '</td>' +
        '<td class="nowrap"><button class="btn sm" data-act="edit">编辑</button> <button class="btn sm primary" data-act="toOrder">转采购</button> <button class="btn sm danger" data-act="del">删</button></td></tr>';
    });
    view.innerHTML =
      '<div class="toolbar"><button class="btn primary" data-act="add">＋ 新增待转</button>' +
      '<button class="btn" data-act="feishu">📥 飞书收件箱</button>' +
      '<button class="btn" data-act="colleague">📨 同事投稿</button>' +
      '<div class="spacer"></div><button class="btn" data-act="export">导出CSV</button></div>' +
      '<div id="feishu-inbox-panel" style="display:none;margin:10px 0"></div>' +
      '<div id="colleague-inbox-panel" style="display:none;margin:10px 0"></div>' +
      (list.length ? '' : '<p style="color:#9aa6b5;margin:16px 0">暂无待转记录。业务发来的订单信息可在此登记，避免漏单。</p>') +
      tableView(['待转编号', '来源', '客户', '产品', '数量', '交期', '预估金额', '状态', '是否重新下单', '原始信息', '操作'], rows);
    view.querySelector('[data-act="add"]').onclick = function () { pendingForm(); };
    view.querySelector('[data-act="feishu"]').onclick = openFeishuInbox;
    view.querySelector('[data-act="colleague"]').onclick = openColleagueInbox;
    view.querySelector('[data-act="export"]').onclick = function () {
      util.exportCSV('待转采购_' + util.today(), ['待转编号', '来源', '客户', '产品', '规格', '数量', '单位', '交期', '预估金额', '状态', '是否重新下单', '原始信息', '备注'],
        list.map(function (p) { return { '待转编号': p.no, '来源': p.source || '', '客户': p.customer, '产品': p.product, '规格': p.spec || '', '数量': p.qty, '单位': p.unit || '', '交期': p.deliverDate || '', '预估金额': p.amount || 0, '状态': p.status, '是否重新下单': needBuyVal(p.needBuy), '原始信息': p.rawText || '', '备注': p.remark || '' }; }));
    };
    view.querySelector('.table-wrap').addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-act]'); if (!btn) return;
      var id = btn.closest('tr').dataset.id, p = store.get('pendings', id);
      if (btn.dataset.act === 'edit') pendingForm(id);
      else if (btn.dataset.act === 'toOrder') {
        if (p.status === '已转采购') return ui.toast('该待转已转采购（' + (p.toOrderNo || '') + '）', 'warn');
        importOrdersModal({ fromPending: p.id });
        ui.toast('请上传订单 Excel/CSV，导入后本待转自动标记「已转采购」', 'ok');
      } else if (btn.dataset.act === 'del') { ui.confirm('删除该待转记录？').then(function (ok) { if (ok) { store.remove('pendings', id); ui.toast('已删除'); renderPending(); } }); }
    });
    // 「是否下单采购」：选中即存，业务随时可改
    view.querySelector('.table-wrap').addEventListener('change', function (ev) {
      var sel = ev.target.closest ? ev.target.closest('.np-sel') : null;
      if (!sel) return;
      var tr = sel.closest('tr'); if (!tr) return;
      var val = needBuyVal(sel.value);
      store.update('pendings', tr.dataset.id, { needBuy: val });
      sel.style.color = val === '不需要' ? '#b5730f' : (val === '需要' ? '#2f6df6' : '#9aa6b5');
      sel.style.borderColor = val === '不需要' ? '#f0d7ab' : (val === '需要' ? '#d7e4ff' : '#d0d7de');
      ui.toast('已保存：' + (val || '未填'), 'ok');
    });
  }

  function getFeishuImported() {
    return store.load('feishuImported', []);
  }
  function markFeishuImported(ids) {
    var s = getFeishuImported();
    ids.forEach(function (id) { if (s.indexOf(id) < 0) s.push(id); });
    store.save('feishuImported', s);
  }
  function renderInboxPanel(panel) {
    panel.innerHTML = '<p style="color:#57606a;margin:6px 0">正在读取飞书收件箱…</p>';
    if (typeof fetch === 'undefined') { panel.innerHTML = '<p style="color:#e11d48">当前环境不支持读取（请用本地服务器 http://localhost:8800 打开）</p>'; return; }
    fetch('/feishu_inbox.json?t=' + Date.now()).then(function (r) { return r.json(); }).then(function (data) {
      var drafts = (data && data.drafts) || [];
      var imported = getFeishuImported();
      var pending = drafts.filter(function (d) { return imported.indexOf(d.draftId) < 0; });
      if (!pending.length) { panel.innerHTML = '<p style="color:#9aa6b5;margin:6px 0">✅ 飞书收件箱暂无新草稿（已导入的不会重复显示）。运行 feishu_puller 脚本可重新抓取。</p>'; return; }

      function renderCard(d, i) {
        var rawTxt = (d.text || '').replace(/</g, '&lt;');
        var txt = rawTxt || '(图片/文件，无文字)';
        var short = txt.slice(0, 80) + (txt.length > 80 ? '…' : '');
        var imgThumbs = (d.images || []).map(function (u, idx) {
          return '<img src="/' + u + '" data-idx="' + idx + '" style="max-width:56px;max-height:56px;border:1px solid #d0d7de;border-radius:4px;vertical-align:middle;margin-right:4px;cursor:pointer" title="点击看大图"/>';
        }).join('');
        var imgBig = (d.images || []).map(function (u) {
          return '<a href="/' + u + '" target="_blank" title="新窗口打开原图"><img src="/' + u + '" style="max-width:100%;max-height:260px;border:1px solid #d0d7de;border-radius:6px;margin:4px 0;display:block"/></a>';
        }).join('');
        return '<div class="fb-card" data-i="' + i + '" style="border:1px solid #e1e6eb;border-radius:6px;margin:6px 0;overflow:hidden;background:#fff">' +
          '<div class="fb-card-head" style="display:flex;align-items:flex-start;padding:8px 10px;cursor:pointer;gap:8px">' +
          '<input type="checkbox" class="fb-chk" data-i="' + i + '" style="margin-top:2px;flex-shrink:0"/>' +
          '<div style="flex:1;min-width:0">' +
          '<div><b>' + esc(d.chatName) + '</b> · <span style="color:#6c757d;font-size:12px">' + esc((d.createTime || '').slice(0, 16).replace('T', ' ')) + '</span></div>' +
          '<div style="color:#57606a;font-size:12px;margin-top:3px;word-break:break-all">' + short + '</div>' +
          (imgThumbs ? '<div style="margin-top:4px">' + imgThumbs + '</div>' : '') +
          '</div>' +
          '<button type="button" class="btn sm fb-toggle" data-i="' + i + '" style="flex-shrink:0">详情</button>' +
          '</div>' +
          '<div class="fb-detail" data-i="' + i + '" style="display:none;border-top:1px solid #eef1f4;padding:10px;background:#f9fafb">' +
          '<div style="color:#24292f;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-all;margin-bottom:8px">' + (rawTxt || '（无文字）') + '</div>' +
          (imgBig ? '<div style="margin-bottom:8px"><b style="color:#57606a;font-size:12px">飞书原图：</b>' + imgBig + '</div>' : '') +
          '<div style="color:#6c757d;font-size:12px;margin-bottom:10px">来源：' + esc(d.chatName) + ' · 时间：' + esc(d.createTime || '-') + ' · 类型：' + esc(d.msgType || '-') + '</div>' +
          '<button class="btn sm primary fb-import-one" data-i="' + i + '">导入这一条</button>' +
          '</div>' +
          '</div>';
      }

      var cards = pending.map(renderCard).join('');
      panel.innerHTML =
        '<div style="background:#f6f8fb;border:1px solid #e1e6eb;border-radius:8px;padding:10px">' +
        '<div style="display:flex;align-items:center;margin-bottom:6px"><b>📥 飞书收件箱（' + pending.length + ' 条待处理）</b>' +
        '<div style="flex:1"></div>' +
        '<button class="btn sm" id="fb-selall">全选</button> <button class="btn sm primary" id="fb-import">批量转为待转</button></div>' +
        cards +
        '<p style="color:#9aa6b5;font-size:12px;margin:6px 0 0">点击卡片可展开详情查看完整原文/大图；勾选后点击「批量转为待转」生成待转采购记录。</p></div>';

      // 展开/收起
      panel.querySelectorAll('.fb-card-head, .fb-toggle').forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.classList && e.target.classList.contains('fb-chk')) return;
          e.preventDefault();
          var idx = el.dataset.i != null ? el.dataset.i : el.closest('.fb-card').dataset.i;
          var detail = panel.querySelector('.fb-detail[data-i="' + idx + '"]');
          if (detail) detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
        });
      });
      // 缩略图点击直接展开详情
      panel.querySelectorAll('.fb-card-head img').forEach(function (img) {
        img.addEventListener('click', function (e) {
          e.stopPropagation();
          var card = img.closest('.fb-card');
          var idx = card ? card.dataset.i : null;
          var detail = idx != null ? panel.querySelector('.fb-detail[data-i="' + idx + '"]') : null;
          if (detail) detail.style.display = 'block';
        });
      });

      panel.querySelector('#fb-selall').onclick = function () { panel.querySelectorAll('.fb-chk').forEach(function (c) { c.checked = true; }); };

      function doImport(chosen) {
        if (!chosen.length) { ui.toast('请先选择要导入的草稿', 'warn'); return; }
        var ids = [];
        chosen.forEach(function (d) {
          store.add('pendings', {
            no: nextPendingNo(), date: util.today(), source: '飞书',
            customer: '', product: '', spec: '', qty: 0, unit: '', deliverDate: '', amount: 0,
            rawText: d.text || '', remark: '来自飞书·' + d.chatName + ' ' + (d.createTime || ''),
            feishuImgs: d.images || [], status: '待转'
          });
          ids.push(d.draftId);
        });
        markFeishuImported(ids);
        ui.toast('已导入 ' + chosen.length + ' 条到待转采购', 'ok');
        renderPending();
        renderInboxPanel(panel);
      }

      panel.querySelector('#fb-import').onclick = function () {
        var chosen = [];
        panel.querySelectorAll('.fb-chk').forEach(function (c) { if (c.checked) chosen.push(pending[+c.dataset.i]); });
        doImport(chosen);
      };
      panel.querySelectorAll('.fb-import-one').forEach(function (b) {
        b.onclick = function () { doImport([pending[+b.dataset.i]]); };
      });

    }).catch(function (e) {
      panel.innerHTML = '<p style="color:#e11d48">读取飞书收件箱失败：' + e.message + '（请用本地服务器 http://localhost:8800 打开）</p>';
    });
  }
  function openFeishuInbox() {
    var panel = document.getElementById('feishu-inbox-panel');
    if (!panel) return;
    if (panel.dataset.open === '1') { panel.style.display = 'none'; panel.dataset.open = '0'; return; }
    panel.style.display = 'block'; panel.dataset.open = '1';
    renderInboxPanel(panel);
  }

  /* ============================ 同事投稿收件箱（Supabase） ============================ */
  var _nxSB = null;
  function nxSB() {
    if (_nxSB) return _nxSB;
    var cfg = window.NX_SUPABASE;
    if (!cfg || !cfg.url || !cfg.anon || cfg.anon.indexOf('YOUR_') === 0) return null;
    if (typeof window.supabase === 'undefined') return null;
    try { _nxSB = window.supabase.createClient(cfg.url, cfg.anon); } catch (e) { return null; }
    return _nxSB;
  }

  function openColleagueInbox() {
    var panel = document.getElementById('colleague-inbox-panel');
    if (!panel) return;
    var fb = document.getElementById('feishu-inbox-panel');
    if (fb) { fb.style.display = 'none'; fb.dataset.open = '0'; }
    if (panel.dataset.open === '1') { panel.style.display = 'none'; panel.dataset.open = '0'; return; }
    panel.style.display = 'block'; panel.dataset.open = '1';
    renderColleagueInbox(panel);
  }

  function getImportedColleagueIds() {
    return store.load('imported_colleague_ids', []);
  }
  function markColleagueImported(ids) {
    var existing = getImportedColleagueIds();
    ids.forEach(function (id) { if (existing.indexOf(id) < 0) existing.push(id); });
    store.save('imported_colleague_ids', existing);
    console.log('[同事投稿] 已标记已导入:', ids, '当前全部:', existing);
  }

  function renderColleagueInbox(panel) {
    panel.innerHTML = '<p style="color:#57606a;margin:6px 0">正在读取同事投稿…</p>';
    var sb = nxSB();
    if (!sb) {
      panel.innerHTML = '<p style="color:#e11d48">尚未配置 Supabase：请在 supabase-config.js 填入 anon key，并在 Supabase 后台运行建表 SQL（colleague_orders.sql）。</p>';
      return;
    }
    var importedIds = getImportedColleagueIds();
    refreshColleagueSubmitterMap();   // 顺带刷新「订单号 → 投稿人」映射，供飞书提醒显示投稿人
    // ⚠️ 浏览器 fetch 默认没有超时：国内网络连 supabase.co 偶发「挂起」（TLS 卡住不返回），
    //    挂起时 then / catch 都不会触发，界面就永远停在「正在读取同事投稿…」。
    //    这里用 Promise.race 强制 15 秒判超时，交给下面的 catch 显示原因 + 重试按钮。
    var timeoutP = new Promise(function (_, rej) {
      setTimeout(function () {
        rej(new Error('连接云端 15 秒无响应（网络到 Supabase 被挂起，数据没丢，点「重试」再试一次即可）'));
      }, 15000);
    });
    timeoutP.catch(function () {});   // 查询先完成时，吸收超时分支的 rejection，避免 unhandled
    var raced = Promise.race([
      sb.from('colleague_orders').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      timeoutP
    ]);
    raced.then(function (r) {
      if (r.error) throw r.error;
      var drafts = (r.data || []).filter(function (d) { return importedIds.indexOf(d.id) < 0; });
      if (!drafts.length) {
        panel.innerHTML = '<p style="color:#9aa6b5;margin:6px 0">✅ 同事投稿暂无新订单（已导入的不会再显示）。</p>';
        return;
      }
      function renderCard(d, i) {
        var img = d.image_data
          ? '<img src="' + d.image_data + '" style="max-width:100%;max-height:240px;border:1px solid #d0d7de;border-radius:6px;margin:6px 0;display:block"/>'
          : '<p style="color:#9aa6b5;font-size:12px">（无截图）</p>';
        var info = [
          d.order_no && ('订单号：' + d.order_no),
          d.deliver_date && ('交期：' + d.deliver_date),
          d.submitter && ('投稿人：' + d.submitter)
        ].filter(Boolean).join('　|　');
        // 是否需要重新下单：只作标记，不影响转采购（都要转）
        var npChip = d.need_purchase === '不需要'
          ? '<span style="background:#fff7ea;color:#b5730f;border:1px solid #f0d7ab;border-radius:4px;padding:1px 5px;font-size:11px;margin-left:6px;white-space:nowrap">不需要重新下单</span>'
          : (d.need_purchase === '需要'
              ? '<span style="background:#eef4ff;color:#2f6df6;border:1px solid #d7e4ff;border-radius:4px;padding:1px 5px;font-size:11px;margin-left:6px;white-space:nowrap">需要重新下单</span>'
              : '');
        return '<div class="fb-card" data-i="' + i + '" style="border:1px solid #e1e6eb;border-radius:6px;margin:6px 0;overflow:hidden;background:#fff">' +
          '<div class="fb-card-head" style="display:flex;align-items:flex-start;padding:8px 10px;cursor:pointer;gap:8px">' +
          '<input type="checkbox" class="cb-chk" data-i="' + i + '" style="margin-top:2px;flex-shrink:0"/>' +
          '<div style="flex:1;min-width:0">' +
          '<div><b>订单号 ' + esc(d.order_no || '未填') + '</b>' + npChip + ' · <span style="color:#6c757d;font-size:12px">' + esc(util.fmtDateTime(d.created_at) || '-') + '</span></div>' +
          '<div style="color:#57606a;font-size:12px;margin-top:3px;word-break:break-all">' + esc(info) + '</div>' +
          '</div>' +
          '<button type="button" class="btn sm cb-toggle" data-i="' + i + '" style="flex-shrink:0">详情</button>' +
          '</div>' +
          '<div class="cb-detail" data-i="' + i + '" style="display:none;border-top:1px solid #eef1f4;padding:10px;background:#f9fafb">' +
          img +
          '<div style="color:#6c757d;font-size:12px;margin-top:8px">是否需要重新下单：<b style="color:' + (d.need_purchase === '不需要' ? '#b5730f' : '#1f2733') + '">' + esc(d.need_purchase || '未填（业务自己判断）') + '</b>（不影响本条转采购）</div>' +
          '<div style="color:#6c757d;font-size:12px;margin-top:4px">来源：同事投稿 · 投稿人：' + esc(d.submitter || '同事') + ' · 时间：' + esc(util.fmtDateTime(d.created_at) || '-') + '</div>' +
          '<button class="btn sm primary cb-import-one" data-i="' + i + '" style="margin-top:8px">转待转</button>' +
          '<button class="btn sm cb-ignore" data-i="' + i + '" style="margin-top:8px;margin-left:6px">忽略</button>' +
          '</div></div>';
      }
      var cards = drafts.map(renderCard).join('');
      panel.innerHTML =
        '<div style="background:#f6f8fb;border:1px solid #e1e6eb;border-radius:8px;padding:10px">' +
        '<div style="display:flex;align-items:center;margin-bottom:6px"><b>📨 同事投稿（' + drafts.length + ' 条待处理）</b>' +
        '<div style="flex:1"></div>' +
        '<button class="btn sm" id="cb-selall">全选</button> <button class="btn sm primary" id="cb-import">批量转为待转</button></div>' +
        cards +
        '<p style="color:#9aa6b5;font-size:12px;margin:6px 0 0">勾选后点击「批量转为待转」直接生成待转采购（已带入订单号/交期/截图），无需手动填写，该投稿不再出现。<br/>同事标记的「是否需要重新下单」只作参考，<b>不管选哪个都会生成待转采购单</b>；「是否重新下单」这一列可在待转采购列表里手动改。</p></div>';

      panel.querySelectorAll('.fb-card-head, .cb-toggle').forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.classList && e.target.classList.contains('cb-chk')) return;
          e.preventDefault();
          var idx = el.dataset.i != null ? el.dataset.i : el.closest('.fb-card').dataset.i;
          var detail = panel.querySelector('.cb-detail[data-i="' + idx + '"]');
          if (detail) detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
        });
      });
      // 全选：全都选上。标了「另一家公司不需要下单」的投稿同样要转采购，不跳过
      panel.querySelector('#cb-selall').onclick = function () {
        panel.querySelectorAll('.cb-chk').forEach(function (c) { c.checked = true; });
      };

      function doImport(chosen) {
        if (!chosen.length) { ui.toast('请先选择要转待转的投稿', 'warn'); return; }
        var ids = [], added = 0, skipped = 0, rows = [];
        chosen.forEach(function (d) {
          var no = (d.order_no || '').trim() || nextPendingNo();   // 优先用原订单号，缺失才生成 PD 编号
          // 去重：同编号 或 原始信息里已含该订单号（防同单不同来源重复导入）
          var dup = store.list('pendings').some(function (p) { return p.no === no || (d.order_no && (p.rawText || '').indexOf('订单号：' + d.order_no) >= 0); });
          if (dup) { skipped++; ids.push(d.id); return; }
          rows.push({ d: d, no: no });
        });
        if (!rows.length) {
          if (ids.length) markColleagueImported(ids);
          ui.toast('所选投稿均已导入过（跳过 ' + skipped + ' 条）', 'warn');
          renderColleagueInbox(panel);
          return;
        }
        // 截图先转存 IndexedDB（fileId 引用），避免 base64 撑爆 localStorage 配额导致数据写盘失败丢失
        Promise.all(rows.map(function (r) {
          var atts = r.d.image_data ? [{ name: 'colleague_order.jpg', type: 'image/jpeg', data: r.d.image_data }] : [];
          return util.persistFiles(atts).then(function (atts2) {
            // IndexedDB 不可用时 persistFiles 会降级内联 base64——坚决不塞进 localStorage（宁可丢图也不爆配额丢数据）
            var safe = atts2.filter(function (f) { return !f.data; });
            if (safe.length < atts2.length) { try { ui.toast('截图没能存下：浏览器存储被限制，请用 Chrome/Edge 普通窗口打开工作台（文字信息不受影响）', 'warn'); } catch (e) {} }
            store.add('pendings', {
              no: r.no, date: util.today(), source: '同事链接' + (r.d.submitter ? ' · ' + r.d.submitter : ''),
              customer: '', product: '', spec: '', qty: 0, unit: '',
              deliverDate: r.d.deliver_date || '', amount: 0,
              rawText: '【同事投稿】订单号：' + (r.d.order_no || '-') + (r.d.deliver_date ? '，交期：' + r.d.deliver_date : '') + (r.d.submitter ? '，投稿人：' + r.d.submitter : '') + (r.d.need_purchase ? '，是否需要重新下单：' + r.d.need_purchase : ''),
              remark: '来自同事投稿·订单号 ' + (r.d.order_no || '-') + ' ' + (r.d.created_at || ''),
              attachments: safe,
              status: '待转',
              needBuy: needBuyVal(r.d.need_purchase)   // 同事投稿时选了就带过来，没选留空让业务自己填
            });
            added++; ids.push(r.d.id);
          });
        })).then(function () {
          if (ids.length) markColleagueImported(ids);
          // 云端标记：等 PATCH 完成再刷新，避免刷新/关页打断请求导致云端永远 pending
          var finish = function () {
            var tip = '已导入 ' + added + ' 条到待转采购' + (skipped ? '（跳过已导入 ' + skipped + ' 条）' : '');
            ui.toast(tip, 'ok');
            renderPending();
            renderColleagueInbox(panel);
          };
          if (!ids.length) { finish(); return; }
          sb.from('colleague_orders').update({ status: 'imported' }).in('id', ids)
            .then(function (ur) { if (ur.error) console.warn('标记同事投稿已导入失败', ur.error); })
            .catch(function (e) { console.warn('标记同事投稿已导入失败', e); })
            .then(finish);
        }).catch(function (e) {
          ui.toast('导入失败：' + (e && e.message ? e.message : e), 'err');
        });
      }

      panel.querySelector('#cb-import').onclick = function () {
        var chosen = [];
        panel.querySelectorAll('.cb-chk').forEach(function (c) { if (c.checked) chosen.push(drafts[+c.dataset.i]); });
        doImport(chosen);
      };
      panel.querySelectorAll('.cb-import-one').forEach(function (b) {
        b.onclick = function (e) { e.stopPropagation(); doImport([drafts[+b.dataset.i]]); };
      });
      // 忽略：不生成待转采购，仅在本地记为「已处理」，该投稿不再显示（同事误投/重复投时用）
      panel.querySelectorAll('.cb-ignore').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var d = drafts[+b.dataset.i];
          if (!d) return;
          if (!window.confirm('忽略这条投稿？\n\n忽略后它不再出现在同事投稿列表里，也不会生成待转采购。')) return;
          markColleagueImported([d.id]);
          ui.toast('已忽略该投稿，不再显示', 'ok');
          renderColleagueInbox(panel);
        };
      });
    }).catch(function (e) {
      var msg = (e && e.message) ? e.message : String(e);
      var offline = /failed to fetch|networkerror|load failed|无响应/i.test(msg);
      panel.innerHTML =
        '<p style="color:#e11d48;margin:6px 0"><b>读取同事投稿失败：' + esc(msg) + '</b></p>' +
        (offline
          ? '<div style="color:#8a6d3b;background:#fffbe6;border:1px solid #ffe58f;border-radius:6px;padding:10px 12px;margin:6px 0;font-size:13px;line-height:1.8">' +
            '这不是密码或本地数据的问题 —— 浏览器连不上 / 连不稳云端（Supabase）。按顺序排查：<br/>' +
            '① 先点下面「重试」，国内网络访问 supabase.co 偶发超时，多试一两次一般就通；<br/>' +
            '② 还不行就换网络（手机热点）或稍后再试；<br/>' +
            '③ 云端项目是否被暂停：Supabase 免费项目长期无访问会被暂停，域名失效也是这个现象；<br/>' +
            '④ 浏览器插件（广告拦截、企业安全策略）是否拦截了请求。<br/>' +
            '<b>注意</b>：云端不可用时，同事在投稿页提交也会失败。本地订单数据与备份不受影响。' +
            '</div>'
          : '') +
        '<button class="btn sm" id="cb-retry" style="margin:6px 0">🔄 重试</button>';
      var rb = panel.querySelector('#cb-retry');
      if (rb) rb.onclick = function () { renderColleagueInbox(panel); };
    });
  }

  function pendingForm(id) {
    var v = id ? JSON.parse(JSON.stringify(store.get('pendings', id))) : { date: util.today(), source: '飞书', status: '待转' };
    if (id && v.deliverDate) v.deliverDate = util.fmtDate(v.deliverDate);
    var feishuImgsHtml = (v.feishuImgs && v.feishuImgs.length) ? '<div style="padding:8px;background:#f6f8fb;border-radius:6px"><b>飞书原图：</b><br/>' + v.feishuImgs.map(function (u) { return '<img src="/' + u + '" style="max-width:110px;max-height:110px;border:1px solid #d0d7de;border-radius:4px;margin:4px"/>'; }).join('') + '</div>' : '';
    ui.form({
      title: id ? '编辑待转' : '新增待转', size: 'lg',
      fields: [
        { name: 'feishuImgsView', label: '飞书原图', type: 'html', full: true, html: feishuImgsHtml },
        { name: 'no', label: '待转编号', readonly: true, placeholder: id ? '' : '保存后自动生成' },
        { name: 'source', label: '来源', type: 'select', options: PENDING_SOURCES, required: true },
        { name: 'ocrHtml', label: '截图识别（选择或 Ctrl+V 粘贴业务订单截图，自动识别并填单）', type: 'html', full: true, html: '<div style="padding:10px;background:#f6f8fb;border-radius:6px;border:1px dashed #d0d7de"><p style="margin:0 0 8px;color:#57606a;font-size:12px">支持 JPG/PNG 截图：可点击选择，或更方便地从飞书等直接 Ctrl+V 粘贴；识别后会自动填单并加入附件。</p><div style="display:flex;gap:8px;align-items:center"><input type="file" accept="image/*" id="pending-ocr-file" class="file-input"/><button type="button" id="pending-ocr-btn" class="btn">识别截图</button></div><div id="pending-ocr-drop" style="margin-top:8px;border:1px dashed #bcd0e5;border-radius:6px;padding:14px;text-align:center;color:#57606a;font-size:13px;cursor:pointer">📋 在此区域按 Ctrl+V 粘贴截图</div><div id="pending-ocr-preview" style="margin-top:8px"></div><div id="pending-ocr-status" style="margin-top:8px;color:#7a8699;font-size:12px;min-height:18px"></div></div>' },
        { name: 'customer', label: '客户名称', type: 'text', list: customerNames(), required: true },
        { name: 'product', label: '产品名称', type: 'text', required: true },
        { name: 'spec', label: '规格型号', type: 'text' },
        { name: 'qty', label: '数量', type: 'number', required: true },
        { name: 'unit', label: '单位', type: 'text' },
        { name: 'deliverDate', label: '要求交货期', type: 'date' },
        { name: 'amount', label: '预估金额', type: 'number' },
        { name: 'rawText', label: '原始信息（业务发来的原文/截图文字，便于还原）', type: 'textarea', full: true },
        { name: 'remark', label: '备注', type: 'textarea', full: true },
        { name: 'attachments', label: '截图/凭证', type: 'files', full: true },
        { name: 'needBuy', label: '是否需要重新下单', type: 'select', options: NEED_BUY_OPTS, hint: '业务自己判断：需要重新下单 / 不需要。不填也可以' },
        { name: 'status', label: '状态', type: 'select', options: PENDING_STATUS }
      ],
      values: v,
      onMount: function (mEl, modal, pending) {
        var ocrFile = mEl.querySelector('#pending-ocr-file');
        var ocrBtn = mEl.querySelector('#pending-ocr-btn');
        if (!ocrFile || !ocrBtn) return;
        function handleImage(file) {
          if (!file || file.type.indexOf('image/') < 0) { ui.toast('请选择或粘贴图片文件', 'warn'); return; }
          var prev = mEl.querySelector('#pending-ocr-preview');
          if (prev) { try { prev.innerHTML = '<img src="' + URL.createObjectURL(file) + '" style="max-width:100%;max-height:220px;border:1px solid #d0d7de;border-radius:4px"/>'; } catch (e) {} }
          runOCR(file, mEl, pending);
        }
        ocrBtn.onclick = function () { if (ocrFile.files[0]) handleImage(ocrFile.files[0]); else ui.toast('请先选择或粘贴截图', 'warn'); };
        var drop = mEl.querySelector('#pending-ocr-drop');
        if (drop) drop.addEventListener('click', function () { ocrFile.click(); });
        mEl.addEventListener('paste', function (e) {
          var cd = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
          if (!cd || !cd.items) return;
          for (var i = 0; i < cd.items.length; i++) {
            if (cd.items[i].kind === 'file' && cd.items[i].type.indexOf('image') >= 0) {
              e.preventDefault();
              handleImage(cd.items[i].getAsFile());
              return;
            }
          }
        });
      },
      onSubmit: function (out) {
        try {
          if (!out.customer || !out.product || util.num(out.qty) <= 0) { ui.toast('请填写客户、产品和数量', 'err'); return false; }
          return util.persistFiles(out.attachments).then(function (atts) {
            var payload = {
              source: out.source, customer: out.customer, product: out.product, spec: out.spec || '',
              qty: util.num(out.qty), unit: out.unit || '', deliverDate: out.deliverDate || '',
              amount: util.num(out.amount), rawText: out.rawText || '', remark: out.remark || '',
              attachments: atts, status: out.status || '待转', feishuImgs: (v.feishuImgs || []),
              needBuy: needBuyVal(out.needBuy)
            };
            if (id) { store.update('pendings', id, payload); ui.toast('待转已保存：' + v.no, 'ok'); }
            else { payload.no = nextPendingNo(); payload.date = util.today(); store.add('pendings', payload); ui.toast('待转已创建：' + payload.no, 'ok'); }
            renderPending();
          }).catch(function (e) { ui.toast('保存失败：' + (e && e.message ? e.message : String(e)), 'err'); });
        } catch (e) { ui.toast('保存异常：' + (e && e.message ? e.message : String(e)), 'err'); console.error(e); return false; }
      }
    });
  }

  /* ============================ 待办中心 ============================ */
  function gatherTodo() {
    var orders = store.list('orders'), prods = store.list('productions'), recs = store.list('reconciliations'), excs = store.list('exceptions');
    var today = util.today();
    var groups = [];
    groups.push({ name: '新订单待确认', items: orders.filter(function (o) { return o.status === '新订单' || o.status === '待确认'; }).map(function (o) { return { title: o.no + ' · ' + o.customer, sub: o.product + ' ' + o.qty + '，交货期' + util.fmtDateView(o.deliverDate), route: 'orders', preset: { status: o.status } }; }) });
    groups.push({ name: '待排产订单跟进', items: orders.filter(function (o) { return o.status === '待排产'; }).map(function (o) { return { title: o.no + ' · ' + o.customer, sub: '需安排工厂排产，交货期' + util.fmtDateView(o.deliverDate), route: 'orders', preset: { status: '待排产' } }; }) });
    groups.push({ name: '生产延期风险订单', items: prods.filter(function (p) { return p.node !== '生产完成' && util.daysBetween(p.deliverDate, today) !== null && util.daysBetween(p.deliverDate, today) <= 3; }).map(function (p) { return { title: p.no + ' · ' + p.customer, sub: '节点' + p.node + ' ' + p.percent + '%，交货期' + util.fmtDateView(p.deliverDate), route: 'production' }; }) });
    groups.push({ name: '到期待发货订单', items: orders.filter(function (o) { return (o.status === '待发货') && util.daysBetween(o.deliverDate, today) <= 0; }).map(function (o) { return { title: o.no + ' · ' + o.customer, sub: '交货期' + util.fmtDateView(o.deliverDate) + '，需尽快发货', route: 'orders', preset: { status: '待发货' } }; }) });
    groups.push({ name: '到期待对账 / 待回款', items: recs.filter(function (r) { return r.status !== '全款结清' && r.periodDue && util.daysBetween(r.periodDue, today) <= 3; }).map(function (r) { return { title: r.no + ' · ' + r.customer, sub: '状态' + r.status + '，到期' + util.fmtDateView(r.periodDue), route: 'reconciliation' }; }) });
    groups.push({ name: '未处理售后异常', items: excs.filter(function (e) { return e.progress === '待处理' || e.progress === '处理中'; }).map(function (e) { return { title: e.type + ' · ' + (e.no || '-'), sub: e.desc, route: 'exception' }; }) });
    groups.push({ name: '待转采购未处理', items: store.list('pendings').filter(function (p) { return p.status === '待转'; }).map(function (p) { return { title: p.no + ' · ' + p.customer, sub: p.product + ' ' + p.qty + '（来源' + (p.source || '-') + '）', route: 'pendings' }; }) });
    return groups;
  }
  function renderTodo() {
    var view = document.getElementById('view');
    var groups = gatherTodo();
    var memos = store.list('memos');
    var autoHtml = groups.map(function (g) {
      if (!g.items.length) return '';
      return '<div class="todo-group"><h4>' + esc(g.name) + ' <span class="cnt">' + g.items.length + '</span></h4>' +
        g.items.map(function (it) {
          var pri = (it.sub && it.sub.indexOf('逾期') >= 0) || g.name.indexOf('风险') >= 0 || g.name.indexOf('未处理') >= 0 ? 'h' : (g.name.indexOf('到期') >= 0 ? 'm' : 'l');
          return '<div class="todo-item"><div class="pri ' + pri + '"></div><div class="body"><b>' + esc(it.title) + '</b><small>' + esc(it.sub) + '</small></div>' +
            (it.route ? '<div class="act"><button class="btn sm primary" data-go="' + it.route + '" data-preset=\'' + JSON.stringify(it.preset || {}) + '\'>去处理</button></div>' : '') + '</div>';
        }).join('') + '</div>';
    }).join('');
    if (!autoHtml) autoHtml = '<div class="empty">🎉 当前没有系统待办，工作都跟上了！</div>';

    var memoHtml = '<div class="todo-group"><h4>手动备忘录 <button class="btn sm" data-act="memo-add" style="margin-left:8px">＋ 添加</button></h4>' +
      (memos.length ? memos.map(function (m) {
        var overdue = m.deadline && util.daysBetween(m.deadline, util.today()) < 0;
        return '<div class="todo-item"><div class="pri ' + (overdue ? 'h' : 'm') + '"></div><div class="body"><b>' + esc(m.title) + '</b><small>' + (m.deadline ? '截止 ' + m.deadline + (overdue ? '（已逾期）' : '') : '无截止时间') + '</small></div><div class="act"><button class="btn sm" data-act="memo-done" data-id="' + m.id + '">完成</button><button class="btn sm danger" data-act="memo-del" data-id="' + m.id + '">删</button></div></div>';
      }).join('') : '<div class="empty">暂无备忘</div>') + '</div>';

    view.innerHTML = '<div class="grid" style="grid-template-columns:1fr"><div class="panel" style="padding:18px"><h3 style="margin-bottom:12px">自动待办（系统实时抓取） <button class="btn sm" data-act="push-feishu" style="float:right">全部推送到飞书</button></h3>' + autoHtml + '</div>' +
      '<div class="panel" style="padding:18px">' + memoHtml + '</div></div>';

    view.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () { window._preset = JSON.parse(b.dataset.preset || '{}'); location.hash = '#/' + b.dataset.go; };
    });
    var fsBtn = view.querySelector('[data-act="push-feishu"]');
    if (fsBtn) fsBtn.onclick = function () { pushFeishu(gatherAlerts(), '内销跟单·全部待办'); };
    view.querySelector('[data-act="memo-add"]').onclick = memoForm;
    view.querySelectorAll('[data-act="memo-done"]').forEach(function (b) { b.onclick = function () { store.remove('memos', b.dataset.id); ui.toast('已完成'); renderTodo(); }; });
    view.querySelectorAll('[data-act="memo-del"]').forEach(function (b) { b.onclick = function () { store.remove('memos', b.dataset.id); renderTodo(); }; });
  }
  function memoForm(id) {
    var v = id ? JSON.parse(JSON.stringify(store.get('memos', id))) : {};
    ui.form({
      title: id ? '编辑备忘' : '新增备忘', size: 'sm',
      fields: [
        { name: 'title', label: '事项', required: true },
        { name: 'deadline', label: '截止时间', type: 'date' },
        { name: 'note', label: '备注', type: 'textarea', full: true }
      ],
      values: v,
      onSubmit: function (out) { if (id) store.update('memos', id, out); else store.add('memos', out); ui.toast('已保存', 'ok'); renderTodo(); }
    });
  }

  /* ============================ 报表中心 ============================ */
  function renderReports() {
    var view = document.getElementById('view');
    var orders = store.list('orders'), prods = store.list('productions'), ships = store.list('shipments'), recs = store.list('reconciliations'), excs = store.list('exceptions');
    // 订单统计：按月汇总
    var byMonth = {};
    orders.forEach(function (o) { var m = util.fmtDate(o.date).slice(0, 7); if (!m) return; byMonth[m] = byMonth[m] || { cnt: 0, amt: 0 }; byMonth[m].cnt++; byMonth[m].amt += o.total; });
    var months = Object.keys(byMonth).sort();
    var orderStat = months.length ? months.map(function (m) { return '<tr><td>' + m + '</td><td>' + byMonth[m].cnt + '</td><td>' + util.money(byMonth[m].amt) + '</td></tr>'; }).join('') : '<tr><td class="empty" colspan="3">暂无订单</td></tr>';
    // 状态分布
    var stDist = {};
    orders.forEach(function (o) { stDist[o.status] = (stDist[o.status] || 0) + 1; });
    var stHtml = ORDER_STATUS.filter(function (s) { return stDist[s]; }).map(function (s) { return '<span class="tag">' + s + ' ' + stDist[s] + '</span>'; }).join('') || '无';
    // 生产延期
    var delayProd = prods.filter(function (p) { return p.node !== '生产完成' && util.daysBetween(p.deliverDate, util.today()) !== null && util.daysBetween(p.deliverDate, util.today()) < 0; });
    var delayHtml = delayProd.length ? delayProd.map(function (p) { return '<tr><td>' + esc(p.no) + '</td><td>' + esc(p.customer) + '</td><td>' + p.node + '</td><td>' + p.percent + '%</td><td class="row-danger">' + esc(p.deliverDate) + '</td></tr>'; }).join('') : '<tr><td class="empty" colspan="5">无延期</td></tr>';
    // 客户回款
    var byCust = {};
    recs.forEach(function (r) { byCust[r.customer] = byCust[r.customer] || { amt: 0, rec: 0 }; byCust[r.customer].amt += r.amount; byCust[r.customer].rec += util.sum(r.receiveRecords || [], 'amount'); });
    var custHtml = Object.keys(byCust).map(function (c) { return '<tr><td>' + esc(c) + '</td><td>' + util.money(byCust[c].amt) + '</td><td>' + util.money(byCust[c].rec) + '</td><td>' + util.money(byCust[c].amt - byCust[c].rec) + '</td></tr>'; }).join('') || '<tr><td class="empty" colspan="4">暂无</td></tr>';
    // 异常类型
    var excDist = {}; excs.forEach(function (e) { excDist[e.type] = (excDist[e.type] || 0) + 1; });
    var excHtml = Object.keys(excDist).map(function (t) { return '<span class="tag">' + t + ' ' + excDist[t] + '</span>'; }).join('') || '无';

    view.innerHTML =
      '<div class="grid" style="grid-template-columns:1fr 1fr">' +
      panel('订单统计表（按月）', '<button class="btn sm" data-x="order">导出</button>', tableView(['月份', '订单数', '金额'], [orderStat])) +
      panel('订单状态分布', '', '<div style="padding:14px">' + stHtml + '</div>') +
      panel('生产进度 / 延期汇总', '<button class="btn sm" data-x="prod">导出</button>', tableView(['订单号', '客户', '节点', '进度', '交货期'], [delayHtml])) +
      panel('发货物流（签收异常）', '<button class="btn sm" data-x="ship">导出</button>', tableView(['订单号', '客户', '发货量', '状态', '异常'], ships.map(function (s) { return '<tr><td>' + esc(s.no) + '</td><td>' + esc(s.customer) + '</td><td>' + s.shipQty + '</td><td>' + badge(s.status) + '</td><td>' + (s.abnormal ? esc(s.abnormal) : '-') + '</td></tr>'; }))) +
      panel('客户对账回款', '<button class="btn sm" data-x="cust">导出</button>', tableView(['客户', '应收', '已收', '未收'], [custHtml])) +
      panel('异常售后报表（类型汇总）', '<button class="btn sm" data-x="exc">导出</button>', '<div style="padding:14px">' + excHtml + '</div>') +
      '</div>';
    view.querySelectorAll('[data-x]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.x;
        if (k === 'order') util.exportCSV('订单统计_' + util.today(), ['月份', '订单数', '金额'], months.map(function (m) { return { '月份': m, '订单数': byMonth[m].cnt, '金额': byMonth[m].amt }; }));
        if (k === 'prod') util.exportCSV('生产延期_' + util.today(), ['订单号', '客户', '节点', '进度', '交货期'], delayProd.map(function (p) { return { '订单号': p.no, '客户': p.customer, '节点': p.node, '进度': p.percent, '交货期': p.deliverDate }; }));
        if (k === 'ship') util.exportCSV('发货物流_' + util.today(), ['订单号', '客户', '发货量', '状态', '异常'], ships.map(function (s) { return { '订单号': s.no, '客户': s.customer, '发货量': s.shipQty, '状态': s.status, '异常': s.abnormal }; }));
        if (k === 'cust') util.exportCSV('客户回款_' + util.today(), ['客户', '应收', '已收', '未收'], Object.keys(byCust).map(function (c) { return { '客户': c, '应收': byCust[c].amt, '已收': byCust[c].rec, '未收': byCust[c].amt - byCust[c].rec }; }));
        if (k === 'exc') util.exportCSV('异常汇总_' + util.today(), ['类型', '数量'], Object.keys(excDist).map(function (t) { return { '类型': t, '数量': excDist[t] }; }));
      };
    });
  }
  function panel(title, action, body) {
    return '<div class="panel" style="padding:16px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="font-size:15px">' + title + '</h3>' + (action || '') + '</div>' + body + '</div>';
  }

  /* ============================ 数据看板 ============================ */
  function renderDashboard() {
    var view = document.getElementById('view');
    var orders = store.list('orders'), prods = store.list('productions'), recs = store.list('reconciliations'), excs = store.list('exceptions');
    var noships = store.list('noships');
    var today = util.today();
    var totalAmt = util.sum(orders, 'total');
    var unpaid = util.sum(orders, 'unpaid');
    var producing = prods.filter(function (p) { return p.node !== '生产完成'; }).length;
    var noshipInTransit = noships.filter(function (s) { return s.status !== '已签收'; }).length;
    var noshipTotalQty = util.sum(noships, 'shipQty');
    var shipping = store.list('shipments').filter(function (s) { return s.status !== '已签收'; }).length + noshipInTransit;
    var pendingExc = excs.filter(function (e) { return e.progress !== '已解决' && e.progress !== '闭环归档'; }).length;
    // 近6月订单趋势
    var months = []; for (var i = 5; i >= 0; i--) { var d = new Date(); d.setMonth(d.getMonth() - i); months.push('' + d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)); }
    var trend = months.map(function (m) { return orders.filter(function (o) { return util.fmtDate(o.date).slice(0, 7) === m; }).length; });
    var maxT = Math.max.apply(null, trend.concat([1]));
    var chart = '<div class="chart-bar">' + months.map(function (m, i) { return '<div class="col"><div class="num">' + trend[i] + '</div><div class="bar" style="height:' + (trend[i] / maxT * 120) + 'px"></div><div class="lab">' + m.slice(2) + '</div></div>'; }).join('') + '</div>';

    // 预警
    var alerts = gatherAlerts();
    var alertHtml = alerts.length ? alerts.map(function (a) {
      return '<div class="alert-item ' + (a.level === 'danger' ? 'danger' : 'warn') + '"><div class="ico">' + (a.level === 'danger' ? '🔴' : '🟡') + '</div><div class="txt"><b>' + esc(a.title) + '</b><small>' + esc(a.desc) + '</small></div></div>';
    }).join('') : '<div class="empty">暂无预警 🎉</div>';

    view.innerHTML =
      '<div class="kpi-row">' +
      kpi('订单总数', orders.length, 'blue', '累计 ' + util.money(totalAmt)) +
      kpi('生产中', producing, 'orange', '跟进中订单') +
      kpi('待回款', util.money(unpaid), 'red', recs.filter(function (r) { return r.status !== '全款结清'; }).length + ' 单未结清') +
      kpi('运输中', shipping, 'indigo', '在途发货（含无单）') +
      kpi('无单出货', noships.length, 'teal', noshipInTransit + ' 单在途 · 共出货 ' + util.num(noshipTotalQty), 'noship') +
      kpi('未处理异常', pendingExc, 'purple', '需跟进闭环') +
      '</div>' +
      '<div class="grid" style="grid-template-columns:1.4fr 1fr">' +
      panel('近6个月订单趋势', '', chart) +
      panel('智能预警', '<button class="btn sm" data-go="todo">去待办</button> <button class="btn sm" data-act="push-feishu">推送到飞书</button>', alertHtml) +
      '</div>' +
      '<div class="grid" style="grid-template-columns:1fr 1fr;margin-top:16px">' +
      panel('订单状态分布', '<a class="btn sm" href="#/orders">查看</a>', '<div style="padding:14px">' + ORDER_STATUS.filter(function (s) { var n = orders.filter(function (o) { return o.status === s; }).length; return n; }).map(function (s) { return '<span class="tag">' + s + ' ' + orders.filter(function (o) { return o.status === s; }).length + '</span>'; }).join('') + '</div>') +
      panel('快捷入口', '', '<div style="padding:14px;display:flex;flex-wrap:wrap;gap:10px">' +
        '<a class="btn" href="#/orders">＋ 接单</a><a class="btn" href="#/production">生产跟进</a><a class="btn" href="#/shipment">发货</a><a class="btn" href="#/noship">无单出货</a><a class="btn" href="#/reconciliation">对账</a><a class="btn" href="#/exception">售后</a><a class="btn" href="#/reports">报表</a></div>') +
      '</div>';
    view.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () { location.hash = '#/' + b.dataset.go; };
    });
    var fsBtn = view.querySelector('[data-act="push-feishu"]');
    if (fsBtn) fsBtn.onclick = function () { pushFeishu(alerts, '内销跟单·预警提醒'); };
  }
  function kpi(label, val, color, sub, route) {
    var go = route ? ' data-go="' + route + '" style="cursor:pointer"' : '';
    return '<div class="stat-card"' + go + '><div class="bar b-' + color + '"></div><div class="label">' + label + '</div><div class="val">' + val + '</div><div class="sub">' + (sub || '') + '</div></div>';
  }

  /* ==================== 投稿人解析（订单号 → 投稿人） ====================
   * 待转采购记录里的投稿人可能出现在三处：rawText、「来源」字段、云端映射缓存。
   * 映射缓存直接落 localStorage（独立前缀，不进加密 store、不触发自动备份），
   * 每次打开「同事投稿」或启动工作台时从 Supabase 静默刷新。
   */
  var SUBMAP_KEY = 'nx_submap_v1';
  function loadSubmap() {
    try { return JSON.parse(localStorage.getItem(SUBMAP_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveSubmap(map) {
    try { localStorage.setItem(SUBMAP_KEY, JSON.stringify(map)); } catch (e) { /* 配额满则忽略，不影响主流程 */ }
  }
  function pendingSubmitter(p) {
    if (!p) return '';
    var m = String(p.rawText || '').match(/投稿人[:：]\s*([^，,；;、\s）)]+)/);
    if (m && m[1]) return m[1].trim();
    var src = String(p.source || ''), i = src.indexOf('·');
    if (i >= 0) { var s = src.slice(i + 1).trim(); if (s) return s; }
    var map = loadSubmap(), k = String(p.no || '').trim();
    return (k && map[k]) ? String(map[k]) : '';
  }
  // 从云端拉全量「订单号 → 投稿人」写入缓存（含已导入的历史投稿）
  function refreshColleagueSubmitterMap() {
    var sb = nxSB();
    if (!sb) return Promise.resolve(false);
    return sb.from('colleague_orders').select('order_no, submitter').order('created_at', { ascending: false }).then(function (r) {
      if (r.error || !r.data || !r.data.length) return false;
      var map = loadSubmap(), n = 0, fixed = 0, seen = {};
      r.data.forEach(function (d) {
        var k = String(d.order_no || '').trim();
        if (!k || seen[k]) return;                 // 按时间倒序：同一单号只取最新一条
        var v = String(d.submitter || '').trim();
        if (!v) return;
        seen[k] = 1;
        if (map[k] !== v) { if (map[k]) fixed++; else n++; map[k] = v; }
      });
      if (n || fixed) {
        saveSubmap(map);
        console.log('[投稿人映射] 新增 ' + n + ' 条' + (fixed ? '、更正 ' + fixed + ' 条' : '') + '，缓存共 ' + Object.keys(map).length + ' 条');
      }
      return true;
    }).catch(function () { return false; });
  }

  /* ============================ 飞书提醒推送 ============================ */
  function pushFeishu(alerts, title) {
    var s = store.getSettings();
    if (!s.feishuWebhook) { ui.toast('未配置飞书 Webhook，请在「设置」中填写', 'warn'); return Promise.resolve(false); }
    if (typeof fetch === 'undefined') { ui.toast('当前环境不支持推送，请用本地服务器运行本工作台', 'err'); return Promise.resolve(false); }
    var text = (title || '【内销跟单·待办提醒】') + '\n' +
      (alerts && alerts.length ? alerts.map(function (a) { return (a.level === 'danger' ? '🔴 ' : '🟡 ') + a.title + '：' + a.desc; }).join('\n') : '当前无待办提醒 🎉');
    return fetch('/api/feishu', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook: s.feishuWebhook, secret: s.feishuSecret || '', text: text, title: title || '内销跟单提醒' })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.code === 0) { ui.toast('已推送到飞书', 'ok'); return true; }
      var msg = (j && (j.msg || j.error)) || '未知错误';
      if (j && j.debug) { console.log('[feishu push debug]', j.debug); }
      if (msg.indexOf('sign match fail') >= 0 || msg.indexOf('timestamp') >= 0) {
        msg += '；请检查：①飞书「签名校验」是否开启且 Secret 已正确填写 ②若未开启签名校验，Secret 请留空 ③系统时间是否准确';
      }
      ui.toast('飞书推送失败：' + msg, 'err'); return false;
    }).catch(function (e) { ui.toast('飞书推送失败（需通过本地服务器运行）：' + e.message, 'err'); return false; });
  }

  /* ============================ 全局提醒 ============================ */
  function gatherAlerts() {
    var today = util.today(), out = [];
    var orders = store.list('orders'), prods = store.list('productions'), recs = store.list('reconciliations'), excs = store.list('exceptions');
    var noships = store.list('noships');
    prods.forEach(function (p) {
      var d = util.daysBetween(p.deliverDate, today);
      if (p.node !== '生产完成' && d !== null && d < 0) out.push({ level: 'danger', title: '生产逾期：' + p.no, desc: p.customer + ' 节点' + p.node + '，已逾期' + (-d) + '天', route: 'production' });
      else if (p.node !== '生产完成' && d !== null && d <= 3) out.push({ level: 'warn', title: '生产临期：' + p.no, desc: p.customer + ' 距交货期仅' + d + '天', route: 'production' });
    });
    orders.forEach(function (o) {
      var d = util.daysBetween(o.deliverDate, today);
      if ((o.status === '待发货') && d !== null && d <= 0) out.push({ level: 'danger', title: '到期待发货：' + o.no, desc: o.customer + ' 交货期' + util.fmtDateView(o.deliverDate), route: 'orders' });
    });
    recs.forEach(function (r) {
      if (r.status !== '全款结清' && r.periodDue) { var d = util.daysBetween(r.periodDue, today); if (d !== null && d < 0) out.push({ level: 'danger', title: '回款逾期：' + r.no, desc: r.customer + ' 到期' + util.fmtDateView(r.periodDue), route: 'reconciliation' }); else if (d !== null && d <= 3) out.push({ level: 'warn', title: '回款临期：' + r.no, desc: r.customer + ' ' + d + '天内到期', route: 'reconciliation' }); }
    });
    excs.forEach(function (e) {
      if (e.progress === '待处理' || e.progress === '处理中') out.push({ level: e.progress === '待处理' ? 'danger' : 'warn', title: '售后异常：' + e.type, desc: (e.no || '-') + ' ' + e.desc, route: 'exception' });
    });
    noships.forEach(function (s) {
      if (s.abnormal) out.push({ level: 'warn', title: '无单出货异常：' + s.no, desc: s.customer + ' ' + s.abnormal, route: 'noship' });
    });
    store.list('pendings').forEach(function (p) {
      if (p.status !== '待转') return;
      var sub = pendingSubmitter(p);                                   // 投稿人（订单号后显示）
      var detail = [];
      if (p.customer) detail.push(p.customer);
      if (p.product) detail.push(p.product + ' ' + util.num(p.qty) + (p.unit || ''));
      if (!detail.length) detail.push(p.deliverDate ? ('交期 ' + util.fmtDateView(p.deliverDate)) : '待补充明细');
      out.push({
        level: 'warn',
        title: '待转采购未处理：' + p.no + (sub ? '（' + sub + '）' : ''),
        desc: detail.join(' · '),
        route: 'pendings'
      });
    });
    return out;
  }
  function showBell() {
    var alerts = gatherAlerts();
    var body = alerts.length ? alerts.map(function (a) {
      return '<div class="alert-item ' + (a.level === 'danger' ? 'danger' : 'warn') + '"><div class="ico">' + (a.level === 'danger' ? '🔴' : '🟡') + '</div><div class="txt"><b>' + esc(a.title) + '</b><small>' + esc(a.desc) + '</small></div><button class="btn sm" data-r="' + a.route + '">去处理</button></div>';
    }).join('') : '<p style="color:#7a8699;text-align:center;padding:20px">暂无提醒事项</p>';
    var m = ui.open({ title: '消息提醒（' + alerts.length + '）', body: body, size: 'lg', footer: [{ label: '关闭', cls: 'primary', onClick: function (c) { c(); } }] });
    m.modal.querySelectorAll('[data-r]').forEach(function (b) { b.onclick = function () { m.close(); location.hash = '#/' + b.dataset.r; }; });
  }

  /* ============================ 设置 ============================ */
  var _syncStateTimer = null;   // 设置页「团队同步」状态自动刷新

  function renderSettings() {
    var view = document.getElementById('view');
    var orderCount = store.list('orders').length, custCount = store.list('customers').length;
    view.innerHTML =
      '<div class="grid" style="grid-template-columns:1fr">' +
      panel('数据管理', '', '<div style="padding:6px 0">' +
        '<p style="margin-bottom:10px;color:#7a8699">当前数据：客户 ' + custCount + ' 家，订单 ' + orderCount + ' 单。所有数据保存在本浏览器，不上传服务器。</p>' +
        '<button class="btn" data-act="seed">加载示例数据</button> ' +
        '<button class="btn" data-act="export-all">导出全部数据(JSON)</button> ' +
        '<button class="btn danger" data-act="clear">清空全部数据</button>' +
        '</div>') +
      panel('团队同步（和同事共用一份数据）', '', '<div style="padding:6px 0">' +
        '<p style="margin-bottom:8px;color:#7a8699">你和你同事填<b>同一个团队名 + 同一个团队口令</b>，两边就能互相看到订单、客户、生产、发货、<b>待转采购</b>等模块的改动（约 20 秒自动同步一次，同一条记录以最后修改的为准）。数据上传前已用团队口令加密，云端只存密文。</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">' +
        '<input class="input" id="syncTeam" placeholder="团队名（例如：纽扣内销）">' +
        '<input class="input" id="syncPass" type="password" placeholder="团队口令（至少 4 位，同事填一样的）"></div>' +
        '<button class="btn primary" data-act="sync-on">开启同步</button> ' +
        '<button class="btn" data-act="sync-now">立即同步</button> ' +
        '<button class="btn" data-act="sync-off">关闭同步</button> ' +
        '<button class="btn danger" data-act="sync-wipe">清空云端</button>' +
        '<div id="syncState" style="margin-top:10px;font-size:12px;color:#5a6678;line-height:1.8"></div>' +
        '</div>') +
      panel('飞书提醒接入', '', '<div style="padding:6px 0">' +
        '<p style="margin-bottom:8px;color:#7a8699">在飞书群添加「自定义机器人」获取 Webhook 地址。若飞书机器人详情里「签名校验」为开启状态，必须填入对应的签名密钥；若未开启，此处留空。通过本地服务器（node server.js）运行本工作台后，延期/到期/新单/未回款/未处理异常等提醒即可推送到飞书。</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">' +
        '<input class="input" id="fsWh" placeholder="飞书 Webhook 地址（https://open.feishu.cn/...）">' +
        '<input class="input" id="fsSecret" placeholder="签名 Secret（开启签名校验时必填）"></div>' +
        '<button class="btn primary" data-act="fs-save">保存配置</button> ' +
        '<button class="btn" data-act="fs-test">测试发送</button>' +
        '</div>') +
      panel('操作日志', '<button class="btn sm" data-act="log-export">导出</button>', (function () {
        var logs = store.list('logs').slice(0, 200);
        return logs.length ? tableView(['时间', '操作', '对象', '摘要'], logs.map(function (l) { return '<tr><td class="nowrap">' + util.fmtDateTime(l.time) + '</td><td>' + esc(l.action) + '</td><td>' + esc(l.target) + '</td><td>' + esc(l.summary) + '</td></tr>'; })) : '<div class="empty">暂无日志</div>';
      })()) +
      panel('说明', '', '<div style="padding:6px 0;color:#5a6678;line-height:1.8">' +
        '· 本工作台为内销跟单一体化工具，覆盖订单、生产、发货、客户、对账、售后六大模块。<br>' +
        '· 数据自动留痕（操作日志），支持一键导出 Excel(CSV) 与打印。<br>' +
        '· 建议使用 Chrome / Edge 浏览器，并定期「导出全部数据」备份。<br>' +
        '· 全局搜索支持订单号、客户、产品、手机号模糊匹配。</div>') +
      '</div>';
    // —— 团队同步（多人共用一份数据） ——
    var syncApi = (window.WB && window.WB.sync) ? window.WB.sync : null;
    var teamEl = view.querySelector('#syncTeam'), passEl = view.querySelector('#syncPass');
    function renderSyncState() {
      var el = view.querySelector('#syncState');
      if (!el) return;
      if (!syncApi) { el.innerHTML = '<span style="color:#9aa6b5">同步模块未加载（sync.js 未引入）</span>'; return; }
      var c = syncApi.getCfg(), s = syncApi.getState(), lines = [];
      lines.push('状态：<b style="color:' + (s.on ? '#1f9d55' : '#9aa6b5') + '">' + (s.on ? '已开启' : '未开启（仅本机使用）') + '</b>' + (c.team ? '　团队：<b>' + esc(c.team) + '</b>' : ''));
      if (s.on) {
        lines.push('上次拉取：' + (s.lastPull ? util.fmtDateTime(s.lastPull) : '—') + '　上次推送：' + (s.lastPush ? util.fmtDateTime(s.lastPush) : '—'));
        lines.push('最近收到云端 ' + s.remoteCount + ' 条；本机累计上传 ' + s.syncedCount + ' 条');
      }
      if (s.lastError) lines.push('<span style="color:#c62828">最近错误：' + esc(s.lastError) + '</span>');
      el.innerHTML = lines.join('<br/>');
    }
    if (syncApi && teamEl) {
      var c0 = syncApi.getCfg();
      teamEl.value = c0.team || '';
      if (passEl && c0.hasPass) passEl.placeholder = '已记住口令（重新输入可修改）';
    }
    renderSyncState();
    if (_syncStateTimer) clearInterval(_syncStateTimer);
    _syncStateTimer = setInterval(function () { if (view.querySelector('#syncState')) renderSyncState(); else { clearInterval(_syncStateTimer); _syncStateTimer = null; } }, 5000);

    var bSyncOn = view.querySelector('[data-act="sync-on"]');
    if (bSyncOn) bSyncOn.onclick = function () {
      if (!syncApi) return ui.toast('同步模块未加载', 'err');
      syncApi.enable((teamEl.value || '').trim(), passEl.value || '').then(function () {
        ui.toast('已开启团队同步，正在与云端对齐…', 'ok'); renderSyncState();
      }).catch(function (e) { ui.toast('开启失败：' + ((e && e.message) || e), 'err'); });
    };
    var bSyncNow = view.querySelector('[data-act="sync-now"]');
    if (bSyncNow) bSyncNow.onclick = function () {
      if (!syncApi || !syncApi.isOn()) return ui.toast('请先开启同步', 'warn');
      ui.toast('正在同步…'); syncApi.syncNow().then(renderSyncState);
    };
    var bSyncOff = view.querySelector('[data-act="sync-off"]');
    if (bSyncOff) bSyncOff.onclick = function () {
      if (!syncApi || !syncApi.isOn()) return ui.toast('当前未开启同步', 'warn');
      ui.confirm('关闭后本机不再与云端互通（云端数据保留，随时可再开）。确定关闭？').then(function (ok) {
        if (ok) { syncApi.disable(); ui.toast('已关闭团队同步'); renderSyncState(); }
      });
    };
    var bSyncWipe = view.querySelector('[data-act="sync-wipe"]');
    if (bSyncWipe) bSyncWipe.onclick = function () {
      if (!syncApi || !syncApi.isOn()) return ui.toast('请先开启同步', 'warn');
      ui.confirm('将删除云端该团队的全部同步数据（本机数据不受影响）。确定？').then(function (ok) {
        if (ok) syncApi.wipeRemote().then(function () { ui.toast('云端数据已清空', 'ok'); renderSyncState(); });
      });
    };
    view.querySelector('[data-act="seed"]').onclick = function () { ui.confirm('将载入示例数据（仅在无数据时有效）？').then(function (ok) { if (ok) { store.seedDemo(); ui.toast('示例数据已加载', 'ok'); renderSettings(); renderView(); } }); };
    view.querySelector('[data-act="export-all"]').onclick = function () {
      var all = {}; ['customers', 'orders', 'productions', 'shipments', 'noships', 'returns', 'pendings', 'reconciliations', 'exceptions', 'memos', 'logs'].forEach(function (k) { all[k] = store.list(k); });
      util.download(new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' }), '内销跟单数据备份_' + util.today() + '.json');
    };
    view.querySelector('[data-act="clear"]').onclick = function () { ui.confirm('确定清空全部数据？此操作不可恢复！').then(function (ok) { if (ok) { ['customers', 'orders', 'productions', 'shipments', 'noships', 'returns', 'pendings', 'reconciliations', 'exceptions', 'memos', 'logs'].forEach(function (k) { store.save(k, []); }); ui.toast('已清空', 'ok'); renderSettings(); renderView(); } }); };
    view.querySelector('[data-act="log-export"]').onclick = function () { util.exportCSV('操作日志_' + util.today(), ['时间', '操作', '对象', '摘要'], store.list('logs').map(function (l) { return { '时间': util.fmtDateTime(l.time), '操作': l.action, '对象': l.target, '摘要': l.summary }; })); };
    // 飞书配置
    var s0 = store.getSettings();
    view.querySelector('#fsWh').value = s0.feishuWebhook || '';
    view.querySelector('#fsSecret').value = s0.feishuSecret || '';
    view.querySelector('[data-act="fs-save"]').onclick = function () {
      store.saveSettings({ feishuWebhook: view.querySelector('#fsWh').value.trim(), feishuSecret: view.querySelector('#fsSecret').value.trim() });
      ui.toast('已保存飞书配置', 'ok');
    };
    view.querySelector('[data-act="fs-test"]').onclick = function () {
      // 测试前先把当前输入框里的值保存下来，避免用户改了没点保存就用旧配置测试
      var wh = view.querySelector('#fsWh').value.trim();
      var sec = view.querySelector('#fsSecret').value.trim();
      store.saveSettings({ feishuWebhook: wh, feishuSecret: sec });
      pushFeishu([{ level: 'warn', title: '测试消息', desc: '这是一条来自内销跟单工作台的测试提醒' }], '内销跟单·测试');
    };
  }

  /* ============================ 全局搜索 ============================ */
  function initSearch() {
    var input = document.getElementById('globalSearch');
    var pop = document.getElementById('searchResults');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (!q) { pop.innerHTML = ''; pop.style.display = 'none'; return; }
      var orders = store.list('orders'), customers = store.list('customers');
      var oHit = orders.filter(function (o) { return (o.no + o.customer + o.product + o.phone).toLowerCase().indexOf(q) >= 0; }).slice(0, 6);
      var cHit = customers.filter(function (c) { return (c.name + c.phone).toLowerCase().indexOf(q) >= 0; }).slice(0, 4);
      var html = '';
      if (cHit.length) { html += '<div class="grp">客户</div>' + cHit.map(function (c) { return '<div class="item" data-type="customer" data-id="' + c.id + '">' + esc(c.name) + ' · ' + esc(c.phone) + '</div>'; }).join(''); }
      if (oHit.length) { html += '<div class="grp">订单</div>' + oHit.map(function (o) { return '<div class="item" data-type="order" data-id="' + o.id + '">' + esc(o.no) + ' · ' + esc(o.customer) + ' · ' + esc(o.product) + '</div>'; }).join(''); }
      if (!html) html = '<div class="item">无匹配结果</div>';
      pop.innerHTML = html; pop.style.display = 'block';
      pop.querySelectorAll('.item[data-id]').forEach(function (it) {
        it.onclick = function () {
          pop.style.display = 'none'; input.value = '';
          if (it.dataset.type === 'order') { location.hash = '#/orders'; setTimeout(function () { orderDetail(it.dataset.id); }, 100); }
          else { location.hash = '#/customers'; }
        };
      });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.top-search')) pop.style.display = 'none'; });
  }

  /* ============================ 路由 ============================ */
  var ROUTES = {
    dashboard: { title: '数据看板', render: renderDashboard },
    orders: { title: '订单管理', render: renderOrders },
    production: { title: '生产跟进', render: renderProduction },
    shipment: { title: '发货物流', render: renderShipment },
    noship: { title: '无单出货', render: renderNoShip },
    customers: { title: '客户档案', render: renderCustomers },
    reconciliation: { title: '对账回款', render: renderReconciliation },
    exception: { title: '异常售后', render: renderException },
    returns: { title: '退货管理', render: renderReturns },
    pendings: { title: '待转采购', render: renderPending },
    todo: { title: '待办中心', render: renderTodo },
    reports: { title: '报表中心', render: renderReports },
    settings: { title: '设置', render: renderSettings },
    backup: { title: '数据备份', render: renderBackupPanel }
  };
  /* 同事版（staff.html 注入 __NXGD_STAFF__）：
   *   · 待转采购 —— 2026-11-16 起已开放给同事（与主端双向同步，共用一份待转清单）
   *   · 数据备份 —— 依赖本机 node server 的 /api 接口，公网静态版用不了，隐藏免得报错 */
  var STAFF = !!window.__NXGD_STAFF__;
  if (STAFF) { delete ROUTES.backup; }
  // 每个模块独立记忆自己的滚动位置，杜绝「滚动A模块、B模块也跟着滑」的联动问题
  var _routeScroll = {};
  var _curRoute = null;
  function renderView() {
    var route = (location.hash.replace('#/', '') || 'dashboard');
    // 模块切换时，先把当前模块的滚动位置存下来（必须在 render 替换 innerHTML 之前，否则会被浏览器重置为0）
    if (_curRoute && _curRoute !== route) {
      var v0 = document.getElementById('view');
      if (v0) _routeScroll[_curRoute] = v0.scrollTop;
    }
    var r = ROUTES[route] || ROUTES.dashboard;
    document.getElementById('pageTitle').textContent = r.title;
    [].forEach.call(document.querySelectorAll('#nav a'), function (a) { a.classList.toggle('active', a.dataset.route === (r === ROUTES.dashboard ? 'dashboard' : route)); });
    r.render();
    // 切换模块后恢复到该模块自己上次的位置；同一模块刷新（route 未变）则保持当前位置不动
    var v = document.getElementById('view');
    if (v && _curRoute !== route) v.scrollTop = (_routeScroll[route] || 0);
    _curRoute = route;
  }

  /* ============================ 数据备份（方案 A） ============================ */
  var _backupTimer = null;
  function getAutoBackup() { return store.load('backupAuto', true) !== false; }
  function setAutoBackup(on) { store.save('backupAuto', !!on); }
  // 防抖：数据变更后 8 秒写一份自动备份（避免每次 save 都落盘）
  WB.scheduleBackup = function () {
    if (!store.crypto.ready) return;   // 未解锁不备份
    if (!getAutoBackup()) return;
    if (_backupTimer) return;
    _backupTimer = setTimeout(function () { _backupTimer = null; doBackup(true); }, 8000);
  };
  function fmtBakName(d) {
    function p(n) { return ('0' + n).slice(-2); }
    return 'backup_' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds()) + '.bak.json';
  }
  function doBackup(silent) {
    if (!store.crypto.ready) { if (!silent) ui.toast('请先解锁再备份', 'warn'); return; }
    store.exportAll().then(function (bundle) {
      var payload = JSON.stringify(bundle);
      var filename = fmtBakName(new Date(bundle.ts));
      return fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: filename, payload: payload }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.code === 0) { if (!silent) ui.toast('已备份：' + filename, 'ok'); if (location.hash.replace('#/', '') === 'backup') loadBackups(); }
          else { if (!silent) ui.toast('备份失败：' + (j.msg || ''), 'err'); }
        });
    }).catch(function (e) { if (!silent) ui.toast('备份出错：' + e.message, 'err'); });
  }
  function loadBackups() {
    var box = document.getElementById('backupList');
    if (!box) return;
    fetch('/api/backups').then(function (r) { return r.json(); }).then(function (j) {
      if (j.code !== 0) { box.innerHTML = '<div class="empty">加载失败</div>'; return; }
      if (!j.list.length) { box.innerHTML = '<div class="empty">暂无备份，点「立即备份」生成第一份</div>'; return; }
      // 按大小降序：含数据的备份在前，避免空备份被默认选中
      var list = j.list.slice().sort(function (a, b) { return b.size - a.size; });
      box.innerHTML = list.map(function (f, idx) {
        var dt = f.mtime ? util.fmtDateTime(f.mtime) : '';
        var sz = (f.size / 1024).toFixed(1) + ' KB';
        var isEmpty = f.size < 1024;
        var rec = idx === 0 && !isEmpty ? ' <span style="color:#2a9d4b;font-size:11px;border:1px solid #2a9d4b;padding:1px 5px;border-radius:4px;margin-left:6px;">推荐</span>' : '';
        var emptyTag = isEmpty ? ' <span style="color:#999;font-size:11px;margin-left:6px;">空备份</span>' : '';
        return '<div class="backup-item' + (isEmpty ? ' empty-bak' : '') + '"><div class="backup-meta"><b>' + util.esc(f.name) + rec + emptyTag + '</b><span>' + dt + ' · ' + sz + '</span></div>' +
          '<div class="backup-acts"><button class="btn" data-restore="' + util.esc(f.name) + '">恢复</button>' +
          '<button class="btn" data-dl="' + util.esc(f.name) + '">下载</button></div></div>';
      }).join('');
    }).catch(function () { box.innerHTML = '<div class="empty">加载失败</div>'; });
  }
  function restoreBackup(name) {
    ui.confirm('恢复「' + name + '」会覆盖当前所有数据。\n恢复后需重新输入访问密码解锁。确定继续？').then(function (ok) {
      if (!ok) return;
      fetch('/api/backup?file=' + encodeURIComponent(name)).then(function (r) {
        if (!r.ok) throw new Error('备份不存在');
        return r.json();
      }).then(function (bundle) { return store.importAll(bundle); }).then(function () {
        ui.toast('恢复成功，正在重新解锁…', 'ok');
        setTimeout(function () { location.reload(); }, 800);
      }).catch(function (e) { ui.toast('恢复失败：' + e.message, 'err'); });
    });
  }
  function downloadBackup(name) {
    fetch('/api/backup?file=' + encodeURIComponent(name)).then(function (r) {
      if (!r.ok) throw new Error('备份不存在');
      return r.text();
    }).then(function (txt) {
      util.download(new Blob([txt], { type: 'application/json' }), name);
    }).catch(function (e) { ui.toast('下载失败：' + e.message, 'err'); });
  }
  function renderBackupPanel() {
    var auto = getAutoBackup();
    document.getElementById('view').innerHTML =
      '<div class="card"><div class="card-h">本地数据备份 <span class="hint">（方案 A · 防丢失）</span></div><div class="card-b">' +
      '<p class="muted">备份内容是 <b>AES 加密密文</b>，落在本机服务器 <code>backups/</code> 目录。备份文件被他人拿到也读不到明文；恢复时需输入访问密码。</p>' +
      '<div class="row"><button class="btn primary" id="btnBackupNow">立即备份</button>' +
      '<label class="switch"><input type="checkbox" id="autoBackupChk"' + (auto ? ' checked' : '') + '> 数据变更后自动备份（默认开启）</label></div>' +
      '<div class="backup-list" id="backupList"><div class="empty">加载中…</div></div></div></div>';
    document.getElementById('btnBackupNow').onclick = function () { doBackup(false); };
    document.getElementById('autoBackupChk').onchange = function (e) { setAutoBackup(e.target.checked); ui.toast(e.target.checked ? '已开启自动备份' : '已关闭自动备份', 'ok'); };
    document.getElementById('backupList').addEventListener('click', function (e) {
      var t = e.target;
      if (t.dataset.restore) restoreBackup(t.dataset.restore);
      else if (t.dataset.dl) downloadBackup(t.dataset.dl);
    });
    loadBackups();
  }

  /* ============================ 初始化 ============================ */
  function init() {
    window.__NXGD_BACKUP_HOOK__ = WB.scheduleBackup;   // 方案 A：解锁后挂载自动备份钩子
    window.__NXGD_REFRESH__ = renderView;              // 团队同步拉到别人的改动后，重画当前界面
    if (window.__NXGD_SYNC_BOOT__) {                   // 上次开过同步 → 解锁后自动连上
      try { window.__NXGD_SYNC_BOOT__(); } catch (e) { console.warn('团队同步启动失败', e); }
    }
    window.__NXGD_FLUSH_ERROR__ = function (name, e) { // 落盘失败必须让用户看见（静默=刷新丢数据）
      var quota = e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || ''));
      var tip = quota
        ? '⚠️ 浏览器存储已满！刚才的修改没有真正保存，刷新后会丢失。请立即「数据备份」导出一份，并减少大附件后重试。'
        : '⚠️ 数据保存失败（' + name + '）：' + ((e && e.message) || e) + '，刷新前请先「数据备份」导出！';
      try { ui.toast(tip, 'err'); } catch (e2) { alert(tip); }
      console.error('[存储告警]', name, e);
    };
    if (getAutoBackup()) WB.scheduleBackup();           // 启动即生成一份当前快照（防抖）
    if (!store.list('customers').length && !store.list('orders').length) {
      // 首次使用：不强制，但提示可加载示例
    }
    repairOrderShipQty(); // 启动时自动修正已出/未出数量不一致
    document.getElementById('bellBtn').onclick = showBell;
    window.addEventListener('hashchange', renderView);
    initSearch();
    renderView();
    // 启动提醒：先补全「订单号 → 投稿人」映射（云端静默拉取），保证提醒与飞书推送带上投稿人
    // 同事版不碰云端投稿数据，直接跑本地提醒
    if (STAFF) { try { runStartupAlerts(); } catch (e) { console.warn(e); } }
    else refreshColleagueSubmitterMap().then(runStartupAlerts, runStartupAlerts);
  }

  /* 启动预警：右下角 toast + 自动推送飞书（同内容 30 分钟内不重复推，避免每次切回都推） */
  function runStartupAlerts() {
    var alerts = gatherAlerts();
    document.getElementById('bellDot').classList.toggle('hidden', alerts.length === 0);
    if (!alerts.length) return;
    setTimeout(function () {
      alerts.slice(0, 4).forEach(function (a, i) {
        setTimeout(function () { ui.toast((a.level === 'danger' ? '🔴 ' : '🟡 ') + a.title + '：' + a.desc, a.level === 'danger' ? 'err' : 'warn'); }, i * 600);
      });
    }, 800);
    if (!store.getSettings().feishuWebhook) return;
    try {
      var sig = JSON.stringify(alerts.map(function (a) { return a.level + '|' + a.title + '|' + a.desc; }));
      var last = store.load('lastFeishuPush', {}) || {};
      var nowTs = Date.now();
      var INTERVAL = 30 * 60 * 1000; // 30 分钟内同内容不再自动推
      if (last.sig !== sig || !last.ts || (nowTs - last.ts) > INTERVAL) {
        setTimeout(function () {
          pushFeishu(alerts, '内销跟单·启动预警').then(function (ok) {
            if (ok) { store.save('lastFeishuPush', { sig: sig, ts: Date.now() }); }
          });
        }, 1600);
      }
    } catch (e) {}
  }

  // 暴露给 auth.js 门禁：解锁成功后再初始化应用（未解锁时由 auth 拦截，不自动 init）
  WB.startApp = init;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { if (!window.__authBooted) init(); });
  } else {
    if (!window.__authBooted) init();
  }

})(window);
