const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const CONFIG_DIR = path.join(process.cwd(), '.code2tutorial');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  maxFileSize: 100000, // 100KB
  llmProvider: 'gemini', // or 'openai', 'anthropic'
  apiKey: 'GEMINI_API_KEY',
  maxTokens: 8000,
  model: 'gemini-2.0-flash',
  retry: {
    attempts: 3,
    delay: 1000
  },
  outputFormat: 'html', // 'markdown', 'html', 'pdf'
  useCache: true,
  maxAbstractions: 25,

  includePatterns: [
    "**/*.js",
    "**/*.jsx",
    "**/*.ts",
    "**/*.tsx",
    "**/*.py",
    "**/*.java",
    "**/*.c",
    "**/*.cpp",
    "**/*.h",
    "**/*.hpp",
    "**/*.cs",
    "**/*.go",
    "**/*.rs",
    "**/*.swift",
    "**/*.kt",
    "**/*.php",
    "**/*.rb",
    "**/*.dart",
    "**/*.scala",
    "**/*.hs",
    "**/*.ex",
    "**/*.exs",
    "**/*.erl",
    "**/*.ml",
    "**/*.m",
    "**/*.jl",
    "**/*.lua",
    "**/*.pl",
    "**/*.r",
    "**/*.nim",
    "**/*.zig",
    "**/*.v",
    "**/*.asm",
    "**/*.ahk",
  ],
  excludePatterns: [
    ".git",
    ".svn",
    ".hg",
    ".bzr",
    "node_modules",
    "vendor",
    "packages",
    "bower_components",
    "jspm_packages",
    "dist",
    "build",
    "target",
    "bin",
    "obj",
    ".next",
    ".nuxt",
    ".output",
    "public/build",
    ".vscode",
    ".idea",
    ".vs",
    "*.swp",
    "*.swo",
    "*~",
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    ".Trashes",
    "*.log",
    "logs",
    "log",
    ".log",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    ".cache",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".tox",
    ".coverage",
    ".nyc_output",
    "coverage",
    ".eslintcache",
    ".stylelintcache",
    ".sass-cache",
    "tmp",
    "temp",
    ".tmp",
    ".temp",
    "*.zip",
    "*.tar.gz",
    "*.tar.bz2",
    "*.tar",
    "*.rar",
    "*.7z",
    "*.bak",
    "*.backup",
    ".env",
    ".env.local",
    ".env.*",
    ".github/workflows",
    ".gitlab-ci.yml",
    ".travis.yml",
    "Jenkinsfile",
    "Dockerfile.*",
    "tests",
    "test",
    "__tests__",
    "*.test.*",
    "*cest*",
    "*.spec.*",
    "e2e",
    "*.e2e.*",
    ".code2tutorial",
  ],
};

/**
 * Validate configuration object
 * @param {Object} config - The configuration object to validate
 * @throws {Error} - If configuration is invalid
 */
function validateConfig(config) {
  // Validate LLM provider
  const validProviders = ['openai', 'gemini', 'anthropic'];
  if (!validProviders.includes(config.llmProvider)) {
    throw new Error(`Invalid llmProvider: ${config.llmProvider}. Must be one of: ${validProviders.join(', ')}`);
  }

  // Validate output format
  const validFormats = ['markdown', 'html', 'pdf'];
  if (!validFormats.includes(config.outputFormat)) {
    throw new Error(`Invalid outputFormat: ${config.outputFormat}. Must be one of: ${validFormats.join(', ')}`);
  }

  // Validate numeric values
  if (config.maxFileSize <= 0) {
    throw new Error(`maxFileSize must be positive, got: ${config.maxFileSize}`);
  }

  if (config.maxTokens <= 0) {
    throw new Error(`maxTokens must be positive, got: ${config.maxTokens}`);
  }

  if (config.maxAbstractions <= 0) {
    throw new Error(`maxAbstractions must be positive, got: ${config.maxAbstractions}`);
  }

  // Validate retry configuration
  if (!config.retry || typeof config.retry !== 'object') {
    throw new Error('retry configuration must be an object');
  }

  if (config.retry.attempts <= 0) {
    throw new Error(`retry.attempts must be positive, got: ${config.retry.attempts}`);
  }

  if (config.retry.delay < 0) {
    throw new Error(`retry.delay must be non-negative, got: ${config.retry.delay}`);
  }

  // Validate arrays
  if (!Array.isArray(config.includePatterns)) {
    throw new Error('includePatterns must be an array');
  }

  if (!Array.isArray(config.excludePatterns)) {
    throw new Error('excludePatterns must be an array');
  }
}

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(data);
      let config = { ...DEFAULT_CONFIG, ...parsed };

      // Validate the merged configuration
      validateConfig(config);

      // Check if apiKey is an environment variable name and get its value
      if (config.apiKey && process.env[config.apiKey]) {
        config = { ...config, apiKey: process.env[config.apiKey] };
      }

      return config;
    } catch (err) {
      console.warn('Error loading config, using defaults:', err.message);
      // For invalid JSON, we should throw if specifically testing for this
      if (err instanceof SyntaxError) {
        throw err; // Re-throw syntax errors (invalid JSON)
      }
    }
  } else {
    console.log('Config file does not exist');
  }
  // First run, create config
  saveConfig(DEFAULT_CONFIG);
  console.log(chalk.white(`⚙️  Created default config at ${CONFIG_FILE}. Please edit it to set your AI provider and API key to get started.`));
  return DEFAULT_CONFIG;
}

function saveConfig(config) {
  fs.ensureDirSync(CONFIG_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

module.exports = { loadConfig, saveConfig, validateConfig, DEFAULT_CONFIG };