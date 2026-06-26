---
name: code-review
description: Comprehensive code review for JavaScript/Node.js projects. Reviews code for best practices, security vulnerabilities, and performance optimizations. Use this skill whenever reviewing pull requests, analyzing code quality, auditing existing codebases, checking for security issues, or looking to improve performance. Supports multiple output formats (JSON, Markdown, inline comments) suitable for CI/CD pipelines, PRs, and developer feedback.
---

# Code Review Skill

A comprehensive code review system for JavaScript/Node.js projects that evaluates code across three dimensions: **best practices & code quality**, **security vulnerabilities**, and **performance optimization**.

## When to Use This Skill

- **Pull Request Reviews**: Analyze new code before merging
- **Code Audits**: Review existing codebases for improvement opportunities
- **Security Scanning**: Identify potential vulnerabilities
- **Performance Optimization**: Find bottlenecks and efficiency issues
- **Team Learning**: Generate detailed feedback for developers
- **CI/CD Integration**: Automated code quality checks

## Review Dimensions

### 1. Best Practices & Code Quality

**Architecture & Design:**
- SOLID Principles (Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion)
- DRY (Don't Repeat Yourself) - Code duplication detection
- Code organization and folder structure adherence
- Proper separation of concerns
- Clean code standards

**Code Quality:**
- Code readability and maintainability
- Proper error handling and validation
- Adherence to JavaScript/Node.js conventions
- Proper use of async/await and Promises
- Testing coverage and test quality
- Meaningful comments and documentation (not just console.logs)

### 2. Security Vulnerabilities
- SQL injection and NoSQL injection risks
- XSS (Cross-Site Scripting) vulnerabilities
- Authentication and authorization issues
- Sensitive data exposure
- CSRF (Cross-Site Request Forgery) protection
- Input validation and sanitization
- Dependency vulnerabilities
- Environment variable and secret management

### 3. Performance Optimization

**🔴 CRITICAL - Database Patterns (Highest Priority):**
- **N+1 Query Detection** - Queries inside loops are flagged as HIGH severity
- **Queries in Loops** - Any database call within a loop must be batched
- Inefficient aggregation pipelines
- Missing indexes on frequently queried fields
- Connection pooling issues

**⚠️ Code Quality Issues:**
- Unnecessary `console.log()` statements (production code must be clean)
- Memory leaks and resource management
- Algorithm complexity (Big O analysis)
- Caching strategies
- API request optimization
- Bundle size and code splitting

## Input Format

Provide code to review in one of these ways:

```
1. Direct code snippet
   - Paste the code directly

2. File content
   - Include file path and full content

3. Repository context
   - Include related files, imports, and dependencies
   - Mention the project type (Express API, Next.js, microservice, etc.)
```

## Output Formats

### Option 1: Markdown Report (Default)
```markdown
# Code Review Report

## Overview
- Files reviewed: X
- Issues found: X
- Severity distribution

## Best Practices (X issues)
### High Priority
- Issue 1
- Issue 2

### Medium Priority
- Issue 3

## Security (X issues)
### Critical
- Vulnerability 1

### High
- Vulnerability 2

## Performance (X issues)
- Optimization 1
- Optimization 2

## Summary & Recommendations
```

### Option 2: JSON Structure
```json
{
  "review_metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "files_reviewed": 3,
    "total_issues": 12
  },
  "best_practices": {
    "issues": [...],
    "count": 5,
    "severity_distribution": { "high": 2, "medium": 3 }
  },
  "security": {
    "vulnerabilities": [...],
    "count": 4,
    "severity_distribution": { "critical": 1, "high": 3 }
  },
  "performance": {
    "issues": [...],
    "count": 3
  },
  "summary": "..."
}
```

### Option 3: Inline Comments
```javascript
// 🚨 [SECURITY] Potential SQL injection
// Consider using parameterized queries instead of string concatenation
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

### Option 4: GitHub PR Comment Format
```markdown
## 🔍 Code Review Results

**Status**: ⚠️ Review Required  
**Issues Found**: 8  
**Severity**: 🔴 Critical (1) | 🟠 High (3) | 🟡 Medium (4)

### Quick Summary
[Issues summary]

### [Click to expand] Best Practices (5 issues)
[Detailed feedback]

### [Click to expand] Security (4 issues)
[Detailed feedback]
```

## Usage Examples

### Example 1: Quick Code Review
```
Review this Node.js middleware function for security issues and best practices.
```

### Example 2: API Endpoint Audit
```
Perform a full code review on this Express route handler. Check for security, 
performance, and best practices. Output as JSON.
```

### Example 3: MongoDB Query Review
```
Review this MongoDB aggregation pipeline for performance and correctness.
Output as Markdown with explanations.
```

## Configuration Options

When requesting a review, you can specify:

- **Scope**: Specific files, functions, or the entire codebase
- **Focus Area**: Best practices, security, performance, or all
- **Output Format**: markdown, json, inline, github-pr
- **Severity Filter**: Show all issues, or only high/critical
- **Team Standards**: Include team-specific guidelines or conventions
- **Context**: Framework (Express, Next.js, etc.), environment (Node.js 18+, etc.)

## Best Practices for Using This Skill

1. **Provide Context**: Include imports, dependencies, and related code
2. **Specify Environment**: Mention Node.js version, frameworks, and databases
3. **Clarify Intent**: Explain what the code should do
4. **Request Format**: Choose output format based on use case
5. **Follow-up**: Ask for specific solutions or refactoring suggestions

## Common Review Patterns

### Reviewing Database Queries
```
Check this MongoDB query for:
- Efficiency (index usage, query optimization)
- Proper error handling
- Injection vulnerabilities
- Connection pooling usage
```

### Reviewing API Handlers
```
Review this Express middleware/route:
- Input validation and sanitization
- Error handling
- Response structure
- Security headers
- Rate limiting needs
```

### Reviewing Authentication Code
```
Review this auth implementation:
- Token security and storage
- Session management
- CORS configuration
- Credential handling
- OAuth/JWT best practices
```

## Integration with opencode

This skill is designed to work seamlessly with the opencode AI coding agent:

1. **Trigger**: Include code review requests in your prompts to opencode
2. **Format Selection**: Specify desired output format
3. **Iteration**: Request changes based on review feedback
4. **Implementation**: Use opencode to apply suggested fixes

Example opencode usage:
```bash
opencode "Review this auth handler for security issues and output as JSON"
```

## Tips for Effective Code Reviews

1. **Be Specific**: Point to exact lines and explain the issue
2. **Provide Solutions**: Suggest concrete improvements
3. **Consider Context**: Understand why code was written a certain way
4. **Educational Tone**: Help developers learn and improve
5. **Prioritize Issues**: Focus on critical issues first

## Related Files

**🔴 Critical Focus Areas:**
See `references/database-n1-queries.md` for detailed N+1 query detection and batching strategies.  
See `references/solid-dry-architecture.md` for code quality, SOLID principles, and architecture guidelines.

**Scripts:**
See `scripts/detect-quality-issues.js` for automated detection of critical patterns.

---

**Version**: 1.0  
**Last Updated**: 2026-06-15  
**Compatibility**: JavaScript/Node.js (ES6+), Express, Next.js, MongoDB, PostgreSQL
