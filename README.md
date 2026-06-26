# Code Review Skill — Principal Engineering Board

A code review skill that simulates a **board of principal engineers with 20+ years of production experience**. Primary focus on TypeScript, NestJS, Express, Fastify, and the full Node.js ecosystem.

Compatible with **opencode**, **claude-code**, and **GitHub Copilot**.

> **Published on npm**: https://www.npmjs.com/package/pe-board-review  
> **Install globally**: `npm install -g pe-board-review`

---

## ⚡ Quick Start

```bash
# Install globally (works with opencode and GitHub Copilot automatically)
npm install -g pe-board-review

# Use with opencode
opencode "/pe-board-review Review this file as a principal engineering board"

# Use with GitHub Copilot in VS Code
# @workspace /pe-board-review Review this code as a principal engineering board
```

**→ See [INSTALLATION.md](INSTALLATION.md) for full setup guide for opencode, GitHub Copilot, and CI/CD**

---

## What This Skill Does

When invoked, it simulates 5 principal engineers reviewing your code with:

- **Warmth-first reviews** — genuine praise before critique
- **Level-aware feedback** — calibrated for junior / mid / senior patterns
- **TypeScript-first analysis** — type safety, `any` detection, utility types
- **NestJS architecture** — layer responsibility, module design, guards/pipes/interceptors
- **Security scanning** — injection, auth gaps, mass assignment, secrets
- **Performance** — N+1 queries, missing pagination, sequential vs parallel async
- **Error consistency** — error factory adherence, HTTP code correctness
- **Naming & consistency** — conventions enforcement across the entire codebase
- **Constants & enums** — magic value detection, enum patterns
- **Clean code** — SOLID, DRY, YAGNI, Law of Demeter
- **Common mistake patterns** — 30+ documented mistakes across all seniority levels

---

## Primary Stack

| Priority | Technologies |
|----------|-------------|
| 🎯 Primary | TypeScript · Node.js · NestJS · Express · Fastify · Hapi |
| 🔶 Secondary | TypeORM · Prisma · Mongoose · GraphQL · BullMQ |
| 🟡 Tertiary | Python · Ruby — concepts only |

**All code examples are TypeScript/JavaScript only.**

---

## Features

**TypeScript Type Safety**
- `any` type detection
- Unsafe `as` assertions
- Non-null assertion (`!`) overuse
- Missing return types on public methods
- Missing utility types (`Partial<T>`, `Omit<T, K>`, etc.)

**NestJS Architecture**
- Layer responsibility enforcement (Controller / Service / Repository)
- Module boundary rules
- Guards, Pipes, Interceptors, Exception Filters
- DTO validation with class-validator
- TypeORM / Prisma patterns

**Security**
- NoSQL operator injection
- SQL injection via QueryBuilder
- Missing auth guards
- Mass assignment via missing `ValidationPipe`
- Sensitive data in responses or logs
- Rate limiting gaps
- Hardcoded secrets

**Performance**
- N+1 query detection (TypeORM / Prisma / Mongoose)
- Missing pagination on list endpoints
- Sequential async instead of `Promise.all()`
- Missing database transactions
- Missing indexes on queried columns
- Blocking event loop (sync CPU work in request path)

**Error Handling**
- Raw `Error` throws in application code
- Wrong HTTP status codes (401 vs 403, 500 for client errors)
- Empty catch blocks
- Missing log context before rethrow
- Inconsistency with codebase error factory

**Naming & Consistency**
- Mixed verb conventions (`get` vs `fetch` vs `find`)
- Boolean variable prefixes (`is/has/can/should`)
- Magic numbers and strings
- Inconsistent response shapes
- File/folder naming violations

**Common Mistakes by Level**
- 10 junior patterns (console.log, no validation, hardcoded secrets...)
- 10 mid-level patterns (N+1, no transactions, race conditions...)
- 10 senior patterns (no idempotency, no retry, breaking API changes...)

---

## 📦 Installation & Usage

**For detailed setup instructions**, see **[INSTALLATION.md](INSTALLATION.md)**

