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

const { getSysInfo } = require('./util/sysinfo');
const { version } = require('./package.json');

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
 *   - gqlFn: 若存在，调用 client 的对应方法
 *   - format: 输出格式，默认 json
 *   - mode: 请求模式，"rps" 表示每秒发起固定数量的请求（默认），"concurrent" 表示保持并发数（请求完成后立即发起新请求）
 */
async function benchmarkEndpoint(
  url,
  { concurrency, timelimit, loginToken, userDid, body, gqlFn, format = 'json', mode = 'rps' }
) {
  const client = createClient(url, loginToken);
  let completed = 0;
  let successes = 0;
  const latencies = [];

  const startTime = Date.now();
  const timeLimitMs = timelimit * 1000;

  // 封装发起单个请求的逻辑，便于两种模式调用
  async function sendRequest() {
    const reqStart = Date.now();
    try {
      if (gqlFn) {
        await client[gqlFn]({ input: body });
        const reqEnd = Date.now();
        latencies.push(Math.max(reqEnd - reqStart, 1));
        successes++;
      } else {
        const fetchOpts = {
          method: body ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        };
        if (body) {
          fetchOpts.headers['Content-Type'] = 'application/json';
          fetchOpts.body = body;
        }
        if (loginToken || userDid) {
          fetchOpts.headers.cookie = `login_token=${loginToken}`;
        }
        if (url.includes('/api/did/session') && loginToken) {
          const res = await fetch(url, fetchOpts).then((v) => v.json());
          const reqEnd = Date.now();
          latencies.push(Math.max(reqEnd - reqStart, 1));
          if (res.error || !res.user) {
            throw new Error(res.error);
          }
          successes++;
        } else if (url.includes('/user-session/myself')) {
          const res = await fetch(url, fetchOpts).then((v) => v.json());
          const reqEnd = Date.now();
          latencies.push(Math.max(reqEnd - reqStart, 1));
          if (res.error) {
            throw new Error(res.error);
          }
          if (res.length > 0) successes++;
        } else {
          const res = await fetch(url, fetchOpts).then((v) => v[format]());
          if (res.error) {
            throw new Error(res.error);
          }
          const reqEnd = Date.now();
          latencies.push(Math.max(reqEnd - reqStart, 1));
          successes++;
        }
      }
    } catch (err) {
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
  .option('-o, --origin <string>', 'origin')
  .option('-c, --concurrency <number>', 'pre-request concurrency, default 10', parseInt, 10)
  .option('-t, --timelimit <number>', 'test duration, default 10', parseInt, 10)
  .option('--login-token [string]', 'login token')
  .option('--user-did [string]', 'user did')
  .option('--team-did [string]', 'team did')
  .option('--body [string]', 'request body (string)')
  .option('--format [string]', 'output format, optional "row", "json", "table", default "table"', 'table')
  // 新增 mode 参数，"rps" 表示每秒固定数量请求，"concurrent" 表示始终保持并发，"all" 表示两种模式各测一半时间
  .option(
    '--mode <mode>',
    'request mode: "rps" for fixed rate, "concurrent" for constant concurrency, or "all" for both modes (each with half total time)',
    'concurrent'
  )
  .action(async (options) => {
    let { origin } = options;
    console.log(bold(`Benchmark v${version}\n`));

    // 处理 origin
    if (!origin.startsWith('http')) {
      origin = `https://${origin}`;
    }
    origin = new URL(origin).origin;
    console.log(`${bold('Benchmarking')} ${cyan(origin)}\n`);

    const list = [
      { name: '/api/date', api: '/api/date', format: 'text' },
      {
        name: '/api/date (with session)',
        api: '/api/date',
        loginToken: options.loginToken,
        format: 'text',
      },
      { name: '/.well-known/service/api/did/login', api: '/.well-known/service/api/did/login', format: 'text' },
      {
        name: '/.well-known/service/api/did/session',
        api: '/.well-known/service/api/did/session',
      },
      {
        name: '/.well-known/service/api/did/session (with session)',
        api: '/.well-known/service/api/did/session',
        loginToken: options.loginToken,
      },
      {
        name: '/.well-known/service/api/user-session',
        api: '/.well-known/service/api/user-session',
        loginToken: options.loginToken,
      },
      {
        name: '/.well-known/service/api/user/privacy/config',
        api: `/.well-known/service/api/user/privacy/config?did=${options.userDid}`,
        loginToken: options.loginToken,
      },
      { name: '/invited-only (without session)', api: '/invited-only', format: 'text' },
      {
        name: `/api/user/${options.userDid}`,
        api: `/api/user/${options.userDid}?return=1`,
        loginToken: options.loginToken,
      },
      { name: '/api/users', api: '/api/users?return=1', loginToken: options.loginToken },
      { name: '/__blocklet__.js', api: '/__blocklet__.js', format: 'text' },
      {
        name: '/.well-known/service/user/settings',
        api: '/.well-known/service/user/settings?locale=en',
        loginToken: options.loginToken,
        format: 'text',
      },
      {
        name: '/.well-known/service/api/user-session/myself',
        api: '/.well-known/service/api/user-session/myself',
        loginToken: options.loginToken,
      },
      {
        name: '/.well-known/service/api/gql (getNotifications)',
        api: '/.well-known/service/api/gql',
        loginToken: options.loginToken,
        gqlFn: 'getNotifications',
        body: {
          teamDid: options.teamDid,
          userDid: options.userDid,
        },
      },
      {
        name: '/.well-known/service/api/gql (getNotificationComponents)',
        api: '/.well-known/service/api/gql',
        gqlFn: 'getNotificationComponents',
        loginToken: options.loginToken,
        body: {
          teamDid: options.teamDid,
          userDid: options.userDid,
        },
      },
    ].filter(Boolean);

    if (options.mode === 'all') {
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
          const perEndpointTime = Math.max(options.timelimit / 2 / list.length, 2);
          const opts = {
            concurrency: options.concurrency || 100,
            timelimit: perEndpointTime,
            loginToken: item.loginToken || undefined,
            userDid: item.userDid || undefined,
            gqlFn: item.gqlFn || undefined,
            api: item.api || undefined,
            format: item.format || 'json',
            body: item.body || options.body || undefined,
            mode: m,
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
      console.log('mode', options.mode);
      const results = [];
      const startTime = Date.now();
      for (const item of list) {
        if (item.skip) {
          continue;
        }
        const url = joinUrl(origin, item.api);
        console.log(bold(`Testing ${item.name}`));
        const opts = {
          concurrency: options.concurrency || 100,
          timelimit: Math.max(options.timelimit / list.length, 2),
          loginToken: item.loginToken || undefined,
          userDid: item.userDid || undefined,
          gqlFn: item.gqlFn || undefined,
          api: item.api || undefined,
          format: item.format || 'json',
          body: item.body || options.body || undefined,
          mode: options.mode,
        };
        const res = await benchmarkEndpoint(url, opts);
        res.name = item.name;
        results.push(res);
      }

      const tableHead = [
        'Case',
        options.mode === 'rps' ? 'Req/s' : 'Concurrency',
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
