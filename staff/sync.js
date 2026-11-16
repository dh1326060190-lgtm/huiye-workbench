/* =========================================================================
 * 内销跟单工作台 · 团队同步 sync.js
 * 在 store.js 之后、app.js 之前加载。
 *
 * 干什么：让多台电脑/手机共用同一份数据。本机仍是 localStorage 加密存储（离线可用），
 * 云端只做「中转」：本地有改动就推上去，定时把别人的改动拉下来合并。
 *
 * 三条硬规矩：
 *  1. 上云前先用「团队口令」加密 —— Supabase 只看到密文，不知道口令就解不开；
 *  2. 待转采购(pendings) 永不上传 —— 那块只留你自己电脑；
 *  3. 默认关闭 —— 不启用就跟以前一模一样，单机照常用。
 *
 * 冲突：同一条记录以「修改时间新的」为准（谁最后改的听谁的）。
 * ========================================================================= */
(function (global) {
  'use strict';
  var SB = global.NX_SUPABASE || {};
  var BASE = (SB.url || '').replace(/\/+$/, '');
  var ANON = SB.anon || '';
  var TABLE = 'wb_sync';

  /* 参与同步的集合；pendings（待转采购）刻意不在里面 */
  var MODULES = ['customers', 'orders', 'productions', 'shipments', 'noships',
                 'returns', 'reconciliations', 'exceptions', 'memos'];

  var CFG_KEY = 'nxgd_sync_cfg';
  var PULL_MS = 20000;        // 自动拉取间隔
  var PUSH_DEBOUNCE = 1200;   // 改动后多久推一次（合并连续编辑）
  var SALT_PREFIX = 'nxgd-team-v1:';

  var cfg = null;       // { on, team, pass, device, lastPull }
  var pushed = {};      // module -> { id: updatedAt } 已推送快照，用于算增量
  var pushTimer = null;
  var pullTimer = null;
  var keyCache = null;  // 团队口令派生的 AES 密钥
  var keyFor = null;    // keyCache 对应的 team+pass，变了就重算

  var state = {
    on: false, pulling: false, pushing: false,
    lastPull: 0, lastPush: 0, lastError: '', remoteCount: 0, syncedCount: 0
  };

  /* ------------------------------ 小工具 ------------------------------ */
  function b64(buf) {
    var b = new Uint8Array(buf), s = '', i;
    for (i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function unb64(str) {
    var s = atob(str), b = new Uint8Array(s.length), i;
    for (i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  function store() { return global.WB && global.WB.store; }
  function rid(n) { var s = '', c = 'abcdefghijklmnopqrstuvwxyz0123456789'; for (var i = 0; i < (n || 6); i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

  function loadCfg() {
    try {
      var raw = localStorage.getItem(CFG_KEY);
      if (!raw) return { on: false, team: '', pass: '', device: rid(5), lastPull: 0 };
      var o = JSON.parse(raw);
      return { on: !!o.on, team: o.team || '', pass: o.pass || '', device: o.device || rid(5), lastPull: o.lastPull || 0 };
    } catch (e) { return { on: false, team: '', pass: '', device: rid(5), lastPull: 0 }; }
  }
  function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
  }
  cfg = loadCfg();
  if (!cfg.device) { cfg.device = rid(5); saveCfg(); }

  /* --------------------------- 团队口令加密 --------------------------- */
  function teamKey() {
    var tag = cfg.team + '|' + cfg.pass;
    if (keyCache && keyFor === tag) return Promise.resolve(keyCache);
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(cfg.pass), 'PBKDF2', false, ['deriveKey'])
      .then(function (k) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: enc.encode(SALT_PREFIX + cfg.team), iterations: 120000, hash: 'SHA-256' },
          k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      })
      .then(function (k) { keyCache = k; keyFor = tag; return k; });
  }
  function encPayload(obj) {
    return teamKey().then(function (k) {
      var iv = new Uint8Array(12); crypto.getRandomValues(iv);
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode(JSON.stringify(obj)))
        .then(function (ct) { return { v: 1, iv: b64(iv), ct: b64(ct) }; });
    });
  }
  function decPayload(p) {
    if (!p || p.v !== 1 || !p.iv || !p.ct) return Promise.resolve(null);
    return teamKey().then(function (k) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p.iv) }, k, unb64(p.ct));
    }).then(function (plain) {
      return JSON.parse(new TextDecoder().decode(plain));
    }).catch(function () { return null; });   // 口令不对 / 数据被改过 → 解不开就跳过
  }

  /* ------------------------------ HTTP ------------------------------ */
  function hdrs(extra) {
    var h = { apikey: ANON, Authorization: 'Bearer ' + ANON };
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }
  function pullRemote(since) {
    var url = BASE + '/rest/v1/' + TABLE +
      '?team=eq.' + encodeURIComponent(cfg.team) +
      '&updated_at=gt.' + (since || 0) +
      '&select=rec_id,module,payload,updated_at,deleted' +
      '&order=updated_at.asc&limit=1000' +
      '&apikey=' + encodeURIComponent(ANON);
    return fetch(url, { method: 'GET', cache: 'no-store', headers: hdrs() })
      .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, text: t }; }); });
  }
  function pushRemote(rows) {
    var url = BASE + '/rest/v1/' + TABLE + '?apikey=' + encodeURIComponent(ANON);
    return fetch(url, {
      method: 'POST', cache: 'no-store',
      headers: hdrs({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(rows)
    }).then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, text: t }; }); });
  }

  /* --------------------------- 拉取并合并 --------------------------- */
  function applyRemote(rows) {
    var st = store(); if (!st) return [];
    var touched = {};
    rows.forEach(function (r) {
      if (MODULES.indexOf(r.module) < 0) return;
      var m = r.module, id = r.rec_id;
      pushed[m] = pushed[m] || {};
      if (r.deleted) {
        var arr0 = st.list(m);
        var i0 = -1;
        for (var k = 0; k < arr0.length; k++) { if (arr0[k].id === id) { i0 = k; break; } }
        if (i0 >= 0) { arr0.splice(i0, 1); touched[m] = true; }
        delete pushed[m][id];                       // 别再把它当墓碑推回去
        return;
      }
      var obj = decPayload(r.payload);
      if (!obj || !obj.id) return;                  // 口令不对解不开 → 跳过
      var arr = st.list(m), idx = -1, j;
      for (j = 0; j < arr.length; j++) { if (arr[j].id === obj.id) { idx = j; break; } }
      if (idx < 0) { arr.unshift(obj); touched[m] = true; pushed[m][id] = r.updated_at; }
      else {
        var localAt = arr[idx].updatedAt || arr[idx].createdAt || 0;
        if ((r.updated_at || 0) > localAt) { arr[idx] = obj; touched[m] = true; }
        pushed[m][id] = r.updated_at;               // 云端已是这个版本，不用再推
      }
    });
    var names = Object.keys(touched);
    names.forEach(function (m) { st.save(m, st.list(m), { remote: true }); });
    return names;
  }

  function pull(isManual) {
    if (!state.on || !cfg.team || !cfg.pass) return Promise.resolve(0);
    if (state.pulling) return Promise.resolve(0);
    state.pulling = true;
    return pullRemote(cfg.lastPull || 0).then(function (res) {
      if (!res.ok) throw new Error('服务器返回 ' + res.status + '：' + res.text.slice(0, 160));
      var rows = JSON.parse(res.text || '[]');
      if (!Array.isArray(rows)) throw new Error('返回内容不是数组');
      return Promise.all(rows.map(function (r) { return decPayload(r.payload).then(function (o) { r._obj = o; return r; }); }))
        .then(function () { return applyRemote(rows); })
        .then(function (names) {
          var maxAt = cfg.lastPull || 0;
          rows.forEach(function (r) { if (r.updated_at > maxAt) maxAt = r.updated_at; });
          cfg.lastPull = maxAt; saveCfg();
          state.lastPull = Date.now();
          state.remoteCount = rows.length;
          state.lastError = '';
          if (names.length && global.__NXGD_REFRESH__) { try { global.__NXGD_REFRESH__(); } catch (e) {} }
          if (isManual && global.ui && global.ui.toast) global.ui.toast('已同步' + (names.length ? '，更新 ' + names.length + ' 个模块' : '，没有新改动'), 'ok');
          return names.length;
        });
    }).catch(function (e) {
      state.lastError = (e && e.message) ? e.message : String(e);
      if (isManual && global.ui && global.ui.toast) global.ui.toast('同步失败：' + state.lastError, 'err');
      return 0;
    }).then(function (n) { state.pulling = false; return n; });
  }

  /* ------------------------------ 推送 ------------------------------ */
  function diffRows() {
    var st = store(); if (!st) return Promise.resolve([]);
    var jobs = [];
    MODULES.forEach(function (m) {
      pushed[m] = pushed[m] || {};
      var arr = st.list(m), seen = {};
      arr.forEach(function (o) {
        var at = o.updatedAt || o.createdAt || 0;
        seen[o.id] = at;
        if (pushed[m][o.id] !== at) {
          jobs.push(encPayload(o).then(function (p) {
            return { rec_id: o.id, module: m, team: cfg.team, payload: p, updated_at: at, deleted: false, device: cfg.device };
          }));
        }
      });
      // 本地已删、云端还留着 → 发一张墓碑
      Object.keys(pushed[m]).forEach(function (id) {
        if (!seen[id]) {
          jobs.push(encPayload({ id: id }).then(function (p) {
            return { rec_id: id, module: m, team: cfg.team, payload: p, updated_at: Date.now(), deleted: true, device: cfg.device };
          }));
        }
      });
    });
    return Promise.all(jobs);
  }

  function push() {
    if (!state.on || !cfg.team || !cfg.pass) return Promise.resolve(0);
    if (state.pushing) return Promise.resolve(0);
    state.pushing = true;
    return diffRows().then(function (rows) {
      if (!rows.length) { state.lastPush = Date.now(); return 0; }
      // 一次别推太多，分片避免请求体过大
      var chunks = [], i;
      for (i = 0; i < rows.length; i += 200) chunks.push(rows.slice(i, i + 200));
      var seq = Promise.resolve();
      chunks.forEach(function (c) {
        seq = seq.then(function () {
          return pushRemote(c).then(function (res) {
            if (!res.ok) throw new Error('服务器返回 ' + res.status + '：' + res.text.slice(0, 160));
            // 推送成功才更新快照（失败的下次还会重推）
            c.forEach(function (r) {
              pushed[r.module] = pushed[r.module] || {};
              if (r.deleted) delete pushed[r.module][r.rec_id];
              else pushed[r.module][r.rec_id] = r.updated_at;
            });
          });
        });
      });
      return seq.then(function () {
        state.lastPush = Date.now();
        state.syncedCount += rows.length;
        state.lastError = '';
        return rows.length;
      });
    }).catch(function (e) {
      state.lastError = (e && e.message) ? e.message : String(e);
      return 0;
    }).then(function (n) { state.pushing = false; return n; });
  }

  function schedulePush() {
    if (!state.on) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushTimer = null; push(); }, PUSH_DEBOUNCE);
  }

  /* ------------------------------ 启停 ------------------------------ */
  function start() {
    if (state.on) return;
    state.on = true;
    if (pullTimer) clearInterval(pullTimer);
    pullTimer = setInterval(function () { pull(false); }, PULL_MS);
    // 先拉后推：别人的改动先拿回来，再把本机比云端新的补上去
    pull(false).then(function () { return push(); });
    document.addEventListener('visibilitychange', onVis);
  }
  function stop() {
    state.on = false;
    if (pullTimer) { clearInterval(pullTimer); pullTimer = null; }
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    document.removeEventListener('visibilitychange', onVis);
  }
  function onVis() { if (!document.hidden) pull(false); }

  var api = {
    MODULES: MODULES,
    getCfg: function () { return { on: cfg.on, team: cfg.team, hasPass: !!cfg.pass, device: cfg.device }; },
    getState: function () { return state; },
    isOn: function () { return state.on; },
    /* 启用：team 团队名、pass 团队口令（两边填一样的才能互相解开） */
    enable: function (team, pass) {
      team = (team || '').trim(); pass = pass || '';
      if (!team) return Promise.reject(new Error('请填团队名'));
      if (pass.length < 4) return Promise.reject(new Error('团队口令至少 4 位'));
      cfg.team = team; cfg.pass = pass; cfg.on = true;
      keyCache = null; keyFor = null; pushed = {};
      saveCfg();
      start();
      return pull(true).then(function () { return push(); });
    },
    disable: function () {
      stop();
      cfg.on = false; cfg.pass = ''; cfg.lastPull = 0;
      keyCache = null; keyFor = null; pushed = {};
      saveCfg();
    },
    /* 清空云端这个团队的所有数据（谨慎） */
    wipeRemote: function () {
      if (!cfg.team) return Promise.resolve(0);
      var url = BASE + '/rest/v1/' + TABLE + '?team=eq.' + encodeURIComponent(cfg.team) + '&apikey=' + encodeURIComponent(ANON);
      return fetch(url, { method: 'DELETE', cache: 'no-store', headers: hdrs() })
        .then(function (r) { return r.ok ? 1 : 0; });
    },
    syncNow: function () { return pull(true).then(function () { return push(); }); },
    pull: pull, push: push,
    _debug: { applyRemote: applyRemote, diffRows: diffRows }
  };

  /* 订阅本地变更：有人改了数据就排一次推送 */
  global.__NXGD_CHANGE_HOOK__ = function (name, kind, item) {
    if (!state.on) return;
    if (MODULES.indexOf(name) < 0) return;      // 待转采购等不参与
    schedulePush();
  };

  /* 解锁后自动接管（配置里已开启就直接连上） */
  global.__NXGD_SYNC_BOOT__ = function () {
    if (cfg.on && cfg.team && cfg.pass) start();
  };

  global.WB = global.WB || {};
  global.WB.sync = api;
})(window);
