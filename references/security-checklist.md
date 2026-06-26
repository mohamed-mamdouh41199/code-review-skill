# Security Review Checklist

## Input Validation & Sanitization

- [ ] All user inputs are validated before use
- [ ] Input validation happens on both client and server
- [ ] Special characters and potential payloads are properly escaped
- [ ] File uploads have type and size restrictions
- [ ] Query parameters are validated for expected types

```javascript
// ❌ BAD - No validation
app.post('/user', (req, res) => {
  const email = req.body.email;
  db.query(`INSERT INTO users VALUES ('${email}')`);
});

// ✅ GOOD - Validated & parameterized
app.post('/user', (req, res) => {
  const email = req.body.email;
  if (!isValidEmail(email)) throw new Error('Invalid email');
  db.query('INSERT INTO users VALUES (?)', [email]);
});
```

## SQL Injection Prevention

- [ ] Using parameterized queries/prepared statements
- [ ] No string concatenation in SQL queries
- [ ] ORM used correctly (Sequelize, TypeORM, etc.)
- [ ] Dynamic query building uses safe methods

## NoSQL Injection Prevention

- [ ] MongoDB queries use operators correctly
- [ ] No string interpolation in queries
- [ ] Mongoose schema validation is enforced
- [ ] Query operators are properly sanitized

```javascript
// ❌ BAD - NoSQL Injection risk
db.collection('users').find({ email: userInput });

// ✅ GOOD - Sanitized
const validator = require('validator');
const email = validator.isEmail(userInput) ? userInput : null;
db.collection('users').find({ email: email });
```

## Authentication & Authorization

- [ ] Passwords are hashed (bcrypt, Argon2)
- [ ] Authentication tokens expire
- [ ] JWT tokens are validated and not tampered with
- [ ] Password reset tokens are time-limited
- [ ] Sessions are invalidated on logout
- [ ] API endpoints check user permissions
- [ ] Role-based access control (RBAC) is implemented

## XSS (Cross-Site Scripting) Prevention

- [ ] User input is escaped before rendering
- [ ] Content Security Policy (CSP) headers are set
- [ ] No eval() or innerHTML with user content
- [ ] Template engines auto-escape by default

```javascript
// ❌ BAD
res.send(`<h1>${userInput}</h1>`);

// ✅ GOOD - Using template engine with auto-escape
res.render('page', { title: userInput });
```

## CSRF (Cross-Site Request Forgery) Protection

- [ ] CSRF tokens are generated and validated
- [ ] Same-Site cookie attribute is set
- [ ] Sensitive operations use POST, not GET
- [ ] Cross-origin requests are properly validated

## Data Protection

- [ ] Sensitive data (passwords, tokens, API keys) not logged
- [ ] Database passwords not hardcoded
- [ ] API keys and secrets use environment variables
- [ ] Sensitive data is encrypted at rest
- [ ] Data in transit uses HTTPS/TLS
- [ ] PII (Personally Identifiable Information) handling is compliant

## Dependency Security

- [ ] No known vulnerabilities in dependencies
- [ ] Dependencies are regularly updated
- [ ] npm audit passes (or issues are documented)
- [ ] Only necessary dependencies are included
- [ ] Supply chain security is considered

## Error Handling

- [ ] Error messages don't expose sensitive information
- [ ] Stack traces not returned to client
- [ ] Database errors are caught and logged
- [ ] Errors are logged with enough context

```javascript
// ❌ BAD - Exposing sensitive info
res.status(500).json({ error: error.message });

// ✅ GOOD - Generic error for client
res.status(500).json({ error: 'Internal server error' });
logger.error(error); // Log full error internally
```

## API Security

- [ ] Rate limiting is implemented
- [ ] API endpoints require authentication
- [ ] CORS is properly configured
- [ ] API versioning is used
- [ ] Request size limits are enforced
- [ ] Timeout limits are set

## Security Headers

- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY or SAMEORIGIN
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Strict-Transport-Security (HSTS)
- [ ] Content-Security-Policy (CSP)
- [ ] Referrer-Policy

## File Upload Security

- [ ] File types are validated
- [ ] File size limits are enforced
- [ ] Uploaded files are stored outside web root
- [ ] Uploaded files are scanned for malware
- [ ] Filenames are sanitized
- [ ] MIME types are verified

## Credential Management

- [ ] OAuth2 tokens are properly stored
- [ ] Refresh tokens are rotated
- [ ] Credentials are never logged
- [ ] API keys are rotated regularly
- [ ] Secrets are not in version control

## MongoDB-Specific Security

```javascript
// ❌ BAD - Operator injection
db.collection('users').find({ username: req.body.username });

// ✅ GOOD - Properly handled
const username = String(req.body.username);
db.collection('users').find({ username: username });
```

- [ ] Operators like $where, $function are avoided
- [ ] User input in queries is properly typed
- [ ] Aggregation pipelines validate input
- [ ] Server-side JavaScript execution is disabled

## Logging & Monitoring

- [ ] Security events are logged
- [ ] Failed authentication attempts are logged
- [ ] Logs don't contain sensitive data
- [ ] Logs are retained appropriately
- [ ] Monitoring for suspicious activity is in place

---

**Severity Levels**:
- 🔴 **Critical**: Can lead to data breach or unauthorized access
- 🟠 **High**: Significant security risk
- 🟡 **Medium**: Should be addressed
- 🟢 **Low**: Best practice recommendation
