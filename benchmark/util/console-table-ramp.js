/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const Table = require('cli-table-redemption');

function average(arr) {
  const valid = arr.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (valid.length === 0) return '-';
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(0);
}

function consoleTableRamp(results) {
  // 获取所有出现过的 concurrency 值并排序
  const concurrencySet = new Set(results.map((i) => i.concurrency));
  const concurrencyList = [...concurrencySet].sort((a, b) => a - b);

  // 构造表头
  const rpsHeaders = concurrencyList.map((c) => `${c}C RPS`);
  const table = new Table({
    head: ['Name', ...rpsHeaders, 'Min', '50%', '90%', 'Max', 'Time'],
  });

  // 按 name 分组
  const grouped = {};
  for (const item of results) {
    if (!grouped[item.name]) grouped[item.name] = [];
    grouped[item.name].push(item);
  }

  // 生成表格数据
  for (const name in grouped) {
    const items = grouped[name];

    // RPS 按 concurrency 分组求和
    const rpsMap = {};
    for (const c of concurrencyList) rpsMap[c] = 0;

    const minList = [];
    const t50List = [];
    const t90List = [];
    const maxList = [];
    let totalTime = 0;

    for (const item of items) {
      const c = item.concurrency;
      if (rpsMap[c] !== undefined) rpsMap[c] += item.rps || 0;

      minList.push(item.min);
      t50List.push(item.t50);
      t90List.push(item.t90);
      maxList.push(item.max);

      totalTime += parseFloat(item.time);
    }

    // 构造行数据
    const row = [
      name,
      ...concurrencyList.map((c) => rpsMap[c]),
      average(minList),
      average(t50List),
      average(t90List),
      average(maxList),
      totalTime.toFixed(2),
    ];

    table.push(row);
  }

  console.log(table.toString());
}

module.exports = consoleTableRamp;
