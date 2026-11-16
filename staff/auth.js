/* =========================================================================
 * 内销跟单工作台 —— 访问门禁 auth.js
 * 依赖 store.js（WB.store.crypto）。在 store.js 之后、app.js 之前加载。
 *  - 首次：设置本地访问密码（AES-256-GCM 密钥由密码 PBKDF2 派生）
 *  - 之后：输入密码解锁，解锁成功后才启动 app
 *  - 忘记密码：清空全部本地数据后重新设置（不可逆）
 * ========================================================================= */
(function (global) {
  'use strict';
  var WB = global.WB = global.WB || {};
  var store = WB.store;

  function showGate(html) {
    var gate = document.getElementById('authGate');
    if (!gate) { gate = document.createElement('div'); gate.id = 'authGate'; document.body.appendChild(gate); }
    gate.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#1f2d3d,#0f1923);display:flex;align-items:center;justify-content:center;font-family:"Microsoft YaHei",sans-serif';
    gate.innerHTML = html;
    return gate;
  }
  function box(inner) {
    return '<div style="width:344px;background:#fff;border-radius:14px;padding:28px 26px;box-shadow:0 12px 40px rgba(0,0,0,.35);color:#222">' + inner + '</div>';
  }

  function bindSetup(gate) {
    var p1 = gate.querySelector('#authPwd'), p2 = gate.querySelector('#authPwd2'), err = gate.querySelector('#authErr');
    function submit() {
      err.textContent = '';
      if (p1.value.length < 6) { err.textContent = '密码至少 6 位'; return; }
      if (p1.value !== p2.value) { err.textContent = '两次输入不一致'; return; }
      store.crypto.setup(p1.value).then(function () {
        gate.remove(); window.__authBooted = true;
        if (WB.startApp) WB.startApp();
      }).catch(function (e) { err.textContent = '启用失败：' + (e && e.message); });
    }
    gate.querySelector('#authBtn').onclick = submit;
    p2.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    p1.focus();
  }

  function bindLogin(gate) {
    var pwd = gate.querySelector('#authPwd'), err = gate.querySelector('#authErr');
    function submit() {
      err.textContent = '';
      if (!pwd.value) { err.textContent = '请输入密码'; return; }
      store.crypto.unlock(pwd.value).then(function (ok) {
        if (ok) { gate.remove(); window.__authBooted = true; if (WB.startApp) WB.startApp(); }
        else { err.textContent = '密码错误'; pwd.value = ''; pwd.focus(); }
      });
    }
    gate.querySelector('#authBtn').onclick = submit;
    pwd.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    pwd.focus();
    gate.querySelector('#authForget').onclick = function () {
      if (confirm('忘记密码将清空全部本地数据，且无法恢复。确定重置？')) {
        store.crypto.reset(); location.reload();
      }
    };
    var rec = gate.querySelector('#authRecover');
    if (rec) rec.onclick = function () { location.href = './recover.html'; };
  }

  function boot() {
    window.__authBooted = true; // 先占位，阻止 app.js 自动 init
    if (!store.crypto.isSet()) {
      var gate = showGate(box(
        '<div style="font-size:20px;font-weight:700;margin-bottom:4px">🔐 内销跟单工作台</div>' +
        '<div style="color:#888;font-size:13px;margin-bottom:18px">首次使用 · 设置本地访问密码</div>' +
        '<label style="font-size:13px;color:#555;display:block;margin-bottom:6px">访问密码（至少 6 位，请牢记，遗忘无法恢复）</label>' +
        '<input id="authPwd" type="password" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d0d7de;border-radius:8px;font-size:14px;margin-bottom:12px"/>' +
        '<input id="authPwd2" type="password" placeholder="再次输入确认" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d0d7de;border-radius:8px;font-size:14px;margin-bottom:6px"/>' +
        '<div id="authErr" style="color:#d33;font-size:12px;min-height:16px;margin-bottom:8px"></div>' +
        '<button id="authBtn" style="width:100%;padding:11px;border:0;border-radius:8px;background:#2f6df6;color:#fff;font-size:15px;cursor:pointer">启用加密保护</button>' +
        '<div style="color:#aaa;font-size:11px;margin-top:14px;line-height:1.6">数据以 AES-256-GCM 加密存于本机浏览器，仅本机 127.0.0.1 可访问。密码不离开本机，请务必牢记。</div>'
      ));
      bindSetup(gate);
    } else {
      var gate = showGate(box(
        '<div style="font-size:20px;font-weight:700;margin-bottom:4px">🔐 内销跟单工作台</div>' +
        '<div style="color:#888;font-size:13px;margin-bottom:18px">已加密 · 请输入访问密码</div>' +
        '<input id="authPwd" type="password" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d0d7de;border-radius:8px;font-size:14px;margin-bottom:6px"/>' +
        '<div id="authErr" style="color:#d33;font-size:12px;min-height:16px;margin-bottom:8px"></div>' +
        '<button id="authBtn" style="width:100%;padding:11px;border:0;border-radius:8px;background:#2f6df6;color:#fff;font-size:15px;cursor:pointer">解锁</button>' +
        '<div style="display:flex;justify-content:space-between;margin-top:10px"><a id="authRecover" style="color:#2f6df6;font-size:12px;cursor:pointer">从本地备份恢复</a><a id="authForget" style="color:#888;font-size:12px;cursor:pointer">忘记密码？</a></div>'
      ));
      bindLogin(gate);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
