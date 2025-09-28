// Constants for the Code2Tutorial application

// File processing limits
const MAX_FILES_TO_PROCESS = 10;
const MAX_CONTENT_LENGTH = 2000;

// LLM Configuration
const DEFAULT_LLM_PROVIDER = 'gemini';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const DEFAULT_MAX_TOKENS = 8000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000;

// Output formats
const OUTPUT_FORMAT_MARKDOWN = 'markdown';
const OUTPUT_FORMAT_HTML = 'html';
const OUTPUT_FORMAT_PDF = 'pdf';
const DEFAULT_OUTPUT_FORMAT = OUTPUT_FORMAT_HTML;

// Node retry values
const NODE_MAX_RETRIES = 3;
const NODE_WAIT_TIME = 20;

// Cache settings
const CACHE_DIR_NAME = '.code2tutorial';
const CACHE_FILE_NAME = 'llm_cache.json';

// Progress tracking
const PROGRESS_UPDATE_INTERVAL = 1000; // ms

// File size limits
const DEFAULT_MAX_FILE_SIZE = 500000; // 500KB

// Abstraction limits
const DEFAULT_MAX_ABSTRACTIONS = 25;

// Chapter filename patterns
const CHAPTER_FILENAME_PATTERN = '02d'; // zero-padded to 2 digits

module.exports = {
  MAX_FILES_TO_PROCESS,
  MAX_CONTENT_LENGTH,
  DEFAULT_LLM_PROVIDER,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RETRY_DELAY,
  OUTPUT_FORMAT_MARKDOWN,
  OUTPUT_FORMAT_HTML,
  OUTPUT_FORMAT_PDF,
  DEFAULT_OUTPUT_FORMAT,
  NODE_MAX_RETRIES,
  NODE_WAIT_TIME,
  CACHE_DIR_NAME,
  CACHE_FILE_NAME,
  PROGRESS_UPDATE_INTERVAL,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_MAX_ABSTRACTIONS,
  CHAPTER_FILENAME_PATTERN,
};