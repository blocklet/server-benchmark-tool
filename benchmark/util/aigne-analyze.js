/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { AIAgent, AIGNE } = require('@aigne/core');
// eslint-disable-next-line import/extensions
const { OpenAIChatModel } = require('@aigne/core/models/openai-chat-model.js');
const aiPrompt = require('./ai-prompt');

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_CLIENT,
  baseURL: process.env.OPENAI_BASE_URL,
  model: 'gpt-4o-mini', // Optional, defaults to "gpt-4o-mini"
});

const aigneAnalyze = async ({ techStack, language, benchmarkRawFilePath }) => {
  // Use with AIGNE
  const aigne = new AIGNE({ model });

  if (!fs.existsSync(benchmarkRawFilePath)) {
    console.error('❌ benchmark.log not found');
    return;
  }

  const logContent = fs.readFileSync(benchmarkRawFilePath, 'utf-8');

  // 截断以防超过 token 限制
  const maxChars = 40000;
  const promptText =
    logContent.length > maxChars ? logContent.slice(logContent.length - maxChars, logContent.length) : logContent;

  // Or use with AIAgent directly
  const agent = AIAgent.from({
    model,
    instructions: 'You are a benchmark analysis expert.',
  });

  const prompt = aiPrompt(techStack, language, promptText);

  const result = await aigne.invoke(agent, prompt);

  console.log(result.$message);
  fs.writeFileSync(path.join(process.cwd(), 'benchmark-output', 'README.md'), result.$message);
};

module.exports = aigneAnalyze;
