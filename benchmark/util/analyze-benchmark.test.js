const path = require('path');
const analyzeBenchmark = require('./analyze-benchmark');

analyzeBenchmark({
  language: '中文',
  techStack: 'nodejs',
  model: 'gpt-4o',
  logFilePath: path.join(__dirname, 'analyze-benchmark.log-file'),
});
