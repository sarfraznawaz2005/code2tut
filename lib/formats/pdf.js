const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const puppeteer = require('puppeteer');

async function generateCombinedPdfHtml(indexHtmlContent, chapterHtmlFiles, projectName, outputPath) {
  // Extract content from HTML without UI elements
  const extractContent = (html, isIndex = false) => {
    // Use a more aggressive approach to remove UI elements
    let content = html
      // Remove entire sections
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<!-- Navigation Buttons -->[\s\S]*?<!-- Chapter Navigation -->/gi, '')
      .replace(/<!-- Chapter Navigation -->[\s\S]*?<!-- Footer -->/gi, '')
      .replace(/<!-- Footer -->[\s\S]*?<\/footer>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Remove elements with specific classes
      .replace(/<div class="[^"]*sticky-header[^"]*"[\s\S]*?<\/div>/gi, '')
      .replace(/<div class="[^"]*nav-buttons[^"]*"[\s\S]*?<\/div>/gi, '')
      .replace(/<div class="[^"]*chapter-nav[^"]*"[\s\S]*?<\/div>/gi, '')
      .replace(/<div class="[^"]*chapter-card[^"]*"[\s\S]*?<\/div>/gi, '')
      .replace(/<div class="[^"]*hero-section[^"]*"[\s\S]*?<\/div>/gi, '')
      .replace(/<div class="[^"]*dropdown[^"]*"[\s\S]*?<\/div>/gi, '')
      .replace(/<div class="[^"]*navbar[^"]*"[\s\S]*?<\/div>/gi, '')
      .replace(/<div class="row[^"]*"[\s\S]*?<\/div>/gi, '') // Remove rows
      .replace(/<div class="col-md-6[^"]*"[\s\S]*?<\/div>/gi, '') // Remove columns
      // Remove buttons and links that are buttons
      .replace(/<a[^>]*class="[^"]*btn[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
      .replace(/<a[^>]*class="[^"]*dropdown[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
      // Remove other UI elements
      .replace(/<hr[^>]*>/gi, '')
      // Keep mermaid divs for rendering
      // Remove inline styles that are UI-related
      .replace(/style="[^"]*position: fixed[^"]*"/gi, '')
      .replace(/style="[^"]*z-index: \d+[^"]*"/gi, '')
      .replace(/style="[^"]*background: linear-gradient[^"]*"/gi, '')
      .replace(/style="[^"]*box-shadow: [^"]*"/gi, '')
      .replace(/style="[^"]*backdrop-filter: [^"]*"/gi, '')
      .replace(/style="[^"]*transform: [^"]*"/gi, '')
      .replace(/style="[^"]*transition: [^"]*"/gi, '')
      .replace(/style="[^"]*animation: [^"]*"/gi, '');

    // For chapters, remove all h1 tags since we'll add our own
    if (!isIndex) {
      content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');
      content = content.replace(/\.Html?/gi, ''); // Remove .Html or .html from text
    }
    // General removal of .Html from all content
    content = content.replace(/\.Html?/gi, '');

    return content;
  };

  const capitalizedProjectName = projectName.charAt(0).toUpperCase() + projectName.slice(1);

  // Generate table of contents
  const toc = chapterHtmlFiles.map((chapter, index) => {
    let chapterTitle = chapter.filename.replace('.md', '').replace(/^\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    chapterTitle = chapterTitle.replace(/\.html?$/gi, '').replace(/\.Html?$/gi, '').replace(/\.html?$/gi, ''); // Remove .html, .htm, .Html, etc.
    return `<li><a href="#chapter-${index + 1}">${index + 1}. ${chapterTitle}</a></li>`;
  }).join('\n');

  // Extract and combine content
  const rawIndexContent = extractContent(indexHtmlContent, true);
  const chapterContents = chapterHtmlFiles.map((chapter, index) => {
    let chapterTitle = chapter.filename.replace('.md', '').replace(/^\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    chapterTitle = chapterTitle.replace(/\.html?$/gi, '').replace(/\.Html?$/gi, '').replace(/\.html?$/gi, ''); // Remove .html, .htm, .Html, etc.
    let content = extractContent(chapter.content, false);
    // Remove wrong headings like "1. Tutorial Generation Flow.Html" or ".html"
    content = content.replace(/<h1>\d+\. [^<]*\.Html?<\/h1>/gi, '').replace(/\.Html?/gi, '');
    return `<h1 id="chapter-${index + 1}">${index + 1}. ${chapterTitle}</h1>\n${content}`;
  }).join('\n');

  // Clean index content after extraction
  const indexContent = rawIndexContent
    .replace(/<h1>[^<]*Tutorial: [^<]+<\/h1>/gi, '') // Remove duplicate tutorial title
    .replace(/<p><strong>[^<]*<\/strong>[^<]*<\/p>/gi, (match) => {
      return match.replace(/<p><strong>([^<]+)<\/strong>([^<]*?)<\/p>/gi, '<p><strong>$1</strong>$2</p>');
    });

  // Combined HTML for PDF
  const combinedHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${capitalizedProjectName} Tutorial</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-solarizedlight.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/mermaid@10.5.0/dist/mermaid.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.5.0/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
   <style>
     body {
       font-family: 'Georgia', serif;
       line-height: 1.6;
       color: #333;
       background: white;
       padding: 20px;
       max-width: none;
       margin: 0;
     }
     h1 {
       color: #2c3e50 !important;
       font-size: 2rem !important;
       text-align: center !important;
       margin-top: 50px !important;
       margin-bottom: 30px !important;
       border-bottom: 2px solid #667eea !important;
       padding-bottom: 10px !important;
     }
     h2 {
       color: #34495e !important;
       font-size: 1.5rem !important;
       margin-top: 45px !important;
       margin-bottom: 25px !important;
       border-left: 4px solid #667eea !important;
       padding-left: 10px !important;
     }
     h3 {
       color: #2c3e50;
       font-size: 1.2rem;
       margin-top: 25px;
       margin-bottom: 12px;
     }
     p {
       font-size: 0.95rem;
       margin-top: 10px;
       margin-bottom: 15px;
       text-align: justify;
     }
     .mermaid {
       text-align: center;
       margin: 25px 0;
       padding: 15px;
       background: #f8f9fa;
       border-radius: 8px;
     }
       pre {
         background: #f0f0f0 !important;
         color: #e91e63 !important;
         padding: 15px !important;
         border-radius: 8px !important;
         overflow-x: hidden !important;
         margin: 20px 0 !important;
         word-wrap: break-word !important;
         overflow-wrap: break-word !important;
         white-space: pre-wrap !important;
         max-width: 100% !important;
         box-sizing: border-box !important;
         width: 100% !important;
       }
      code {
        padding: 2px 4px !important;
        border-radius: 3px !important;
        color: #e91e63 !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        white-space: pre-wrap !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      pre[class*="language-"] {
        white-space: pre-wrap !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
     ul {
       list-style-type: disc;
       padding-left: 20px;
       margin-top: 15px;
       margin-bottom: 15px;
     }
      ul li {
        margin-bottom: 8px;
      }
      ul li a {
        color: #667eea;
        text-decoration: none;
        font-weight: 500;
      }
      ul li a:hover {
        text-decoration: underline;
      }
      .toc {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-top: 30px;
        margin-bottom: 30px;
      }
     .toc h2 {
       text-align: left;
       margin-bottom: 15px;
       border-left: none;
       padding-left: 0;
     }
   </style>
</head>
<body>
  <h1>${capitalizedProjectName} Tutorial</h1>
  <div class="toc">
    <h2>Table of Contents</h2>
    <ul>
      <li><a href="#index">Introduction</a></li>
      ${toc}
    </ul>
  </div>
  <div id="index">
    ${indexContent}
  </div>
  ${chapterContents}
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
    document.addEventListener('DOMContentLoaded', function() {
      // Render Mermaid diagrams
      mermaid.init(undefined, '.mermaid');
      // Highlight code
      document.querySelectorAll('pre code').forEach((block) => {
        if (!block.closest('.mermaid')) {
          Prism.highlightElement(block);
        }
      });
    });
  </script>
</body>
</html>
  `;

  // Save to temp file for debugging

  // const tempHtmlPath = path.join(outputPath, 'temp_combined.html');
  // await fs.writeFile(tempHtmlPath, combinedHtml);
  // console.log(chalk.blue(`  - Saved temp HTML for debugging: ${tempHtmlPath}`));

  return combinedHtml;
}

async function writePdfFiles(outputPath, indexHtmlContent, chapterHtmlFiles, projectName) {
  try {
    if (!indexHtmlContent || !chapterHtmlFiles || !projectName) {
      throw new Error('Invalid input'); // Changed to match test expectation
    }

    const pdfDir = path.join(outputPath, 'pdf');
    // Clean up previous contents of the PDF output directory
    if (fs.existsSync(pdfDir)) {
      await fs.emptyDir(pdfDir);
    }
    await fs.ensureDir(pdfDir);

    // Generate combined HTML for PDF
    const combinedHtml = await generateCombinedPdfHtml(indexHtmlContent, chapterHtmlFiles, projectName, outputPath);

    // Launch Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set content and generate single PDF
    await page.setContent(combinedHtml, { waitUntil: 'networkidle0' });
    const pdfFilepath = path.join(pdfDir, `${projectName}.pdf`);
    await page.pdf({
      path: pdfFilepath,
      format: 'A3',
      printBackground: true,
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
    });
    console.log(chalk.white(`  - Wrote ${pdfFilepath}`));

    await browser.close();
  } catch (error) {
    console.error(chalk.red(`Error in writePdfFiles: ${error.message}`));
    throw error; // Re-throw to trigger retry
  }
}

module.exports = { writePdfFiles };