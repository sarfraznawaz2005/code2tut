const { writePdfFiles } = require('../lib/formats/pdf');
const fs = require('fs-extra');
const path = require('path');
const puppeteer = require('puppeteer');

// Mock dependencies
jest.mock('fs-extra');
jest.mock('puppeteer');

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((str) => str),
  white: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
}));

describe('writePdfFiles', () => {
  let mockBrowser;
  let mockPage;

  beforeEach(() => {
    mockBrowser = {
      newPage: jest.fn(),
      close: jest.fn(),
    };
    mockPage = {
      setContent: jest.fn(),
      pdf: jest.fn(),
    };
    mockBrowser.newPage.mockResolvedValue(mockPage);
    puppeteer.launch.mockResolvedValue(mockBrowser);

    fs.existsSync.mockClear();
    fs.emptyDir.mockClear();
    fs.ensureDir.mockClear();
  });

  test('generates and writes PDF file', async () => {
    const indexHtmlContent = '<html>Index</html>';
    const chapterHtmlFiles = [
      { filename: '01_chapter1.html', content: '<html>Chapter1</html>' },
    ];
    const projectName = 'TestProject';
    const outputPath = '/output';

    await writePdfFiles(outputPath, indexHtmlContent, chapterHtmlFiles, projectName);

    expect(fs.ensureDir).toHaveBeenCalledWith(path.join(outputPath, 'pdf'));
    expect(mockPage.setContent).toHaveBeenCalled();
    expect(mockPage.pdf).toHaveBeenCalledWith({
      path: path.join(outputPath, 'pdf', `${projectName}.pdf`),
      format: 'A3',
      printBackground: true,
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
    });
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  test('throws error for invalid input', async () => {
    await expect(writePdfFiles('/output', null, [], 'Test')).rejects.toThrow('Invalid input');
  });

  test('handles Puppeteer errors', async () => {
    mockPage.setContent.mockRejectedValue(new Error('Puppeteer error'));
    const indexHtmlContent = '<html>Index</html>';
    const chapterHtmlFiles = [];
    const projectName = 'TestProject';
    const outputPath = '/output';

    await expect(writePdfFiles(outputPath, indexHtmlContent, chapterHtmlFiles, projectName)).rejects.toThrow('Puppeteer error');
  });
});