# Code Review Skill for opencode

A comprehensive code review skill for the **opencode** AI coding agent. Analyzes JavaScript/Node.js code for best practices, security vulnerabilities, and performance optimizations.

## Features

✅ **Best Practices & Code Quality**
- Code readability and maintainability
- Error handling and validation
- Architecture and design patterns
- Testing coverage

🔒 **Security Vulnerabilities**
- SQL/NoSQL injection detection
- XSS and CSRF prevention
- Authentication/authorization issues
- Sensitive data exposure
- Dependency vulnerabilities

⚡ **Performance Optimization**
- Database query efficiency
- Caching strategies
- Memory leak detection
- Algorithm complexity analysis
- API request optimization

## Installation

### Option 1: Direct Installation (opencode)

```bash
# Clone the repository
git clone https://github.com/yourusername/code-review-skill.git

# Use in opencode
opencode --skill ./code-review-skill "Review this code for security and performance"
```

### Option 2: Package Installation

Download the `.skill` file from [Releases](https://github.com/yourusername/code-review-skill/releases) and install it in your opencode configuration directory.

## Quick Start

### Basic Code Review
```bash
opencode "Review this authentication middleware for security issues" < auth.js
```

### With Format Specification
```bash
opencode "Review this API endpoint for all issues and output as JSON" < api-route.js
```

### Specific Focus Area
```bash
opencode "Focus on performance optimizations for this MongoDB query"
```

### Multiple Files
```bash
opencode "Review these files for security vulnerabilities" < app.js < routes.js < db.js
```

## Output Formats

### 1. Markdown (Default)
```markdown
# Code Review Report

## Best Practices & Code Quality (3 issues)
### High Priority
- Missing error handling
- Code duplication

## Security (2 issues)
### Critical
- SQL Injection vulnerability

## Performance (1 issue)
- N+1 query problem
```

### 2. JSON
```json
{
  "review_metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "files_reviewed": 2,
    "total_issues": 6
  },
  "security": {
    "vulnerabilities": [...],
    "count": 2,
    "severity_distribution": { "critical": 1, "high": 1 }
  }
}
```

### 3. GitHub PR Comment
```markdown
## 🔍 Code Review

**Status**: ⚠️ Review Required

### Summary
| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 1 | 0 | 0 | 0 |
| Best Practices | 0 | 1 | 1 | 0 |
| Performance | 0 | 1 | 0 | 0 |
```

### 4. Inline Comments
```javascript
// 🚨 [SECURITY] SQL Injection risk
// Use parameterized queries instead
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

## Usage Examples

### Example 1: Review Express Middleware
```bash
opencode "Review this Express middleware for security vulnerabilities and best practices" < middleware.js
```

**Output**: Identifies CORS issues, missing validation, improper error handling

### Example 2: Database Query Audit
```bash
opencode "Perform a performance audit on this MongoDB aggregation pipeline"
```

**Output**: Suggests indexing, query optimization, projection fixes

### Example 3: API Endpoint Analysis
```bash
opencode "Review this REST endpoint handler for all three dimensions (security, performance, best practices). Output as JSON."
```

**Output**: Structured JSON with categorized issues and suggestions

## Features by Node.js Framework

### Express.js
- Route validation
- Middleware ordering
- Error handling patterns
- Security headers
- CORS configuration

### Next.js / React
- Server-side validation
- API route security
- Data fetching patterns
- Environment variable handling

### MongoDB
- Aggregation pipeline optimization
- Index usage analysis
- Query performance
- Injection vulnerability detection

### PostgreSQL
- Query optimization
- Connection pooling
- Transaction handling
- Prepared statement usage

## Configuration

### Team Standards
Customize the skill by creating an `.opencode-review-config.json`:

```json
{
  "security_level": "strict",
  "frameworks": ["express", "mongodb"],
  "team_conventions": {
    "error_handling": "async/await with try-catch",
    "logging": "pino",
    "testing": "jest"
  },
  "focus_areas": ["security", "performance"]
}
```

### Extending the Skill

Create a `custom-rules.js` in your project:

```javascript
module.exports = {
  rules: [
    {
      name: "company-api-pattern",
      severity: "high",
      check: (code) => !code.includes("apiResponse.format()"),
      message: "Must use company standard response format"
    }
  ]
};
```

## Security Checklist

The skill checks against these security items:

- ✅ Input validation & sanitization
- ✅ SQL/NoSQL injection prevention
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Authentication/authorization
- ✅ Sensitive data handling
- ✅ Environment variable management
- ✅ Error message exposure
- ✅ Rate limiting
- ✅ API security headers

See [security-checklist.md](references/security-checklist.md) for full details.

## Performance Guidelines

The skill provides guidance on:

- Database query optimization
- Caching strategies
- Async/await best practices
- Memory management
- Stream processing
- Algorithm complexity
- Bundle size optimization
- Connection pooling

See [performance-guide.md](references/performance-guide.md) for full details.

## Helper Scripts

The `scripts/` directory contains utility functions:

### Format JSON
```bash
node scripts/format-json.js
```
Converts review to structured JSON format

### Format Markdown
```bash
node scripts/format-markdown.js
```
Generates readable Markdown report

### Format GitHub PR
```bash
node scripts/format-github-pr.js
```
Creates GitHub PR comment format

## Tips for Best Results

1. **Provide Context**
   - Include imports and dependencies
   - Specify the framework (Express, Next.js, etc.)
   - Mention Node.js version

2. **Be Specific**
   - Ask about specific concerns
   - Provide function or module scope
   - Include related files

3. **Use Appropriate Format**
   - Markdown for documentation
   - JSON for CI/CD pipelines
   - GitHub PR for pull request reviews

4. **Follow Up**
   - Ask for specific solutions
   - Request refactoring suggestions
   - Query explanations for complex issues

## CI/CD Integration

### GitHub Actions
```yaml
name: Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Code Review
        run: |
          opencode --skill code-review-skill \
            "Review changes for security and performance" \
            --output json > review.json
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit
opencode --skill code-review-skill \
  "Quick security check before commit" \
  --strict
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new review rules
4. Submit a pull request

## Issues & Feature Requests

Found a bug or have a feature idea? [Open an issue](https://github.com/yourusername/code-review-skill/issues)

## Support

- 📖 [Full Documentation](https://github.com/yourusername/code-review-skill/wiki)
- 💬 [Discussions](https://github.com/yourusername/code-review-skill/discussions)
- 🐛 [Bug Reports](https://github.com/yourusername/code-review-skill/issues)

## License

MIT License - see [LICENSE](LICENSE) for details

## Changelog

### Version 1.0.0 (Current)
- Initial release
- Support for JavaScript/Node.js
- Three review dimensions: security, best practices, performance
- Multiple output formats
- Helper scripts included

---

**Built for**: [opencode](https://github.com/opencode-ai/opencode)  
**Requires**: Node.js 16+ (for opencode integration)  
**Author**: Your Name / Your Organization

## Roadmap

- [ ] TypeScript support
- [ ] Python code review (Flask, Django)
- [ ] Go code review
- [ ] Rust code review
- [ ] Real-time feedback in editors (VSCode extension)
- [ ] Integration with SonarQube
- [ ] Custom rule builder UI
- [ ] Team collaboration features

---

Made with ❤️ for the Node.js community
