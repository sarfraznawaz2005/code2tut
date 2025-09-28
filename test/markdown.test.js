const { writeMarkdownFiles } = require('../lib/formats/markdown');
const fs = require('fs-extra');
const path = require('path');

// Mock fs
jest.mock('fs-extra');

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((str) => str),
  white: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
}));

describe('writeMarkdownFiles', () => {
  beforeEach(() => {
    fs.existsSync.mockClear();
    fs.emptyDir.mockClear();
    fs.ensureDir.mockClear();
    fs.writeFile.mockClear();
  });

  test('writes Markdown files to output directory', async () => {
    const indexContent = '# Test Project\n\nSummary.';
    const chapterFiles = [
      { filename: '01_chapter1.md', content: '# Chapter 1\n\nContent1.' },
      { filename: '02_chapter2.md', content: '# Chapter 2\n\nContent2.' },
    ];
    const outputPath = '/output';

    await writeMarkdownFiles(outputPath, indexContent, chapterFiles);

    expect(fs.ensureDir).toHaveBeenCalledWith(path.join(outputPath, 'markdown'));
    expect(fs.writeFile).toHaveBeenCalledWith(path.join(outputPath, 'markdown', 'index.md'), indexContent);
    expect(fs.writeFile).toHaveBeenCalledWith(path.join(outputPath, 'markdown', '01_chapter1.md'), '# Chapter 1\n\nContent1.');
    expect(fs.writeFile).toHaveBeenCalledWith(path.join(outputPath, 'markdown', '02_chapter2.md'), '# Chapter 2\n\nContent2.');
  });

  test('skips files with undefined content', async () => {
    const indexContent = '# Test';
    const chapterFiles = [
      { filename: '01_chapter1.md', content: undefined },
    ];
    const outputPath = '/output';

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    await writeMarkdownFiles(outputPath, indexContent, chapterFiles);

    expect(fs.writeFile).toHaveBeenCalledWith(path.join(outputPath, 'markdown', 'index.md'), indexContent);
    expect(fs.writeFile).not.toHaveBeenCalledWith(path.join(outputPath, 'markdown', '01_chapter1.md'), expect.anything());
    expect(consoleSpy).toHaveBeenCalledWith('  - Skipping Markdown for 01_chapter1.md: content is undefined');
    consoleSpy.mockRestore();
  });

  test('throws error for invalid input', async () => {
    await expect(writeMarkdownFiles('/output', null, [])).rejects.toThrow('Invalid input');
  });
});