/* eslint-disable no-promise-executor-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-loop-func */
const targetUrl = 'http://localhost:5555'; // 修改为目标服务器地址
const concurrentRequests = 10000; // 每秒发起的请求数
let inFlight = 0; // 当前正在进行的请求数
let maxInFlight = 0; // 记录期间内的最大并发数
let totalRequests = 0; // 总发送请求数
let totalCompleted = 0; // 总完成请求数

async function sendRequests() {
  const requests = [];
  let errorCount = 0;
  for (let i = 0; i < concurrentRequests; i++) {
    totalRequests++;
    inFlight++;
    // 更新最大并发数
    if (inFlight > maxInFlight) {
      maxInFlight = inFlight;
    }
    // 使用 fetch 发起请求
    const promise = fetch(targetUrl)
      .then((res) => res.text())
      .catch(() => {
        errorCount++;
      })
      .finally(() => {
        inFlight--;
        totalCompleted++;
      });
    requests.push(promise);
  }
  // 等待本批次所有请求完成
  await Promise.all(requests);
  console.log(`已发起 ${concurrentRequests} 个请求, 错误数: ${errorCount}`);
}

// 每秒执行一次
const intervalId = setInterval(sendRequests, 1000);

// 10 秒后停止测试
setTimeout(async () => {
  clearInterval(intervalId);
  console.log('停止发起新请求，等待剩余请求完成...');

  // 等待所有 in-flight 请求完成
  while (inFlight > 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.log('测试结束');
  console.log(`总共发起的请求数：${totalRequests}`);
  console.log(`总共完成的请求数：${totalCompleted}`);
  console.log(`最大并发请求数：${maxInFlight}`);
  process.exit(0);
}, 10000);
