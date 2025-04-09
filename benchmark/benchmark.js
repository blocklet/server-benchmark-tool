#!/usr/bin/env node
/* eslint-disable @typescript-eslint/comma-dangle */
/* eslint-disable no-promise-executor-return */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
const { Command } = require('commander');
const Table = require('cli-table-redemption');
const { bold, cyan } = require('chalk');
const joinUrl = require('url-join');
const NodeClient = require('@abtnode/client');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const loadConfig = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.yml')) {
    return YAML.parse(content);
  }
  return JSON.parse(content);
};

const { getSysInfo } = require('./util/sysinfo');
const { version } = require('./package.json');
const replaceApiPlaceholders = require('./util/replace-api-placeholders');

function createClient(origin, loginToken) {
  const client = new NodeClient(origin);
  client.setAuthToken(() => {
    return loginToken;
  });
  return client;
}

const getServerVersion = async (origin) => {
  let serverVersion = '';
  try {
    const envText = await fetch(joinUrl(origin, '/.well-known/service/api/env')).then((res) => res.text());
    const match = envText.match(/serverVersion\s*:\s*"([^"]+)"/);
    if (match) {
      // eslint-disable-next-line prefer-destructuring
      serverVersion = match[1];
    }
  } catch (err) {
    serverVersion = 'unknown';
  }
  return serverVersion;
};

// 计算百分位数（输入数组已排序）
function percentile(sortedArr, p) {
  const idx = Math.floor(sortedArr.length * p);
  return sortedArr[idx] || 0;
}

/**
 * 对单个 endpoint 进行压力测试
 * @param {string} url 请求地址
 * @param {object} opts 参数配置，包括:
 *   - concurrency: 并发数/每秒请求数
 *   - timelimit: 测试时长（秒）
 *   - loginToken: 若存在，加入 header 中
 *   - body: 若存在，使用 POST 请求，并以此作为请求体（要求为 JSON 字符串）
 *   - abtnodeFn: 若存在，调用 client 的对应方法
 *   - format: 输出格式，默认 json
 *   - mode: 请求模式，"rps" 表示每秒发起固定数量的请求（默认），"concurrent" 表示保持并发数（请求完成后立即发起新请求）
 */
