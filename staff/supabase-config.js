/* =========================================================================
 * 同事投稿 · Supabase 配置（前端共享）
 * anon / public key 本就设计为可放在前端，用于：
 *   - 公网投稿页写入订单
 *   - 工作台「待转采购 → 同事投稿」读取待处理列表
 * 把下面 anon 改成你 Supabase 项目的 anon/public key 即可（URL 已按已知项目填好）。
 * 取 key 位置：Supabase 后台 → Project Settings → API → Project URL / anon public key
 * ========================================================================= */
window.NX_SUPABASE = {
  url: 'https://unpqqqptkhdggfntxscy.supabase.co',
  anon: 'sb_publishable_ThPZiPRcvbvpyp_Ck13k6Q_zl6ABRlY'
};
