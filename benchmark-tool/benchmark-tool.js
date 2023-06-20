#!/usr/bin/env node
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
  .option('--login-token [string]', 'login token')
  .option('--format [string]', 'output format. Can be "row", "json", "table"', 'table')
  .option('--hide-version', 'not display version of benchmark-tool', false)
  .action(async (url, { concurrency, requests, times, loginToken, format, hideVersion } = {}) => {
    if (!hideVersion) {
      console.log(bold(`Benchmark v${version}\n`));
    }

    checkAb();

    if (!url.startsWith('http')) {
      // eslint-disable-next-line no-param-reassign
      url = `https://${url}`;
    }

    console.log(`${bold('Benchmarking')} ${cyan(url)}\n`);

    const tableHead = ['Concurrency', 'Requests', 'Success', 'RPS', 'Min', '50%', '90%', '99%', 'Max', 'Test Time'];

    const table = new Table({
      head: tableHead,
      style: { head: ['cyan', 'bold'] },
    });

    const count = requests || concurrency * 10;

    const result = {
      concurrency,
      count,
      success: [],
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
      await sleep(1000);

      console.log(
        `Time: ${i + 1}. ${bold('Benchmarking')} ${bold(url)} with ${cyan(concurrency)} concurrency and ${cyan(
          count
        )} requests...\n`
      );

      const header = loginToken ? `-H 'cookie: login_token=${loginToken}'` : '';
      const res = shelljs.exec(`ab -r -c ${concurrency} -n ${count} ${header} ${url}`, { silent: false });
      const { stdout, code } = res;
      if (code !== 0) {
        process.exit(code);
      }

      stdout.split('\n').forEach((line) => {
        // push 'Requests per second' and '50%' and '90%' to table
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
          const t = line.split(':')[1].trim();
          result.success.push(((count - parseInt(t, 10)) / count) * 100);
        }
      });

      console.log(`${bold('-----------------')}\n`);
    }

    result.success = average(result.success, 2) + '%';
    result.rps = average(result.rps);
    result.min = average(result.min) + ' ms';
    result.t50 = average(result.t50) + ' ms';
    result.t90 = average(result.t90) + ' ms';
    result.t99 = average(result.t99) + ' ms';
    result.max = average(result.max) + ' ms';
    result.time = average(result.time, 2) + ' s';

    table.push(Object.values(result));

    // output
    if (format === 'raw') {
      console.log(JSON.stringify(result));
    } else if (format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(table.toString());
    }
  });

program.parse(process.argv);
