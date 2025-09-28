const { BatchNode } = require('pocketflow');
const LLMCaller = require('../callLLM');
const { getContentForIndices, ProgressTracker } = require('../helpers');
const chalk = require('chalk');

class WriteChaptersNode extends BatchNode {
  constructor(maxRetries = 5, wait = 20) {
    super();
    this.maxRetries = maxRetries;
    this.wait = wait;
    this.chaptersWrittenSoFar = [];
  }

  async prep(shared) {
    const chapterOrder = shared.chapterOrder;
    const abstractions = shared.abstractions;
    const filesData = shared.files;
    const projectName = shared.projectName;

    const useCache = shared.useCache;

    // Create a complete list of all chapters
    const allChapters = [];
    const chapterFilenames = {};
    for (let i = 0; i < chapterOrder.length; i++) {
      const abstractionIndex = chapterOrder[i];
      const chapterNum = i + 1;
      const chapterName = abstractions[abstractionIndex].name.charAt(0).toUpperCase() + abstractions[abstractionIndex].name.slice(1); // Potentially translated name, capitalized
      // Create safe filename (from potentially translated name)
      const safeName = chapterName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const filename = `${String(i + 1).padStart(2, '0')}_${safeName}.md`;
      // Format with link (using potentially translated name)
      allChapters.push(`${chapterNum}. [${chapterName}](${filename})`);
      // Store mapping of chapter index to filename for linking
      chapterFilenames[abstractionIndex] = {
        num: chapterNum,
        name: chapterName,
        filename: filename,
      };
    }
    // Create a formatted string with all chapters
    const fullChapterListing = allChapters.join('\n');

    // Store them temporarily during the batch run, not in shared memory yet
    this.chaptersWrittenSoFar = []; // Use instance variable for temporary storage across exec calls

    const items = [];
    for (let i = 0; i < chapterOrder.length; i++) {
      const abstractionIndex = chapterOrder[i];
      const abstractionDetails = abstractions[abstractionIndex]; // Contains potentially translated name/desc
      // Use 'files' (list of indices) directly
      const relatedFileIndices = abstractionDetails.files || [];
      // Get content for related files using helper
      const relatedFilesContentMap = getContentForIndices(filesData, relatedFileIndices);

      // Get previous chapter info for transitions (uses potentially translated name)
      let prevChapter = null;
      if (i > 0) {
        const prevIdx = chapterOrder[i - 1];
        prevChapter = chapterFilenames[prevIdx];
      }

      // Get next chapter info for transitions (uses potentially translated name)
      let nextChapter = null;
      if (i < chapterOrder.length - 1) {
        const nextIdx = chapterOrder[i + 1];
        nextChapter = chapterFilenames[nextIdx];
      }

      items.push({
        chapterNum: i + 1,
        abstractionIndex,
        abstractionDetails, // Has potentially translated name/desc
        relatedFilesContentMap,
        projectName,
        fullChapterListing, // Add the full chapter listing (uses potentially translated names)
        chapterFilenames, // Add chapter filenames mapping (uses potentially translated names)
        prevChapter, // Add previous chapter info (uses potentially translated name)
        nextChapter, // Add next chapter info (uses potentially translated name)

        useCache, // Pass use_cache flag
        // Store the shared object data needed by exec method
        llmProvider: shared.llmProvider,
        apiKey: shared.apiKey,
        maxTokens: shared.maxTokens,
        model: shared.model,
        retry: shared.retry,
        verbose: shared.verbose
      });
    }

    console.log(chalk.yellow(`📝 Preparing to write ${items.length} chapters...`));

    // Initialize progress tracker\n    this.progressTracker = new ProgressTracker(items.length, 'Writing chapters');\n    // Add a newline after the chapter preparation message so progress updates appear on a new line\n    process.stdout.write('\\n');

    return items; // Iterable for BatchNode
  }

