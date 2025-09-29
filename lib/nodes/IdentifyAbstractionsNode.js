const { Node } = require('pocketflow');
const LLMCaller = require('../callLLM');
const { validateIndexRange } = require('../helpers');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');

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
Identify the top 5-${maxAbstractions} core most important abstractions to help those new to the codebase.

For each abstraction, provide:
1. A concise \`name\`.
2. A beginner-friendly \`description\` explaining what it is with a simple analogy, in around 100 words.
3. A list of relevant \`file_indices\` (integers) using the format \`idx # path/comment\`.

List of file indices and paths present in the context:
${fileListing}

Format the output as a YAML list of dictionaries:

\`\`\`yaml
- name: |
    Query Processing
  description: |
    Explains what the abstraction does.
    It's like a central dispatcher routing requests.
  file_indices:
    - 0 # path/to/file1.py
    - 3 # path/to/related.py
- name: |
    Query Optimization
  description: |
    Another core concept, similar to a blueprint for objects.
  file_indices:
    - 5 # path/to/another.js
# ... up to ${maxAbstractions} abstractions
\`\`\`
`;

    if (shared.verbose) console.log(chalk.white(`Abstractions prompt:\n${prompt}`));
    // Use structured output method
    const response = await llm.callWithStructuredOutput(prompt, shared.useCache);

    let abstractions;

    // Response is already parsed YAML
    if (Array.isArray(response)) {
      abstractions = response;
    } else {
      throw new Error("LLM Output is not a valid YAML list: " + typeof response);
    }

    const validated = [];
    for (const item of abstractions) {
      // Validate that item is an object with the expected properties
      if (!item || typeof item !== 'object' || !('name' in item) || !('description' in item) || !('file_indices' in item)) {
        console.warn(`Warning: Skipping invalid item:`, item);
        continue;
      }
      if (typeof item.name !== 'string') {
        console.warn(`Warning: item name is not a string:`, item);
        continue;
      }
      if (typeof item.description !== 'string') {
        console.warn(`Warning: item description is not a string:`, item);
        continue;
      }
      if (!Array.isArray(item.file_indices)) {
        console.warn(`Warning: item file_indices is not an array:`, item);
        continue;
      }

      // Validate indices
      const validatedIndices = [];
      for (const idxEntry of item.file_indices) {
        try {
          let idx;
          if (typeof idxEntry === 'number') {
            idx = idxEntry;
          } else if (typeof idxEntry === 'string' && idxEntry.includes('#')) {
            idx = parseInt(idxEntry.split('#')[0].trim());
          } else {
            idx = parseInt(String(idxEntry).trim());
          }

          if (isNaN(idx)) {
            console.warn(`Warning: Could not parse index from ${idxEntry} in item ${item.name}`);
            continue;
          }

          validateIndexRange(idx, fileCount, `file indices for ${item.name}`);
          validatedIndices.push(idx);
        } catch (e) {
          console.warn(`Warning: ${e.message}`);
        }
      }

      validated.push({
        name: item.name.trim(),
        description: item.description.trim(),
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