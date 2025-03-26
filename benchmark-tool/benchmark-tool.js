#!/usr/bin/env node
/* eslint-disable @typescript-eslint/comma-dangle */
/* eslint-disable prefer-template */
/* eslint-disable no-console */

const { Command } = require('commander');
const shelljs = require('shelljs');
const Table = require('cli-table-redemption');
const { bold, cyan } = require('chalk');
const { version } = require('./package.json');

const checkAb = () => {
  const ab = shelljs.which('ab').stdout;

  if (!ab) {
    console.error('ab is not installed. Please install apache2-utils.');
    process.exit(1);
  }
};

// eslint-disable-next-line no-promise-executor-return
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const average = (arr, precision = 0) => Number((arr.reduce((p, c) => p + c, 0) / arr.length).toFixed(precision));

const program = new Command();

program
  .version(version)
  .arguments('<url>')
  .option('-c, --concurrency <number>', 'Number of multiple requests to perform at a time. Default is 100.', 100)
  .option('-n, --requests <number>', 'Number of requests to perform.')
  .option('--times <number>', 'Times of testing. Default is 3.', 3)
  .option('-t, --timelimit <number>', 'Duration of the test in seconds.')
  .option('--login-token [string]', 'login token')
  .option('--format [string]', 'output format. Can be "row", "json", "table"', 'table')
  .option('--body [string]', 'body of request')
  .option('--hide-version', 'not display version of benchmark-tool', false)
  .action(async (url, { concurrency, requests, times, loginToken, format, hideVersion, timelimit, body } = {}) => {
    if (!hideVersion) {
      console.log(bold(`Benchmark v${version}\n`));
    }

    checkAb();

    if (!url.startsWith('http')) {
      // eslint-disable-next-line no-param-reassign
      url = `https://${url}`;
    }

    console.log(`${bold('Benchmarking')} ${cyan(url)}\n`);

    // 增加 status200 列
    const tableHead = [
      'Concurrency',
      'Requests',
      'Success',
      'status200',
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

    const count = requests || concurrency * 10;

    const result = {
      concurrency,
      count,
      success: [],
      status200: [],
      rps: [],
      min: [],
      t50: [],
      t90: [],
      t99: [],
      max: [],
      time: [],
    };

    for (let i = 0; i < times; i++) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(500);

      console.log(
        `Time: ${i + 1}. ${bold('Benchmarking')} ${bold(url)} with ${cyan(concurrency)} concurrency and ${cyan(
          count || 0
        )} or ${timelimit || 0} seconds requests...\n`
      );

      const header = loginToken && loginToken !== 'undefined' ? `-H 'cookie: login_token=${loginToken}'` : '';
      const timelimitParam = timelimit && timelimit !== 'undefined' ? `-t ${timelimit}` : '';
      const countParam = count && count !== 'undefined' ? `-n ${count}` : '';
      const bodyParam = body && body !== 'undefined' ? `-p ${body} -T "application/json"` : '';
      const command = `ab -r -c ${concurrency} ${countParam} ${timelimitParam} ${header} ${bodyParam} ${url}`;
      console.log(command);
      const res = shelljs.exec(command, {
        silent: false,
      });
      const { stdout, code } = res;
      if (code !== 0) {
        process.exit(code);
      }

      let failed = 0;
      let non2xx = 0;

      stdout.split('\n').forEach((line) => {
        if (line.includes('Requests per second')) {
          const rps = line.split(':')[1].trim().split(' ')[0];
          result.rps.push(Number(rps));
        }
        if (line.includes('50%')) {
          const t = line.split('50%')[1].trim().split(' ')[0];
          result.t50.push(Number(t));
        }
        if (line.includes('90%')) {
          const t = line.split('90%')[1].trim().split(' ')[0];
          result.t90.push(Number(t));
        }
        if (line.includes('99%')) {
          const t = line.split('99%')[1].trim().split(' ')[0];
          result.t99.push(Number(t));
        }
        if (line.includes('Time taken for tests')) {
          const t = line.split(':')[1].trim();
          result.time.push(Number(t.replace('seconds', '').trim()));
        }
        if (line.includes('Total:')) {
          const t = line.split(':')[1].trim().split(' ');
          result.min.push(Number(t[0]));
          result.max.push(Number(t[t.length - 1]));
        }
        if (line.includes('Failed requests')) {
          failed = parseInt(line.split(':')[1].trim(), 10);
        }
        if (line.includes('Non-2xx responses')) {
          non2xx = parseInt(line.split(':')[1].trim(), 10);
        }
      });

      // 计算成功请求数：只要有返回就算成功，即 count - failed
      const successPercent = ((count - failed) / count) * 100;
      // 单独记录状态码为 200 的请求比例
      const status200Percent = ((count - failed - non2xx) / count) * 100;

      result.success.push(successPercent);
      result.status200.push(status200Percent);

      console.log(`${bold('-----------------')}\n`);
    }

    result.success = average(result.success, 2) + '%';
    result.status200 = average(result.status200, 2) + '%';
    result.rps = average(result.rps);
    result.min = average(result.min) + ' ms';
    result.t50 = average(result.t50) + ' ms';
    result.t90 = average(result.t90) + ' ms';
    result.t99 = average(result.t99) + ' ms';
    result.max = average(result.max) + ' ms';
    result.time = average(result.time, 2) + ' s';

    table.push(Object.values(result));

    // 输出结果
    if (format === 'raw') {
      console.log(JSON.stringify(result));
    } else if (format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(table.toString());
    }
  });

program.parse(process.argv);
