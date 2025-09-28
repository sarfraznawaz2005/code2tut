const { WriteChaptersNode } = require('../lib/nodes/WriteChaptersNode');
const LLMCaller = require('../lib/callLLM');

// Mock LLMCaller
jest.mock('../lib/callLLM');

describe('WriteChaptersNode', () => {
  let node;
  let mockShared;

  beforeEach(() => {
    node = new WriteChaptersNode();
    mockShared = {
      chapterOrder: [0, 1, 2],
      abstractions: [
        { name: 'Abstraction1', description: 'Desc1', files: [0] },
        { name: 'Abstraction2', description: 'Desc2', files: [1] },
        { name: 'Abstraction3', description: 'Desc3', files: [2] },
      ],
      files: [
        ['file1.js', 'content1'],
        ['file2.js', 'content2'],
        ['file3.js', 'content3'],
      ],
      projectName: 'TestProject',
      useCache: true,
      llmProvider: 'openai',
      apiKey: 'test-key',
      maxTokens: 1000,
      model: 'gpt-4o',
      retry: 3,
      verbose: false,
    };
    LLMCaller.mockClear();
  });

  test('prep should set up items for batch processing', async () => {
    const items = await node.prep(mockShared);

    expect(items).toHaveLength(3);
    expect(items[0].chapterNum).toBe(1);
    expect(items[0].abstractionIndex).toBe(0);
    expect(items[0].abstractionDetails.name).toBe('Abstraction1');
    expect(items[0].relatedFilesContentMap).toEqual({ '0 # file1.js': 'content1' });
    expect(items[0].fullChapterListing).toContain('1. [Abstraction1]');
  });

  test('exec should call LLM and return chapter content', async () => {
    const mockContent = '# Chapter 1: Abstraction1\n\nContent here.';
    const mockLlm = {
      call: jest.fn().mockResolvedValue(mockContent),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const item = {
      chapterNum: 1,
      abstractionIndex: 0,
      abstractionDetails: { name: 'Abstraction1', description: 'Desc1' },
      relatedFilesContentMap: { '0 # file1.js': 'content1' },
      projectName: 'TestProject',
      fullChapterListing: '1. [Abstraction1]',
      chapterFilenames: { 0: { num: 1, name: 'Abstraction1', filename: '01_abstraction1.md' } },
      prevChapter: null,
      nextChapter: { num: 2, name: 'Abstraction2', filename: '02_abstraction2.md' },
      useCache: true,
      llmProvider: 'openai',
      apiKey: 'test-key',
      maxTokens: 1000,
      model: 'gpt-4o',
      retry: 3,
      verbose: false,
    };

    const result = await node.exec(item);

    expect(LLMCaller).toHaveBeenCalledWith('openai', true, 'test-key', 1000, 'gpt-4o', 3, false);
    expect(mockLlm.call).toHaveBeenCalled();
    expect(result).toBe(mockContent);
  });

  test('exec should add heading if missing', async () => {
    const mockContent = 'Content without heading.';
    const mockLlm = {
      call: jest.fn().mockResolvedValue(mockContent),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const item = {
      chapterNum: 1,
      abstractionIndex: 0,
      abstractionDetails: { name: 'Abstraction1', description: 'Desc1' },
      relatedFilesContentMap: {},
      projectName: 'TestProject',
      fullChapterListing: '1. [Abstraction1]',
      chapterFilenames: {},
      prevChapter: null,
      nextChapter: null,
      useCache: true,
      llmProvider: 'openai',
      apiKey: 'test-key',
      maxTokens: 1000,
      model: 'gpt-4o',
      retry: 3,
      verbose: false,
    };

    const result = await node.exec(item);

    expect(result).toBe('# Chapter 1: Abstraction1\n\nContent without heading.');
  });

  test('exec should handle LLM error', async () => {
    const mockLlm = {
      call: jest.fn().mockRejectedValue(new Error('LLM failed')),
    };
    LLMCaller.mockImplementation(() => mockLlm);

    const item = {
      chapterNum: 1,
      abstractionIndex: 0,
      abstractionDetails: { name: 'Abstraction1', description: 'Desc1' },
      relatedFilesContentMap: {},
      projectName: 'TestProject',
      fullChapterListing: '1. [Abstraction1]',
      chapterFilenames: {},
      prevChapter: null,
      nextChapter: null,
      useCache: true,
      llmProvider: 'openai',
      apiKey: 'test-key',
      maxTokens: 1000,
      model: 'gpt-4o',
      retry: 3,
      verbose: false,
    };

    await expect(node.exec(item)).rejects.toThrow('LLM failed');
  });

  test('post should set shared.chapters', async () => {
    const prepRes = {};
    const execResList = ['Chapter 1 content', 'Chapter 2 content', 'Chapter 3 content'];

    await node.post(mockShared, prepRes, execResList);

    expect(mockShared.chapters).toEqual(execResList);
  });
});