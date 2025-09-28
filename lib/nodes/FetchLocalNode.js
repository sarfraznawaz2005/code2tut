const { Node } = require('pocketflow');
const crawlLocalFiles = require('../crawlLocal');
const path = require('path');
const chalk = require('chalk');

class FetchLocalNode extends Node {
  async prep(shared) {
    return {
      dir: shared.localDir,
      includePatterns: shared.includePatterns,
      excludePatterns: shared.excludePatterns,
      maxFileSize: shared.maxFileSize
    };
  }

  async exec(prepRes) {
    console.log(chalk.white(`📂 Crawling directory: ${path.basename(prepRes.dir)}...`));
    const result = crawlLocalFiles(prepRes.dir, prepRes.includePatterns, prepRes.excludePatterns, prepRes.maxFileSize);
    const filesList = Object.entries(result.files);
    console.log(chalk.green(`📄 Fetched ${filesList.length} files.`));
    return filesList;
  }

  async post(shared, prepRes, execRes) {
    shared.files = execRes;
  }
}

module.exports = { FetchLocalNode };