### Quick Install (All Platforms)

```bash
npm install -g pe-board-review
```

### Use with opencode

```bash
opencode "/pe-board-review Review this PR diff as a principal engineering board"
opencode "/pe-board-review Review src/orders/order.service.ts"
```

### Use with GitHub Copilot (VS Code)

```
@workspace /pe-board-review Review this code as a principal engineering board.
Output as GitHub PR comment.
```

**Full guide with examples, CI/CD integration, and troubleshooting: [INSTALLATION.md](INSTALLATION.md)**

---

## Output Formats

### 1. GitHub PR Comment (Default)

```markdown
## 🔍 Code Review

> Reviewed by: Principal Engineering Board | 2026-06-26

### ✅ What's Done Well
[Specific, genuine praise]

### 🔴 Blockers — Must Fix Before Merge
[Issues with location → problem → production consequence → concrete fix]

### 🟠 High Priority — Fix in This PR
[Important but not merge-blocking]

### 🟡 Suggestions — Follow-up PR OK
[Improvements, refactors]

### 📋 Pre-Merge Checklist
- [ ] No `any` types, explicit return types on public methods
- [ ] No hardcoded secrets, input validation present
- [ ] Error handling follows codebase convention
- [ ] No N+1 queries, pagination on list endpoints
- [ ] Naming follows codebase conventions
- [ ] No magic numbers/strings

### 💬 Closing
[Brief, encouraging]
```

### 2. JSON Report

```json
{
  "review_metadata": {
    "timestamp": "2026-06-26T10:30:00Z",
    "reviewer": "Principal Engineering Board",
    "files_reviewed": 3,
    "total_issues": 8
  },
  "praise": ["..."],
  "blockers": [...],
  "high_priority": [...],
  "suggestions": [...],
  "checklist": { "passed": 6, "failed": 2 }
}
```

### 3. Inline Comments

```typescript
// 🔴 [BLOCKER] NoSQL injection: req.body.email could be { "$gt": "" }
// Fix: const email = String(req.body.email);
const user = await userModel.findOne({ email: req.body.email });
```

---

## Reference Files

| File | What It Covers |
|------|---------------|
| [SKILL.md](SKILL.md) | Core skill instructions — the principal engineer persona |
| [references/typescript-nestjs-patterns.md](references/typescript-nestjs-patterns.md) | TypeScript type safety, NestJS patterns, Guards/Pipes/Interceptors, TypeORM, **Mongoose + NestJS (Part 9)** |
| [references/naming-conventions-consistency.md](references/naming-conventions-consistency.md) | Full naming rules, folder structure, consistency enforcement |
| [references/error-handling-factory.md](references/error-handling-factory.md) | Error factory pattern, custom exceptions, HTTP code guide |
| [references/common-mistakes-by-level.md](references/common-mistakes-by-level.md) | 30+ common mistakes: junior / mid / senior with TypeScript examples |
| [references/database-n1-queries.md](references/database-n1-queries.md) | N+1 detection, TypeORM/Prisma/Mongoose batching strategies |
| [references/security-checklist.md](references/security-checklist.md) | Full security checklist · NestJS patterns · **Mongoose-specific security (SEC-M1 to SEC-M7)** |
| [references/performance-guide.md](references/performance-guide.md) | Performance patterns, caching, queues, Node.js-specific optimizations |
| [references/solid-dry-architecture.md](references/solid-dry-architecture.md) | SOLID, DRY, YAGNI, Law of Demeter — all in TypeScript |

---

## Severity Guide

| Label | Meaning | Required Action |
|-------|---------|----------------|
| 🔴 Blocker | Security hole, data loss, crash, critical arch violation | Must fix before merge |
| 🟠 High | Performance regression, inconsistency, missing validation | Fix in this PR |
| 🟡 Medium | Code quality, maintainability | Fix in follow-up |
| 🟢 Low | Style, informational | Author's discretion |

---

**Version**: 2.0  
**Updated**: 2026-06-26  
**Primary Focus**: TypeScript · Node.js · NestJS · Express · Fastify  
**License**: MIT
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
