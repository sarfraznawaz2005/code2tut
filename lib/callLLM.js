const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { ChatOpenAI } = require("@langchain/openai");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { zodToJsonSchema } = require("zod-to-json-schema");

const CACHE_DIR = path.join(process.cwd(), '.code2tutorial');
const CACHE_FILE = path.join(CACHE_DIR, 'llm_cache.json');

/**
 * LLM Caller class for handling interactions with various LLM providers
 */
class LLMCaller {
  /**
   * Create an LLM caller instance
   * @param {string} provider - The LLM provider ('openai', 'gemini', 'anthropic')
   * @param {boolean} useCache - Whether to use caching for responses
   * @param {string} apiKey - API key for the provider
   * @param {number} maxTokens - Maximum tokens for responses
   * @param {string} model - Model name to use
   * @param {Object} retry - Retry configuration { attempts, delay }
   * @param {boolean} verbose - Whether to enable verbose logging
   */
  constructor(provider = 'openai', useCache = true, apiKey, maxTokens = 8000, model = 'gpt-4o', retry = { attempts: 3, delay: 1000 }, verbose = false) {
    this.provider = provider;
    this.useCache = useCache;
    this.apiKey = apiKey;
    this.maxTokens = maxTokens;
    this.modelName = model;
    this.retry = retry;
    this.verbose = verbose;
    if (provider === 'openai') {
      this.model = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        maxTokens: maxTokens,
        temperature: 0,
      });
    } else if (provider === 'gemini') {
      this.model = new ChatGoogleGenerativeAI({
        apiKey,
        model: model,
        maxOutputTokens: maxTokens,
        temperature: 0,
      });
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Call the LLM with a text prompt
   * @param {string} prompt - The prompt to send to the LLM
   * @param {boolean} shouldCache - Whether to cache this response
   * @returns {string} - The LLM response
   */
  async call(prompt, shouldCache = true) {
    // Check cache first if enabled
    if (this.useCache && shouldCache) {
      const cachedResponse = this.getCachedResponse(prompt);
      if (cachedResponse !== null) {
        return cachedResponse;
      }
    }

    let lastError;
    let delay = this.retry.delay;
    for (let attempt = 0; attempt < this.retry.attempts; attempt++) {
      try {
        if (this.verbose) console.log(chalk.white(`Calling ${this.provider} with prompt (length: ${prompt.length})`));
        const response = await this.model.invoke([{ role: 'user', content: prompt }]);
        const text = response.content;

        // Cache the response if caching is enabled
        if (this.useCache && shouldCache) {
          if (this.verbose) console.log(chalk.white(`Caching response for prompt (length: ${prompt.length})`));
          this.setCachedResponse(prompt, text);
        }

        return text;
      } catch (error) {
        lastError = error;
        if (attempt < this.retry.attempts - 1) {
          console.log(chalk.red(`LLM call failed (attempt ${attempt + 1}/${this.retry.attempts}), retrying in ${delay}ms:`, error.message));
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        }
      }
    }
    throw lastError;
  }

  /**
   * Get a cached response for the given prompt
   * @param {string} prompt - The prompt to check for cached response
   * @returns {string|null} - The cached response or null if not found
   */
  getCachedResponse(prompt) {
    if (!this.useCache) return null;
    const cache = this.loadCache();
    if (cache[prompt]) {
      if (this.verbose) console.log(chalk.white(`Using cached response for prompt (length: ${prompt.length})`));
      return cache[prompt];
    }
    return null;
  }

  /**
   * Cache a response for the given prompt
   * @param {string} prompt - The prompt
   * @param {string} response - The response to cache
   */
  setCachedResponse(prompt, response) {
    if (!this.useCache) return;
    this.saveToCache(prompt, response);
  }

  loadCache() {
    if (fs.existsSync(CACHE_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      } catch (e) {
        return {};
      }
    }
    return {};
  }

  /**
   * Call the LLM with structured output using Zod schema
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} schema - Zod schema for response validation
   * @param {boolean} shouldCache - Whether to cache this response
   * @returns {Object} - The parsed and validated LLM response
   */
  async callWithStructuredOutput(prompt, schema, shouldCache = true) {
    // Check cache first if enabled
    if (this.useCache && shouldCache) {
      const cachedResponse = this.getCachedResponse(prompt);
      if (cachedResponse !== null) {
        return cachedResponse;
      }
    }

    let lastError;
    let delay = this.retry.delay;
    for (let attempt = 0; attempt < this.retry.attempts; attempt++) {
      try {
        if (this.verbose) console.log(chalk.white(`Calling ${this.provider} with structured prompt (length: ${prompt.length})`));
        let structuredModel;
        if (this.provider === 'gemini') {
          // For Gemini, handle structured output differently since the API has different requirements
          // Call the model normally and parse the JSON response
          const response = await this.model.invoke([{ role: 'user', content: prompt }]);
          let parsedResponse;
          try {
            // Extract JSON from the response content
            const content = response.content;
            let jsonStr = content;

            // Look for JSON between ```json and ``` markers
            let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              jsonStr = jsonMatch[1];
            } else {
              // Look for generic code blocks
              let codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
              if (codeMatch) {
                jsonStr = codeMatch[1];
              }
            }

            // Clean up the JSON string if needed
            jsonStr = jsonStr.trim();
            parsedResponse = JSON.parse(jsonStr);
          } catch (parseError) {
            console.error('Failed to parse Gemini response as JSON:', parseError);
            console.log('Raw response:', response.content);
            throw new Error(`Gemini response parsing failed: ${parseError.message}`);
          }

          if (this.useCache && shouldCache) {
            if (this.verbose) console.log(chalk.white(`Caching structured response for prompt (length: ${prompt.length})`));
            this.setCachedResponse(prompt, parsedResponse);
          }
          return parsedResponse;
        } else {
          // For OpenAI, use zodToJsonSchema directly
          let jsonSchema;
          try {
            jsonSchema = zodToJsonSchema(schema);
            if (typeof jsonSchema !== 'object' || jsonSchema === null) {
              throw new Error('Invalid JSON Schema generated');
            }
          } catch (e) {
            console.warn('Failed to convert Zod schema to JSON Schema, using fallback:', e.message);
            jsonSchema = { type: 'object', properties: {} };
          }
          structuredModel = this.model.withStructuredOutput(jsonSchema);
        }

        const response = await structuredModel.invoke([{ role: 'user', content: prompt }]);

        if (this.useCache && shouldCache) {
          if (this.verbose) console.log(chalk.white(`Caching structured response for prompt (length: ${prompt.length})`));
          this.setCachedResponse(prompt, response);
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt < this.retry.attempts - 1) {
          console.warn(`Structured LLM call failed (attempt ${attempt + 1}/${this.retry.attempts}), retrying in ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        }
      }
    }
    throw lastError;
  }

  saveToCache(prompt, response) {
    if (this.verbose) console.log(chalk.white(`Attempting to save to cache for prompt (length: ${prompt.length})`));
    try {
      const cache = this.loadCache();
      cache[prompt] = response;
      if (this.verbose) console.log(chalk.white(`Ensuring cache directory exists: ${CACHE_DIR}`));
      fs.ensureDirSync(CACHE_DIR);
      if (this.verbose) console.log(chalk.white(`Writing cache file: ${CACHE_FILE}`));
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      if (this.verbose) console.log(chalk.white(`Saved to cache: ${CACHE_FILE}`));
    } catch (error) {
      console.warn(chalk.yellow(`Failed to save to cache: ${error.message}`));
      if (this.verbose) console.log(chalk.red(`Cache save error stack: ${error.stack}`));
    }
  }
}

module.exports = LLMCaller;