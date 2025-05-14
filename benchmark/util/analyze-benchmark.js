/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const { OpenAI } = require('openai');
const path = require('path');
const aiPrompt = require('./ai-prompt');

async function analyzeBenchmark({
  language = '中文',
  techStack = 'nodejs',
  model = 'gpt-4o',
  benchmarkRawFilePath,
} = {}) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_CLIENT, baseURL: process.env.OPENAI_BASE_URL });

  if (!fs.existsSync(benchmarkRawFilePath)) {
    console.error('❌ benchmark.log not found');
    return;
  }

  const logContent = fs.readFileSync(benchmarkRawFilePath, 'utf-8');

  // 截断以防超过 token 限制
  const maxChars = 40000;
  const promptText =
    logContent.length > maxChars ? logContent.slice(logContent.length - maxChars, logContent.length) : logContent;

  const prompt = aiPrompt(techStack, language, promptText);

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
    fs.writeFileSync(path.join(process.cwd(), 'benchmark-output', 'README.md'), reply);
  } catch (err) {
    console.error('❌ OpenAI request failed:', err.message);
  }
}

module.exports = analyzeBenchmark;
