module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
  transformIgnorePatterns: [
    'node_modules/(?!marked|@markedjs)/'
  ],
  moduleNameMapper: {
    '^marked$': '<rootDir>/node_modules/marked/lib/marked.umd.js',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
};