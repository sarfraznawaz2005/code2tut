# Code2Tut

Generate comprehensive tutorials from codebases using AI. This tool analyzes your codebase, identifies key abstractions and concepts, and creates structured, educational content in multiple formats.

This project is power by [PocketFlow](https://github.com/The-Pocket/PocketFlow).

## Features

- **AI-Powered Analysis**: Uses advanced language models to understand and explain complex codebases
- **Multiple LLM Providers**: Supports OpenAI, Google Gemini, and Anthropic Claude
- **Flexible Output Formats**: Generate tutorials in HTML (with interactive diagrams), Markdown, or PDF
- **Smart Code Crawling**: Automatically discovers and analyzes source files across multiple programming languages
- **Configurable Processing**: Customize file inclusion/exclusion patterns, maximum file sizes, and abstraction limits
- **Interactive HTML Output**: Features syntax highlighting, Mermaid diagrams, zoomable charts, and responsive design
- **Caching Support**: Speed up repeated analyses with intelligent caching
- **Comprehensive Testing**: Full test suite ensuring reliability

## Installation

### Global Installation (Recommended)

```bash
npm install -g code2tut
```

### Local Installation

```bash
git clone https://github.com/sarfraznawaz2005/code2tut.git
cd code2tut
npm install
npm link
```

## Usage

### Basic Usage

```bash
code2tut --dir /path/to/your/project
```

### Advanced Usage

```bash
code2tut \
  --dir /path/to/project \
  --name "My Awesome Project" \
  --output tutorials \
  --format html \
  --llm-provider gemini \
  --max-abstractions 20 \
  --verbose
```

### Command Line Options

- `-d, --dir <directory>`: Path to local directory (default: current working directory)
- `-n, --name <name>`: Project name (default: directory basename)
- `-o, --output <output>`: Output directory (default: 'output')
- `-i, --include <patterns...>`: Include file patterns (supports glob patterns)
- `-e, --exclude <patterns...>`: Exclude file patterns (supports glob patterns)
- `-s, --max-size <size>`: Max file size in bytes (default: 100000)
- `-v, --verbose`: Enable verbose output
- `--cache <bool>`: Enable caching (default: true)
- `--max-abstractions <num>`: Maximum abstractions to identify (default: 25)
- `--llm-provider <provider>`: LLM provider: openai, gemini, anthropic (default: gemini)
- `--format <format>`: Output format: markdown, html, pdf (default: html)

### Environment Variables

Set your API keys as environment variables:

```bash
export GEMINI_API_KEY="your_gemini_api_key"
export OPENAI_API_KEY="your_openai_api_key"
export ANTHROPIC_API_KEY="your_anthropic_api_key"
```

## Supported LLM Providers

### Google Gemini (Default)

- **Environment Variable**: `GEMINI_API_KEY`
- **Default Model**: `gemini-2.0-flash`
- **Recommended for**: Balanced performance and cost

### OpenAI

- **Environment Variable**: `OPENAI_API_KEY`
- **Default Model**: Configurable
- **Recommended for**: High-quality outputs

### Anthropic Claude

- **Environment Variable**: `ANTHROPIC_API_KEY`
- **Default Model**: Configurable
- **Recommended for**: Safety-focused applications

## Output Formats

### HTML (Default)

- **Features**: Interactive navigation, syntax highlighting, Mermaid diagrams, responsive design
- **Includes**: Bootstrap styling, zoomable diagrams, chapter navigation
- **Best for**: Web-based tutorials and documentation

### Markdown

- **Features**: Clean, portable text format
- **Includes**: Standard Markdown syntax with code blocks
- **Best for**: Version control, static site generators

### PDF

- **Features**: Print-ready format with proper formatting
- **Includes**: Syntax highlighting, diagrams, table of contents
- **Best for**: Offline distribution and printing

## How It Works

Code2Tut follows a sophisticated multi-step process:

1. **Code Crawling**: Scans your codebase using configurable include/exclude patterns
2. **Abstraction Identification**: Uses AI to identify key concepts and abstractions
3. **Relationship Analysis**: Maps dependencies and relationships between components
4. **Chapter Ordering**: Determines logical flow and progression of topics
5. **Content Generation**: Writes detailed, educational content for each chapter
6. **Tutorial Assembly**: Combines all chapters into a cohesive tutorial

## Development

### Running Tests

```bash
npm test
```

### Running Specific Tests

```bash
npm test -- --testNamePattern="IdentifyAbstractionsNode"
```

### Development Setup

```bash
git clone https://github.com/sarfraznawaz2005/code2tut.git
cd code2tut
npm install
npm link
```

## Examples

### Generate Tutorial for a React Project

```bash
code2tut \
  --dir ./my-react-app \
  --name "React Todo App" \
  --format html \
  --llm-provider gemini
```

### Generate Markdown Tutorial with Custom Patterns

```bash
code2tut \
  --dir ./src \
  --include "**/*.js" "**/*.jsx" \
  --exclude "**/test/**" "**/spec/**" \
  --format markdown \
  --max-abstractions 15
```

### Generate PDF Tutorial for Documentation

```bash
code2tut \
  --dir ./library \
  --name "My Library" \
  --format pdf \
  --llm-provider openai
```

## Troubleshooting

### Common Issues

1. **API Key Not Found**: Ensure your API key environment variable is set correctly
2. **Large Files Skipped**: Increase `maxFileSize` or exclude large files
3. **No Files Found**: Check your include/exclude patterns
4. **LLM Errors**: Verify your API key and model availability

### Verbose Mode

Use the `--verbose` flag for detailed logging:

```bash
code2tut --dir ./project --verbose
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License.