async function benchmarkEndpoint(
  url,
  {
    concurrency,
    timelimit,
    cookie,
    body,
    abtnodeFn,
    format = 'json',
    mode = 'rps',
    method = 'GET',
    assert,
    headers,
    data,
    logError = false,
    logBody = false,
  }
) {
  console.log('==debug==', logError, logBody);
  const client = createClient(url, data.loginToken);
  let completed = 0;
  let successes = 0;
  const latencies = [];

  const startTime = Date.now();
  const timeLimitMs = timelimit * 1000;

  // 封装发起单个请求的逻辑，便于两种模式调用
  async function sendRequest() {
    const reqStart = Date.now();
    try {
      if (abtnodeFn) {
        const res = await client[abtnodeFn]({ input: body });
        if (logBody) {
          console.log(res);
        }
        const reqEnd = Date.now();
        latencies.push(Math.max(reqEnd - reqStart, 1));
        successes++;
      } else {
        const fetchOpts = {
          method,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        };
        if (body) {
          fetchOpts.headers['Content-Type'] = 'application/json';
          fetchOpts.body = body;
        }
        if (cookie) {
          fetchOpts.headers.cookie = cookie;
        }
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            fetchOpts.headers[key] = value;
          });
        }
        const res = await fetch(url, fetchOpts).then((v) => v[format]());
        if (logBody) {
          console.log(res);
        }
        if (res.error) {
          throw new Error(res.error);
        }
        if (assert && format === 'json') {
          Object.entries(assert).forEach(([key, value]) => {
            if (value === 'null') {
              if (res[key]) {
                throw new Error(`${key} is not null`);
              }
            } else if (value === 'not-null') {
              if (typeof res[key] === 'undefined') {
                throw new Error(`${key} is null`);
              }
            }
          });
        }
        const reqEnd = Date.now();
        latencies.push(Math.max(reqEnd - reqStart, 1));
        successes++;
      }
    } catch (err) {
      if (logError) {
        console.error(err);
      }
      const reqEnd = Date.now();
      latencies.push(reqEnd - reqStart);
      // 请求异常，不计入成功数
    } finally {
      completed++;
    }
  }

  if (mode === 'concurrent') {
    // 并发模式：保持同时有 concurrency 个请求在执行
    const runners = [];
    for (let i = 0; i < concurrency; i++) {
      runners.push(
        (async () => {
          while (Date.now() - startTime < timeLimitMs) {
            await sendRequest();
          }
        })()
      );
    }
    await Promise.all(runners);
  } else {
    // 固定速率模式：每秒发起 concurrency 个请求
    const allPromises = [];
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - startTime >= timeLimitMs) {
        clearInterval(interval);
        return;
      }
      for (let i = 0; i < concurrency; i++) {
        allPromises.push(sendRequest());
      }
    }, 1000);
    await new Promise((resolve) => setTimeout(resolve, timelimit * 1000));
    await Promise.all(allPromises);
  }

  const totalTimeSec = Math.max((Date.now() - startTime) / 1000, 1);
  const rps = successes / totalTimeSec;
  latencies.sort((a, b) => a - b);
  const min = latencies[0] || 0;
  const med = latencies[Math.floor(latencies.length / 2)] || 0;
  const p90 = percentile(latencies, 0.9);
  const p99 = percentile(latencies, 0.99);
  const max = latencies[latencies.length - 1] || 0;

  return {
    concurrency,
    count: completed,
    success: successes,
    rps: Math.round(rps),
    min,
    t50: med,
    t90: p90,
    t99: p99,
    max,
    time: totalTimeSec.toFixed(2),
  };
}

const program = new Command();

program
  .version(version)
  .command('init')
  .description('initialize config file')
  .action(() => {
    console.log(bold(`Benchmark v${version}\n`));
    const config = fs.readFileSync('./util/benchmark.yml', 'utf8');
    fs.writeFileSync('benchmark.yml', config);
    console.log('benchmark.yml file is initialized');
  });

