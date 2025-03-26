#!/usr/bin/env node
/* eslint-disable @typescript-eslint/comma-dangle */
/* eslint-disable no-param-reassign */
/* eslint-disable prefer-template */
/* eslint-disable no-console */

const path = require('path');
const { Command } = require('commander');
const shelljs = require('shelljs');
const Table = require('cli-table-redemption');
const { bold, cyan } = require('chalk');
const joinUrl = require('url-join');
const fs = require('fs');
const { getSysInfo } = require('./util/sysinfo');
const { version } = require('./package.json');

const checkAb = () => {
  const ab = shelljs.which('ab').stdout;

  if (!ab) {
    console.error('ab is not installed. Please install apache2-utils.');
    process.exit(1);
  }
};

const findOutput = (stdout) => {
  const lines = stdout.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith('{')) {
      return JSON.parse(line);
    }
  }
  return {};
};

const getServerVersion = (origin) => {
  const { stdout } = shelljs.exec(`curl ${joinUrl(origin, '/.well-known/service/api/env')}`, {
    silent: true,
  });
  for (const line of (stdout || '').split('\n')) {
    if (line.trim().startsWith('serverVersion')) {
      return line.split('"')[1];
    }
  }

  return '';
};

const program = new Command();

program
  .version(version)
  .arguments('<origin>')
  .option('-c, --concurrency <number>', 'Number of multiple requests to perform at a time. Default is 100.', 100)
  .option('-n, --requests <number>', 'Number of requests to perform.')
  .option('--times <number>', 'Times of testing. Default is 3.', 3)
  .option('-t, --timelimit <number>', 'Duration of the test in seconds.')
  .option('--login-token [string]', 'login token')
  .option('--user-did [string]', 'user did')
  .option('--team-did [string]', 'team did')
  .option('--format [string]', 'output format. Can be "row", "json", "table"', 'table')
  .action(async (origin, { concurrency, requests, times, loginToken, userDid, timelimit } = {}) => {
    console.log(bold(`Benchmark v${version}\n`));

    checkAb();

    if (!origin.startsWith('http')) {
      origin = `https://${origin}`;
    }
    origin = new URL(`${origin.startsWith('http') ? '' : 'https://'}${origin}`).origin;

    console.log(`${bold('Benchmarking')} ${cyan(origin)}\n`);

    const list = [
      { name: '/api/date', api: '/api/date' },
      loginToken && { name: '/api/date (with session)', api: '/api/date', loginToken },
      { name: '/.well-known/service/api/did/session', api: '/.well-known/service/api/did/session' },
      // { name: '/.well-known/service/openembed.json', api: '/.well-known/service/openembed.json' },
      { name: '/.well-known/service/api/did/login', api: '/.well-known/service/api/did/login' },
      loginToken && {
        name: '/.well-known/service/api/did/session (with session)',
        api: '/.well-known/service/api/did/session',
        loginToken,
      },
      loginToken && {
        name: '/.well-known/service/api/user-session',
        api: '/.well-known/service/api/user-session',
        loginToken,
      },
      userDid && {
        name: '/.well-known/service/api/user/privacy/config',
        api: `/.well-known/service/api/user/privacy/config?did=${userDid}`,
      },
      { name: '/invited-only (without session)', api: '/invited-only' },
      userDid && { name: `/api/user/${userDid}`, api: `/api/user/${userDid}?return=0` },
      { name: '/api/users', api: '/api/users?return=0' },
      { name: '/__blocklet__.js', api: '/__blocklet__.js' },
      // {
      //   name: '/.well-known/service/api/gql (getNotifications)',
      //   api: '/.well-known/service/api/gql',
      //   loginToken,
      //   body: getNotifications(teamDid, userDid),
      // },
      // {
      //   name: '/.well-known/service/api/gql (getNotificationComponents)',
      //   api: '/.well-known/service/api/gql',
      //   loginToken,
      //   body: getNotificationComponents(teamDid, userDid),
      // },
    ].filter(Boolean);

    const results = [];

    const realTimelimit =
      timelimit && timelimit !== 'undefined' ? Math.max(Math.round(timelimit / list.length), 1) : 'undefined';

    const startTime = Date.now();
    let i = 0;
    list.forEach(({ name, api, loginToken: token, body }) => {
      i++;
      const url = joinUrl(origin, api);
      let tempBodyPath = 'undefined';
      if (body && body !== 'undefined') {
        tempBodyPath = path.join(__dirname, 'temp', `temp-body-${i}.json`);
        if (!fs.existsSync(path.dirname(tempBodyPath))) {
          fs.mkdirSync(path.dirname(tempBodyPath), { recursive: true });
        }
        fs.writeFileSync(tempBodyPath, body);
      }

      const res = shelljs.exec(
        `${path.join(
          __dirname,
          'benchmark-tool.js'
        )} -c ${concurrency} -n ${requests} --times ${times} -t ${realTimelimit} --body ${tempBodyPath} --login-token ${token} --format raw --hide-version '${url}'`,
        { silent: false }
      );

      const { stdout, code } = res;

      if (code !== 0) {
        process.exit(code);
      }

      const output = findOutput(stdout);
      output.name = name;
      results.push(output);
    });

    const tableHead = [
      'Case',
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

    table.push(
      ...results.map((result) => [
        result.name,
        result.concurrency,
        result.count,
        result.success,
        result.status200,
        result.rps,
        result.min,
        result.t50,
        result.t90,
        result.t99,
        result.max,
        result.time,
      ])
    );

    // output
    console.log(`\n${bold('-----------------')}\n`);

    const sysInfo = await getSysInfo();
    const serverVersion = getServerVersion(origin);
    console.log(cyan('Server Version:'), serverVersion);
    console.log(cyan('Platform:'), sysInfo.os?.platform);
    console.log(cyan('CPU Cores:'), `${sysInfo.cpu?.cores}`);
    console.log(cyan('Memory (GB):'), `${Math.ceil((sysInfo.mem?.total || 0) / 1024 / 1024 / 1024)}`);
    console.log(cyan('Test Time:'), `${(Date.now() - startTime) / 1000} seconds`);
    console.log(table.toString());
  });

program.parse(process.argv);
