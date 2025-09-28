// Helper function to get content for specific file indices
function getContentForIndices(filesData, indices) {
  const contentMap = {};
  for (const idx of indices) {
    if (idx >= 0 && idx < filesData.length) {
      const [path, content] = filesData[idx];
      contentMap[`${idx} # ${path}`] = content; // Use index + path as key for context
    }
  }
  return contentMap;
}

/**
 * Parse an index from a string that may be in format "index # name" or just "index"
 * @param {string} str - The string to parse
 * @returns {number} - The parsed index
 * @throws {Error} - If the string cannot be parsed as a valid index
 */
function parseIndexFromString(str) {
  let idx;
  if (str.includes('#')) {
    idx = parseInt(str.split('#')[0].trim());
  } else {
    idx = parseInt(str.trim());
  }

  if (isNaN(idx)) {
    throw new Error(`Could not parse index from string: ${str}`);
  }

  return idx;
}

/**
 * Validate that an index is within the valid range
 * @param {number} idx - The index to validate
 * @param {number} maxIndex - The maximum valid index (exclusive)
 * @param {string} context - Context for error messages
 * @throws {Error} - If the index is invalid
 */
function validateIndexRange(idx, maxIndex, context = '') {
  if (idx < 0 || idx >= maxIndex) {
    throw new Error(`Invalid index ${idx} in ${context}. Max index is ${maxIndex - 1}.`);
  }
}

/**
 * Check for duplicates in an array and throw an error if found
 * @param {Array} array - The array to check
 * @param {string} context - Context for error messages
 * @throws {Error} - If duplicates are found
 */
function checkForDuplicates(array, context = '') {
  const seen = new Set();
  for (const item of array) {
    if (seen.has(item)) {
      throw new Error(`Duplicate item ${item} found in ${context}.`);
    }
    seen.add(item);
  }
}

/**
 * Simple progress tracker for long-running operations
 */
class ProgressTracker {
  constructor(total, label = 'Progress') {
    this.total = total;
    this.current = 0;
    this.label = label;
    this.startTime = Date.now();
  }

  /**
   * Update progress by incrementing current count
   * @param {number} increment - How much to increment (default: 1)
   */
  update(increment = 1) {
    this.current += increment;
    this.display();
  }

  /**
   * Set progress to a specific value
   * @param {number} value - The new progress value
   */
  set(value) {
    this.current = value;
    this.display();
  }

  /**
   * Display current progress
   */
  display() {
    const percentage = Math.round((this.current / this.total) * 100);
    const elapsed = Date.now() - this.startTime;
    const eta = this.current > 0 ? Math.round((elapsed / this.current) * (this.total - this.current) / 1000) : 0;

    console.log(`${this.label}: ${this.current}/${this.total} (${percentage}%) - ETA: ${eta}s`);
  }

  /**
   * Complete the progress tracking
   */
  complete() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    console.log(`${this.label}: ${this.total}/${this.total} (100%) - Completed in ${elapsed.toFixed(1)}s`);
  }
}

/**
 * Standardized error handling utilities
 */
class AppError extends Error {
  constructor(message, code = 'GENERIC_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Create a standardized error
 * @param {string} message - Error message
 * @param {string} code - Error code for categorization
 * @param {any} details - Additional error details
 * @returns {AppError} - Standardized error object
 */
function createError(message, code = 'GENERIC_ERROR', details = null) {
  return new AppError(message, code, details);
}

/**
 * Handle errors consistently - log and re-throw
 * @param {Error} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @param {boolean} shouldThrow - Whether to re-throw the error (default: true)
 */
function handleError(error, context = '', shouldThrow = true) {
  const chalk = require('chalk');
  const message = context ? `${context}: ${error.message}` : error.message;

  if (error instanceof AppError) {
    console.error(chalk.red(`❌ ${error.code}: ${message}`));
    if (error.details) {
      console.error(chalk.gray(`Details: ${JSON.stringify(error.details, null, 2)}`));
    }
  } else {
    console.error(chalk.red(`❌ Error${context ? ` in ${context}` : ''}: ${error.message}`));
  }

  if (shouldThrow) {
    throw error;
  }
}

module.exports = {
  getContentForIndices,
  parseIndexFromString,
  validateIndexRange,
  checkForDuplicates,
  ProgressTracker,
  AppError,
  createError,
  handleError,
};