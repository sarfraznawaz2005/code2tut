const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { marked } = require('marked');

// Helper function to determine if text looks like markdown content
function isLikelyMarkdown(text) {
  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s.+/m,       // Headers (# ## ### etc.) - must have text after the hash
    /^\s*[-*+]\s.+/m,     // Unordered list items - must have content after the marker
    /^\s*\d+\.\s.+/m,     // Ordered list items - must have content after the number
    /\[.+\]\(.+\)/,       // Markdown links [text](url) - requires both text and URL
    /\*\*.*?\*\*/,        // Bold with ** 
    /__.*?__/,            // Bold with __
    /\*.*?\*/,            // Italic with *
    /_.*?_/,              // Italic with _
    /^```[\s\S]*?```/m,   // Code blocks with proper start and end
    /^>\s.+/m,            // Blockquotes - must have content after the >
    /\|.*\|/              // Table separators (basic detection)
  ];

  // Count how many markdown patterns match in the text
  let matches = 0;
  for (const pattern of markdownPatterns) {
    if (pattern.test(text)) {
      matches++;
      // If we find at least one clear markdown pattern, assume it's markdown
      if (matches >= 1) return true;
    }
  }

  // If no markdown-specific patterns are found, it's probably plain text
  return false;
}

async function generateHtmlContent(indexContent, chapterFiles, projectName) {
  if (!indexContent || !Array.isArray(chapterFiles) || !projectName) {
    throw new Error('Invalid input: indexContent, chapterFiles, or projectName is undefined');
  }

  // Generate navigation menu for sidebar
  const navMenu = chapterFiles.map((chapter, index) => {
    const chapterTitle = chapter.filename.replace('.md', '').replace(/^\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `<li class="nav-item"><a href="${chapter.filename.replace('.md', '.html')}" class="nav-link">${chapterTitle}</a></li>`;
  }).join('\n');

  // Capitalize first letter of project name
  const capitalizedProjectName = projectName.charAt(0).toUpperCase() + projectName.slice(1);

  // Single HTML template function
  const generateHtmlTemplate = (content, isIndex = false, currentIndex = 0, totalChapters = chapterFiles.length, chapterTitle = '') => {

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isIndex ? `Tutorial: ${capitalizedProjectName}` : `${chapterTitle} - ${capitalizedProjectName}`}</title>
   <!-- Bootstrap CSS -->
   <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
   <!-- Bootstrap Icons -->
   <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
   <!-- Google Fonts -->
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
   <!-- Prism.js for syntax highlighting -->
   <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" rel="stylesheet">
    <!-- Mermaid.js for diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.5.0/dist/mermaid.min.js"></script>

   <style>
     body {
       font-family: 'Inter', sans-serif;
       color: #2c3e50;
       background-color: #f8f9fa;
     }
      .sticky-header {
        position: fixed;
        top: 0;
        width: 100%;
        z-index: 1000;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 20px rgba(0,0,0,.15);
        backdrop-filter: blur(10px);
      }
      .navbar-brand {
        font-weight: 700;
        color: white !important;
        font-size: 1.5rem;
      }

       body { padding-top: 35px; }

      /* Sidebar Styles */
      .sidebar {
        position: fixed;
        padding: 25px 0;
        left: 0;
        width: 330px;
        height: calc(100vh);
        background: #eef2f6;
        border-right: 1px solid #e9ecef;
        overflow-y: auto;
        z-index: 999;
      }
      .sidebar .nav {
        padding: 20px;
        margin: 0; /* Reset any default margin */
      }
        .nav-link {font-size: 1rem; }
      .sidebar .nav-link {
        color: #2c3e50;
        font-weight: 500;
        border-radius: 10px;
        margin-bottom: 5px;
        display: block;
        text-decoration: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 290px;
      }
      .sidebar .nav-link:hover {
        background-color: #667eea;
        color: white;
      }
      .sidebar .nav-link.active {
        background-color: #667eea;
        color: white;
      }
      .sidebar .nav-link i {
        margin-right: 10px;
      }

      .main-content {
        margin-left: 330px;
        padding: 20px;
        position: relative;
        line-height: 1.7;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
      }

       @media (max-width: 768px) {
         .hero-section {
           padding: 40px 20px;
           margin-bottom: 30px;
         }

         .hero-section h1 {
           font-size: 2rem;
         }

         .hero-section p {
           font-size: 1.1rem;
         }

         .sticky-header .navbar-brand {
           font-size: 1.2rem;
         }

         .sidebar {
           width: 100%;
           position: relative;
           height: auto;
           top: 0;
         }

         .main-content {
           margin-left: 0;
         }

         .chapter-card .card-body {
           padding: 20px;
         }

          .nav-buttons {
            bottom: 20px;
            right: 20px;
          }

          .nav-button {
            width: 35px;
            height: 35px;
            font-size: 16px;
          }
       }

      @media (max-width: 576px) {
        .hero-section h1 {
          font-size: 1.8rem;
        }

        .chapter-card {
          margin-bottom: 15px;
        }
      }

     h1, h2, h3, h4, h5, h6 {
       color: #2c3e50;
       font-weight: 600;
       margin-top: 2rem;
       margin-bottom: 1rem;
     }

      h1 {
        font-size: 2.5rem;
        background: linear-gradient(135deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 1.5rem;
      }

      p {
        font-size: 1.1rem;
        margin-bottom: 1.5rem;
      }

      .hero-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 10px 0;
        margin-bottom: 40px;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,.1);
      }

      .hero-section h1 {
        color: white;
        -webkit-text-fill-color: white;
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .hero-section p {
        font-size: 1.3rem;
        opacity: 0.9;
      }

      .chapter-card {
        background: white;
        border: none;
        border-radius: 15px;
        box-shadow: 0 5px 15px rgba(0,0,0,.08);
        /* Removed transition for nav consistency */
        margin-bottom: 20px;
        overflow: hidden;
      }

      .chapter-card:hover {
        /* Removed transform for consistency */
        box-shadow: 0 10px 25px rgba(0,0,0,.15);
      }

      .chapter-card .card-body {
        padding: 25px;
      }

      .chapter-card .card-title {
        color: #2c3e50;
        font-weight: 600;
        margin-bottom: 15px;
      }

      .chapter-card .card-text {
        color: #6c757d;
        line-height: 1.6;
      }

      .chapter-card .btn {
        border-radius: 25px;
        padding: 8px 20px;
        font-weight: 500;
        /* Removed transition for consistency */
      }
      .nav-buttons {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .nav-button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        font-size: 18px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0,0,0,.2);

        /* Removed transition for consistency */
        display: flex;
        align-items: center;
        justify-content: center;
      }
     .nav-button:hover {
       /* Removed transform for consistency */
       box-shadow: 0 6px 20px rgba(0,0,0,.3);
     }

      /* Mermaid Diagram Styles */
      .mermaid {
        position: relative;
        text-align: center;
        margin: 30px 0;
        padding: 20px;
        background: white;
        border-radius: 15px;
        box-shadow: 0 5px 15px rgba(0,0,0,.1);
        overflow: hidden;
      }

      .mermaid svg {
        max-width: 100%;
        height: auto;
        border-radius: 10px;
        cursor: grab;
        transition: transform 0.3s ease;
      }

      .mermaid svg.dragging {
        cursor: grabbing;
      }

      /* Zoom Controls Overlay */
      .mermaid-zoom-controls {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        opacity: 1;
        transition: opacity 0.3s ease;
        z-index: 10;
      }

      .mermaid-zoom-btn {
        width: 30px;
        height: 30px;
        border: none;
        border-radius: 50%;
        background: rgba(102, 126, 234, 0.9);
        color: white;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,.2);
        transition: all 0.2s ease;
      }

      .mermaid-zoom-btn:hover {
        background: rgba(102, 126, 234, 1);
        transform: scale(1.1);
      }

      .mermaid-zoom-btn:active {
        transform: scale(0.95);
      }

      .chapter-nav {
        padding: 20px 0;
        margin-top: 40px;
        text-align: center;
        margin-left: 330px; /* Match sidebar width to align with main content */
        width: calc(100% - 330px); /* Account for sidebar width */
      }
      
      @media (max-width: 768px) {

     .chapter-nav .btn {
       border-radius: 25px;
       padding: 10px 25px;
       font-weight: 500;
       /* Removed transform for consistency */
     }

     .chapter-nav .btn:hover {
       /* Removed transform for consistency */
       box-shadow: 0 4px 15px rgba(0,0,0,.2);
     }

     code {
       background-color: #e9ecef;
       padding: 2px 6px;
       border-radius: 4px;
       color: #495057;
     }

     pre {
       background-color: #2d3748;
       color: #e2e8f0;
       padding: 20px;
       border-radius: 10px;
       overflow-x: auto;
       box-shadow: 0 4px 6px rgba(0,0,0,.1);
     }

      blockquote {
        border-left: 5px solid #667eea;
        background: linear-gradient(135deg, #f8f9fa, #ffffff);
        padding: 20px 25px;
        margin: 25px 0;
        border-radius: 0 15px 15px 0;
        box-shadow: 0 3px 10px rgba(0,0,0,.05);
        font-style: italic;
        position: relative;
      }

      blockquote::before {
        content: '"';
        font-size: 4rem;
        color: #667eea;
        opacity: 0.3;
        position: absolute;
        top: -10px;
        left: 15px;
        font-family: serif;
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .fade-in-up {
        animation: fadeInUp 0.6s ease-out;
      }

      .chapter-card {
        animation: fadeInUp 0.6s ease-out;
        animation-fill-mode: both;
      }

      .chapter-card:nth-child(1) { animation-delay: 0.1s; }
      .chapter-card:nth-child(2) { animation-delay: 0.2s; }
      .chapter-card:nth-child(3) { animation-delay: 0.3s; }
      
      /* Center chapter navigation and footer within main content area */
      .chapter-nav {
        background: transparent;
        padding: 20px 0;
        margin-top: 40px;
        text-align: center;
        margin-left: 330px; /* Match sidebar width to align with main content */
        width: calc(100% - 330px); /* Account for sidebar width */
        position: relative; /* Ensure proper positioning */
      }
      
      footer {
        margin-left: 330px; /* Match sidebar width to align with main content */
        width: calc(100% - 330px); /* Account for sidebar width */
        position: relative; /* Ensure proper positioning */
      }
      
      @media (max-width: 768px) {
        .chapter-nav, footer {
          margin-left: 0 !important;
          width: 100% !important;
        }
      }
   </style>
</head>
<body>
    <!-- Sticky Header -->
    <header class="sticky-header">
       <nav class="navbar navbar-expand-lg navbar-light">
         <div class="d-flex justify-content-between align-items-center">
           <a href="index.html" class="btn btn-link text-white me-3" title="Home">
             <i class="bi bi-house-door fs-4"></i>
           </a>
           <div class="mx-auto">
             <span class="navbar-brand">${isIndex ? `Tutorial: ${capitalizedProjectName}` : `${chapterTitle} - ${capitalizedProjectName}`}</span>
           </div>
           <div></div> <!-- Spacer -->
         </div>
       </nav>
    </header>

    <!-- Sidebar -->
    <div class="sidebar">
      <nav class="nav flex-column">
        <li class="nav-item">
          <a href="index.html" class="nav-link">
            <i class="bi bi-house-door"></i>Home
          </a>
        </li>
        ${navMenu}
      </nav>
    </div>

    <div class="main-content">
      <div class="container mt-4">
        ${isIndex ? `
          <div class="hero-section">
            <h1><i class="bi bi-stars me-3"></i>Tutorial: ${capitalizedProjectName}</h1>
            <p class="lead">Explore comprehensive guides and insights generated from your codebase</p>
          </div>
        ` : ''}
        ${content}
      </div>
    </div>

   <!-- Navigation Buttons -->
   <div class="nav-buttons">
     <button class="nav-button" onclick="scrollToTop()">↑</button>
     <button class="nav-button" onclick="scrollToBottom()">↓</button>
   </div>

    <!-- Chapter Navigation -->
    <div class="chapter-nav text-center mt-5 mb-5">
       ${isIndex && chapterFiles.length > 0 ? `
         <a href="${chapterFiles[0].filename.replace('.md', '.html')}" class="btn btn-primary mx-2">Next: ${chapterFiles[0].filename.replace('.md', '').replace(/^\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</a>
       ` : `
         ${!isIndex && currentIndex > 1 && chapterFiles.length > 0 ? `<a href="${chapterFiles[currentIndex - 2].filename.replace('.md', '.html')}" class="btn btn-secondary mx-2">← Previous</a>` : '<a href="index.html" class="btn btn-secondary mx-2">← Home</a>'}
         ${!isIndex && currentIndex < totalChapters && chapterFiles.length > 0 ? `<a href="${chapterFiles[currentIndex].filename.replace('.md', '.html')}" class="btn btn-primary mx-2">Next →</a>` : '<a href="index.html" class="btn btn-success mx-2">Back to Home</a>'}
       `}
    </div>

   <!-- Footer -->
   <footer class="text-center mt-5 py-4" style="border-top: 1px solid #e9ecef; background: #fff; margin-left: 330px; width: calc(100% - 330px); position: relative;">
     <div class="container">
       <p class="mb-0 text-muted">
         <small>Generated by <a href="https://github.com/sarfraznawaz2005/code2tut" class="text-decoration-none" style="color: #667eea; font-weight: 500;">Code2Tutorial</a></small>
       </p>
     </div>
   </footer>


  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <!-- Prism.js for syntax highlighting -->
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
   <script>
     // Initialize Mermaid
     mermaid.initialize({ startOnLoad: true });

     // Initialize syntax highlighting, but skip mermaid elements
     document.querySelectorAll('pre code').forEach((block) => {
       if (!block.closest('.mermaid')) {
         Prism.highlightElement(block);
       }
     });

     // Highlight current chapter in sidebar
     document.addEventListener('DOMContentLoaded', function() {
       const currentPage = window.location.pathname.split('/').pop();
       const navLinks = document.querySelectorAll('.sidebar .nav-link');
       navLinks.forEach(link => {
         if (link.getAttribute('href') === currentPage) {
           link.classList.add('active');
         }
       });
     });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowUp') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === 'ArrowDown') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    });

    // Scroll functions for buttons
    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function scrollToBottom() {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }

    // Mermaid zoom and pan functionality
    const ZOOM_STEP = 0.2;
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 3;

    // Initialize zoom controls for each mermaid diagram
    document.addEventListener('DOMContentLoaded', function() {
      // Wait for Mermaid to finish rendering
      setTimeout(() => {
        const mermaidContainers = document.querySelectorAll('.mermaid');
        mermaidContainers.forEach(container => {
          initMermaidControls(container);
        });
      }, 1000); // Wait 1 second for Mermaid to render
    });

    function initMermaidControls(container) {
      const svg = container.querySelector('svg');
      if (!svg) return;

      // Add zoom controls overlay
      const controls = document.createElement('div');
      controls.className = 'mermaid-zoom-controls';
      controls.innerHTML = '<button class="mermaid-zoom-btn" onclick="zoomInMermaid(this)" title="Zoom In">+</button><button class="mermaid-zoom-btn" onclick="zoomOutMermaid(this)" title="Zoom Out">-</button><button class="mermaid-zoom-btn" onclick="resetMermaidZoom(this)" title="Reset Zoom">⭯</button>';
      container.appendChild(controls);

      // Initialize zoom and pan state
      svg.dataset.zoom = '1';
      svg.dataset.panX = '0';
      svg.dataset.panY = '0';
      svg.dataset.dragging = 'false';

      // Add pan functionality
      let isDragging = false;
      let startX, startY, startPanX, startPanY;

      svg.addEventListener('mousedown', function(e) {
        if (parseFloat(svg.dataset.zoom) > 1) {
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          startPanX = parseFloat(svg.dataset.panX);
          startPanY = parseFloat(svg.dataset.panY);
          svg.classList.add('dragging');
          svg.dataset.dragging = 'true';
          e.preventDefault();
        }
      });

      document.addEventListener('mousemove', function(e) {
        if (isDragging && svg.dataset.dragging === 'true') {
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;
          const newPanX = startPanX + deltaX;
          const newPanY = startPanY + deltaY;

          svg.dataset.panX = newPanX;
          svg.dataset.panY = newPanY;
          updateMermaidTransform(svg);
        }
      });

      document.addEventListener('mouseup', function() {
        if (isDragging) {
          isDragging = false;
          svg.classList.remove('dragging');
          svg.dataset.dragging = 'false';
        }
      });

      // Prevent context menu on right click for better UX
      svg.addEventListener('contextmenu', function(e) {
        e.preventDefault();
      });
    }

    function zoomInMermaid(button) {
      const container = button.closest('.mermaid');
      const svg = container.querySelector('svg');
      let zoom = parseFloat(svg.dataset.zoom);
      zoom = Math.min(zoom + ZOOM_STEP, MAX_ZOOM);
      svg.dataset.zoom = zoom;
      updateMermaidTransform(svg);
      container.classList.add('zoomed');
    }

    function zoomOutMermaid(button) {
      const container = button.closest('.mermaid');
      const svg = container.querySelector('svg');
      let zoom = parseFloat(svg.dataset.zoom);
      zoom = Math.max(zoom - ZOOM_STEP, MIN_ZOOM);
      svg.dataset.zoom = zoom;
      updateMermaidTransform(svg);
      if (zoom <= 1) {
        container.classList.remove('zoomed');
      }
    }

    function resetMermaidZoom(button) {
      const container = button.closest('.mermaid');
      const svg = container.querySelector('svg');
      svg.dataset.zoom = '1';
      svg.dataset.panX = '0';
      svg.dataset.panY = '0';
      updateMermaidTransform(svg);
      container.classList.remove('zoomed');
    }

    function updateMermaidTransform(svg) {
      const zoom = parseFloat(svg.dataset.zoom);
      const panX = parseFloat(svg.dataset.panX);
      const panY = parseFloat(svg.dataset.panY);

      svg.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
      svg.style.transformOrigin = 'center center';
    }


  </script>
</body>
</html>
`;
  };

  // Generate index HTML
  const markedContent = marked(indexContent.replace(/\.md/g, '.html')
    .replace(/<hr>\s*<p>Generated by <a href="https:\/\/github\.com\/sarfraznawaz2005\/code2tut">Code2Tutorial<\/a><\/p>/g, ''));
  let finalIndexContent = markedContent.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (match, p1) => {
    const cleanP1 = p1.replace(/<[^>]*>/g, '').trim();
    const unescaped = cleanP1.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    if (match.includes('language-mermaid') || unescaped.includes('sequenceDiagram') || unescaped.includes('flowchart') || unescaped.includes('graph')) {
      return `<div class="mermaid">${unescaped}</div>`;
    }
    return match;
  }).replace(/<hr>\s*<p>Generated by <a href="https:\/\/github\.com\/sarfraznawaz2005\/code2tut">Code2Tutorial<\/a><\/p>/g, '');

  // Wrap chapters in cards
  finalIndexContent = finalIndexContent.replace(/(<h2>Chapters<\/h2>[\s\S]*?<ol>[\s\S]*?<\/ol>)/, (match) => {
    const chapterList = match.replace(/<li><a href="([^"]+)">([^<]+)<\/a><\/li>/g, (liMatch, href, title) => {
      return `
              <div class="col-md-6 mb-4">
                <div class="chapter-card card h-100">
                  <div class="card-body">
                    <h5 class="card-title"><i class="bi bi-bookmark me-2 text-primary"></i>${title}</h5>
                    <p class="card-text">Dive deep into ${title.toLowerCase()} with detailed explanations and examples.</p>
                    <a href="${href}" class="btn btn-primary">Read Chapter</a>
                  </div>
                </div>
              </div>
            `;
    });
    return `<div class="row">${chapterList.replace(/<h2>Chapters<\/h2>[\s\S]*?<ol>|<\/ol>/g, '')}</div>`;
  });
  const indexHtmlContent = generateHtmlTemplate(
    finalIndexContent,
    true
  );

  // Generate chapter HTML files
  const chapterHtmlFiles = chapterFiles.map((chapter, index) => {
    const chapterTitle = chapter.filename.replace('.md', '').replace(/^\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const currentIndex = index + 1;
    const totalChapters = chapterFiles.length;

    // Process the chapter content to handle any unwanted <pre><code class="language-markdown"> blocks
    let processedChapterContent = chapter.content;

    // First, look for <pre><code class="language-markdown"> blocks that contain actual markdown that should be rendered as HTML
    // This happens when the LLM wraps markdown content in these tags
    processedChapterContent = processedChapterContent.replace(/<pre><code class="language-markdown">([\s\S]*?)<\/code><\/pre>/g, (match, p1) => {
      const cleanMarkdown = p1.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      // Check if this is actually markdown content (contains markdown-like patterns) or just plain text
      // If it looks like markdown, convert it to HTML; otherwise, return as plain text
      if (isLikelyMarkdown(cleanMarkdown)) {
        const convertedHtml = marked(cleanMarkdown.replace(/\.md/g, '.html')
          .replace(/<hr>\s*<p>Generated by <a href="https:\/\/github\.com\/sarfraznawaz2005\/code2tut">Code2Tutorial<\/a><\/p>/g, '')
          .replace(/<h1>.*?<\/h1>/, `<h1>Chapter ${currentIndex}: ${chapterTitle}</h1>`));
        return convertedHtml;
      } else {
        // If it's not likely markdown content, return it as regular text (not code block)
        return cleanMarkdown;
      }
    });

    // Now, convert the processed chapter content to HTML using marked
    // But we need to be careful to handle code blocks properly
    const markedChapterContent = marked(processedChapterContent.replace(/\.md/g, '.html')
      .replace(/<hr>\s*<p>Generated by <a href="https:\/\/github\.com\/sarfraznawaz2005\/code2tut">Code2Tutorial<\/a><\/p>/g, '')
      .replace(/<h1>.*?<\/h1>/, `<h1>Chapter ${currentIndex}: ${chapterTitle}</h1>`));

    // Process any remaining code blocks for special handling (like mermaid diagrams)
    let processedContent = markedChapterContent.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (match, p1) => {
      const cleanP1 = p1.replace(/<[^>]*>/g, '').trim();
      const unescaped = cleanP1.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      // More precise Mermaid detection: check if it starts with a Mermaid diagram type
      if (/^\s*(graph|sequenceDiagram|flowchart|classDiagram|stateDiagram|journey|pie|requirement|timeline|mindmap)\s+/i.test(unescaped)) {
        return `<div class="mermaid">${unescaped}</div>`;
      }
      return match;
    }).replace(/<hr>\s*<p>Generated by <a href="https:\/\/github\.com\/sarfraznawaz2005\/code2tut">Code2Tutorial<\/a><\/p>/g, '');

    // Fix malformed Mermaid divs
    processedContent = processedContent.replace(/(<div class="mermaid">[\s\S]*?)<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>([\s\S]*?<\/div>)/g, (match, p1, p2, p3) => {
      const cleanP2 = p2.replace(/<[^>]*>/g, '').trim();
      const unescaped = cleanP2.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      return `${p1}${unescaped}${p3}`;
    });

    return {
      filename: chapter.filename.replace('.md', '.html'),
      content: generateHtmlTemplate(
        processedContent,
        false,
        currentIndex,
        totalChapters,
        chapterTitle
      )
    };
  });

  return { indexHtmlContent, chapterHtmlFiles };
}

async function writeHtmlFiles(outputPath, indexHtmlContent, chapterHtmlFiles) {
  try {
    if (!indexHtmlContent || !Array.isArray(chapterHtmlFiles)) {
      throw new Error('Invalid input'); // Changed to match test expectation
    }

    const htmlDir = path.join(outputPath, 'html');
    // Clean up previous contents of the output directory
    if (fs.existsSync(htmlDir)) {
      await fs.emptyDir(htmlDir);
    }
    await fs.ensureDir(htmlDir);

    // Write index.html
    const indexHtmlFilepath = path.join(htmlDir, 'index.html');
    await fs.writeFile(indexHtmlFilepath, indexHtmlContent);
    console.log(chalk.white(`  - Wrote ${indexHtmlFilepath}`));

    // Write chapter files
    for (const chapterInfo of chapterHtmlFiles) {
      if (!chapterInfo.content) {
        console.warn(chalk.yellow(`  - Skipping HTML for ${chapterInfo.filename}: content is undefined`));
        continue;
      }
      const chapterFilepath = path.join(htmlDir, chapterInfo.filename);
      await fs.writeFile(chapterFilepath, chapterInfo.content);
      console.log(chalk.white(`  - Wrote ${chapterFilepath}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error in writeHtmlFiles: ${error.message}`));
    throw error; // Re-throw to trigger retry
  }
}

module.exports = { generateHtmlContent, writeHtmlFiles };