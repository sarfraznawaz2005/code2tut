#!/usr/bin/env node

const path = require('path');
const { Command } = require('commander');
const chalk = require('chalk');
const { loadConfig } = require('./lib/config');
const createTutorialFlow = require('./lib/flow');

const program = new Command();

program
  .name('code2tutorial')
  .description('Generate tutorials from codebases using AI')
  .version('1.0.0')
  .option('-d, --dir <directory>', 'Path to local directory', process.cwd())
  .option('-n, --name <name>', 'Project name')
  .option('-o, --output <output>', 'Output directory', 'output')
  .option('-i, --include <patterns...>', 'Include file patterns')
  .option('-e, --exclude <patterns...>', 'Exclude file patterns')
  .option('-s, --max-size <size>', 'Max file size in bytes', parseInt, 100000)
  .option('-v, --verbose', 'Enable verbose output')
  .option('--cache <bool>', 'Enable caching', 'true')
  .option('--max-abstractions <num>', 'Max abstractions', parseInt)
  .option('--llm-provider <provider>', 'LLM provider: openai, anthropic, google')
  .option('--format <format>', 'Output format: markdown, html, pdf', 'html')


program.action(async (options) => {
  const config = loadConfig();

  const apiKey = process.env[config.apiKey] || config.apiKey;

  const shared = {
    localDir: options.dir,
    projectName: (options.name || path.basename(options.dir)).charAt(0).toUpperCase() + (options.name || path.basename(options.dir)).slice(1),
    outputDir: options.output,
    includePatterns: options.include || config.includePatterns,
    excludePatterns: options.exclude || config.excludePatterns,
    maxFileSize: options.maxSize || config.maxFileSize,
    verbose: options.verbose,
    useCache: options.cache === 'true' && config.useCache,
    maxAbstractions: options.maxAbstractions !== undefined ? options.maxAbstractions : config.maxAbstractions,
    llmProvider: options.llmProvider || config.llmProvider || 'openai',
    apiKey: apiKey,
    maxTokens: config.maxTokens,
    model: config.model,
    retry: config.retry,
    outputFormat: options.format || config.outputFormat,

  };

  console.log(chalk.yellow(`🚀 Starting tutorial generation for ${path.basename(shared.localDir)}...`));

  const flow = createTutorialFlow(shared);
  await flow.run(shared);

  console.log(chalk.green('✅ Done!'));
});

program.parse();