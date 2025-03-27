/* eslint-disable @typescript-eslint/no-var-requires */
const { cwd } = require('process');
const utc = require('dayjs/plugin/utc');
const dayjs = require('dayjs');
const { join } = require('path');
const { readJSONSync } = require('fs-extra');
const fs = require('fs');

dayjs.extend(utc);

const benchmarkPackageJson = readJSONSync(join(__dirname, '..', 'benchmark', 'package.json'));
const currentVersion = benchmarkPackageJson.version.replace(/-.*/, '');
const time = dayjs().utcOffset(8).format('YYYY-MM-DD-HH-mm-SSS');

const nextPackageJson = {
  ...benchmarkPackageJson,
  version: `${currentVersion}-beta-${time}`,
};

fs.writeFileSync(join(cwd(), 'benchmark', 'package.json'), JSON.stringify(nextPackageJson, null, 2));
