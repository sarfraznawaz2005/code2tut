const { Node } = require('pocketflow');
const LLMCaller = require('../callLLM');
const { validateIndexRange } = require('../helpers');
const path = require('path');
const chalk = require('chalk');
const { z } = require('zod');

/**
 * Node for identifying key abstractions in the codebase
 * Uses LLM to analyze code files and extract core concepts
 */
class IdentifyAbstractionsNode extends Node {
  /**
   * Create an IdentifyAbstractionsNode
   * @param {number} maxRetries - Maximum retry attempts for LLM calls
   * @param {number} wait - Wait time between retries
   */
  constructor(maxRetries = 5, wait = 20) {
    super();
    this.maxRetries = maxRetries;
    this.wait = wait;
  }

  /**
   * Get the Zod schema for LLM response validation
   * @returns {Object} - Zod schema for abstraction identification
   */
  getSchema() {
    return z.object({
      abstractions: z.array(z.object({
        name: z.string().describe("A concise name for the abstraction"),
        description: z.string().describe("A beginner-friendly description with a simple analogy, around 100 words"),
        file_indices: z.array(z.number()).describe("List of relevant file indices")
      }))
    });
  }

  async prep(shared) {
    const filesData = shared.files;
    const projectName = shared.projectName || path.basename(shared.localDir);
    const maxAbstractions = shared.maxAbstractions;
    const { MAX_FILES_TO_PROCESS, MAX_CONTENT_LENGTH } = require('../constants');

    let context = '';
    const fileInfo = [];
    // Limit content to avoid context length issues - only include first few files
    const maxFilesToProcess = Math.min(MAX_FILES_TO_PROCESS, filesData.length);
    for (let i = 0; i < maxFilesToProcess; i++) {
      const [filePath, content] = filesData[i];
      // Limit content length to manage token count
      const limitedContent = content.length > MAX_CONTENT_LENGTH ? content.substring(0, MAX_CONTENT_LENGTH) + '...' : content;
      context += `--- File Index ${i}: ${filePath} ---\n${limitedContent}\n\n`;
      fileInfo.push(`${i} # ${filePath}`);
    }
    // Only list the files that were actually included in the context
    const fileListing = fileInfo.join('\n');

    return { context, fileListing, fileCount: filesData.length, projectName, maxAbstractions, shared };
  }

  async exec(prepRes) {
    console.log(chalk.yellow('🧠 Identifying abstractions...'));

    const { context, fileListing, fileCount, projectName, maxAbstractions, shared } = prepRes;
    const llm = new LLMCaller(shared.llmProvider, shared.useCache, shared.apiKey, shared.maxTokens, shared.model, shared.retry, shared.verbose);



    const prompt = `
For the project \`${projectName}\`:

Codebase Context:
${context}

Analyze the codebase context.
Identify the top ${maxAbstractions} core most important abstractions to help those new to the codebase.

For each abstraction, provide:
1. A concise \`name\`.
2. A beginner-friendly \`description\` explaining what it is with a simple analogy, in around 100 words.
3. A list of relevant \`file_indices\` (integers).

List of file indices and paths present in the context:
${fileListing}

Return a JSON object with key 'abstractions' containing an array of objects with keys: name, description, file_indices.
`;

    if (shared.verbose) console.log(chalk.white(`Abstractions prompt:\n${prompt}`));
    // Use structured output method with object schema for OpenAI compatibility
    const schema = this.getSchema();
    const response = await llm.callWithStructuredOutput(prompt, schema, shared.useCache);

    let abstractions;

    // Handle the case where response might be a string or other unexpected format
    if (typeof response === 'string') {
      try {
        const parsed = JSON.parse(response);
        abstractions = parsed.abstractions;
      } catch (e) {
        console.error('Failed to parse string response as JSON:', response);
        throw new Error("LLM returned invalid JSON string");
      }
    } else if (response && typeof response === 'object' && Array.isArray(response.abstractions)) {
      abstractions = response.abstractions;
    } else {
      throw new Error("LLM Output does not contain valid abstractions array: " + typeof response);
    }

    const validated = [];
    for (const item of abstractions) {
      // Validate that item is an object with the expected properties
      if (!item || typeof item !== 'object') {
        console.warn(`Warning: Skipping invalid item:`, item);
        continue;
      }

      // Validate indices with safety check
      const validatedIndices = [];

      // Check if file_indices exists and is an array
      if (!item.file_indices || !Array.isArray(item.file_indices)) {
        console.warn(`Warning: item ${item.name || 'unknown'} has invalid file_indices:`, item.file_indices);
        item.file_indices = [];
      }

      for (const idx of item.file_indices) {
        validateIndexRange(idx, fileCount, `file indices for ${item.name || 'unknown'}`);
        validatedIndices.push(idx);
      }

      validated.push({
        name: (item.name || 'Unknown').trim(),
        description: (item.description || 'No description').trim(),
        files: [...new Set(validatedIndices)] // Remove duplicates
      });
    }

    // Limit to maxAbstractions
    const limited = validated.slice(0, maxAbstractions);
    console.log(chalk.green(`✅ Identified ${limited.length} abstractions:`));
    for (const a of limited) {
      console.log(`  - ${a.name}`);
    }
    return limited;
  }

  async post(shared, prepRes, execRes) {
    shared.abstractions = execRes;
  }
}

module.exports = { IdentifyAbstractionsNode };