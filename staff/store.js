/* =========================================================================
 * 内销跟单工作台 —— 数据层 store.js
 * 所有数据持久化在浏览器 localStorage，无需后端，双击 index.html 即可使用。
 * 暴露全局对象：WB.store / WB.util
 * ========================================================================= */
(function (global) {
  'use strict';

  var PREFIX = 'nxgd_'; // 内销跟单

  /* —— 加密层状态（AES-256-GCM）——
   * 设计：store 对外仍是同步 API；内存维护明文缓存 _cache，解锁时一次性解密全部数据进缓存。
   *  - load：直接读 _cache（同步，即时返回）
   *  - save：更新 _cache + 异步加密落盘（fire-and-forget）
   *  - 密钥仅存内存，不持久化；刷新页面需重新输密码
   *  - 密码经 PBKDF2 派生 AES-GCM 密钥；固定串 'AUTH_OK' 加密后作为校验令牌(nxgd_auth)
   */
  var _cache = {};        // 内存明文缓存：name -> data
  var _cryptKey = null;   // CryptoKey（仅内存，不持久化）
  var _cryptReady = false;
  var AUTH_KEY = 'nxgd_auth';
  var SALT_KEY = 'nxgd_salt';
  // ⚠️ 旧版团队同步配置误用了 nxgd_ 前缀，会被下面的扫描当成业务模块 → 被加密落盘覆盖 →
  //    重开工作台后同步设置丢失。这里显式排除，并就地清理（sync.js 已改用无前缀的 wb_sync_cfg）
  var LEGACY_SYNC_KEY = 'nxgd_sync_cfg';
  var PBKDF2_ITER = 120000;

  /* ----------------------------- 数据读写 ----------------------------- */
  /* 变更通知：团队同步层（sync.js）通过 window.__NXGD_CHANGE_HOOK__ 订阅。
   * 这里只负责「喊一声」，不改动本地 CRUD 的任何行为；没启用团队同步时等于空转。 */
  function _notify(name, kind, item) {
    if (!global.__NXGD_CHANGE_HOOK__) return;
    try { global.__NXGD_CHANGE_HOOK__(name, kind, item); } catch (e) { console.warn('同步钩子异常', e); }
  }

  var store = {
    load: function (name, def) {
      if (!_cryptReady) return def;          // 未解锁不返回任何数据
      var v = _cache[name];
      if (v === undefined || v === null) return def;
      return v;
    },
    save: function (name, data, opts) {
      if (!_cryptReady) { console.warn('store.save 被拒：尚未解锁', name); return; }
      _cache[name] = data;                    // 内存立即生效（同步）
      store.crypto._flush(name, data).catch(function () {}); // 异步加密落盘（失败经 __NXGD_FLUSH_ERROR__ 通知，避免 unhandled rejection）
      if (global.__NXGD_BACKUP_HOOK__) { try { global.__NXGD_BACKUP_HOOK__(); } catch (e) {} } // 方案A：触发自动备份（防抖在 app 层）
      // 团队同步：remote=true 表示这次写入是「云端拉回来的」，不再回推（否则两端无限互相推送）
      if (!(opts && opts.remote) && global.__NXGD_CHANGE_HOOK__) {
        try { global.__NXGD_CHANGE_HOOK__(name, 'save', null); } catch (e) { console.warn('同步钩子异常', e); }
      }
    },
    // 通用集合操作（customers/orders/... 均为数组）
    list: function (name) {
      return store.load(name, []);
    },
    add: function (name, item) {
      var arr = store.list(name);
      if (!item.id) item.id = store.uid();
      item.createdAt = item.createdAt || Date.now();
      arr.unshift(item);
      store.save(name, arr);
      store.log('新增', name, item);
      _notify(name, 'add', item);
      return item;
    },
    update: function (name, id, patch) {
      var arr = store.list(name);
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          var before = JSON.parse(JSON.stringify(arr[i]));
          Object.assign(arr[i], patch);
          arr[i].updatedAt = Date.now();
          store.save(name, arr);
          store.log('修改', name, arr[i], before);
          _notify(name, 'update', arr[i]);
          return arr[i];
        }
      }
      return null;
    },
    remove: function (name, id) {
      var arr = store.list(name);
      var item = arr.find(function (x) { return x.id === id; });
      var next = arr.filter(function (x) { return x.id !== id; });
      store.save(name, next);
      if (item) store.log('删除', name, item);
      if (item) _notify(name, 'remove', item);
      return item;
    },
    get: function (name, id) {
      return store.list(name).find(function (x) { return x.id === id; }) || null;
    },
    // 生成唯一ID
    uid: function () {
      return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    },
    // 订单编号：年月(YYYYMM) + 当月4位流水（按现有最大流水+1，避免删除中间订单后重号）
    nextOrderNo: function () {
      var d = new Date();
      var ym = '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2);
      var max = 0;
      store.list('orders').forEach(function (o) {
        if ((o.no || '').indexOf(ym) === 0) {
          var n = parseInt((o.no + '').slice(ym.length), 10);
          if (!isNaN(n) && n > max) max = n;
        }
      });
      return ym + ('000' + (max + 1)).slice(-4);
    },
    // 操作日志（精简版：不再存储完整 before/after 对象，避免日志无限膨胀撑爆 localStorage）
    log: function (action, target, after, before) {
      var logs = store.list('logs');
      var summary = (after && (after.no || after.name || after.title || after.id)) || '';
      // 变更摘要只保留关键字段，不存完整对象；单条日志控制在 200 字符以内
      var change = '';
      if (before && after && action === '修改') {
        var keys = Object.keys(before).filter(function (k) {
          var a = after[k], b = before[k];
          if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify(a) !== JSON.stringify(b);
          return a !== b;
        }).slice(0, 6);
        change = keys.join(',');
      }
      logs.unshift({
        id: store.uid(),
        time: Date.now(),
        action: action,
        target: target,
        summary: String(summary).slice(0, 80),
        change: change.slice(0, 100)
      });
      if (logs.length > 200) logs.length = 200;
      store.save('logs', logs);
    },
    // 清理历史日志：删除 detail 字段、只保留最近 max 条。用于处理旧版日志撑爆存储的问题。
    compressLogs: function (max) {
      max = max || 200;
      var logs = store.list('logs');
      var before = JSON.stringify(logs).length;
      var cleaned = logs.map(function (l) {
        var c = { id: l.id, time: l.time, action: l.action, target: l.target, summary: l.summary };
        if (l.change) c.change = l.change;
        return c;
      });
      if (cleaned.length > max) cleaned.length = max;
      store.save('logs', cleaned);
      var after = JSON.stringify(cleaned).length;
      return { before: before, after: after, count: cleaned.length };
    },

    // 方案 A：导出全量（从 _cache 重新加密，确保备份一定是密文；含密码校验要素 + IndexedDB 附件）
    exportAll: function () {
      return _dumpIDB().then(function (files) {
        var ls = {};
        // auth/salt 原样导出（它们本身不是业务数据密文）
        var auth = localStorage.getItem(AUTH_KEY), salt = localStorage.getItem(SALT_KEY);
        if (auth) ls[AUTH_KEY] = auth;
        if (salt) ls[SALT_KEY] = salt;
        // 业务数据从 _cache 重新加密（直接调用 _encrypt，避免触发备份钩子导致循环）
        var keys = Object.keys(_cache);
        return Promise.all(keys.map(function (name) {
          return store.crypto._encrypt(_cache[name]).then(function (enc) {
            ls[PREFIX + name] = enc;
          });
        })).then(function () {
          return { v: 1, ts: Date.now(), ls: ls, files: files };
        });
      });
    },
    // 方案 A：导入全量（写回 localStorage 密文 + IndexedDB 附件），并重置加密运行时，强制重新输密码解锁
    importAll: function (obj) {
      return Promise.resolve().then(function () {
        // 先清空全部业务 key（排除密码校验要素），避免旧数据残留与备份叠加导致订单重复
        var toDel = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0 && k !== AUTH_KEY && k !== SALT_KEY) toDel.push(k);
        }
        toDel.forEach(function (k) { localStorage.removeItem(k); });
        if (obj.ls) {
          Object.keys(obj.ls).forEach(function (k) { if (obj.ls[k] != null) localStorage.setItem(k, obj.ls[k]); });
        }
        if (obj.files && obj.files.length) {
          return _openIDB().then(function (db) {
            return new Promise(function (res, rej) {
              var tx = db.transaction('files', 'readwrite');
              var stx = tx.objectStore('files');
              obj.files.forEach(function (f) { stx.put(f); });
              tx.oncomplete = function () { res(); };
              tx.onerror = function () { rej(tx.error); };
            });
          }).catch(function () {
            // 恢复备份时 IndexedDB 也不通 → 附件走第二通道，别让附件在备份里白白丢掉
            (obj.files || []).forEach(function (f) { if (f && f.id && f.data) _lsPut(f.id, f.data); });
          });
        }
      }).then(function () {
        _cryptReady = false; _cryptKey = null; _cache = {};
      });
    }
  };

  /* ===================== 加密层（AES-256-GCM + PBKDF2） ===================== */
  function _b64(buf) {
    var bytes = new Uint8Array(buf), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function _b64dec(str) {
    var bin = atob(str), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function _derive(pwd, saltBuf) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: saltBuf, iterations: PBKDF2_ITER, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }
  function _randIV() { var iv = new Uint8Array(12); crypto.getRandomValues(iv); return iv; }

  store.crypto = {
    get ready() { return _cryptReady; },
    isSet: function () { return !!localStorage.getItem(AUTH_KEY); },
    // 解锁：校验密码并一次性解密全部数据进 _cache
    unlock: function (pwd) {
      var saltB64 = localStorage.getItem(SALT_KEY);
      if (!saltB64) return Promise.resolve(false);
      return _derive(pwd, _b64dec(saltB64)).then(function (k) {
        var tok = localStorage.getItem(AUTH_KEY);
        if (!tok) return false;
        var p = tok.split('|');
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: _b64dec(p[0]) }, k, _b64dec(p[1]))
          .then(function (pt) {
            if (new TextDecoder().decode(pt) === 'AUTH_OK') {
              _cryptKey = k; _cryptReady = true;
              return store.crypto._loadCache().then(function () {
                // 若之前存在明文数据（兼容/异常状态），立即加密落盘（尽力而为）
                return store.crypto._flushAll().catch(function (e) { console.warn('解锁后落盘未完全成功', e); }).then(function () { return true; });
              });
            }
            return false;
          }).catch(function () { return false; });
      }).catch(function () { return false; });
    },
    // 首次设置密码：派生密钥 -> 迁移旧明文数据 -> 写校验令牌 -> 全量加密落盘
    setup: function (pwd) {
      var salt = crypto.getRandomValues(new Uint8Array(16));
      localStorage.setItem(SALT_KEY, _b64(salt));
      return _derive(pwd, salt).then(function (k) {
        _cryptKey = k; _cryptReady = true;
        _migratePlaintext();
        var iv = _randIV();
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode('AUTH_OK'))
          .then(function (ct) {
            localStorage.setItem(AUTH_KEY, _b64(iv) + '|' + _b64(ct));
            // 落盘尽力而为：存储已满也不应让「设置密码」失败（否则用户会以为没设上）
            return store.crypto._flushAll().catch(function (e) { console.warn('设置密码后落盘未完全成功', e); });
          });
      });
    },
    _encrypt: function (obj) {
      var iv = _randIV();
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, _cryptKey, new TextEncoder().encode(JSON.stringify(obj)))
        .then(function (ct) { return _b64(iv) + '|' + _b64(ct); });
    },
    _decrypt: function (str) {
      try {
        var p = String(str).split('|');
        if (p.length !== 2) return Promise.resolve(null);
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: _b64dec(p[0]) }, _cryptKey, _b64dec(p[1]))
          .then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); })
          .catch(function () { return Promise.resolve(null); });
      } catch (e) { return Promise.resolve(null); }
    },
    // 解锁后：把 localStorage 中全部加密值解密进 _cache；兼容明文（迁移/异常状态）
    _loadCache: function () {
      _cache = {};
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0 && k !== AUTH_KEY && k !== SALT_KEY && k !== LEGACY_SYNC_KEY) keys.push(k);
      }
      return Promise.all(keys.map(function (k) {
        var raw = localStorage.getItem(k);
        return store.crypto._decrypt(raw).then(function (obj) {
          if (obj != null) { _cache[k.slice(PREFIX.length)] = obj; return; }
          // 解密失败：尝试按明文 JSON 兼容读取（用于修复异常明文数据）
          try { _cache[k.slice(PREFIX.length)] = JSON.parse(raw); } catch (e) { _cache[k.slice(PREFIX.length)] = raw; }
        });
      })).then(function () {
        // 清理旧版同步配置残留（sync.js 已迁移到 wb_sync_cfg；若这里还留着密文会被反复当模块加载）
        try { if (localStorage.getItem(LEGACY_SYNC_KEY) !== null) localStorage.removeItem(LEGACY_SYNC_KEY); } catch (e) {}
        // 自动瘦身历史日志：旧版日志可能包含完整对象 detail，体积巨大；
        // 若 logs 超过 500KB，自动清理为精简格式并只保留最近 200 条（日志非业务主数据，可安全裁剪）
        var logs = _cache['logs'];
        if (Array.isArray(logs) && JSON.stringify(logs).length > 500 * 1024) {
          store.compressLogs(200);
        }
      });
    },
    _flush: function (name, data) {
      if (data === null || data === undefined) return Promise.resolve();
      return store.crypto._encrypt(data).then(function (enc) {
        try { localStorage.setItem(PREFIX + name, enc); }
        catch (e) {
          // 配额超限等写入失败：不能静默！通知 app 层弹红色警告，否则刷新即丢数据
          console.error('加密落盘失败', name, e);
          if (global.__NXGD_FLUSH_ERROR__) { try { global.__NXGD_FLUSH_ERROR__(name, e); } catch (e2) {} }
          throw e;
        }
      }).catch(function (e) {
        console.error('加密落盘失败', name, e);
        if (global.__NXGD_FLUSH_ERROR__ && e && e.name !== 'QuotaExceededError') { try { global.__NXGD_FLUSH_ERROR__(name, e); } catch (e2) {} }
        return Promise.reject(e);
      });
    },
    // 全量落盘：单个 key 失败不影响整体，也绝不能 reject ——
    // 否则 unlock/setup 会把「落盘失败」误判成「密码错误」，导致用户明明密码正确却进不去
    _flushAll: function () {
      return Promise.all(Object.keys(_cache).map(function (name) {
        return store.crypto._flush(name, _cache[name]).catch(function () { return null; });
      }));
    },
    // 清空全部本地数据（忘记密码时调用，不可逆）
    reset: function () {
      var toDel = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) toDel.push(k);
      }
      toDel.forEach(function (k) { localStorage.removeItem(k); });
      _cache = {}; _cryptReady = false; _cryptKey = null;
    }
  };

  // 首次设置密码时：把现有明文（升级前）数据迁移进 _cache
  function _migratePlaintext() {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(PREFIX) === 0 && k !== AUTH_KEY && k !== SALT_KEY && k !== LEGACY_SYNC_KEY) {
        var raw = localStorage.getItem(k);
        var name = k.slice(PREFIX.length);
        try { _cache[name] = JSON.parse(raw); } catch (e) { /* 非 JSON，跳过 */ }
      }
    }
  }

  // 页面隐藏/卸载前尽力把内存数据加密落盘，缩小「保存后立刻刷新/关页」导致的数据丢失窗口
  function _bestEffortFlush() { try { store.crypto._flushAll(); } catch (e) {} }
  if (typeof global !== 'undefined' && global.addEventListener) {
    global.addEventListener('visibilitychange', function () { if (global.document && global.document.visibilityState === 'hidden') _bestEffortFlush(); });
    global.addEventListener('beforeunload', _bestEffortFlush);
  }

  /* ----------------------------- 工具函数 ----------------------------- */
  var util = {
    today: function () {
      var d = new Date();
      return util.fmtDate(d);
    },
    fmtDate: function (d) {
      if (!d) return '';
      if (typeof d === 'number') d = new Date(d);
      if (typeof d === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        d = new Date(d);
      }
      var y = d.getFullYear();
      var m = ('0' + (d.getMonth() + 1)).slice(-2);
      var day = ('0' + d.getDate()).slice(-2);
      return y + '-' + m + '-' + day;
    },
    // 界面显示用：斜杠分隔的纯阿拉伯数字（2026/08/04），不改变存储/计算用的 YYYY-MM-DD
    fmtDateView: function (d) {
      var s = util.fmtDate(d);
      if (!s) return '';
      return s.replace(/-/g, '/');
    },
    fmtDateTime: function (t) {
      if (!t) return '';
      var d = new Date(t);
      return util.fmtDateView(d) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    },
    // 两个日期相差天数 (a-b)，按天
    daysBetween: function (a, b) {
      if (!a || !b) return null;
      var da = new Date(util.fmtDate(a)).getTime();
      var db = new Date(util.fmtDate(b)).getTime();
      return Math.round((da - db) / 86400000);
    },
    money: function (n) {
      n = Number(n) || 0;
      return '¥' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    num: function (n) {
      return Number(n) || 0;
    },
    // 求和
    sum: function (arr, key) {
      return arr.reduce(function (s, x) { return s + (Number(x[key]) || 0); }, 0);
    },
    // 转义HTML
    esc: function (s) {
      if (s === null || s === undefined) return '';
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    // 状态徽章颜色映射
    statusColor: function (status) {
      var map = {
        '新订单': 'blue', '待确认': 'blue', '待排产': 'purple', '生产中': 'orange',
        '待验货': 'orange', '待发货': 'teal', '已发货': 'indigo', '已完成': 'green',
        '已取消': 'gray', '待处理': 'red', '处理中': 'orange', '已解决': 'green',
        '闭环归档': 'gray', '未对账': 'red', '已对账待回款': 'orange', '部分回款': 'orange',
        '全款结清': 'green', '运输中': 'indigo', '已签收': 'green', '逾期': 'red'
      };
      return map[status] || 'gray';
    },
    // 导出 CSV（带 BOM，Excel 正确显示中文）
    exportCSV: function (filename, headers, rows) {
      var lines = [];
      lines.push(headers.map(function (h) { return util.csvCell(h); }).join(','));
      rows.forEach(function (r) {
        lines.push(headers.map(function (h) { return util.csvCell(r[h]); }).join(','));
      });
      var content = '﻿' + lines.join('\r\n');
      var blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      util.download(blob, filename + '.csv');
    },
    csvCell: function (v) {
      if (v === null || v === undefined) v = '';
      v = String(v);
      if (/[",\r\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    },
    // 导出真正的 .xlsx（需页面已加载 SheetJS：lib/xlsx.full.min.js）。
    // rows 为对象数组，key 对应 headers；首行为表头。
    exportXLSX: function (filename, headers, rows) {
      if (!global.XLSX) { util.exportCSV(filename, headers, rows); return; }
      var aoa = [headers];
      rows.forEach(function (r) { aoa.push(headers.map(function (h) { return r[h]; })); });
      var ws = global.XLSX.utils.aoa_to_sheet(aoa);
      var wb = global.XLSX.utils.book_new();
      global.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      global.XLSX.writeFile(wb, filename + '.xlsx');
    },
    download: function (blob, filename) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },
    // 打印任意 HTML
    printHTML: function (title, html) {
      var w = window.open('', '_blank');
      if (!w) { alert('浏览器拦截了打印窗口，请允许弹窗'); return; }
      w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + util.esc(title) + '</title>');
      w.document.write('<style>body{font-family:"Microsoft YaHei",sans-serif;padding:24px;color:#222}' +
        'table{border-collapse:collapse;width:100%;font-size:12px}td,th{border:1px solid #ccc;padding:6px 8px;text-align:left}' +
        'h2{margin:0 0 12px}.mb{margin-bottom:16px}.right{text-align:right}.center{text-align:center}' +
        '@media print{.noprint{display:none}}</style></head><body>');
      w.document.write(html);
      w.document.write('<script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script>');
      w.document.write('</body></html>');
      w.document.close();
    }
  };

  /* ----------------------------- 示例数据 ----------------------------- */
  store.seedDemo = function () {
    if (store.list('customers').length || store.list('orders').length) return;
    var now = Date.now();
    var customers = [
      { id: store.uid(), name: '东莞市宏发五金制品厂', region: '华南', contact: '王经理', phone: '13800001111', wechat: 'wang_hf', address: '广东省东莞市长安镇振安路88号', level: '核心客户', firstCoop: '2023-03-12', totalAmount: 0, totalOrders: 0, credit: '优', prefer: '偏好含税报价；常规产品：不锈钢螺丝', taboo: '不接受延期', habit: '微信沟通为主', createdAt: now },
      { id: store.uid(), name: '苏州精工塑胶有限公司', region: '华东', contact: '李总', phone: '13900002222', wechat: 'li_jg', address: '江苏省苏州市工业园区星湖街66号', level: '老客户', firstCoop: '2022-09-01', totalAmount: 0, totalOrders: 0, credit: '良', prefer: '月结对账', taboo: '', habit: '邮件确认订单', createdAt: now + 1 },
      { id: store.uid(), name: '宁波新锐家居', region: '华东', contact: '张小姐', phone: '13700003333', wechat: 'zhang_xr', address: '浙江省宁波市鄞州区钱湖北路12号', level: '普通客户', firstCoop: '2024-06-20', totalAmount: 0, totalOrders: 0, credit: '良', prefer: '小批量多批次', taboo: '忌讳物流破损', habit: '电话沟通', createdAt: now + 2 }
    ];
    store.save('customers', customers);

    var orderStatus = ['新订单', '待确认', '待排产', '生产中', '待验货', '待发货', '已发货', '已完成', '已取消'];
    function mkOrder(idx, c) {
      var ym = '' + new Date().getFullYear() + ('0' + (new Date().getMonth() + 1)).slice(-2);
      var no = ym + ('000' + (idx + 1)).slice(-4);
      var qty = [500, 1200, 800][idx % 3];
      var price = [3.5, 12, 8.8][idx % 3];
      var total = +(qty * price).toFixed(2);
      var deliver = util.fmtDate(new Date(now + (idx - 1) * 6 * 86400000));
      var status = orderStatus[Math.min(idx, 7)];
      var prepay = +(total * 0.3).toFixed(2);
      var rest = +(total - prepay).toFixed(2);
      var received = idx === 7 ? total : (idx >= 4 ? prepay : 0);
      return {
        id: store.uid(), no: no, date: util.fmtDate(new Date(now - idx * 2 * 86400000)),
        customer: c.name, contact: c.contact, phone: c.phone, address: c.address, salesman: '陈晓',
        product: ['不锈钢内六角螺丝', 'ABS注塑外壳', '铝合金支架'][idx % 3],
        spec: ['M6×20', '200×150×40', 'L型 30cm'][idx % 3],
        material: ['304不锈钢', 'ABS', '6063铝'][idx % 3],
        color: ['本色', '黑色', '银色'][idx % 3],
        qty: qty, price: price, total: total, remark: idx === 1 ? '客户要求丝印LOGO' : '',
        status: status,
        confirmTime: idx >= 1 ? util.fmtDate(new Date(now - idx * 2 * 86400000 + 86400000)) : '',
        scheduleTime: idx >= 2 ? util.fmtDate(new Date(now - idx * 2 * 86400000 + 2 * 86400000)) : '',
        startTime: idx >= 3 ? util.fmtDate(new Date(now - idx * 2 * 86400000 + 3 * 86400000)) : '',
        expectFinish: util.fmtDate(new Date(now + (idx - 2) * 4 * 86400000)),
        actualFinish: idx >= 4 ? util.fmtDate(new Date(now - 1 * 86400000)) : '',
        deliverDate: deliver,
        prepay: prepay, rest: rest, received: received, unpaid: +(total - received).toFixed(2),
        payMethod: '银行转账',
        attachments: [],
        createdAt: now - idx * 86400000
      };
    }
    var orders = [
      mkOrder(0, customers[0]),
      mkOrder(1, customers[1]),
      mkOrder(2, customers[2]),
      mkOrder(3, customers[0]),
      mkOrder(4, customers[1]),
      mkOrder(5, customers[2]),
      mkOrder(6, customers[0]),
      mkOrder(7, customers[1])
    ];
    store.save('orders', orders);

    // 生产跟进
    var prods = orders.filter(function (o) { return ['生产中', '待验货', '待发货'].indexOf(o.status) >= 0; }).map(function (o, i) {
      return {
        id: store.uid(), orderId: o.id, no: o.no, customer: o.customer, product: o.product,
        qty: o.qty, deliverDate: o.deliverDate,
        node: i === 0 ? '生产中' : (i === 1 ? '半成品' : '质检中'),
        percent: [55, 80, 95][i % 3],
        abnormal: i === 0 ? '原料略缺，已补' : '',
        logs: [{ time: Date.now() - 86400000, text: '对接工厂，进度正常' }],
        createdAt: now
      };
    });
    store.save('productions', prods);

    // 发货
    var ships = orders.filter(function (o) { return o.status === '已发货' || o.status === '已完成'; }).map(function (o) {
      return {
        id: store.uid(), orderId: o.id, no: o.no, customer: o.customer,
        product: o.product, shipQty: o.qty, remainQty: 0,
        shipDate: util.fmtDate(new Date(now - 86400000)), warehouse: '主仓',
        method: '整车', tracking: 'SF' + (1000000000 + Math.floor(Math.random() * 800000000)),
        company: '顺丰速运', status: o.status === '已完成' ? '已签收' : '运输中',
        signTime: o.status === '已完成' ? util.fmtDate(new Date(now)) : '', signer: o.status === '已完成' ? o.contact : '',
        abnormal: '', attachments: [], createdAt: now
      };
    });
    store.save('shipments', ships);

    // 对账回款
    var recs = orders.map(function (o) {
      var st = o.unpaid <= 0 ? '全款结清' : (o.received > 0 ? '部分回款' : '已对账待回款');
      return {
        id: store.uid(), orderId: o.id, no: o.no, customer: o.customer, amount: o.total,
        shippedAmount: ['已发货', '已完成'].indexOf(o.status) >= 0 ? o.total : 0,
        reconAmount: o.total, status: st, period: 30, periodDue: util.fmtDate(new Date(now + 15 * 86400000)),
        receiveRecords: o.received > 0 ? [{ date: util.fmtDate(new Date(now - 86400000)), amount: o.received, method: '银行转账', voucher: '' }] : [],
        createdAt: now
      };
    });
    store.save('reconciliations', recs);

    // 异常售后
    store.save('exceptions', [{
      id: store.uid(), type: '生产延期', orderId: orders[3].id, no: orders[3].no,
      desc: '工厂设备故障，预计延期2天', time: util.fmtDate(new Date(now - 2 * 86400000)),
      party: '宏发五金', solution: '已协调加急', progress: '处理中', createdAt: now
    }]);

    store.save('memos', []);
    store.save('logs', []);
    // 重新生成操作日志（seed 时关闭了 log，这里补一条）
    store.log('初始化', 'system', { note: '已加载示例数据' });
  };

  /* ----------------------------- 设置 ----------------------------- */
  store.getSettings = function () { return store.load('settings', {}); };
  store.saveSettings = function (patch) {
    var s = store.load('settings', {});
    Object.assign(s, patch);
    store.save('settings', s);
    return s;
  };

  /* ----------------------- IndexedDB 附件存储 -----------------------
   * 突破 localStorage 约 5MB 上限：文件本体存 IndexedDB，记录里只保留元数据 + fileId。
   *
   * 三级降级（2026-10-19）：
   *   1) IndexedDB   —— 正常通道
   *   2) localStorage 分片 —— IndexedDB 打不开时（隐私模式 / 站点数据被禁 / 配额异常）的救命通道，
   *                     带配额体检，装得下就存，小图基本都能救回来
   *   3) 内联 base64 —— 前两条都走不通才用；调用方（导入投稿）会主动丢弃，
   *                     原则是「宁可丢图，也不让 localStorage 爆配额把业务数据一起搞丢」
   */
  var _idb = null;
  var _idbState = { tried: 0, ok: false, errName: '', errMsg: '', mode: '' };   // 供诊断页读取
  function _openIDB() {
    return new Promise(function (res, rej) {
      if (_idb) return res(_idb);
      if (typeof indexedDB === 'undefined') {
        _idbState.tried++; _idbState.ok = false;
        _idbState.errName = 'NoIndexedDB';
        _idbState.errMsg = '浏览器没有 indexedDB（旧内核 / 兼容模式 / 被策略禁用）';
        return rej(new Error(_idbState.errMsg));
      }
      var req, settled = false;
      try { req = indexedDB.open('nxgd_files', 1); }
      catch (e) {
        _idbState.tried++; _idbState.ok = false;
        _idbState.errName = (e && e.name) || 'SecurityError';
        _idbState.errMsg = (e && e.message) || 'indexedDB.open 直接抛错';
        return rej(e);
      }
      // 超时保护：某些环境（隐私模式 / 公司策略）既不 success 也不 error，会永久挂起，
      // 导致「导入投稿」一直转圈不结束——这里 8 秒兜底判失败，改走 localStorage 通道
      var t = setTimeout(function () {
        if (settled) return; settled = true;
        _idbState.tried++; _idbState.ok = false;
        _idbState.errName = 'Timeout';
        _idbState.errMsg = '打开数据库 8 秒无响应（多半被浏览器策略拦截）';
        rej(new Error(_idbState.errMsg));
      }, 8000);
      req.onupgradeneeded = function () { req.result.createObjectStore('files', { keyPath: 'id' }); };
      req.onsuccess = function () {
        if (settled) return; settled = true; clearTimeout(t);
        _idb = req.result; _idbState.tried++; _idbState.ok = true; _idbState.errName = ''; _idbState.errMsg = '';
        res(_idb);
      };
      req.onerror = function () {
        if (settled) return; settled = true; clearTimeout(t);
        var e = req.error || {};
        _idbState.tried++; _idbState.ok = false;
        _idbState.errName = e.name || 'Error';
        _idbState.errMsg = e.message || '打开 IndexedDB 失败';
        rej(req.error || new Error(_idbState.errMsg));
      };
      req.onblocked = function () {
        if (settled) return; settled = true; clearTimeout(t);
        _idbState.tried++; _idbState.ok = false;
        _idbState.errName = 'Blocked';
        _idbState.errMsg = '另一个标签页占用着旧版本数据库，关掉其它工作台标签页后刷新即可';
        rej(new Error(_idbState.errMsg));
      };
    });
  }

  /* -------------------- 第二通道：localStorage 附件分片 -------------------- */
  var LSF = 'nxgd_file_';
  var LS_BUDGET = 3 * 1024 * 1024;    // 附件最多再吃 300 万字符，其余留给业务数据
  function _lsUsed() {
    var n = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k) n += k.length + (localStorage.getItem(k) || '').length;
      }
    } catch (e) {}
    return n;
  }
  function _lsCount() {
    var n = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LSF) === 0) n++;
      }
    } catch (e) {}
    return n;
  }
  function _lsPut(id, data) {
    try {
      if (!data) return false;
      if (_lsUsed() + data.length + LSF.length + id.length > LS_BUDGET) return false;   // 装不下就别塞
      localStorage.setItem(LSF + id, data);
      _idbState.mode = 'localStorage';
      return true;
    } catch (e) { return false; }
  }
  function _lsGet(id) { try { return localStorage.getItem(LSF + id); } catch (e) { return null; } }
  function _lsDel(id) { try { localStorage.removeItem(LSF + id); } catch (e) {} }
  function _lsAll() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LSF) === 0) out.push({ id: k.slice(LSF.length), data: localStorage.getItem(k) });
      }
    } catch (e) {}
    return out;
  }
  // 方案 A：把 IndexedDB 全部附件导出（恢复时写回）
  function _dumpIDB() {
    return _openIDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction('files', 'readonly');
        var stx = tx.objectStore('files');
        var out = [];
        var cur = stx.openCursor();
        cur.onsuccess = function (e) {
          var c = e.target.result;
          if (c) { out.push(c.value); c.continue(); } else res(out);
        };
        cur.onerror = function () { rej(cur.error); };
      });
    }).then(function (out) { return out.concat(_lsAll()); })   // 备份时把第二通道里的附件也带上
      .catch(function () { return _lsAll(); });
  }
  store.putFile = function (id, dataURL) {
    return _openIDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put({ id: id, data: dataURL });
        tx.oncomplete = function () { _idbState.mode = 'indexedDB'; res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    }).catch(function (e) {
      if (_lsPut(id, dataURL)) return;      // 第二通道兜住
      throw e;                              // 两条路都不通 → 由 persistFiles 决定（内联/丢弃）
    });
  };
  store.getFile = function (id) {
    return _openIDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction('files', 'readonly');
        var r = tx.objectStore('files').get(id);
        r.onsuccess = function () { res(r.result ? r.result.data : null); };
        r.onerror = function () { rej(r.error); };
      });
    }).then(function (d) { return d || _lsGet(id); })     // IDB 里没有 → 再去第二通道找
      .catch(function () { return _lsGet(id); });
  };
  store.delFile = function (id) {
    _lsDel(id);
    return _openIDB().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').delete(id);
        tx.oncomplete = function () { res(); };
      });
    }).catch(function () {});
  };
  function _meta(f) { return { name: f.name, type: f.type, size: f.size, fileId: f.fileId }; }
  function _inline(f) { var c = { name: f.name, type: f.type, size: f.size }; if (f.data) c.data = f.data; if (f.fileId) c.fileId = f.fileId; return c; }
  util.persistFiles = function (arr) {
    arr = arr || [];
    // 注意：即使 indexedDB 不存在也不再直接内联——putFile 内部会走 localStorage 第二通道，
    // 只有两条通道都失败才回退内联（调用方会丢弃，避免撑爆 localStorage 配额）
    return Promise.all(arr.map(function (f) {
      if (f.fileId && !f.data) return Promise.resolve(_meta(f));
      var id = 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      return store.putFile(id, f.data).then(function () {
        return { name: f.name, type: f.type, size: f.size, fileId: id };
      }).catch(function () { var c = _meta(f); c.data = f.data; return c; });
    }));
  };

  /* 附件存储自检：诊断页 idb-diag.html 用它判断「截图为什么存不下来」 */
  util.attDiag = function () {
    return _openIDB().then(function () {
      return { idb: true, mode: _idbState.mode || 'indexedDB', errName: '', errMsg: '',
               lsFiles: _lsCount(), usedChars: _lsUsed() };
    }, function () {
      return { idb: false, mode: _lsCount() ? 'localStorage' : 'none',
               errName: _idbState.errName, errMsg: _idbState.errMsg,
               lsFiles: _lsCount(), usedChars: _lsUsed() };
    });
  };

  global.WB = global.WB || {};
  global.WB.store = store;
  global.WB.util = util;
})(window);
