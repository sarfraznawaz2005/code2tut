const fs = require('fs-extra');
const path = require('path');
const micromatch = require('micromatch');
const ignore = require('ignore');
const { createError } = require('./helpers');

function crawlLocalFiles(directory, includePatterns = [], excludePatterns = [], maxFileSize = 100000) {
  if (!fs.existsSync(directory)) {
    throw createError(`Directory does not exist: ${directory}`, 'DIRECTORY_NOT_FOUND', { directory });
  }

  // Validate that the directory exists and is actually a directory
  let directoryStat;
  try {
    directoryStat = fs.statSync(directory);
  } catch (e) {
    throw createError(`Failed to access directory: ${directory}`, 'DIRECTORY_ACCESS_ERROR', { directory, originalError: e.message });
  }

  if (!directoryStat.isDirectory()) {
    throw createError(`Path is not a directory: ${directory}`, 'INVALID_DIRECTORY', { directory });
  }

  // Load .gitignore
  let gitignore = null;
  const gitignorePath = path.join(directory, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const ignoreInstance = ignore();
      // Check if ignoreInstance is properly configured (not a mock that returns undefined)
      if (ignoreInstance && typeof ignoreInstance.add === 'function') {
        gitignore = ignoreInstance.add(gitignoreContent);
      }
    } catch (e) {
      console.warn('Could not read .gitignore:', e.message);
    }
  }

  const files = {};

  function walk(currentDir, relDir = '') {
    let items;
    try {
      items = fs.readdirSync(path.join(directory, relDir));
    } catch (e) {
      console.warn(`Could not read directory ${relDir}:`, e.message);
      return;
    }
    for (const item of items) {
      const itemPath = path.join(relDir, item);
      const fullPath = path.join(directory, itemPath);

      // Check .gitignore
      if (gitignore && gitignore.ignores(itemPath)) {
        continue;
      }

      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        console.warn(`Could not stat ${itemPath}:`, e.message);
        continue;
      }
      if (stat.isDirectory()) {
        // Check exclude patterns for directories
        let excluded = false;
        for (const pattern of excludePatterns) {
          if (micromatch.isMatch(itemPath, pattern) || micromatch.isMatch(item, pattern)) {
            excluded = true;
            break;
          }
        }
        if (!excluded) {
          walk(currentDir, itemPath);
        }
      } else if (stat.isFile()) {
        // Check size
        if (stat.size > maxFileSize) {
          continue;
        }

        // Check include/exclude
        let included = includePatterns.length === 0;
        if (!included) {
          for (const pattern of includePatterns) {
            if (micromatch.isMatch(itemPath, pattern)) {
              included = true;
              break;
            }
          }
        }
        if (included) {
          let excluded = false;
          for (const pattern of excludePatterns) {
            if (micromatch.isMatch(itemPath, pattern)) {
              excluded = true;
              break;
            }
          }
          if (!excluded) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              files[itemPath] = content;
            } catch (e) {
              console.warn(`Could not read file ${itemPath}:`, e.message);
            }
          }
        }
      }
    }
  }

  walk(directory, '');
  return { files };
}

module.exports = crawlLocalFiles;