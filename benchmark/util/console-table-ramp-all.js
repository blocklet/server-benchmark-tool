/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const Table = require('cli-table-redemption');

function consoleTableRampAll(results) {
  // 获取所有出现过的 concurrency 值并排序
  const concurrencySet = new Set(results.map((i) => i.concurrency));
  const concurrencyList = [...concurrencySet].sort((a, b) => a - b);

  // 构造表头
  const table = new Table({
    head: ['Name', 'Concurrency', 'Count', 'Success', 'RPS', 'Min', '50%', '90%', 'Max', 'Time'],
    style: {
      head: [], // 禁用表头颜色
      border: [], // 禁用边框颜色
    },
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

    const rpsZero = new Set();
    for (const item of items) {
      if (item.rps === 0 && rpsZero.has(item.name)) {
        // eslint-disable-next-line no-continue
        continue;
      }
      // 构造行数据
      const row = [
        name,
        item.concurrency,
        item.count,
        item.success,
        item.rps,
        item.min,
        item.t50,
        item.t90,
        item.max,
        item.time,
      ];
      table.push(row);
      if (item.rps === 0) {
        rpsZero.add(item.name);
      }
    }
  }

  console.log(table.toString());
}

module.exports = consoleTableRampAll;
