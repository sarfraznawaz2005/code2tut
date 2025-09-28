const { getContentForIndices } = require('../lib/helpers');

describe('getContentForIndices', () => {
  test('returns content for valid indices', () => {
    const filesData = [
      ['file1.js', 'content1'],
      ['file2.js', 'content2'],
      ['file3.js', 'content3'],
    ];
    const indices = [0, 2];

    const result = getContentForIndices(filesData, indices);

    expect(result).toEqual({
      '0 # file1.js': 'content1',
      '2 # file3.js': 'content3',
    });
  });

  test('ignores invalid indices', () => {
    const filesData = [
      ['file1.js', 'content1'],
      ['file2.js', 'content2'],
    ];
    const indices = [0, 5, -1]; // 5 and -1 are invalid

    const result = getContentForIndices(filesData, indices);

    expect(result).toEqual({
      '0 # file1.js': 'content1',
    });
  });

  test('handles empty indices', () => {
    const filesData = [
      ['file1.js', 'content1'],
    ];
    const indices = [];

    const result = getContentForIndices(filesData, indices);

    expect(result).toEqual({});
  });

  test('handles empty filesData', () => {
    const filesData = [];
    const indices = [0];

    const result = getContentForIndices(filesData, indices);

    expect(result).toEqual({});
  });

  test('handles duplicate indices', () => {
    const filesData = [
      ['file1.js', 'content1'],
      ['file2.js', 'content2'],
    ];
    const indices = [0, 0, 1];

    const result = getContentForIndices(filesData, indices);

    expect(result).toEqual({
      '0 # file1.js': 'content1',
      '1 # file2.js': 'content2',
    });
  });
});