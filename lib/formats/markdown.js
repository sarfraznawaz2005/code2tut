const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

async function writeMarkdownFiles(outputPath, indexContent, chapterFiles) {
  try {
    if (!indexContent || !chapterFiles) {
      throw new Error('Invalid input'); // Changed to match test expectation
    }

    const markdownDir = path.join(outputPath, 'markdown');
    // Clean up previous contents of the output directory
    if (fs.existsSync(markdownDir)) {
      await fs.emptyDir(markdownDir);
    }
    await fs.ensureDir(markdownDir);

    // Write index.md
    const indexMdFilepath = path.join(markdownDir, 'index.md');
    await fs.writeFile(indexMdFilepath, indexContent);
    console.log(chalk.white(`  - Wrote ${indexMdFilepath}`));

    // Write chapter files
    for (const chapterInfo of chapterFiles) {
      if (!chapterInfo.content) {
        console.warn(chalk.yellow(`  - Skipping Markdown for ${chapterInfo.filename}: content is undefined`));
        continue;
      }
      const chapterFilepath = path.join(markdownDir, chapterInfo.filename);
      await fs.writeFile(chapterFilepath, chapterInfo.content);
      console.log(chalk.white(`  - Wrote ${chapterFilepath}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error in writeMarkdownFiles: ${error.message}`));
    throw error; // Re-throw to trigger retry
  }
}

module.exports = { writeMarkdownFiles };