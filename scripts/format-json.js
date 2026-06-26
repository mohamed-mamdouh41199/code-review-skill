#!/usr/bin/env node

/**
 * Code Review JSON Formatter
 * Converts code review feedback into structured JSON format
 * Usage: node format-json.js < review-input.txt > review-output.json
 */

const fs = require('fs');
const readline = require('readline');

class CodeReviewJSONFormatter {
  constructor() {
    this.review = {
      review_metadata: {
        timestamp: new Date().toISOString(),
        files_reviewed: 0,
        total_issues: 0
      },
      best_practices: {
        high: [],
        medium: [],
        low: [],
        count: 0
      },
      security: {
        critical: [],
        high: [],
        medium: [],
        count: 0
      },
      performance: {
        high: [],
        medium: [],
        low: [],
        count: 0
      },
      summary: ''
    };
  }

  addIssue(category, severity, title, description, suggestion) {
    const issue = {
      title,
      description,
      suggestion,
      line: null
    };

    if (category === 'best_practices' && this.review.best_practices[severity]) {
      this.review.best_practices[severity].push(issue);
      this.review.best_practices.count++;
    } else if (category === 'security' && this.review.security[severity]) {
      this.review.security[severity].push(issue);
      this.review.security.count++;
    } else if (category === 'performance' && this.review.performance[severity]) {
      this.review.performance[severity].push(issue);
      this.review.performance.count++;
    }

    this.review.review_metadata.total_issues++;
  }

  toJSON() {
    this.review.security.severity_distribution = {
      critical: this.review.security.critical.length,
      high: this.review.security.high.length,
      medium: this.review.security.medium.length
    };

    this.review.best_practices.severity_distribution = {
      high: this.review.best_practices.high.length,
      medium: this.review.best_practices.medium.length,
      low: this.review.best_practices.low.length
    };

    this.review.performance.severity_distribution = {
      high: this.review.performance.high.length,
      medium: this.review.performance.medium.length,
      low: this.review.performance.low.length
    };

    return JSON.stringify(this.review, null, 2);
  }

  // Example usage
  static example() {
    const formatter = new CodeReviewJSONFormatter();
    
    formatter.addIssue(
      'security',
      'critical',
      'SQL Injection Risk',
      'User input is concatenated directly into SQL query without parameterization',
      'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [userId])'
    );

    formatter.addIssue(
      'best_practices',
      'high',
      'Missing Error Handling',
      'Function does not handle promise rejections or exceptions',
      'Add try-catch block or .catch() handler'
    );

    formatter.addIssue(
      'performance',
      'medium',
      'N+1 Query Problem',
      'Loop makes individual database queries instead of batch operation',
      'Use Promise.all() or batch queries'
    );

    return formatter;
  }
}

// Example output
if (require.main === module) {
  const example = CodeReviewJSONFormatter.example();
  console.log(example.toJSON());
}

module.exports = CodeReviewJSONFormatter;
