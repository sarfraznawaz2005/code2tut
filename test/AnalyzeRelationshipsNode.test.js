const { AnalyzeRelationshipsNode } = require('../lib/nodes/AnalyzeRelationshipsNode');
const LLMCaller = require('../lib/callLLM');

// Mock LLMCaller
jest.mock('../lib/callLLM');

describe('AnalyzeRelationshipsNode', () => {
  let node;
  let mockShared;

  beforeEach(() => {
    node = new AnalyzeRelationshipsNode();
    mockShared = {
      abstractions: [
        { name: 'Abstraction1', description: 'Desc1', files: [0, 1] },
        { name: 'Abstraction2', description: 'Desc2', files: [2] },
        { name: 'Abstraction3', description: 'Desc3', files: [3, 4] },
      ],
      files: [
        ['file1.js', 'content1'],
        ['file2.js', 'content2'],
        ['file3.js', 'content3'],
        ['file4.js', 'content4'],
        ['file5.js', 'content5'],
      ],
      projectName: 'TestProject',
      llmProvider: 'openai',
      useCache: true,
      apiKey: 'test-key',
      maxTokens: 1000,
      model: 'gpt-4o',
      retry: 3,
      verbose: false,
    };
    LLMCaller.mockClear();
  });

  test('prep should create context with abstractions and files', async () => {
    const prepRes = await node.prep(mockShared);

    expect(prepRes.context).toContain('Identified Abstractions:');
    expect(prepRes.context).toContain('Index 0: Abstraction1');
    expect(prepRes.context).toContain('--- File: 0 # file1.js ---');
    expect(prepRes.abstractionListing).toBe('0 # Abstraction1\n1 # Abstraction2\n2 # Abstraction3');
    expect(prepRes.numAbstractions).toBe(3);
  });

  test('exec should call LLM and validate response', async () => {
    const mockResponse = {
      summary: 'Test project summary.',
      relationships: [
        { from_abstraction: '0 # Abstraction1', to_abstraction: '1 # Abstraction2', label: 'Uses' },
        { from_abstraction: '1 # Abstraction2', to_abstraction: '2 # Abstraction3', label: 'Manages' },
      ],
    };
    const mockLlm = {
      loadCache: jest.fn().mockReturnValue({}),
      callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const prepRes = { context: 'test context', abstractionListing: '0 # Abstraction1', numAbstractions: 3, projectName: 'TestProject', shared: mockShared };

    const result = await node.exec(prepRes);

    expect(mockLlm.callWithStructuredOutput).toHaveBeenCalled();
    expect(result.summary).toBe('Test project summary.');
    expect(result.details).toEqual([
      { from: 0, to: 1, label: 'Uses' },
      { from: 1, to: 2, label: 'Manages' },
    ]);
  });

    test('exec should handle cached response', async () => {
      const mockResponse = {
        summary: 'Cached summary.',
        relationships: [
          { from_abstraction: '0 # Abstraction1', to_abstraction: '1 # Abstraction2', label: 'Uses' },
        ],
      };
      LLMCaller.mockImplementation(() => ({
        callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
      }));

      const prepRes = { context: 'test context', abstractionListing: '0 # Abstraction1\n1 # Abstraction2', numAbstractions: 2, projectName: 'TestProject', shared: { ...mockShared, useCache: true } };

      const result = await node.exec(prepRes);

      expect(LLMCaller.mock.results[0].value.callWithStructuredOutput).toHaveBeenCalled();
      expect(result.summary).toBe('Cached summary.');
    });

  test('exec should throw error for missing keys', async () => {
    const mockResponse = { summary: 'Summary only' }; // Missing relationships
    const mockLlm = {
      loadCache: jest.fn().mockReturnValue({}),
      callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const prepRes = { context: 'test', abstractionListing: '0 # Abstraction1', numAbstractions: 1, projectName: 'TestProject', shared: mockShared };

    await expect(node.exec(prepRes)).rejects.toThrow("LLM output is missing required keys");
  });

  test('exec should validate relationship indices', async () => {
    const mockResponse = {
      summary: 'Summary.',
      relationships: [
        { from_abstraction: '0 # Abstraction1', to_abstraction: '5 # Invalid', label: 'Uses' }, // Invalid index
      ],
    };
    const mockLlm = {
      loadCache: jest.fn().mockReturnValue({}),
      callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const prepRes = { context: 'test', abstractionListing: '0 # Abstraction1', numAbstractions: 3, projectName: 'TestProject', shared: mockShared };

    await expect(node.exec(prepRes)).rejects.toThrow('Invalid index 5 in relationship to index. Max index is 2.');
  });

  test('post should set shared.relationships', async () => {
    const prepRes = {};
    const execRes = { summary: 'Summary', details: [{ from: 0, to: 1, label: 'Uses' }] };

    await node.post(mockShared, prepRes, execRes);

    expect(mockShared.relationships).toEqual(execRes);
  });
});