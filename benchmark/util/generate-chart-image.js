/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const ChartDataLabels = require('chartjs-plugin-datalabels');

const width = 1200;
const height = 800;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColor: 'white' });
chartJSNodeCanvas._chartJs.register(ChartDataLabels); // 注册 datalabels 插件

const whiteBackgroundPlugin = {
  id: 'white-background',
  beforeDraw: (chart) => {
    const ctx = chart.canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
};

const drawChartToBuffer = (config) => {
  config.plugins = config.plugins || [];
  config.plugins.push(whiteBackgroundPlugin, ChartDataLabels);
  return chartJSNodeCanvas.renderToBuffer(config);
};

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

const shortName = (name) => {
  const parts = name.split('/');
  return parts[parts.length - 1] || name;
};

async function generateChartImage(data, outputPrefix = 'chartbook') {
  if (!fs.existsSync(outputPrefix)) {
    fs.mkdirSync(outputPrefix, { recursive: true });
  }
  const concurrencySet = [...new Set(data.map((d) => d.concurrency))].sort((a, b) => a - b);
  const groupByName = {};
  for (const item of data) {
    if (!groupByName[item.name]) groupByName[item.name] = [];
    groupByName[item.name].push(item);
  }

  const scoreTable = [];
  const chartConfigs = [];
  const chartCaptions = [];

  // 1. RPS vs Concurrency
  const rpsDatasets = Object.entries(groupByName).map(([name, items]) => ({
    label: name,
    data: concurrencySet.map((c) => items.find((i) => i.concurrency === c)?.rps || 0),
    borderWidth: 2,
    tension: 0.2,
    fill: false,
  }));
  chartConfigs.push({
    type: 'line',
    data: { labels: concurrencySet.map((c) => `${c}C`), datasets: rpsDatasets },
    options: {
      plugins: {
        title: { display: true, text: 'RPS vs Concurrency' },
        legend: { position: 'right' },
        datalabels: {
          align: 'top',
          formatter: (value, ctx) => {
            // eslint-disable-next-line @typescript-eslint/no-shadow
            const { data } = ctx.dataset;
            const index = ctx.dataIndex;
            return index === data.length - 1 ? shortName(ctx.dataset.label) : '';
          },
          font: { size: 10 },
          color: 'black',
        },
      },
      scales: {
        x: { title: { display: true, text: 'Concurrency' } },
        y: { title: { display: true, text: 'RPS' } },
      },
    },
  });

  chartCaptions.push('1-RPS-vs-Concurrency');

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
  chartConfigs.push({
    type: 'line',
    data: { labels: concurrencySet.map((c) => `${c}C`), datasets: degradeDatasets },
    options: {
      plugins: {
        title: { display: true, text: 'Degradation Trend' },
        legend: { position: 'right' },
        datalabels: {
          align: 'top',
          formatter: (value, ctx) => {
            const { data } = ctx.dataset;
            const index = ctx.dataIndex;
            return index === data.length - 1 ? shortName(ctx.dataset.label) : '';
          },
          font: { size: 10 },
          color: 'black',
        },
      },
      scales: {
        x: { title: { display: true, text: 'Concurrency' } },
        y: { title: { display: true, text: 'Degrade Score' } },
      },
    },
  });
  chartCaptions.push('2-Degradation-Trend');

  // 3. Max RPS 排行图
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
  chartConfigs.push({
    type: 'bar',
    data: { labels: topRps.map((i) => i.name), datasets: [{ label: 'Max RPS', data: topRps.map((i) => i.rps) }] },
    options: { plugins: { title: { display: true, text: 'Top 10 Max RPS' } }, indexAxis: 'y' },
  });
  chartCaptions.push('3-Top10-Max-RPS');

  // 4. 最低 t90 排行图
  const topT90 = [...scoreTable].sort((a, b) => a.t90 - b.t90).slice(0, 10);
  chartConfigs.push({
    type: 'bar',
    data: {
      labels: topT90.map((i) => i.name),
      datasets: [{ label: 'Lowest t90 (ms)', data: topT90.map((i) => i.t90) }],
    },
    options: { plugins: { title: { display: true, text: 'Top 10 Lowest t90' } }, indexAxis: 'y' },
  });
  chartCaptions.push('4-Top10-Lowest-t90');

  // 5. RPS vs t90（散点图）
  const scatterData = Object.entries(groupByName).map(([name, items]) => {
    const last = items[items.length - 1];
    return {
      label: name,
      data: [{ x: last.t90, y: last.rps }],
    };
  });
  chartConfigs.push({
    type: 'scatter',
    data: { datasets: scatterData },
    options: {
      plugins: {
        title: { display: true, text: 'RPS vs t90' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: t90=${ctx.parsed.x}ms, RPS=${ctx.parsed.y}`,
          },
        },
        datalabels: {
          align: 'right',
          anchor: 'end',
          formatter: (val, ctx) => shortName(ctx.dataset.label),
          font: { size: 10 },
          color: 'black',
        },
      },
      scales: {
        x: { title: { display: true, text: 't90 (ms)' } },
        y: { title: { display: true, text: 'RPS' } },
      },
    },
  });
  chartCaptions.push('5-RPS-vs-t90');

  // 6. 综合性能评分雷达图
  const t90Min = Math.min(...scoreTable.map((i) => i.t90));
  const t90Max = Math.max(...scoreTable.map((i) => i.t90));
  const radarData = {
    labels: ['RPS', 't90', 'Success Rate'],
    datasets: scoreTable.map((item) => ({
      label: item.name,
      data: [
        Math.min(item.rps / 1000, 1),
        t90Max === t90Min ? 1 : 1 - (item.t90 - t90Min) / (t90Max - t90Min),
        item.rate,
      ],
      fill: true,
      borderWidth: 2,
    })),
  };
  chartConfigs.push({
    type: 'radar',
    data: radarData,
    options: {
      plugins: {
        title: { display: true, text: 'Performance Radar' },
        legend: { display: true, position: 'right' },
        datalabels: {
          formatter: (value, ctx) => shortName(ctx.dataset.label),
          color: 'black',
          font: { size: 10 },
        },
      },
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 1,
        },
      },
    },
  });
  chartCaptions.push('6-Performance-Radar');

  // 输出所有 PNG 文件
  for (let i = 0; i < chartConfigs.length; i++) {
    const buffer = await drawChartToBuffer(chartConfigs[i]);
    const fileName = path.join(outputPrefix, `${chartCaptions[i]}.png`);
    fs.writeFileSync(fileName, buffer);
    console.log(`✅ Saved: ${fileName}`);
  }
}

module.exports = generateChartImage;
