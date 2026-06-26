# 📦 Installation & Usage Guide — pe-board-review

**Global npm package**: `pe-board-review`  
**Current version**: 1.1.0  
**Published on**: https://www.npmjs.com/package/pe-board-review

---

## ⚡ Quick Start (All Platforms)

```bash
# Install globally
npm install -g pe-board-review

# Verify installation
pe-board-review --version
```

---

## 🔧 Integration Guides

### 1️⃣ OpenCode AI Agent

#### Installation

```bash
# Clone/link the skill into opencode
npm install -g pe-board-review

# The skill auto-registers in opencode after installation
# (opencode detects globally installed skills automatically)
```

#### Usage

```bash
# Review a PR diff
opencode "/pe-board-review Review this PR diff as a principal engineering board"

# Review a specific file
opencode "/pe-board-review Review src/orders/order.service.ts — focus on TypeScript and NestJS patterns"

# Audit for security issues
opencode "/pe-board-review Audit src/auth/ for security vulnerabilities. Output GitHub PR comment format"

# Check for N+1 queries
opencode "/pe-board-review Review src/database/ — flag any N+1 query patterns and suggest fixes"
```

#### How It Works

1. opencode reads the skill's `SKILL.md` frontmatter to register `/pe-board-review` as a command
2. When you use `/pe-board-review`, opencode loads all reference files from `node_modules/pe-board-review/references/`
3. The principal engineering board persona reviews your code
4. Output is formatted as GitHub PR comments by default

---

### 2️⃣ GitHub Copilot (VS Code Agent)

#### Installation

```bash
# Install globally (GitHub Copilot finds it automatically)
npm install -g pe-board-review
```

#### Usage in VS Code

**Method 1: Chat with @workspace agent**

```
@workspace /pe-board-review Review this code as a principal engineering board.
Focus on: TypeScript type safety, NestJS layer responsibilities, error factory 
consistency, naming conventions, and level-appropriate common mistakes.
Output as structured GitHub PR comment.
```

**Method 2: Right-click context menu**

1. Select code in VS Code editor
2. Right-click → **Copilot** → **Review Selected Code**
3. Ask in the chat:
   ```
   Use the pe-board-review skill to review this code. 
   Output as GitHub PR comment format.
   ```

**Method 3: Create a custom instruction**

Add to your VS Code settings (`.vscode/settings.json` or user settings):

```json
{
  "github.copilot.advanced": {
    "instructions": "When reviewing code, apply the pe-board-review principal engineering board standard. Check for TypeScript type safety, NestJS patterns, security, N+1 queries, error consistency, and naming conventions."
  }
}
```

#### How It Works

1. GitHub Copilot detects globally installed skills from npm
2. When you invoke `/pe-board-review`, Copilot loads the SKILL.md instructions
3. Copilot uses the reference files to provide expert-level reviews
4. Integrates with your VS Code workflow seamlessly

---

### 3️⃣ Local Development Setup

#### Option A: Global Installation (Recommended)

```bash
npm install -g pe-board-review

# Verify it's installed
npm list -g pe-board-review

# Find where it's installed
npm list -g pe-board-review --depth=0
```

#### Option B: Project-Local Installation

```bash
cd your-project
npm install --save-dev pe-board-review

# Use it in npm scripts
npm run review

# In package.json:
{
  "scripts": {
    "review": "pe-board-review"
  }
}
```

#### Option C: Manual Symlink (Advanced)

```bash
# Install to specific location
npm install -g pe-board-review

# Create symlink for easy access
ln -s $(npm list -g pe-board-review --depth=0 --parseable)/node_modules/pe-board-review ~/.pe-board-review
```

---

## 📋 What Gets Installed

When you `npm install -g pe-board-review`, you get:

```
pe-board-review/
├── SKILL.md                                 ← Principal engineer instructions
├── README.md                                ← Overview
├── package.json                             ← Metadata
├── references/
│   ├── typescript-nestjs-patterns.md        ← TypeScript + Mongoose patterns
│   ├── security-checklist.md                ← Security issues + Mongoose-specific
│   ├── database-n1-queries.md               ← N+1 detection + fixes
│   ├── error-handling-factory.md            ← Error factory patterns
│   ├── common-mistakes-by-level.md          ← Junior/mid/senior mistakes
│   ├── naming-conventions-consistency.md    ← Naming rules
│   ├── performance-guide.md                 ← Performance patterns
│   └── solid-dry-architecture.md            ← SOLID + DRY principles
├── scripts/
│   ├── format-github-pr.js                  ← PR comment formatter
│   ├── format-json.js                       ← JSON report formatter
│   ├── format-markdown.js                   ← Markdown formatter
│   └── detect-quality-issues.js             ← Quality gate detector
└── LICENSE
```

