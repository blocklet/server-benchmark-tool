#!/usr/bin/env node
/* eslint-disable @typescript-eslint/comma-dangle */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-promise-executor-return */
/* eslint-disable no-console */
const { Command } = require('commander');
const Table = require('cli-table-redemption');
const { bold, cyan } = require('chalk');
const joinUrl = require('url-join');
const NodeClient = require('@abtnode/client');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const { getSysInfo } = require('./util/sysinfo');
const { version } = require('./package.json');
const replaceApiPlaceholders = require('./util/replace-api-placeholders');

function createClient(origin, loginToken) {
  const client = new NodeClient(origin);
  client.setAuthToken(() => loginToken);
  return client;
}

function loadConfig(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return filePath.endsWith('.yml') ? YAML.parse(content) : JSON.parse(content);
}

function percentile(sortedArr, p) {
  const idx = Math.floor(sortedArr.length * p);
  return sortedArr[idx] || 0;
}

async function getServerVersion(origin) {
  try {
    const envText = await fetch(joinUrl(origin, '/.well-known/service/api/env')).then((res) => res.text());
    const match = envText.match(/serverVersion\s*:\s*"([^"]+)"/);
    return match ? match[1] : 'unknown';
  } catch {
    return 'unknown';
  }
}

async function benchmarkEndpoint(url, opts) {
  const {
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
    logResponse = false,
  } = opts;

  const client = createClient(url, data?.loginToken);
  let completed = 0;
  let successes = 0;
  const latencies = [];
  const startTime = Date.now();
  const timeLimitMs = timelimit * 1000;

  async function sendRequest() {
    const reqStart = Date.now();
    try {
      if (abtnodeFn) {
        const res = await client[abtnodeFn]({ input: body });
        if (logResponse) console.log(res);
        latencies.push(Math.max(Date.now() - reqStart, 1));
        successes++;
      } else {
        const fetchOpts = {
          method,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
        };
        if (body) fetchOpts.body = body;
        if (cookie) fetchOpts.headers.cookie = cookie;

        const res = await fetch(url, fetchOpts).then((v) => v[format]());
        if (logResponse) console.log(res);
        if (res.error) throw new Error(res.error);

        if (assert && format === 'json') {
          for (const [key, value] of Object.entries(assert)) {
            if (value === 'null' && res[key]) throw new Error(`${key} is not null`);
            if (value === 'not-null' && typeof res[key] === 'undefined') throw new Error(`${key} is null`);
          }
        }

        latencies.push(Math.max(Date.now() - reqStart, 1));
        successes++;
      }
    } catch (err) {
      if (logError) console.error(err);
      latencies.push(Date.now() - reqStart);
    } finally {
      completed++;
    }
  }

  if (mode === 'concurrent') {
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (Date.now() - startTime < timeLimitMs) await sendRequest();
      })
    );
  } else {
    const allPromises = [];
    const interval = setInterval(() => {
      if (Date.now() - startTime >= timeLimitMs) {
        clearInterval(interval);
        return;
      }
      for (let i = 0; i < concurrency; i++) allPromises.push(sendRequest());
    }, 1000);
    await new Promise((resolve) => setTimeout(resolve, timeLimitMs));
    await Promise.all(allPromises);
  }

  const totalTimeSec = Math.max((Date.now() - startTime) / 1000, 1);
  const rps = successes / totalTimeSec;
  latencies.sort((a, b) => a - b);

  return {
    concurrency,
    count: completed,
    success: successes,
    rps: Math.round(rps),
    min: latencies[0] || 0,
    t50: latencies[Math.floor(latencies.length / 2)] || 0,
    t90: percentile(latencies, 0.9),
    t99: percentile(latencies, 0.99),
    max: latencies[latencies.length - 1] || 0,
    time: totalTimeSec.toFixed(2),
  };
}

const program = new Command();
program.version(version);

program
  .command('init')
  .description('initialize config file')
  .action(() => {
    const config = fs.readFileSync('./util/benchmark.yml', 'utf8');
    fs.writeFileSync('benchmark.yml', config);
    console.log(bold(`Benchmark v${version}\n`));
    console.log('benchmark.yml file is initialized');
  });

program
  .command('run')
  .description('run benchmark from config')
  .option('--config <path>', 'path to JSON or YML config file')
  .option('--format [string]', 'output format: row, json, table', 'table')
  .option('--mode <mode>', 'request mode: rps | concurrent | all', 'all')
  .action(async (options) => {
    const configPath = options.config || path.join(process.cwd(), 'benchmark.yml');
    if (!fs.existsSync(configPath)) {
      console.error('config file is required');
      return;
    }

    const config = loadConfig(configPath);
    const { origin } = new URL(config.origin);
    let list = config.apis.filter((item) => item && !item.skip);
    const onlyList = config.apis.filter((item) => item.only);
    if (onlyList.length > 0) list = onlyList;

    list = replaceApiPlaceholders(list, config.data);
    console.log(bold(`Benchmarking ${cyan(origin)}\n`));

    const modes = config.mode === 'all' ? ['rps', 'concurrent'] : [config.mode];
    const resultsByMode = {};

    for (const mode of modes) {
      console.log(bold(`\n--- Testing endpoints in mode ${mode} ---\n`));
      const results = [];

      for (const item of list) {
        const url = joinUrl(origin, item.api);
        console.log(bold(`Testing ${item.name}`));

        const timePerEndpoint = Math.max(config.timelimit / (modes.length * list.length), 2);
        // eslint-disable-next-line no-await-in-loop
        const res = await benchmarkEndpoint(url, {
          ...item,
          concurrency: config.concurrency || 100,
          timelimit: timePerEndpoint,
          format: item.format || 'json',
          body: item.body || config.body || undefined,
          mode,
          data: config.data,
          logResponse: config.logResponse,
          logError: config.logError,
        });

        res.name = item.name;
        results.push(res);
      }

      resultsByMode[mode] = results;
    }

    for (const [mode, results] of Object.entries(resultsByMode)) {
      const table = new Table({
        head: [
          'Case',
          mode === 'rps' ? 'Req/s' : 'Concurrency',
          'Requests',
          'Success',
          'RPS',
          'Min',
          '50%',
          '90%',
          '99%',
          'Max',
          'Test Time',
        ],
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

      const modeDescriptions = {
        rps: 'RPS Mode: Sends a fixed number of requests per second.',
        concurrent: 'Concurrent Mode: Keeps concurrency level steady.',
      };

      console.log(`\n${bold('-----------------')}\n`);
      console.log(`Mode: ${mode} - ${modeDescriptions[mode]}`);
      console.log(table.toString());
    }

    const sysInfo = await getSysInfo();
    const serverVersion = await getServerVersion(origin);

    console.log(cyan('Server Version:'), serverVersion);
    console.log(cyan('Platform:'), sysInfo.os?.platform);
    console.log(cyan('CPU Cores:'), `${sysInfo.cpu?.cores}`);
    console.log(cyan('Memory (GB):'), `${Math.ceil((sysInfo.mem?.total || 0) / 1024 / 1024 / 1024)}`);
  });

program.parse(process.argv);
