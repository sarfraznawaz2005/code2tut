const { IdentifyAbstractionsNode } = require('../lib/nodes/IdentifyAbstractionsNode');
const LLMCaller = require('../lib/callLLM');

// Mock LLMCaller
jest.mock('../lib/callLLM');

describe('IdentifyAbstractionsNode', () => {
  let node;
  let mockShared;

  beforeEach(() => {
    node = new IdentifyAbstractionsNode();
    mockShared = {
      files: [
        ['file1.js', 'content1'],
        ['file2.js', 'content2'],
        ['file3.js', 'content3'],
        ['file4.js', 'content4'],
        ['file5.js', 'content5'],
        ['file6.js', 'content6'], // More than 5
      ],
      projectName: 'TestProject',
      maxAbstractions: 3,
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

  test('prep should limit files to max and create context', async () => {
    const prepRes = await node.prep(mockShared);

    expect(prepRes.fileCount).toBe(6);
    expect(prepRes.context).toContain('--- File Index 0: file1.js ---');
    expect(prepRes.context).toContain('--- File Index 4: file5.js ---');
    expect(prepRes.context).toContain('--- File Index 5: file6.js ---');
    expect(prepRes.fileListing).toBe('0 # file1.js\n1 # file2.js\n2 # file3.js\n3 # file4.js\n4 # file5.js\n5 # file6.js');
    expect(prepRes.maxAbstractions).toBe(3);
  });

  test('exec should call LLM and validate response', async () => {
    const mockResponse = [
      { name: 'Abstraction1', description: 'Desc1', file_indices: [0, 1] },
      { name: 'Abstraction2', description: 'Desc2', file_indices: [2] },
      { name: 'Abstraction3', description: 'Desc3', file_indices: [3, 4] },
    ];
    const mockLlm = {
      loadCache: jest.fn().mockReturnValue({}),
      callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const prepRes = { context: 'test context', fileListing: '0 # file1.js\n1 # file2.js\n2 # file3.js\n3 # file4.js\n4 # file5.js', fileCount: 5, projectName: 'TestProject', maxAbstractions: 3, shared: mockShared };

    const result = await node.exec(prepRes);

    expect(LLMCaller).toHaveBeenCalledWith('openai', true, 'test-key', 1000, 'gpt-4o', 3, false);
    expect(mockLlm.callWithStructuredOutput).toHaveBeenCalled();
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: 'Abstraction1', description: 'Desc1', files: [0, 1] });
  });

  test('exec should handle YAML response', async () => {
    const mockResponse = [
      { name: 'Abstraction1', description: 'Desc1', file_indices: [0] },
    ];
    const mockLlm = {
      loadCache: jest.fn().mockReturnValue({}),
      callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const prepRes = { context: 'test', fileListing: '0 # file1.js', fileCount: 1, projectName: 'TestProject', maxAbstractions: 1, shared: mockShared };

    const result = await node.exec(prepRes);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Abstraction1');
  });

  test('exec should limit abstractions to maxAbstractions', async () => {
    const mockResponse = [
      { name: 'Abstraction1', description: 'Desc1', file_indices: [0] },
      { name: 'Abstraction2', description: 'Desc2', file_indices: [1] },
      { name: 'Abstraction3', description: 'Desc3', file_indices: [2] },
      { name: 'Abstraction4', description: 'Desc4', file_indices: [3] },
    ];
    const mockLlm = {
      loadCache: jest.fn().mockReturnValue({}),
      callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const prepRes = { context: 'test', fileListing: '0 # file1.js\n1 # file2.js\n2 # file3.js\n3 # file4.js', fileCount: 4, projectName: 'TestProject', maxAbstractions: 2, shared: mockShared };

    const result = await node.exec(prepRes);

    expect(result).toHaveLength(2);
  });

  test('exec should handle invalid file indices', async () => {
    const mockResponse = [
      { name: 'Abstraction1', description: 'Desc1', file_indices: [10] }, // 10 is invalid
    ];
    const mockLlm = {
      loadCache: jest.fn().mockReturnValue({}),
      callWithStructuredOutput: jest.fn().mockResolvedValue(mockResponse),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const prepRes = { context: 'test', fileListing: '0 # file1.js', fileCount: 1, projectName: 'TestProject', maxAbstractions: 1, shared: mockShared };

    const result = await node.exec(prepRes);

    expect(result).toHaveLength(1);
    expect(result[0].files).toEqual([]); // Invalid indices skipped
  });

  test('post should set shared.abstractions', async () => {
    const prepRes = {};
    const execRes = [{ name: 'Abstraction1', description: 'Desc1', files: [0] }];

    await node.post(mockShared, prepRes, execRes);

    expect(mockShared.abstractions).toEqual(execRes);
  });
});