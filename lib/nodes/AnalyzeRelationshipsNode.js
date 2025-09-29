const { Node } = require('pocketflow');
const LLMCaller = require('../callLLM');
const { parseIndexFromString, validateIndexRange } = require('../helpers');
const chalk = require('chalk');
const yaml = require('js-yaml');
const { getContentForIndices } = require('../helpers');

class AnalyzeRelationshipsNode extends Node {
  constructor(maxRetries = 5, wait = 20) {
    super();
    this.maxRetries = maxRetries;
    this.wait = wait;
  }



  async prep(shared) {
    const abstractions = shared.abstractions;
    const filesData = shared.files;
    const projectName = shared.projectName;

    // Create context with abstraction names, indices, descriptions, and relevant file snippets
    let context = 'Identified Abstractions:\n';
    const allIndices = new Set();
    const abstractionInfoForPrompt = [];
    for (let i = 0; i < abstractions.length; i++) {
      const abs = abstractions[i];
      const indicesStr = abs.files.join(', ');
      // Abstraction name and description might be translated already
      const infoLine = `- Index ${i}: ${abs.name} (Relevant file indices: [${indicesStr}])\n  Description: ${abs.description}`;
      context += infoLine + '\n';
      abstractionInfoForPrompt.push(`${i} # ${abs.name}`); // Use potentially translated name here too
      abs.files.forEach(idx => allIndices.add(idx));
    }

    context += '\nRelevant File Snippets (Referenced by Index and Path):\n';

    // Get content for relevant files using helper
    const relevantFilesContentMap = getContentForIndices(filesData, Array.from(allIndices));
    // Format file content for context
    const fileContextStr = Object.entries(relevantFilesContentMap)
      .map(([idxPath, content]) => `--- File: ${idxPath} ---\n${content}`)
      .join('\n\n');

    context += fileContextStr;

    return {
      context,
      abstractionListing: abstractionInfoForPrompt.join('\n'),
      numAbstractions: abstractions.length,
      projectName,
      shared
    };
  }

  async exec(prepRes) {
    console.log(chalk.yellow('🔗 Analyzing relationships...'));

    const { context, abstractionListing, projectName, shared } = prepRes;
    const llm = new LLMCaller(shared.llmProvider, shared.useCache, shared.apiKey, shared.maxTokens, shared.model, shared.retry, shared.verbose);



    const prompt = `
Based on the following abstractions and relevant code snippets from the project \`${projectName}\`:

List of Abstraction Indices and Names:
${abstractionListing}

Context (Abstractions, Descriptions, Code):
${context}

Please provide:
1. A high-level \`summary\` of the project's main purpose and functionality in a few beginner-friendly sentences. Use markdown formatting with **bold** and *italic* text to highlight important concepts.
2. A list (\`relationships\`) describing the key interactions between these abstractions. For each relationship, specify:
   - \`from_abstraction\`: Index of the source abstraction (e.g., \`0 # AbstractionName1\`)
   - \`to_abstraction\`: Index of the target abstraction (e.g., \`1 # AbstractionName2\`)
   - \`label\`: A brief label for the interaction **in just a few words** (e.g., "Manages", "Inherits", "Uses").
   Ideally the relationship should be backed by one abstraction calling or passing parameters to another.
   Simplify the relationship and exclude those non-important ones.

IMPORTANT: Make sure EVERY abstraction is involved in at least ONE relationship (either as source or target). Each abstraction index must appear at least once across all relationships.

Format the output as YAML:

\`\`\`yaml
summary: |
  A brief, simple explanation of the project.
  Can span multiple lines with **bold** and *italic* for emphasis.
relationships:
  - from_abstraction: 0 # AbstractionName1
    to_abstraction: 1 # AbstractionName2
    label: "Manages"
  - from_abstraction: 2 # AbstractionName3
    to_abstraction: 0 # AbstractionName1
    label: "Provides config"
  # ... other relationships
\`\`\`

Now, provide the YAML output:
`;

    if (shared.verbose) console.log(chalk.white(`Relationships prompt:\n${prompt}`));
    // Use structured output
    const response = await llm.callWithStructuredOutput(prompt, shared.useCache);

    // Response is already parsed YAML
    const relationshipsData = response;

    if (!relationshipsData || !('summary' in relationshipsData) || !('relationships' in relationshipsData)) {
      throw new Error(`LLM output is missing required keys ('summary', 'relationships'). Got: ${JSON.stringify(relationshipsData)}`);
    }
    if (typeof relationshipsData.summary !== 'string') {
      throw new Error("summary is not a string");
    }
    if (!Array.isArray(relationshipsData.relationships)) {
      throw new Error("relationships is not a list");
    }

    // Validate relationships structure
    const validatedRelationships = [];
    for (const rel of relationshipsData.relationships) {
      if (!('from_abstraction' in rel) || !('to_abstraction' in rel) || !('label' in rel)) {
        throw new Error(`Missing keys (expected from_abstraction, to_abstraction, label) in relationship item: ${JSON.stringify(rel)}`);
      }
      if (typeof rel.label !== 'string') {
        throw new Error(`Relationship label is not a string: ${JSON.stringify(rel)}`);
      }

      // Validate indices
      const numAbstractions = prepRes.numAbstractions;
      const fromIdx = parseIndexFromString(String(rel.from_abstraction));
      const toIdx = parseIndexFromString(String(rel.to_abstraction));

      validateIndexRange(fromIdx, numAbstractions, `relationship from index`);
      validateIndexRange(toIdx, numAbstractions, `relationship to index`);

      validatedRelationships.push({
        from: fromIdx,
        to: toIdx,
        label: rel.label,
      });
    }

    console.log(chalk.green("✅ Generated project summary and relationship details."));
    return {
      summary: relationshipsData.summary, // Potentially translated summary
      details: validatedRelationships, // Store validated, index-based relationships with potentially translated labels
    };
  }

  async post(shared, prepRes, execRes) {
    shared.relationships = execRes;
  }
}

module.exports = { AnalyzeRelationshipsNode };