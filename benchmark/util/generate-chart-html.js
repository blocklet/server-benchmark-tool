/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/comma-dangle */
/*
 * 自动生成接口性能图集 HTML（交互式版本）
 * - 输出 HTML 页面（不生成 PNG 文件）
 * - 使用 Chart.js 浏览器渲染图表
 */

const fs = require('fs');
const path = require('path');

const calcScore = (rps, t90, rate) => {
  const rpsScore = Math.min(100, (rps / 1000) * 100);
  const t90Score = Math.max(0, 100 - t90);
  const rateScore = rate * 100;
  return rpsScore * 0.4 + t90Score * 0.3 + rateScore * 0.3;
};

const gradeFromScore = (score) => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};

function generateChartHtml(data, outputFile = 'chartbook.html') {
  const width = '800';
  const height = '600';
  const concurrencySet = [...new Set(data.map((d) => d.concurrency))].sort((a, b) => a - b);
  const groupByName = {};
  for (const item of data) {
    if (!groupByName[item.name]) groupByName[item.name] = [];
    groupByName[item.name].push(item);
  }

  const scoreTable = [];
  const charts = [];

  // 1. RPS vs Concurrency
  const rpsLabels = concurrencySet.map((c) => `${c}C`);
  const rpsDatasets = Object.entries(groupByName).map(([name, items]) => ({
    label: name,
    data: rpsLabels.map((c) => {
      const val = items.find((i) => `${i.concurrency}C` === c);
      return val ? val.rps : 0;
    }),
    borderWidth: 2,
    tension: 0.2,
    fill: false,
  }));
  charts.push({
    type: 'line',
    title: '1. RPS vs Concurrency',
    labels: rpsLabels,
    datasets: rpsDatasets,
  });

  // 2. Degradation Trend
  const degradeDatasets = Object.entries(groupByName).map(([name, items]) => {
    const baseline = items[0];
    return {
      label: name,
      data: items.map((i) => {
        const rpsLoss = 1 - i.rps / baseline.rps;
        const latencyGain = (i.t90 - baseline.t90) / baseline.t90;
        const successDrop = 1 - i.success / i.count;
        return rpsLoss + latencyGain + successDrop;
      }),
      borderWidth: 2,
      tension: 0.2,
      fill: false,
    };
  });
  charts.push({
    type: 'line',
    title: '2. Degradation Trend',
    labels: rpsLabels,
    datasets: degradeDatasets,
  });

  // 3. Max RPS 排行
  const topRps = Object.entries(groupByName)
    .map(([name, items]) => {
      const last = items[items.length - 1];
      const { rps } = last;
      const { t90 } = last;
      const rate = last.success / last.count;
      const score = calcScore(rps, t90, rate);
      scoreTable.push({ name, rps, t90, rate, score, grade: gradeFromScore(score) });
      return { name, rps };
    })
    .sort((a, b) => b.rps - a.rps)
    .slice(0, 10);
  charts.push({
    type: 'bar',
    title: '3. Top 10 Max RPS',
    labels: topRps.map((i) => i.name),
    datasets: [{ label: 'Max RPS', data: topRps.map((i) => i.rps) }],
    options: { indexAxis: 'y' },
  });

  // 4. 最低 t90 排行
  const topT90 = [...scoreTable].sort((a, b) => a.t90 - b.t90).slice(0, 10);
  charts.push({
    type: 'bar',
    title: '4. Top 10 Lowest t90',
    labels: topT90.map((i) => i.name),
    datasets: [{ label: 'Lowest t90 (ms)', data: topT90.map((i) => i.t90) }],
    options: { indexAxis: 'y' },
  });

  // 5. 雷达图
  const t90Min = Math.min(...scoreTable.map((i) => i.t90));
  const t90Max = Math.max(...scoreTable.map((i) => i.t90));
  charts.push({
    type: 'radar',
    title: '5. Performance Radar',
    labels: ['RPS', 't90', 'Success Rate'],
    datasets: scoreTable.map((i) => ({
      label: i.name,
      data: [Math.min(i.rps / 1000, 1), t90Max === t90Min ? 1 : 1 - (i.t90 - t90Min) / (t90Max - t90Min), i.rate],
    })),
  });

  // HTML 输出
  const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>Benchmark Charts</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>body { font-family: sans-serif; padding: 2em; background: #fdfdfd; }</style>
</head><body>
  <h1>Benchmark Charts</h1>
  ${charts
    .map(
      (chart, i) => `
    <h2>${chart.title}</h2>
    <canvas id="chart${i}" width="${width}" height="${height}"></canvas>
  `
    )
    .join('\n')}
  <script>
    const charts = ${JSON.stringify(charts, null, 2)};
    charts.forEach((cfg, i) => {
      const ctx = document.getElementById('chart' + i).getContext('2d');
      new Chart(ctx, {
        type: cfg.type,
        data: {
          labels: cfg.labels,
          datasets: cfg.datasets
        },
        options: Object.assign({ responsive: true, plugins: { legend: { display: true } } }, cfg.options || {})
      });
    });
  </script>
</body></html>`;

  const dir = path.dirname(outputFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputFile, html);
  console.log(`✅ HTML saved: ${outputFile}`);
}

module.exports = generateChartHtml;
