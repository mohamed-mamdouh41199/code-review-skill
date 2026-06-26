# 📦 Installation & Usage Guide — pe-board-review

**Global npm package**: `pe-board-review`  
**Current version**: 1.1.1  
**Published on**: https://www.npmjs.com/package/pe-board-review

---

## ⚡ Quick Start (All Platforms)

```bash
# Step 1: Install globally
npm install -g pe-board-review

# Step 2: Link to your AI tool (opencode or claude-code)
# Copy the command below and run it:

# For OPENCODE users:
NPM_PATH=$(npm list -g pe-board-review --parseable) && ln -sf "$NPM_PATH" ~/.agents/skills/pe-board-review && echo "✅ pe-board-review linked to opencode"

# For CLAUDE-CODE users:
NPM_PATH=$(npm list -g pe-board-review --parseable) && ln -sf "$NPM_PATH" ~/.claude/skills/pe-board-review && echo "✅ pe-board-review linked to claude-code"

# Step 3: Verify installation
ls -la ~/.agents/skills/pe-board-review/SKILL.md  # for opencode
# OR
ls -la ~/.claude/skills/pe-board-review/SKILL.md  # for claude-code
```

That's it! 🎉 You're ready to use it.

---

## 🔧 Integration Guides

### 1️⃣ OpenCode AI Agent

#### Installation (3 steps)

**Step 1: Install from npm**
```bash
npm install -g pe-board-review
```

**Step 2: Create the opencode skills directory (if it doesn't exist)**
```bash
mkdir -p ~/.agents/skills
```

**Step 3: Link the skill**
```bash
NPM_PATH=$(npm list -g pe-board-review --parseable)
ln -sf "$NPM_PATH" ~/.agents/skills/pe-board-review
```

**Step 4: Verify it worked**
```bash
ls ~/.agents/skills/pe-board-review/SKILL.md
# Should show the file exists
```

**Step 5: Restart opencode and type `/skills`**

You should see `pe-board-review` in the list! ✅

#### Usage

```bash
# In opencode, type:
/pe-board-review Review src/orders/order.service.ts

# Or with specific instructions:
/pe-board-review Review this code for security issues. Output GitHub PR comment.

# Or audit for specific patterns:
/pe-board-review Check for N+1 queries and missing pagination in src/database/
```

---

### 2️⃣ Claude-Code AI Agent

#### Installation (3 steps)

**Step 1: Install from npm**
```bash
npm install -g pe-board-review
```

**Step 2: Create the claude-code skills directory (if it doesn't exist)**
```bash
mkdir -p ~/.claude/skills
```

**Step 3: Link the skill**
```bash
NPM_PATH=$(npm list -g pe-board-review --parseable)
ln -sf "$NPM_PATH" ~/.claude/skills/pe-board-review
```

**Step 4: Verify it worked**
```bash
ls ~/.claude/skills/pe-board-review/SKILL.md
# Should show the file exists
```

**Step 5: Restart claude-code**

#### Usage

```bash
# In claude-code, type:
/pe-board-review Review src/users/users.service.ts

# Or ask directly:
"Use pe-board-review to review this file. Focus on TypeScript and NestJS patterns."
```

---

### 3️⃣ GitHub Copilot (VS Code)

#### Installation (2 steps)

**Step 1: Install from npm**
```bash
npm install -g pe-board-review
```

**Step 2: Restart VS Code**

That's it! GitHub Copilot will automatically detect the globally installed skill.

#### Usage

**In VS Code Chat:**

```
@workspace /pe-board-review Review this code as a principal engineering board.
```

Or with specific focus:

```
@workspace /pe-board-review Review src/orders/order.service.ts
Focus on: TypeScript type safety, NestJS patterns, Mongoose queries, error handling.
Output as GitHub PR comment.
```

**Quick asks:**

```
/pe-board-review Check for security issues

/pe-board-review Review for N+1 queries and performance problems

/pe-board-review Audit error handling consistency
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

### Issue: opencode doesn't show `pe-board-review` in `/skills`

**Solution:** Verify the symlink is correct

```bash
# Check if symlink exists
ls -la ~/.agents/skills/pe-board-review

# Should show:
# pe-board-review -> /opt/homebrew/lib/node_modules/pe-board-review

# If it doesn't exist, create it:
NPM_PATH=$(npm list -g pe-board-review --parseable)
ln -sf "$NPM_PATH" ~/.agents/skills/pe-board-review

# Then restart opencode and type /skills
```

### Issue: claude-code doesn't show `pe-board-review`

**Solution:** Create the symlink for claude-code

```bash
# Check if symlink exists
ls -la ~/.claude/skills/pe-board-review

# If missing, create it:
NPM_PATH=$(npm list -g pe-board-review --parseable)
ln -sf "$NPM_PATH" ~/.claude/skills/pe-board-review

# Then restart claude-code
```

### Issue: `npm install -g pe-board-review` failed

```bash
# Check if npm is installed correctly
npm --version

# Try installing again with sudo (if needed)
sudo npm install -g pe-board-review

# Or use a user-level npm prefix
npm install -g pe-board-review --prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Issue: Symlink points to wrong location

```bash
# Remove the bad symlink
rm ~/.agents/skills/pe-board-review

# Find the correct npm path
npm list -g pe-board-review --parseable

# Create symlink with the correct path
ln -sf /path/from/above ~/.agents/skills/pe-board-review

# Verify it works
ls ~/.agents/skills/pe-board-review/SKILL.md
```

---

## ✅ Quick Verification Checklist

Run these to verify everything is set up correctly:

```bash
# 1. npm package installed?
npm list -g pe-board-review

# 2. Can you find it?
npm list -g pe-board-review --parseable

# 3. Symlink for opencode?
ls ~/.agents/skills/pe-board-review/SKILL.md

# 4. Symlink for claude-code?
ls ~/.claude/skills/pe-board-review/SKILL.md

# 5. Skills directory exists?
ls -la ~/.agents/skills/ | grep pe-board-review
```

If all five return results without errors, you're ✅ **ready to use pe-board-review!**

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
