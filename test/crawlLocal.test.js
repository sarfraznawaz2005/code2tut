const crawlLocalFiles = require('../lib/crawlLocal');
const fs = require('fs-extra');
const path = require('path');
const ignore = require('ignore');
const micromatch = require('micromatch');

// Mock fs and other dependencies
jest.mock('fs-extra');
jest.mock('ignore');
jest.mock('micromatch');

describe('crawlLocalFiles', () => {
  beforeEach(() => {
    fs.existsSync.mockClear();
    fs.statSync.mockClear();
    fs.readFileSync.mockClear();
    fs.readdirSync.mockClear();
    ignore.mockClear();
    micromatch.isMatch.mockClear();
  });

  test('throws error for non-existent directory', () => {
    fs.existsSync.mockReturnValue(false);
    expect(() => crawlLocalFiles('/nonexistent')).toThrow('Directory does not exist: /nonexistent');
  });

  test('throws error for non-directory', () => {
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ isDirectory: () => false });
    expect(() => crawlLocalFiles('/file')).toThrow('Path is not a directory: /file');
  });

    test('crawls directory and returns files', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation((path) => {
        if (path.endsWith('/test') || path.endsWith('\\test')) return { isDirectory: () => true, isFile: () => false };
        if (path.includes('file1.js')) return { isDirectory: () => false, isFile: () => true, size: 100 };
        if (path.includes('file2.js')) return { isDirectory: () => false, isFile: () => true, size: 100 };
        if (path.includes('dir1')) return { isDirectory: () => true, isFile: () => false };
        return { isDirectory: () => false, isFile: () => true, size: 100 };
      });
     fs.readdirSync.mockImplementation((path) => {
       if (path.endsWith('/test') || path.endsWith('\\test')) return ['file1.js', 'file2.js', 'dir1'];
       if (path.includes('dir1') && !path.includes('file1.js')) return [];
       return [];
     });
     fs.readFileSync.mockReturnValue('content');
     micromatch.isMatch.mockImplementation((path, pattern) => {
       // For this test, '**/*.js' should match 'file1.js' and 'file2.js'
       return pattern === '**/*.js' && (path.includes('file1.js') || path.includes('file2.js'));
     });

     const result = crawlLocalFiles('/test', ['**/*.js'], ['node_modules'], 1000);

     expect(result.files).toEqual({
       'file1.js': 'content',
       'file2.js': 'content',
     });
   });

    test('respects include patterns', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation((path) => {
        if (path.endsWith('/test') || path.endsWith('\\test')) return { isDirectory: () => true, isFile: () => false };
        if (path.includes('file1.js')) return { isDirectory: () => false, isFile: () => true, size: 100 };
        if (path.includes('file2.ts')) return { isDirectory: () => false, isFile: () => true, size: 100 };
        return { isDirectory: () => false, isFile: () => true, size: 100 };
      });
     fs.readdirSync.mockReturnValue(['file1.js', 'file2.ts']);
     fs.readFileSync.mockReturnValue('content');
     micromatch.isMatch.mockImplementation((path, pattern) => {
       // file1.js matches '**/*.js', file2.ts does not
       return pattern === '**/*.js' && path.includes('file1.js');
     });

     const result = crawlLocalFiles('/test', ['**/*.js'], [], 1000);

     expect(result.files).toEqual({ 'file1.js': 'content' });
   });

    test('respects exclude patterns', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation((path) => {
        if (path.endsWith('/test') || path.endsWith('\\test')) return { isDirectory: () => true, isFile: () => false };
        if (path.includes('file1.js')) return { isDirectory: () => false, isFile: () => true, size: 100 };
        if (path.includes('node_modules')) return { isDirectory: () => true, isFile: () => false };
        return { isDirectory: () => false, isFile: () => true, size: 100 };
      });
     fs.readdirSync.mockReturnValue(['file1.js', 'node_modules']);
     fs.readFileSync.mockReturnValue('content');
     micromatch.isMatch.mockImplementation((path, pattern) => {
       if (pattern === '**/*') {
         // Both match include
         return true;
       } else if (pattern === 'node_modules') {
         // node_modules is excluded
         return path.includes('node_modules');
       }
       return false;
     });

     const result = crawlLocalFiles('/test', ['**/*'], ['node_modules'], 1000);

     expect(result.files).toEqual({ 'file1.js': 'content' });
   });

    test('filters by max file size', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation((path) => {
        if (path.endsWith('/test') || path.endsWith('\\test')) return { isDirectory: () => true, isFile: () => false };
        if (path.includes('small.js')) return { isDirectory: () => false, isFile: () => true, size: 50 };
        if (path.includes('large.js')) return { isDirectory: () => false, isFile: () => true, size: 200 };
        return { isDirectory: () => false, isFile: () => true, size: 100 };
      });
     fs.readdirSync.mockReturnValue(['small.js', 'large.js']);
     fs.readFileSync.mockReturnValue('content');
     micromatch.isMatch.mockImplementation((path, pattern) => {
       // Both match '**/*.js'
       return pattern === '**/*.js';
     });

     const result = crawlLocalFiles('/test', ['**/*.js'], [], 100);

     expect(result.files).toEqual({ 'small.js': 'content' });
   });

    test('handles .gitignore', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation((path) => {
        if (path.endsWith('/test') || path.endsWith('\\test')) return { isDirectory: () => true, isFile: () => false };
        if (path.includes('file1.js')) return { isDirectory: () => false, isFile: () => true, size: 100 };
        if (path.includes('ignored.js')) return { isDirectory: () => false, isFile: () => true, size: 100 };
        return { isDirectory: () => false, isFile: () => true, size: 100 };
      });
     fs.readdirSync.mockReturnValue(['file1.js', 'ignored.js']);
     fs.readFileSync.mockReturnValue('content');
     micromatch.isMatch.mockImplementation((path, pattern) => {
       // Both match '**/*.js'
       return pattern === '**/*.js';
     });

     const mockGitignore = { ignores: jest.fn().mockImplementation((path) => path.includes('ignored.js')), add: jest.fn().mockReturnThis() };
     ignore.mockReturnValue(mockGitignore);

     const result = crawlLocalFiles('/test', ['**/*.js'], [], 1000);

     expect(result.files).toEqual({ 'file1.js': 'content' });
   });

    test('handles recursive directory traversal', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation((path) => {
        if (path.endsWith('/test') || path.endsWith('\\test')) return { isDirectory: () => true, isFile: () => false };
        if (path.includes('dir1') && !path.includes('file1.js')) return { isDirectory: () => true, isFile: () => false };
        if (path.includes('file1.js')) return { isDirectory: () => false, isFile: () => true, size: 100 };
        return { isDirectory: () => false, isFile: () => true, size: 100 };
      });
     fs.readdirSync
       .mockReturnValueOnce(['dir1']) // Root
       .mockReturnValueOnce(['file1.js']); // dir1
     fs.readFileSync.mockReturnValue('content');
     micromatch.isMatch.mockImplementation((path, pattern) => {
       // 'dir1/file1.js' matches '**/*.js'
       return pattern === '**/*.js';
     });

     const result = crawlLocalFiles('/test', ['**/*.js'], [], 1000);

     expect(result.files).toEqual({ 'dir1\\file1.js': 'content' });
   });

    test('handles read errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation((path) => {
        if (path.endsWith('/test') || path.endsWith('\\test')) return { isDirectory: () => true, isFile: () => false };
        if (path.includes('file1.js')) return { isDirectory: () => false, isFile: () => true, size: 100 };
        return { isDirectory: () => false, isFile: () => true, size: 100 };
      });
      fs.readdirSync.mockReturnValue(['file1.js']);
      fs.readFileSync.mockImplementation(() => { throw new Error('Read failed'); });
      micromatch.isMatch.mockImplementation((path, pattern) => {
        // 'file1.js' matches '**/*.js'
        return pattern === '**/*.js';
      });

     const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
     const result = crawlLocalFiles('/test', ['**/*.js'], [], 1000);

     expect(result.files).toEqual({});
     expect(consoleSpy).toHaveBeenCalledWith('Could not read file file1.js:', 'Read failed');
     consoleSpy.mockRestore();
   });
});