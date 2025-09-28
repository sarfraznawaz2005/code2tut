const { OrderChaptersNode } = require('../lib/nodes/OrderChaptersNode');
const LLMCaller = require('../lib/callLLM');

// Mock LLMCaller
jest.mock('../lib/callLLM');

describe('OrderChaptersNode', () => {
  let node;
  let mockShared;

  beforeEach(() => {
    node = new OrderChaptersNode();
    mockShared = {
      abstractions: [
        { name: 'Abstraction1', description: 'Desc1', files: [0] },
        { name: 'Abstraction2', description: 'Desc2', files: [1] },
        { name: 'Abstraction3', description: 'Desc3', files: [2] },
      ],
      relationships: {
        summary: 'Test summary.',
        details: [
          { from: 0, to: 1, label: 'Uses' },
          { from: 1, to: 2, label: 'Manages' },
        ],
      },
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

  test('prep should create context with abstractions and relationships', async () => {
    const prepRes = await node.prep(mockShared);

    expect(prepRes.abstractionListing).toBe('0 # Abstraction1\n1 # Abstraction2\n2 # Abstraction3');
    expect(prepRes.context).toContain('Project Summary:');
    expect(prepRes.context).toContain('Test summary.');
    expect(prepRes.context).toContain('From 0 (Abstraction1) to 1 (Abstraction2): Uses');
    expect(prepRes.numAbstractions).toBe(3);
  });

  test('exec should call LLM and return ordered indices', async () => {
    const mockResponse = { order: ['2', '0', '1'] }; // Ordered as 2, 0, 1
    const mockLlm = {
      loadCache: jest.fn().mockReturnValue({}),
      callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const prepRes = { abstractionListing: '0 # Abstraction1', context: 'test context', numAbstractions: 3, projectName: 'TestProject', shared: mockShared };

    const result = await node.exec(prepRes);

    expect(mockLlm.callWithStructuredOutput).toHaveBeenCalled();
    expect(result).toEqual([2, 0, 1]);
  });

    test('exec should handle cached response', async () => {
      const mockResponse = { order: ['1', '0', '2'] };
      LLMCaller.mockImplementation(() => ({
        callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
      }));

     const prepRes = { abstractionListing: '0 # Abstraction1', context: 'test context', numAbstractions: 3, projectName: 'TestProject', shared: { ...mockShared, useCache: true } };

     const result = await node.exec(prepRes);

     expect(result).toEqual([1, 0, 2]);
   });

  test('exec should add missing indices at the end', async () => {
    const mockResponse = { order: ['0', '1'] }; // Missing index 2
    const mockLlm = {
      loadCache: jest.fn().mockReturnValue({}),
      callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const prepRes = { abstractionListing: '0 # Abstraction1', context: 'test context', numAbstractions: 3, projectName: 'TestProject', shared: mockShared };

    const result = await node.exec(prepRes);

    expect(result).toEqual([0, 1, 2]); // Should add missing index 2 at the end
  });

    test('exec should throw error for duplicate indices', async () => {
      const mockResponse = { order: ['0', '1', '2', '0'] }; // Duplicate 0, but length matches
      const mockLlm = {
        loadCache: jest.fn().mockReturnValue({}),
        callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
      };
      LLMCaller.mockImplementation(() => mockLlm);

     const prepRes = { abstractionListing: '0 # Abstraction1', context: 'test context', numAbstractions: 3, projectName: 'TestProject', shared: mockShared };

      await expect(node.exec(prepRes)).rejects.toThrow('Duplicate item 0 found in ordered list.');
   });

    test('exec should handle invalid index', async () => {
      const mockResponse = { order: ['0', '1', '5'] }; // 5 is invalid, but length matches
      const mockLlm = {
        loadCache: jest.fn().mockReturnValue({}),
        callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
      };
      LLMCaller.mockImplementation(() => mockLlm);

     const prepRes = { abstractionListing: '0 # Abstraction1', context: 'test context', numAbstractions: 3, projectName: 'TestProject', shared: mockShared };

     await expect(node.exec(prepRes)).rejects.toThrow('Invalid index 5 in ordered list. Max index is 2.');
   });

  test('post should set shared.chapterOrder', async () => {
    const prepRes = {};
    const execRes = [2, 0, 1];

    await node.post(mockShared, prepRes, execRes);

    expect(mockShared.chapterOrder).toEqual([2, 0, 1]);
  });
});