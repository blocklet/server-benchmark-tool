const fs = require('fs');
const util = require('util');
// eslint-disable-next-line import/no-extraneous-dependencies
const path = require('path');

if (!fs.existsSync(path.join(process.cwd(), 'benchmark-output'))) {
  fs.mkdirSync(path.join(process.cwd(), 'benchmark-output'), { recursive: true });
}

const logFile = fs.createWriteStream(path.join(process.cwd(), 'benchmark-output', 'benchmark.log'), { flags: 'a' }); // 'a' 表示追加写入
const logStdout = process.stdout;

// eslint-disable-next-line func-names, no-console
console.log = function () {
  // eslint-disable-next-line prefer-rest-params
  const rawMessage = util.format.apply(null, arguments);
  const line = `${rawMessage}\n`;

  logFile.write(line); // 写入纯净版本到文件
  logStdout.write(`${rawMessage}\n`); // 彩色输出到终端
};
