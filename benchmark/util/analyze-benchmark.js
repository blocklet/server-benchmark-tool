/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const { OpenAI } = require('openai');

async function analyzeBenchmark({
  language = '中文',
  techStack = 'nodejs',
  model = 'gpt-4o',
  logFilePath = './benchmark.log',
} = {}) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_CLIENT, baseURL: process.env.OPENAI_BASE_URL });

  if (!fs.existsSync(logFilePath)) {
    console.error('❌ benchmark.log 文件不存在');
    return;
  }

  const logContent = fs.readFileSync(logFilePath, 'utf-8');

  // 截断以防超过 token 限制
  const maxChars = 40000;
  const promptText =
    logContent.length > maxChars ? logContent.slice(logContent.length - maxChars, logContent.length) : logContent;

  const prompt = `
你是一个经验丰富的后端性能架构专家，擅长通过压测日志识别系统瓶颈并提出可落地的优化建议。以下是某个 Node.js 服务在多接口、多并发条件下进行的性能压测日志数据（原始文本）。

请你将日志拆解分析并输出结构化的性能分析报告，要求包含以下维度，并用专家视角深入剖析：

---

【技术背景】
- 当前系统技术栈: ${techStack}
- 日志为系统压测原始输出，每一段包含多个接口在不同并发下的表现指标（RPS、延迟、错误等）

---

重要的事情说三遍：

- 0 PRS 的不需要分析，因为这类往往是压测的 token 失效了，只分析大于 0 RPS 的接口
- 0 PRS 的不需要分析，因为这类往往是压测的 token 失效了，只分析大于 0 RPS 的接口
- 0 PRS 的不需要分析，因为这类往往是压测的 token 失效了，只分析大于 0 RPS 的接口

---

【分析目标】

1. **吞吐率分析：**
   - 哪些接口的 RPS 随并发增长呈线性？哪些在特定并发下性能下降？
   - 对下降/饱和的接口，请推测可能瓶颈原因（CPU/线程池/数据库连接/锁等）。

2. **延迟分布分析：**
   - P50/P90/P99/Max 是否有严重抖动？
   - 若 P99 明显高于 P90，请分析原因（如 GC、队列排队、锁竞争等）；
   - 延迟随并发增加的趋势是否异常？

3. **接口表现对比：**
   - 哪些接口最优，可能是因为逻辑轻/走缓存？
   - 哪些接口最差，可能是数据库操作/依赖第三方服务？

4. **整体系统瓶颈判断：**
   - 系统整体是否已达到 CPU/线程/IO 等瓶颈？
   - 是否存在非线性缩放？在哪些并发下出现？这说明了什么？

5. **架构级优化建议：**
   - 给出可行的优化建议，涵盖架构/数据库/代码/部署维度；
   - 请结合常见的高并发系统设计模式（如限流、缓存、异步解耦）提出有针对性的优化措施；
   - 若必要，请建议使用哪些分析工具（如 APM、tracing、db profiler）进一步定位问题。

6. **AI 分析态度**
   - 分析请避免只是重述数据（如 “P90 是 300ms”）；
   - 请主动结合经验、以“为什么”和“如何改善”为核心展开。
   - 一定要结合具体的接口，具体的数据进行分析

日志内容如下：
\`\`\`
${promptText}
\`\`\`


【输出格式建议】
请以如下结构输出：

## 接口性能概览
## 问题诊断
## 优化建议
## 优先级排序
## 分析总结

请使用 **${language}** 输出结果。
`;

  console.log('🧠 Ask OpenAI for analysis...');

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const reply = completion.choices[0].message.content;
    console.log('\n✅ Analysis report:\n');
    console.log(reply);
  } catch (err) {
    console.error('❌ OpenAI request failed:', err.message);
  }
}

module.exports = analyzeBenchmark;
