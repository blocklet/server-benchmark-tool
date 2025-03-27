#!/usr/bin/env node
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
 * 对单个 endpoint 进行压力测试，采用每秒发起指定数量的请求
 * @param {string} url 请求地址
 * @param {object} opts 参数配置，包括:
 *   - concurrency: 每秒并发请求数
 *   - timelimit: 测试时长（秒）
 *   - loginToken: 若存在，加入 header 中
 *   - body: 若存在，使用 POST 请求，并以此作为请求体（要求为 JSON 字符串）
 *   - gqlFn: 若存在，调用 client 的对应方法
 */
async function benchmarkEndpoint(url, { concurrency, timelimit, loginToken, userDid, body, gqlFn, format = 'json' }) {
  const client = createClient(url, loginToken);
  let completed = 0;
  let successes = 0;
  const latencies = [];

  const startTime = Date.now();
  const timeLimitMs = timelimit * 1000;

  // 用于存储所有请求的 Promise
  const allPromises = [];

  // 定时器，每秒触发一次，发起 concurrency 个请求
  const interval = setInterval(() => {
    const now = Date.now();
    if (now - startTime >= timeLimitMs) {
      clearInterval(interval);
      return;
    }
    for (let i = 0; i < concurrency; i++) {
      const reqStart = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      const promise = (async () => {
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
      })();
      allPromises.push(promise);
    }
  }, 1000);

  // 等待测试时长结束
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve) => setTimeout(resolve, timelimit * 1000));
  // 等待所有发出的请求结束
  await Promise.all(allPromises);

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
  .option('-c, --concurrency <number>', 'pre-request concurrency, default 100', parseInt, 10)
  .option('-t, --timelimit <number>', 'test duration, default 10', parseInt, 10)
  .option('--login-token [string]', 'login token')
  .option('--user-did [string]', 'user did')
  .option('--team-did [string]', 'team did')
  .option('--body [string]', 'request body (string)')
  .option('--format [string]', 'output format, optional "row", "json", "table", default "table"', 'table')
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
      { name: '/invited-only (without session)', api: '/invited-only', format: 'text', loginToken: options.loginToken },
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
        body: item.body || options.body || undefined, // 优先使用 item.body，如无则使用命令行传入的 body
      };
      const res = await benchmarkEndpoint(url, opts);
      res.name = item.name;
      console.log(res);
      results.push(res);
    }

    const tableHead = [
      'Case',
      'Concurrency',
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
        `${(result.success / result.count) * 100}%`,
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
  });

program.parse(process.argv);
