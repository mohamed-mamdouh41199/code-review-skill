#!/usr/bin/env node

/**
 * Code Review Markdown Formatter
 * Converts code review feedback into readable Markdown format
 * Usage: node format-markdown.js
 */

class CodeReviewMarkdownFormatter {
  constructor(options = {}) {
    this.options = {
      includeDetails: options.includeDetails !== false,
      useSeverityEmoji: options.useSeverityEmoji !== false,
      ...options
    };

    this.sections = {
      best_practices: [],
      security: [],
      performance: []
    };
  }

  addIssue(category, severity, title, description, suggestion, codeExample = null) {
    const emoji = this.getSeverityEmoji(severity);
    const issue = {
      severity,
      emoji,
      title,
      description,
      suggestion,
      codeExample
    };

    if (this.sections[category]) {
      this.sections[category].push(issue);
    }
  }

  getSeverityEmoji(severity) {
    const emojiMap = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return emojiMap[severity] || '⚪';
  }

  formatSection(title, issues) {
    if (issues.length === 0) {
      return `## ${title}\n\n✅ No issues found\n\n`;
    }

    let markdown = `## ${title} (${issues.length} issues)\n\n`;

    // Group by severity
    const bySeverity = {};
    issues.forEach(issue => {
      if (!bySeverity[issue.severity]) {
        bySeverity[issue.severity] = [];
      }
      bySeverity[issue.severity].push(issue);
    });

    const severityOrder = ['critical', 'high', 'medium', 'low'];
    
    for (const severity of severityOrder) {
      if (bySeverity[severity] && bySeverity[severity].length > 0) {
        const severityTitle = severity.charAt(0).toUpperCase() + severity.slice(1);
        markdown += `### ${bySeverity[severity][0].emoji} ${severityTitle}\n\n`;

        bySeverity[severity].forEach((issue, index) => {
          markdown += `${index + 1}. **${issue.title}**\n`;
          markdown += `   - ${issue.description}\n`;
          markdown += `   - 💡 Suggestion: ${issue.suggestion}\n`;
          
          if (issue.codeExample) {
            markdown += `\n\`\`\`javascript\n${issue.codeExample}\n\`\`\`\n`;
          }
          markdown += '\n';
        });
      }
    }

    return markdown;
  }

  toMarkdown() {
    let markdown = '# Code Review Report\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;

    // Summary
    const totalIssues = Object.values(this.sections).reduce((sum, arr) => sum + arr.length, 0);
    const criticalCount = Object.values(this.sections)
      .flatMap(arr => arr)
      .filter(issue => issue.severity === 'critical').length;

    markdown += `## Summary\n\n`;
    markdown += `- **Total Issues**: ${totalIssues}\n`;
    markdown += `- **Critical**: ${criticalCount}\n`;
    markdown += `- **Files Reviewed**: Multiple files\n\n`;

    if (totalIssues === 0) {
      markdown += '✅ **Status**: All clear! No issues found.\n\n';
    } else if (criticalCount > 0) {
      markdown += `⚠️ **Status**: ${criticalCount} critical issue(s) require immediate attention\n\n`;
    } else {
      markdown += '⚠️ **Status**: Review required before merging\n\n';
    }

    // Best Practices
    markdown += this.formatSection('Best Practices & Code Quality', this.sections.best_practices);

    // Security
    markdown += this.formatSection('Security Vulnerabilities', this.sections.security);

    // Performance
    markdown += this.formatSection('Performance Optimizations', this.sections.performance);

    // Recommendations
    markdown += '## Recommendations\n\n';
    markdown += '1. Address all critical issues immediately\n';
    markdown += '2. Fix high-severity issues before merge\n';
    markdown += '3. Consider medium-severity suggestions\n';
    markdown += '4. Track low-priority improvements for future refactoring\n\n';

    return markdown;
  }

  // Example usage
  static example() {
    const formatter = new CodeReviewMarkdownFormatter();

    // Security issues
    formatter.addIssue(
      'security',
      'critical',
      'SQL Injection Vulnerability',
      'User input is concatenated directly into SQL query',
      'Use parameterized queries',
      `// ❌ BAD\nconst query = \`SELECT * FROM users WHERE id = \${userId}\`;\n\n// ✅ GOOD\nconst query = 'SELECT * FROM users WHERE id = ?';\ndb.query(query, [userId]);`
    );

    formatter.addIssue(
      'security',
      'high',
      'Missing CSRF Protection',
      'Form submissions are not protected with CSRF tokens',
      'Add csrf middleware and validate tokens',
      `const csrf = require('csurf');\napp.use(csrf());\napp.post('/submit', csrf(), handleSubmit);`
    );

    // Best practices
    formatter.addIssue(
      'best_practices',
      'high',
      'Missing Error Handling',
      'Promise rejection is not handled',
      'Add .catch() or try-catch block',
      `// ❌ BAD\nfetchData().then(process);\n\n// ✅ GOOD\nfetchData()\n  .then(process)\n  .catch(error => logger.error(error));`
    );

    formatter.addIssue(
      'best_practices',
      'medium',
      'Code Duplication',
      'User validation logic is repeated in multiple endpoints',
      'Extract into a reusable validation middleware'
    );

    // Performance issues
    formatter.addIssue(
      'performance',
      'high',
      'N+1 Query Problem',
      'Loop makes individual database queries instead of batch operation',
      'Use Promise.all() or aggregation pipeline'
    );

    formatter.addIssue(
      'performance',
      'medium',
      'Missing Database Index',
      'Frequently queried field has no index',
      'Add index to improve query performance',
      `db.collection('users').createIndex({ email: 1 });`
    );

    return formatter;
  }
}

// Example output
if (require.main === module) {
  const example = CodeReviewMarkdownFormatter.example();
  console.log(example.toMarkdown());
}

module.exports = CodeReviewMarkdownFormatter;
