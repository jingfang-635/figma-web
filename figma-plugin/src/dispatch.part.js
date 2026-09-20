// ============================================================
// 命令分发（由 manifest.json 的 menu 定义，figma.command 决定走向）
//   emoji  → Emoji 批量换 antd 图标（原功能，见 logic.part.js）
//   charts → 图表数据重建 + 组件化（见 charts.part.js）
// ============================================================

async function dispatchCommand() {
  const cmd = figma.command || 'emoji';
  if (cmd === 'emoji') return runEmojiCommand();
  if (cmd === 'charts') return runCharts();
  notify('未知命令：' + cmd);
  figma.closePlugin();
}

dispatchCommand().catch((err) => {
  try {
    notify('❌ 出错：' + (err && err.message ? err.message : String(err)));
  } catch (e) {
    /* ignore */
  }
  try {
    figma.closePlugin();
  } catch (e) {
    /* ignore */
  }
});