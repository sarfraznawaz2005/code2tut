const { FetchLocalNode } = require('../lib/nodes/FetchLocalNode');
const crawlLocalFiles = require('../lib/crawlLocal');

// Mock dependencies
jest.mock('../lib/crawlLocal');
jest.mock('fs-extra');
jest.mock('path');

const fs = require('fs-extra');
const path = require('path');

describe('FetchLocalNode', () => {
  let node;
  let mockShared;

  beforeEach(() => {
    node = new FetchLocalNode();
    mockShared = {
      localDir: '/test/dir',
      includePatterns: ['**/*.js'],
      excludePatterns: ['node_modules'],
      maxFileSize: 100000,
    };
    // Reset mocks
    crawlLocalFiles.mockClear();
    fs.existsSync.mockClear();
    fs.statSync.mockClear();
    path.join.mockClear();
    path.basename.mockClear();
  });

  test('prep should return correct configuration', async () => {
    const prepRes = await node.prep(mockShared);
    expect(prepRes).toEqual({
      dir: '/test/dir',
      includePatterns: ['**/*.js'],
      excludePatterns: ['node_modules'],
      maxFileSize: 100000,
    });
  });

  test('exec should call crawlLocalFiles and return files list', async () => {
    const mockFiles = {
      'file1.js': 'content1',
      'file2.js': 'content2',
    };
    crawlLocalFiles.mockReturnValue({ files: mockFiles });
    const prepRes = { dir: '/test/dir', includePatterns: [], excludePatterns: [], maxFileSize: 100000 };

    const result = await node.exec(prepRes);

    expect(crawlLocalFiles).toHaveBeenCalledWith('/test/dir', [], [], 100000);
    expect(result).toEqual([['file1.js', 'content1'], ['file2.js', 'content2']]);
  });

  test('exec should handle empty files', async () => {
    crawlLocalFiles.mockReturnValue({ files: {} });
    const prepRes = { dir: '/test/dir', includePatterns: [], excludePatterns: [], maxFileSize: 100000 };

    const result = await node.exec(prepRes);

    expect(result).toEqual([]);
  });

  test('post should set shared.files', async () => {
    const prepRes = {};
    const execRes = [['file1.js', 'content1']];

    await node.post(mockShared, prepRes, execRes);

    expect(mockShared.files).toEqual([['file1.js', 'content1']]);
  });

  test('exec should handle crawlLocalFiles error', async () => {
    crawlLocalFiles.mockImplementation(() => {
      throw new Error('Crawl failed');
    });
    const prepRes = { dir: '/test/dir', includePatterns: [], excludePatterns: [], maxFileSize: 100000 };

    await expect(node.exec(prepRes)).rejects.toThrow('Crawl failed');
  });
});