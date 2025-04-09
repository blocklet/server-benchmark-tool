/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
/**
 * 生成并保存 RPS vs Concurrency 折线图
 * @param {Array} data 原始数据数组
 * @param {string} [outputFile='output.png'] 输出文件名
 */
async function generateChart(data, outputFile = 'output.png') {
  // 整理成 API -> { concurrency: rps }
  const grouped = {};
  for (const item of data) {
    const { name, concurrency, rps } = item;
    if (!grouped[name]) grouped[name] = {};
    grouped[name][concurrency] = rps;
  }

  const allConcurrency = [...new Set(data.map((i) => i.concurrency))].sort((a, b) => a - b);

  const datasets = Object.entries(grouped).map(([name, rpsMap]) => ({
    label: name,
    data: allConcurrency.map((c) => rpsMap[c] || 0),
    fill: false,
    borderWidth: 2,
    tension: 0.2,
  }));

  const width = 1200;
  const height = 800;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColor: 'white' });

  const configuration = {
    type: 'line',
    data: {
      labels: allConcurrency.map((c) => `${c}C`),
      datasets,
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'RPS vs Concurrency',
        },
        legend: {
          position: 'right',
        },
      },
      scales: {
        x: { title: { display: true, text: 'Concurrency' } },
        y: { title: { display: true, text: 'RPS' } },
      },
    },
    plugins: [
      {
        id: 'white-background',
        beforeDraw: (chart) => {
          const ctx = chart.canvas.getContext('2d');
          ctx.save();
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, chart.width, chart.height);
          ctx.restore();
        },
      },
    ],
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(outputFile, buffer);
  console.log(`✅ Chart saved as ${outputFile}`);
  // 打印下载命令提示
  const { username } = os.userInfo();
  const hostname = os.hostname();
  const cwd = process.cwd();
  console.log(`scp ${username}@${hostname}:${cwd}/${outputFile} ./`);
}

module.exports = generateChart;
