#!/usr/bin/env node

/**
 * Code Quality Pattern Detector
 * Detects critical issues for code review:
 * - N+1 queries and queries in loops
 * - console.log statements
 * - SOLID principle violations
 * - DRY violations
 */

const fs = require('fs');
const path = require('path');

class CodeQualityDetector {
  constructor() {
    this.issues = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
  }

  /**
   * Detect N+1 queries and queries in loops
   */
  detectQueryInLoop(code, filePath) {
    const loopPatterns = [
      /for\s*\([^)]*\)\s*{[^}]*await[^}]*\.find\(/gm,
      /for\s*\([^)]*\)\s*{[^}]*await[^}]*\.query\(/gm,
      /\.forEach\s*\([^)]*=>\s*{[^}]*await[^}]*\.find\(/gm,
      /\.forEach\s*\([^)]*=>\s*{[^}]*await[^}]*\.query\(/gm,
      /\.map\s*\([^)]*=>\s*await[^}]*\.find\(/gm,
      /\.map\s*\([^)]*=>\s*await[^}]*\.query\(/gm,
      /while\s*\([^)]*\)\s*{[^}]*await[^}]*\.find\(/gm,
    ];

    loopPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        this.issues.critical.push({
          file: filePath,
          severity: 'critical',
          type: 'Query in Loop (N+1)',
          description: 'Database query found inside a loop. This causes N+1 query problem.',
          suggestion: 'Batch queries using Promise.all() or aggregation pipelines'
        });
      }
    });
  }

  /**
   * Detect console.log statements
   */
  detectConsoleLogs(code, filePath) {
    const consolePatterns = [
      /console\.log\s*\(/gm,
      /console\.debug\s*\(/gm,
      /console\.error\s*\(/gm,    // Error logs should use logger
      /console\.warn\s*\(/gm,     // Warn logs should use logger
      /console\.table\s*\(/gm
    ];

    let lineNum = 1;
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      if (/console\.(log|debug|error|warn|table)\s*\(/.test(line)) {
        this.issues.critical.push({
          file: filePath,
          line: index + 1,
          severity: 'critical',
          type: 'console.log in Production Code',
          description: 'console.log statements should not exist in production code. They pollute logs and impact performance.',
          suggestion: 'Use a proper logging library (Winston, Pino, Bunyan) or remove debug statements',
          code: line.trim()
        });
      }
    });
  }

  /**
   * Detect DRY violations (repeated code patterns)
   */
  detectDRYViolations(code, filePath) {
    // Look for repeated error handling
    const errorHandlingPattern = /try\s*{[^}]*}\s*catch\s*\([^)]*\)\s*{[^}]*logger\.error[^}]*res\.status\(4[0-9]{2}\)/g;
    const matches = code.match(errorHandlingPattern) || [];
    
    if (matches.length > 1) {
      this.issues.high.push({
        file: filePath,
        severity: 'high',
        type: 'Repeated Error Handling',
        description: 'Similar error handling pattern repeated multiple times.',
        suggestion: 'Extract common error handling to middleware or utility function'
      });
    }

    // Look for repeated validation
    const validationPattern = /if\s*\(!req\.body\.\w+\)\s*return\s*res\.status\(400\)/g;
    const validationMatches = code.match(validationPattern) || [];
    
    if (validationMatches.length > 2) {
      this.issues.high.push({
        file: filePath,
        severity: 'high',
        type: 'Repeated Validation Logic',
        description: 'Similar validation pattern repeated in multiple places.',
        suggestion: 'Extract to validation middleware or utility function'
      });
    }
  }

  /**
   * Detect SOLID principle violations
   */
  detectSOLIDViolations(code, filePath) {
    // Check for god class (too many responsibilities)
    const classPattern = /class\s+(\w+)\s*{/g;
    const classMatches = code.match(classPattern) || [];

    classMatches.forEach(match => {
      const methodCount = code.match(/async?\s+\w+\s*\([^)]*\)\s*{/g)?.length || 0;
      
      if (methodCount > 10) {
        this.issues.high.push({
          file: filePath,
          severity: 'high',
          type: 'God Class (SRP Violation)',
          description: `Class has too many responsibilities (${methodCount} methods).`,
          suggestion: 'Split into smaller classes with single responsibilities'
        });
      }
    });

    // Check for hardcoded dependencies
    if (/new\s+\w+Database|new\s+\w+Service|new\s+\w+Repository/g.test(code)) {
      this.issues.high.push({
        file: filePath,
        severity: 'high',
        type: 'Tight Coupling (DIP Violation)',
        description: 'Dependencies are hardcoded instead of injected.',
        suggestion: 'Use dependency injection in constructor'
      });
    }
  }

  /**
   * Detect production readiness issues
   */
  detectProductionIssues(code, filePath) {
    // Check for hardcoded API keys/secrets
    if (/(api[_-]?key|secret|password|token)\s*=\s*['"][^'"]*['"]/i.test(code)) {
      this.issues.critical.push({
        file: filePath,
        severity: 'critical',
        type: 'Hardcoded Secrets',
        description: 'API keys, passwords, or tokens are hardcoded in source.',
        suggestion: 'Move to environment variables (.env file)'
      });
    }

    // Check for no error handling
    if (/async\s+function|async\s*\(|router\.\w+\([^,]*async/ .test(code)) {
      if (!/(try|catch|\.catch\(|error\s*handler)/i.test(code)) {
        this.issues.high.push({
          file: filePath,
          severity: 'high',
          type: 'Missing Error Handling',
          description: 'Async functions without try-catch or error handlers.',
          suggestion: 'Add proper error handling (try-catch or .catch())'
        });
      }
    }

    // Check for unvalidated user input
    if (/req\.body\.\w+|req\.query\.\w+|req\.params\.\w+/g.test(code)) {
      if (!/validate|schema|joi|yup/i.test(code)) {
        this.issues.high.push({
          file: filePath,
          severity: 'high',
          type: 'Missing Input Validation',
          description: 'User input is used without validation.',
          suggestion: 'Add input validation using joi, yup, or express-validator'
        });
      }
    }
  }

  /**
   * Analyze a single file
   */
  analyzeFile(filePath) {
    try {
      const code = fs.readFileSync(filePath, 'utf8');
      
      this.detectQueryInLoop(code, filePath);
      this.detectConsoleLogs(code, filePath);
      this.detectDRYViolations(code, filePath);
      this.detectSOLIDViolations(code, filePath);
      this.detectProductionIssues(code, filePath);
    } catch (err) {
      console.error(`Error analyzing ${filePath}:`, err.message);
    }
  }

  /**
   * Analyze directory recursively
   */
  analyzeDirectory(dir, ext = '.js') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        this.analyzeDirectory(filePath, ext);
      } else if (stat.isFile() && file.endsWith(ext)) {
        this.analyzeFile(filePath);
      }
    });
  }

  /**
   * Generate report
   */
  generateReport() {
    const report = {
      summary: {
        critical: this.issues.critical.length,
        high: this.issues.high.length,
        medium: this.issues.medium.length,
        low: this.issues.low.length,
        total: Object.values(this.issues).flat().length
      },
      issues: this.issues
    };

    return report;
  }

  /**
   * Print formatted report
   */
  printReport() {
    const report = this.generateReport();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║    Code Quality Analysis Report        ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('📊 Summary:');
    console.log(`  🔴 Critical: ${report.summary.critical}`);
    console.log(`  🟠 High:     ${report.summary.high}`);
    console.log(`  🟡 Medium:   ${report.summary.medium}`);
    console.log(`  🟢 Low:      ${report.summary.low}`);
    console.log(`  📈 Total:    ${report.summary.total}\n`);

    if (report.summary.critical > 0) {
      console.log('🔴 CRITICAL ISSUES:');
      report.issues.critical.forEach(issue => {
        console.log(`\n  File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`  Type: ${issue.type}`);
        console.log(`  Issue: ${issue.description}`);
        console.log(`  Fix: ${issue.suggestion}`);
        if (issue.code) console.log(`  Code: ${issue.code}`);
      });
    }

    if (report.summary.high > 0) {
      console.log('\n\n🟠 HIGH PRIORITY ISSUES:');
      report.issues.high.forEach(issue => {
        console.log(`\n  File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`  Type: ${issue.type}`);
        console.log(`  Issue: ${issue.description}`);
        console.log(`  Fix: ${issue.suggestion}`);
      });
    }

    return report;
  }

  /**
   * Export to JSON
   */
  exportJSON(filename = 'code-quality-report.json') {
    const report = this.generateReport();
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n✅ Report exported to ${filename}`);
    return report;
  }
}

// Example usage
if (require.main === module) {
  const detector = new CodeQualityDetector();
  
  // Analyze current directory or provided path
  const targetDir = process.argv[2] || './src';
  
  if (fs.existsSync(targetDir)) {
    console.log(`Analyzing ${targetDir}...`);
    detector.analyzeDirectory(targetDir);
    const report = detector.printReport();
    
    // Exit with error code if critical issues found
    if (report.summary.critical > 0) {
      process.exit(1);
    }
  } else {
    console.error(`Directory not found: ${targetDir}`);
    process.exit(1);
  }
}

module.exports = CodeQualityDetector;
