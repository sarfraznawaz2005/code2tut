const { loadConfig, saveConfig, DEFAULT_CONFIG } = require('../lib/config');
const fs = require('fs-extra');
const path = require('path');

const CONFIG_DIR = path.join(process.cwd(), '.code2tutorial');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const BACKUP_DIR = path.join(process.cwd(), '.code2tutorial_backup');

describe('Config', () => {
  beforeAll(() => {
    // Backup existing config dir
    if (fs.existsSync(CONFIG_DIR)) {
      fs.moveSync(CONFIG_DIR, BACKUP_DIR);
    }
  });

  afterAll(() => {
    // Clean up test config and restore backup
    if (fs.existsSync(CONFIG_DIR)) {
      fs.removeSync(CONFIG_DIR);
    }
    if (fs.existsSync(BACKUP_DIR)) {
      fs.moveSync(BACKUP_DIR, CONFIG_DIR);
    }
  });

  beforeEach(() => {
    // Clean up any test config
    if (fs.existsSync(CONFIG_DIR)) {
      fs.removeSync(CONFIG_DIR);
    }
  });

  test('loadConfig returns default config when no file exists', () => {
    const config = loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  test('saveConfig and loadConfig work correctly', () => {
    const testConfig = { ...DEFAULT_CONFIG, maxFileSize: 200000 };
    saveConfig(testConfig);
    const loaded = loadConfig();
    expect(loaded.maxFileSize).toBe(200000);
  });

  test('loadConfig handles all default config options', () => {
    const config = loadConfig();
    expect(config).toHaveProperty('llmProvider');
    expect(config).toHaveProperty('apiKey');
    expect(config).toHaveProperty('model');
    expect(config).toHaveProperty('maxTokens');
    expect(config).toHaveProperty('useCache');
    expect(config).toHaveProperty('maxAbstractions');
    expect(config).toHaveProperty('includePatterns');
    expect(config).toHaveProperty('excludePatterns');
    expect(config).toHaveProperty('maxFileSize');
    expect(config).toHaveProperty('outputFormat');
  });

  test('saveConfig handles all config options', () => {
    const fullConfig = {
      llmProvider: 'gemini',
      apiKey: 'test-key',
      model: 'gemini-2.0-flash',
      maxTokens: 5000,
      useCache: false,
      maxAbstractions: 10,
      includePatterns: ['**/*.ts', '**/*.js'],
      excludePatterns: ['node_modules', 'dist'],
      maxFileSize: 50000,
      outputFormat: 'pdf',
      retry: { attempts: 3, delay: 1000 },
    };
    saveConfig(fullConfig);
    const loaded = loadConfig();
    expect(loaded).toEqual(fullConfig);
  });

  test('loadConfig handles environment variables', () => {
    const testConfig = { ...DEFAULT_CONFIG, apiKey: 'GEMINI_API_KEY' };
    saveConfig(testConfig);
    process.env.GEMINI_API_KEY = 'env-key';
    const config = loadConfig();
    expect(config.apiKey).toBe('env-key');
    delete process.env.GEMINI_API_KEY;
  });

  test('loadConfig prioritizes environment variable over config file', () => {
    const testConfig = { ...DEFAULT_CONFIG, apiKey: 'GEMINI_API_KEY' };
    saveConfig(testConfig);
    process.env.GEMINI_API_KEY = 'env-key';
    const config = loadConfig();
    expect(config.apiKey).toBe('env-key');
    delete process.env.GEMINI_API_KEY;
  });

  test('loadConfig handles missing environment variable', () => {
    const testConfig = { ...DEFAULT_CONFIG, apiKey: 'file-key' };
    saveConfig(testConfig);
    const config = loadConfig();
    expect(config.apiKey).toBe('file-key');
  });

  test('saveConfig creates config directory if not exists', () => {
    const testConfig = { ...DEFAULT_CONFIG, maxAbstractions: 5 };
    saveConfig(testConfig);
    expect(fs.existsSync(CONFIG_DIR)).toBe(true);
    expect(fs.existsSync(CONFIG_FILE)).toBe(true);
  });

  test('loadConfig handles invalid JSON in config file', () => {
    fs.ensureDirSync(CONFIG_DIR);
    fs.writeFileSync(CONFIG_FILE, 'invalid json');
    expect(() => loadConfig()).toThrow();
  });

  test('loadConfig handles partial config file', () => {
    const partialConfig = { llmProvider: 'openai' };
    saveConfig(partialConfig);
    const config = loadConfig();
    expect(config.llmProvider).toBe('openai');
    expect(config.apiKey).toBe(DEFAULT_CONFIG.apiKey); // Should have defaults for missing
  });
});