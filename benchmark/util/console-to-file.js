const fs = require('fs');
const util = require('util');
// eslint-disable-next-line import/no-extraneous-dependencies
const stripAnsi = require('strip-ansi');

const logFile = fs.createWriteStream('benchmark.log', { flags: 'a' }); // 'a' 表示追加写入
const logStdout = process.stdout;

// eslint-disable-next-line func-names, no-console
console.log = function () {
  // eslint-disable-next-line prefer-rest-params
  const rawMessage = util.format.apply(null, arguments);
  const cleanMessage = stripAnsi(rawMessage); // 去掉颜色控制符
  const line = `${cleanMessage}\n`;

  logFile.write(line); // 写入纯净版本到文件
  logStdout.write(`${rawMessage}\n`); // 彩色输出到终端
};
