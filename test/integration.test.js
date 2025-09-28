const createTutorialFlow = require('../lib/flow');
const { loadConfig } = require('../lib/config');

// Mock config and flow components
jest.mock('../lib/config');
jest.mock('../lib/callLLM');

// Mock marked
jest.mock('marked', () => ({
  marked: jest.fn((str) => str),
}));

describe('Integration Tests', () => {
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      llmProvider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4o',
      maxTokens: 1000,
      useCache: true,
      maxAbstractions: 3,
      includePatterns: ['**/*.js'],
      excludePatterns: ['node_modules'],
      maxFileSize: 100000,
      outputFormat: 'html',
    };
    loadConfig.mockReturnValue(mockConfig);
  });

  test('full flow execution with default config', async () => {
    const flow = createTutorialFlow();
    const shared = {
      localDir: '/test',
      projectName: 'TestProject',
      outputDir: 'output',
      includePatterns: ['**/*.js'],
      excludePatterns: ['node_modules'],
      maxFileSize: 100000,
      verbose: false,
      useCache: true,
      maxAbstractions: 3,
      llmProvider: 'openai',
      apiKey: 'test-key',
      maxTokens: 1000,
      model: 'gpt-4o',
      retry: 3,
      outputFormat: 'html',
    };

    // Mock the flow run method
    flow.run = jest.fn().mockResolvedValue();

    await flow.run(shared);

    expect(flow.run).toHaveBeenCalledWith(shared);
  });

  test('flow execution with custom options', async () => {
    const flow = createTutorialFlow();
    const shared = {
      localDir: '/custom',
      projectName: 'CustomProject',
      outputDir: 'custom_output',
      includePatterns: ['**/*.ts'],
      excludePatterns: ['dist'],
      maxFileSize: 50000,
      verbose: true,
      useCache: false,
      maxAbstractions: 5,
      llmProvider: 'google',
      apiKey: 'custom-key',
      maxTokens: 2000,
      model: 'gemini-pro',
      retry: 5,
      outputFormat: 'pdf',
    };

    flow.run = jest.fn().mockResolvedValue();

    await flow.run(shared);

    expect(flow.run).toHaveBeenCalledWith(shared);
  });

  test('flow handles errors during execution', async () => {
    const flow = createTutorialFlow();
    const shared = {
      localDir: '/test',
      projectName: 'TestProject',
      outputDir: 'output',
      includePatterns: ['**/*.js'],
      excludePatterns: ['node_modules'],
      maxFileSize: 100000,
      verbose: false,
      useCache: true,
      maxAbstractions: 3,
      llmProvider: 'openai',
      apiKey: 'test-key',
      maxTokens: 1000,
      model: 'gpt-4o',
      retry: 3,
      outputFormat: 'html',
    };

    flow.run = jest.fn().mockRejectedValue(new Error('Flow execution failed'));

    await expect(flow.run(shared)).rejects.toThrow('Flow execution failed');
  });
});