const { Node } = require('pocketflow');
const LLMCaller = require('../callLLM');
const { parseIndexFromString, validateIndexRange, checkForDuplicates } = require('../helpers');
const chalk = require('chalk');
const yaml = require('js-yaml');

class OrderChaptersNode extends Node {
  constructor(maxRetries = 5, wait = 20) {
    super();
    this.maxRetries = maxRetries;
    this.wait = wait;
  }



  async prep(shared) {
    const abstractions = shared.abstractions; // Name/description might be translated
    const relationships = shared.relationships; // Summary/label might be translated
    const projectName = shared.projectName; // Get project name

    // Prepare context for the LLM
    const abstractionInfoForPrompt = [];
    for (let i = 0; i < abstractions.length; i++) {
      abstractionInfoForPrompt.push(`${i} # ${abstractions[i].name}`); // Use potentially translated name
    }
    const abstractionListing = abstractionInfoForPrompt.join('\n');

    let context = `Project Summary:\n${relationships.summary}\n\n`;
    context += "Relationships (Indices refer to abstractions above):\n";

    for (const rel of relationships.details) {
      const fromName = abstractions[rel.from].name;
      const toName = abstractions[rel.to].name;
      // Use potentially translated 'label'
      context += `- From ${rel.from} (${fromName}) to ${rel.to} (${toName}): ${rel.label}\n`; // Label might be translated
    }



    return {
      abstractionListing,
      context,
      numAbstractions: abstractions.length,
      projectName,
      shared,
    };
  }

  async exec(prepRes) {
    console.log(chalk.yellow("📋 Determining chapter order..."));

    const { abstractionListing, context, numAbstractions, projectName, shared } = prepRes;
    const llm = new LLMCaller(shared.llmProvider, shared.useCache, shared.apiKey, shared.maxTokens, shared.model, shared.retry, shared.verbose);

    const prompt = `
Given the following project abstractions and their relationships for the project \`\`\` ${projectName} \`\`\`:

Abstractions (Index # Name):
${abstractionListing}

Context about relationships and project summary:
${context}

If you are going to make a tutorial for \`\`\` ${projectName} \`\`\`, what is the best order to explain these abstractions, from first to last?
Ideally, first explain those that are the most important or foundational, perhaps user-facing concepts or entry points. Then move to more detailed, lower-level implementation details or supporting concepts.

Output the ordered list of abstraction indices, including the name in a comment for clarity. Use the format \`idx # AbstractionName\`.

\`\`\`yaml
- 2 # FoundationalConcept
- 0 # CoreClassA
- 1 # CoreClassB (uses CoreClassA)
- ...
\`\`\`
`;

    if (shared.verbose) console.log(chalk.white(`Order prompt:\n${prompt}`));
    // Use structured output
    const response = await llm.callWithStructuredOutput(prompt, shared.useCache);

    // Response is already parsed YAML
    let orderedIndicesRaw = response;

    // Ensure we have an array
    if (!Array.isArray(orderedIndicesRaw)) {
      throw new Error(`Expected array from LLM, got ${typeof orderedIndicesRaw}`);
    }

    const orderedIndices = [];
    const seenIndices = new Set();

    for (const entry of orderedIndicesRaw) {
      let idx;

      if (typeof entry === 'number') {
        idx = entry;
      } else if (typeof entry === 'string' && entry.includes('#')) {
        idx = parseIndexFromString(entry);
      } else {
        idx = parseInt(String(entry).trim());
      }

      if (isNaN(idx)) {
        throw new Error(`Could not parse index from entry: ${entry}`);
      }

      validateIndexRange(idx, numAbstractions, 'ordered list');
      orderedIndices.push(idx);
      seenIndices.add(idx);
    }

    checkForDuplicates(orderedIndices, 'ordered list');

    // If not all abstractions are included in the order, add the missing ones at the end
    if (orderedIndices.length !== numAbstractions) {
      const missingIndices = [];
      for (let i = 0; i < numAbstractions; i++) {
        if (!seenIndices.has(i)) {
          missingIndices.push(i);
        }
      }
      if (missingIndices.length > 0) {
        console.warn(`LLM did not include all abstractions in order. Adding missing indices at the end: ${missingIndices.join(', ')}`);
        orderedIndices.push(...missingIndices);
      }
    }

    return orderedIndices;
  }

  async post(shared, prepRes, execRes) {
    shared.chapterOrder = execRes; // List of indices
  }
}

module.exports = { OrderChaptersNode };