const { generateHtmlContent, writeHtmlFiles } = require('../lib/formats/html');
const fs = require('fs-extra');
const path = require('path');

// Mock fs
jest.mock('fs-extra');

// Mock marked
jest.mock('marked', () => ({
  marked: jest.fn((str) => str),
}));

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((str) => str),
  white: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
}));

describe('generateHtmlContent', () => {
  beforeEach(() => {
    fs.existsSync.mockClear();
    fs.emptyDir.mockClear();
    fs.ensureDir.mockClear();
    fs.writeFile.mockClear();
  });

  test('generates HTML content correctly', async () => {
    const indexContent = '# Test Project\n\nSummary here.';
    const chapterFiles = [
      { filename: '01_chapter1.md', content: '# Chapter 1\n\nContent1.' },
      { filename: '02_chapter2.md', content: '# Chapter 2\n\nContent2.' },
    ];
    const projectName = 'TestProject';

    const result = await generateHtmlContent(indexContent, chapterFiles, projectName);

    expect(result.indexHtmlContent).toContain('<!DOCTYPE html>');
    expect(result.indexHtmlContent).toContain('TestProject');
    expect(result.chapterHtmlFiles).toHaveLength(2);
    expect(result.chapterHtmlFiles[0].filename).toBe('01_chapter1.html');
    expect(result.chapterHtmlFiles[0].content).toContain('Chapter 1');
  });

  test('handles empty chapter files', async () => {
    const indexContent = '# Test';
    const chapterFiles = [];
    const projectName = 'TestProject';

    const result = await generateHtmlContent(indexContent, chapterFiles, projectName);

    expect(result.chapterHtmlFiles).toHaveLength(0);
  });

  test('throws error for invalid input', async () => {
    await expect(generateHtmlContent(null, [], 'Test')).rejects.toThrow('Invalid input');
  });
});

describe('writeHtmlFiles', () => {
  beforeEach(() => {
    fs.existsSync.mockClear();
    fs.emptyDir.mockClear();
    fs.ensureDir.mockClear();
    fs.writeFile.mockClear();
  });

  test('writes HTML files to output directory', async () => {
    const indexHtmlContent = '<html>Index</html>';
    const chapterHtmlFiles = [
      { filename: '01_chapter1.html', content: '<html>Chapter1</html>' },
    ];
    const outputPath = '/output';

    await writeHtmlFiles(outputPath, indexHtmlContent, chapterHtmlFiles);

    expect(fs.ensureDir).toHaveBeenCalledWith(path.join(outputPath, 'html'));
    expect(fs.writeFile).toHaveBeenCalledWith(path.join(outputPath, 'html', 'index.html'), indexHtmlContent);
    expect(fs.writeFile).toHaveBeenCalledWith(path.join(outputPath, 'html', '01_chapter1.html'), '<html>Chapter1</html>');
  });

  test('skips files with undefined content', async () => {
    const indexHtmlContent = '<html>Index</html>';
    const chapterHtmlFiles = [
      { filename: '01_chapter1.html', content: undefined },
    ];
    const outputPath = '/output';

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    await writeHtmlFiles(outputPath, indexHtmlContent, chapterHtmlFiles);

    expect(fs.writeFile).toHaveBeenCalledWith(path.join(outputPath, 'html', 'index.html'), indexHtmlContent);
    expect(fs.writeFile).not.toHaveBeenCalledWith(path.join(outputPath, 'html', '01_chapter1.html'), expect.anything());
    expect(consoleSpy).toHaveBeenCalledWith('  - Skipping HTML for 01_chapter1.html: content is undefined');
    consoleSpy.mockRestore();
  });

  test('throws error for invalid input', async () => {
    await expect(writeHtmlFiles('/output', null, [])).rejects.toThrow('Invalid input');
  });
});