  async exec(item) {
    // This runs for each item prepared above
    const abstractionName = item.abstractionDetails.name.charAt(0).toUpperCase() + item.abstractionDetails.name.slice(1); // Potentially translated name, capitalized
    const abstractionDescription = item.abstractionDetails.description; // Potentially translated description
    const chapterNum = item.chapterNum;
    const projectName = item.projectName;

    const useCache = item.useCache;

    console.log(chalk.white(`✍️ Writing chapter ${chapterNum} for: ${abstractionName}`));

    const llm = new LLMCaller(item.llmProvider, useCache, item.apiKey, item.maxTokens, item.model, item.retry, item.verbose);

    // Prepare file context string from the map
    const fileContextStr = Object.entries(item.relatedFilesContentMap)
      .map(([idxPath, content]) => `--- File: ${idxPath.split('# ')[1] || idxPath} ---\n${content}`)
      .join('\n\n');

    // Get summary of chapters written *before* this one
    // Use the temporary instance variable
    const previousChaptersSummary = this.chaptersWrittenSoFar.join('\n---\n');

    const prompt = `
Write a very beginner-friendly tutorial chapter (in Markdown format) for the project \`${projectName}\` about the concept: "${abstractionName}". This is Chapter ${chapterNum}.

  Concept Details:
  - Name: ${abstractionName}
  - Description:
  ${abstractionDescription}

  Complete Tutorial Structure:
  ${item.fullChapterListing}

  Context from previous chapters:
  ${previousChaptersSummary || "This is the first chapter."}

  Relevant Code Snippets (Code itself remains unchanged):
  ${fileContextStr || "No specific code snippets provided for this abstraction."}

  Instructions for the chapter:
  - Start with a clear heading (e.g., \`# Chapter ${chapterNum}: ${abstractionName}\`). Use the provided concept name.

  - If this is not the first chapter, begin with a brief transition from the previous chapter, referencing it with a proper Markdown link using its name.

  - Begin with a high-level motivation explaining what problem this abstraction solves. Start with a central use case as a concrete example. The whole chapter should guide the reader to understand how to solve this use case. Make it very minimal and friendly to beginners.

  - If the abstraction is complex, break it down into key concepts. Explain each concept one-by-one in a very beginner-friendly way.

  - Explain how to use this abstraction to solve the use case. Give example inputs and outputs for code snippets (if the output isn't values, describe at a high level what will happen).

  - Each code block should be BELOW 10 lines! If longer code blocks are needed, break them down into smaller pieces and walk through them one-by-one. Aggresively simplify the code to make it minimal. Use comments to skip non-important implementation details. Each code block should have a beginner friendly explanation right after it.

  - Describe the internal implementation to help understand what's under the hood. First provide a non-code or code-light walkthrough on what happens step-by-step when the abstraction is called. It's recommended to use a simple sequenceDiagram with a dummy example - keep it minimal with at most 5 participants to ensure clarity. If participant name has space, use: \`participant QP as Query Processing\`.

  - Then dive deeper into code for the internal implementation with references to files. Provide example code blocks, but make them similarly simple and beginner-friendly. Explain.

  - IMPORTANT: When you need to refer to other core abstractions covered in other chapters, ALWAYS use proper Markdown links like this: [Chapter Title](filename.md). Use the Complete Tutorial Structure above to find the correct filename and the chapter title.

  - Use mermaid diagrams to illustrate complex concepts (\`mermaid\` format).

  - Heavily use analogies and examples throughout to help beginners understand.

   - End the chapter with a brief conclusion that summarizes what was learned. ${item.nextChapter ? `Provide a transition to the next chapter using a proper Markdown link: [${item.nextChapter.name}](${item.nextChapter.filename.replace('.md', '.html')}).` : 'Do not mention any next chapter since this is the final chapter.'}

  - Ensure the tone is welcoming and easy for a newcomer to understand.

  - Output *only* the Markdown content for this chapter.

  Now, directly provide a super beginner-friendly Markdown output (DON'T need \`markdown\` tags):
  `;

    // Use caching if enabled, regardless of retry count (we want to cache successful responses)
    const shouldCache = item.useCache;
    let chapterContent = await llm.call(prompt, shouldCache);

    // Basic validation/cleanup
    const actualHeading = `# Chapter ${chapterNum}: ${abstractionName}`; // Use potentially translated name
    let processedContent = chapterContent;
    if (!processedContent.trim().startsWith(`# Chapter ${chapterNum}`)) {
      // Add heading if missing or incorrect, trying to preserve content
      const lines = processedContent.trim().split('\n');
      if (lines && lines[0].trim().startsWith('#')) { // If there's some heading, replace it
        lines[0] = actualHeading;
        processedContent = lines.join('\n');
      } else { // Otherwise, prepend it
        processedContent = `${actualHeading}\n\n${processedContent}`;
      }
    }

    // Add the generated content to our temporary list for the next iteration's context
    this.chaptersWrittenSoFar.push(processedContent);

    // Update progress if tracker is available
    if (this.progressTracker) {
      this.progressTracker.update();
    }

    return processedContent; // Return the Markdown string (potentially translated)
  }

  async post(shared, prepRes, execResList) {
    // exec_res_list contains the generated Markdown for each chapter, in order
    shared.chapters = execResList;

    // Complete progress tracking
    if (this.progressTracker) {
      this.progressTracker.complete();
    }

    // Clean up the temporary instance variables
    delete this.chaptersWrittenSoFar;
    delete this.progressTracker;
  }
}

module.exports = { WriteChaptersNode };