---

## 🚀 Usage Examples

### Example 1: Review a NestJS Service

```bash
opencode "/pe-board-review Review src/users/users.service.ts for:
- TypeScript type safety
- NestJS layer responsibilities
- Mongoose query patterns
- Error handling consistency
Output GitHub PR comment."
```

**Expected Output:**
```markdown
## 🔍 Code Review — Principal Engineering Board

### ✅ What's Done Well
- Clear separation of concerns between Controller and Service
- Proper use of DTOs for request/response validation
- Mongoose queries use lean() appropriately

### 🔴 Blockers — Must Fix Before Merge
- SEC-M1: Query injection risk — email parameter not coerced to string
  Fix: const email = String(req.body.email)
- TS-4: Missing return type on public method findByEmail()
  Fix: async findByEmail(email: string): Promise<User | null>

### 🟠 High Priority
- N+1 query in findUsersWithOrders() — use populate() instead of loop

### 📋 Pre-Merge Checklist
- [ ] No `any` types
- [ ] All inputs validated
- [ ] Follows error factory pattern
...
```

### Example 2: Security Audit

```bash
opencode "/pe-board-review Audit src/auth/ — flag all security issues 
including injection risks, hardcoded secrets, missing rate limiting. 
Output as detailed report."
```

### Example 3: Performance Check

```bash
opencode "/pe-board-review Review src/orders/ for performance issues:
- N+1 queries
- Missing pagination
- Sequential async calls that should be parallel
Output summary with concrete fixes."
```

---

## 🔧 Troubleshooting

### Issue: Command not found

```bash
# Verify npm global installation worked
npm list -g pe-board-review

# If not installed, try:
npm install -g pe-board-review

# If permission issues:
npm install -g pe-board-review --prefix ~/.npm-global
# Then add to PATH: export PATH=~/.npm-global/bin:$PATH
```

### Issue: opencode doesn't recognize `/pe-board-review`

```bash
# Restart opencode after installation
# Or manually register the skill:
opencode --add-skill pe-board-review

# Verify it's registered:
opencode --list-skills | grep pe-board-review
```

### Issue: GitHub Copilot doesn't show the skill

```bash
# VS Code needs to reload after npm install -g
# Try: Cmd+Shift+P → "Developer: Reload Window"

# Or manually specify in chat:
"Use the pe-board-review principal engineering board standard to review this code"
```

---

## 📖 CLI Commands

### Check Version

```bash
pe-board-review --version
# Output: pe-board-review v1.1.0
```

### View Help

```bash
pe-board-review --help
# Shows all available commands and options
```

### Run Quality Gate (CI/CD)

```bash
# Use the detect-quality-issues script for automated checks
node $(npm list -g pe-board-review --parseable)/scripts/detect-quality-issues.js src/
```

---

## 🔄 Update to Latest Version

```bash
# Check for updates
npm outdated -g pe-board-review

# Update
npm update -g pe-board-review

# Or install latest explicitly
npm install -g pe-board-review@latest
```

---

## 🤝 Integration with Git Hooks & CI/CD

### Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running pe-board-review on staged files..."
node $(npm list -g pe-board-review --parseable)/scripts/detect-quality-issues.js
```

### GitHub Actions

Create `.github/workflows/code-review.yml`:

```yaml
name: Code Review with pe-board-review

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install pe-board-review
        run: npm install -g pe-board-review
      
      - name: Run quality checks
        run: pe-board-review --ci src/
```

---

## 📞 Support & Issues

- **GitHub Issues**: https://github.com/mohamed-mamdouh41199/code-review-skill/issues
- **npm Package**: https://www.npmjs.com/package/pe-board-review
- **Author**: Mohamed Mamdouh

---

## 📄 License

MIT — See LICENSE file in the package

---

**Last Updated**: 2026-06-26  
**Version**: 1.1.0  
**Maintained by**: Mohamed Mamdouh
