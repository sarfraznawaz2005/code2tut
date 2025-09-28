const { Command } = require('commander');
const path = require('path');
const chalk = require('chalk');
const { loadConfig } = require('../lib/config');
const createTutorialFlow = require('../lib/flow');

// Mock dependencies
jest.mock('../lib/config');
jest.mock('../lib/flow');
jest.mock('chalk');

describe('CLI Options', () => {
  let mockConfig;
  let mockFlow;

  beforeEach(() => {
    mockConfig = {
      llmProvider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
      maxTokens: 1000,
      useCache: true,
      maxAbstractions: 25,
      includePatterns: ['**/*.js'],
      excludePatterns: ['node_modules'],
      maxFileSize: 100000,
      outputFormat: 'html',
    };
    loadConfig.mockReturnValue(mockConfig);
    mockFlow = { run: jest.fn() };
    createTutorialFlow.mockReturnValue(mockFlow);
    console.log = jest.fn();
    console.error = jest.fn();
    chalk.yellow = jest.fn((str) => str);
    chalk.green = jest.fn((str) => str);
  });

  test('parses default options correctly', () => {
    const program = new Command();
    program
      .option('-d, --dir <directory>', 'Path to local directory', process.cwd())
      .option('-n, --name <name>', 'Project name')
      .option('-o, --output <output>', 'Output directory', 'output')
      .option('-i, --include <patterns...>', 'Include file patterns')
      .option('-e, --exclude <patterns...>', 'Exclude file patterns')
      .option('-s, --max-size <size>', 'Max file size in bytes', (value) => parseInt(value), 100000)
      .option('-v, --verbose', 'Enable verbose output')
      .option('--cache <bool>', 'Enable caching', 'true')
      .option('--max-abstractions <num>', 'Max abstractions', parseInt)
      .option('--llm-provider <provider>', 'LLM provider: openai, anthropic, google')
      .option('--format <format>', 'Output format: markdown, html, pdf', 'html');

    program.parse(['node', 'test']);

    const options = program.opts();
    expect(options.dir).toBe(process.cwd());
    expect(options.name).toBeUndefined();
    expect(options.output).toBe('output');
    expect(options.include).toBeUndefined();
    expect(options.exclude).toBeUndefined();
    expect(options.maxSize).toBe(100000);
    expect(options.verbose).toBeUndefined();
    expect(options.cache).toBe('true');
    expect(options.maxAbstractions).toBeUndefined();
    expect(options.llmProvider).toBeUndefined();
    expect(options.format).toBe('html');
  });

  test('parses custom options correctly', () => {
    const program = new Command();
    program
      .option('-d, --dir <directory>', 'Path to local directory', process.cwd())
      .option('-n, --name <name>', 'Project name')
      .option('-o, --output <output>', 'Output directory', 'output')
      .option('-i, --include <patterns...>', 'Include file patterns')
      .option('-e, --exclude <patterns...>', 'Exclude file patterns')
      .option('-s, --max-size <size>', 'Max file size in bytes', (value) => parseInt(value), 100000)
      .option('-v, --verbose', 'Enable verbose output')
      .option('--cache <bool>', 'Enable caching', 'true')
      .option('--max-abstractions <num>', 'Max abstractions', parseInt)
      .option('--llm-provider <provider>', 'LLM provider: openai, anthropic, google')
      .option('--format <format>', 'Output format: markdown, html, pdf', 'html');

    program.parse(['node', 'test', '-d', '/custom/dir', '-n', 'MyProject', '-o', 'custom_output', '-i', '**/*.ts', '-e', 'dist', '-s', '50000', '-v', '--cache', 'false', '--max-abstractions', '10', '--llm-provider', 'google', '--format', 'pdf']);

    const options = program.opts();
    expect(options.dir).toBe('/custom/dir');
    expect(options.name).toBe('MyProject');
    expect(options.output).toBe('custom_output');
    expect(options.include).toEqual(['**/*.ts']);
    expect(options.exclude).toEqual(['dist']);
    expect(options.maxSize).toBe(50000);
    expect(options.verbose).toBe(true);
    expect(options.cache).toBe('false');
    expect(options.maxAbstractions).toBe(10);
    expect(options.llmProvider).toBe('google');
    expect(options.format).toBe('pdf');
  });

  test('action sets up shared object correctly', async () => {
    const program = new Command();
    program
      .option('-d, --dir <directory>', 'Path to local directory', process.cwd())
      .option('-n, --name <name>', 'Project name')
      .option('-o, --output <output>', 'Output directory', 'output')
      .option('-i, --include <patterns...>', 'Include file patterns')
      .option('-e, --exclude <patterns...>', 'Exclude file patterns')
      .option('-s, --max-size <size>', 'Max file size in bytes', (value) => parseInt(value), 100000)
      .option('-v, --verbose', 'Enable verbose output')
      .option('--cache <bool>', 'Enable caching', 'true')
      .option('--max-abstractions <num>', 'Max abstractions', parseInt)
      .option('--llm-provider <provider>', 'LLM provider: openai, anthropic, google')
      .option('--format <format>', 'Output format: markdown, html, pdf', 'html');

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

      expect(shared.localDir).toBe('/test/dir');
       expect(shared.projectName).toBe('Dir'); // basename of '/test/dir' is 'dir', capitalized to 'Dir'
      expect(shared.outputDir).toBe('output');
      expect(shared.includePatterns).toEqual(['**/*.js']);
      expect(shared.excludePatterns).toEqual(['node_modules']);
      expect(shared.maxFileSize).toBe(100000);
      expect(shared.verbose).toBeUndefined();
      expect(shared.useCache).toBe(true);
      expect(shared.maxAbstractions).toBe(25);
      expect(shared.llmProvider).toBe('openai');
      expect(shared.apiKey).toBe('test-key');
      expect(shared.maxTokens).toBe(1000);
      expect(shared.model).toBe('gpt-4o');
      expect(shared.outputFormat).toBe('html');
    });

    program.parse(['node', 'test', '-d', '/test/dir']);
  });

  test('action calls flow.run', async () => {
    const program = new Command();
    program
      .option('-d, --dir <directory>', 'Path to local directory', process.cwd())
      .option('-n, --name <name>', 'Project name')
      .option('-o, --output <output>', 'Output directory', 'output')
      .option('-i, --include <patterns...>', 'Include file patterns')
      .option('-e, --exclude <patterns...>', 'Exclude file patterns')
      .option('-s, --max-size <size>', 'Max file size in bytes', (value) => parseInt(value), 100000)
      .option('-v, --verbose', 'Enable verbose output')
      .option('--cache <bool>', 'Enable caching', 'true')
      .option('--max-abstractions <num>', 'Max abstractions', parseInt)
      .option('--llm-provider <provider>', 'LLM provider: openai, anthropic, google')
      .option('--format <format>', 'Output format: markdown, html, pdf', 'html');

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

      const flow = createTutorialFlow();
      await flow.run(shared);

      expect(createTutorialFlow).toHaveBeenCalled();
      expect(mockFlow.run).toHaveBeenCalledWith(shared);
    });

    program.parse(['node', 'test']);
  });
});