program
  .command('run')
  .version(version)
  .option('--config <path>', 'path to JSON config file defining endpoints')
  .option('--format [string]', 'output format, optional "row", "json", "table", default "table"', 'table')
  // 新增 mode 参数，"rps" 表示每秒固定数量请求，"concurrent" 表示始终保持并发，"all" 表示两种模式各测一半时间
  .option(
    '--mode <mode>',
    'request mode: "rps" for fixed rate, "concurrent" for constant concurrency, or "all" for both modes (each with half total time)',
    'all'
  )
  .action(async (options) => {
    console.log(bold(`Benchmark v${version}\n`));
    const configPath = options.config || path.join(process.cwd(), 'benchmark.yml');

    if (!fs.existsSync(configPath)) {
      console.error('config file is required');
      return;
    }

    const config = loadConfig(configPath);
    let list = config.apis.filter((item) => item && !item.skip);
    const onlyList = config.apis.filter((item) => item && item.only);
    if (onlyList.length > 0) {
      list = onlyList;
    }
    list = replaceApiPlaceholders(list, config.data);
    console.log('==debug==', list);

    const { origin } = new URL(config.origin);
    console.log(`${bold('Benchmarking')} ${cyan(origin)}\n`);

    if (config.mode === 'all') {
      // 当 mode 为 all 时，两种模式各测试一半时间
      const modes = ['rps', 'concurrent'];
      const allResults = {};
      for (const m of modes) {
        console.log(bold(`\n--- Testing endpoints in mode ${m} ---\n`));
        const results = [];
        for (const item of list) {
          const url = joinUrl(origin, item.api);
          console.log(bold(`Testing ${item.name} in mode ${m}`));
          // 每个请求的时长调整为总时长的一半除以 endpoint 数量
          const perEndpointTime = Math.max(config.timelimit / 2 / list.length, 2);
          const opts = {
            ...item,
            concurrency: config.concurrency || 100,
            timelimit: perEndpointTime,
            format: item.format || 'json',
            body: item.body || config.body || undefined,
            mode: m,
            data: config.data,
            logBody: config.logBody,
            logError: config.logError,
          };
          const res = await benchmarkEndpoint(url, opts);
          res.name = item.name;
          results.push(res);
        }
        allResults[m] = results;
      }

      // 输出两个 mode 的表格
      for (const m of modes) {
        const tableHead = [
          'Case',
          m === 'rps' ? 'Req/s' : 'Concurrency',
          'Requests',
          'Success',
          'RPS',
          'Min',
          '50%',
          '90%',
          '99%',
          'Max',
          'Test Time',
        ];
        const table = new Table({
          head: tableHead,
          style: { head: ['cyan', 'bold'] },
        });
        allResults[m].forEach((result) => {
          table.push([
            result.name,
            result.concurrency,
            result.count,
            `${((result.success / result.count) * 100).toFixed(2)}%`,
            result.rps,
            `${result.min}ms`,
            `${result.t50}ms`,
            `${result.t90}ms`,
            `${result.t99}ms`,
            `${result.max}ms`,
            `${result.time}s`,
          ]);
        });
        const modeLogs = {
          rps: 'RPS Mode: Sends a fixed number of requests per second regardless of whether previous requests have returned, simulating a continuous influx of traffic even when responses are delayed.',
          concurrent:
            'Concurrent Mode: Maintains a constant number of ongoing requests by immediately launching a new request once one completes, which can reveal the maximum achievable concurrency when responses are slow.',
        };
        console.log(`\n${bold('-----------------')}\n`);
        console.log(`Mode: ${m} - ${modeLogs[m]}`);
        console.log(table.toString());
      }
    } else {
      // 单一 mode 的情况
      console.log('mode', config.mode);
      const results = [];
      const startTime = Date.now();
      for (const item of list) {
        if (item.skip) {
          continue;
        }
        const url = joinUrl(origin, item.api);
        console.log(bold(`Testing ${item.name}`));
        const opts = {
          ...item,
          concurrency: config.concurrency || 100,
          timelimit: Math.max(config.timelimit / list.length, 2),
          body: item.body || config.body || undefined,
          mode: config.mode,
          data: config.data,
          logBody: config.logBody,
          logError: config.logError,
        };
        const res = await benchmarkEndpoint(url, opts);
        res.name = item.name;
        results.push(res);
      }

      const tableHead = [
        'Case',
        config.mode === 'rps' ? 'Req/s' : 'Concurrency',
        'Requests',
        'Success',
        'RPS',
        'Min',
        '50%',
        '90%',
        '99%',
        'Max',
        'Test Time',
      ];
      const table = new Table({
        head: tableHead,
        style: { head: ['cyan', 'bold'] },
      });
      results.forEach((result) => {
        table.push([
          result.name,
          result.concurrency,
          result.count,
          `${((result.success / result.count) * 100).toFixed(2)}%`,
          result.rps,
          `${result.min}ms`,
          `${result.t50}ms`,
          `${result.t90}ms`,
          `${result.t99}ms`,
          `${result.max}ms`,
          `${result.time}s`,
        ]);
      });
      console.log(`\n${bold('-----------------')}\n`);
      const sysInfo = await getSysInfo();
      const serverVersion = await getServerVersion(origin);
      console.log(cyan('Server Version:'), serverVersion);
      console.log(cyan('Platform:'), sysInfo.os?.platform);
      console.log(cyan('CPU Cores:'), `${sysInfo.cpu?.cores}`);
      console.log(cyan('Memory (GB):'), `${Math.ceil((sysInfo.mem?.total || 0) / 1024 / 1024 / 1024)}`);
      console.log(cyan('Test Time:'), `${(Date.now() - startTime) / 1000} seconds`);
      console.log(table.toString());
    }
  });

program.parse(process.argv);
