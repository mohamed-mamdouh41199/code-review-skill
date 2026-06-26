# Error Handling & Error Factory — Principal Engineering Reference

> Inconsistent error handling is one of the top reasons APIs are hard to consume
> and debug in production. Every codebase must have ONE error pattern and stick to it.
> The worst codebases have three — one per developer.

---

## Part 1: Core Principles

### Principle 1 — Never Throw Raw `Error` in Application Code

```typescript
// ❌ BAD — no HTTP status code, no error code, no structure
throw new Error('User not found');
throw new Error('Invalid input');

// ✅ GOOD — NestJS built-in (automatically mapped to HTTP status)
throw new NotFoundException('User not found');
throw new BadRequestException('Email is required');
throw new UnauthorizedException('Token has expired');
throw new ForbiddenException('Insufficient permissions');
throw new ConflictException('Email already registered');
throw new UnprocessableEntityException('Insufficient credits');
throw new InternalServerErrorException('Payment processing failed');
```

### Principle 2 — Detect and Use the Codebase's Error Pattern

The first thing to check in a PR:
1. Does the codebase have a custom `ErrorFactory`, `AppException`, or `AppError` class?
2. Does it use NestJS built-in exceptions directly?
3. Does it use a custom hierarchy?

Then: **every new `throw` in the PR must use the same pattern.**

### Principle 3 — Never Expose Internal Error Details to Clients

```typescript
// ❌ CRITICAL — leaks DB schema, internal logic, stack trace
catch (error) {
  res.status(500).json({ error: error.message }); // "relation 'users' doesn't exist"
}

// ✅ GOOD — client gets generic message, logs get full context
catch (error) {
  this.logger.error('User lookup failed', {
    userId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack  : undefined,
  });
  throw new InternalServerErrorException('Unable to retrieve user');
}
```

### Principle 4 — Log Context Before Rethrowing

```typescript
// ❌ BAD — error disappears in production logs
try {
  await this.stripe.charge(amount, token);
} catch (error) {
  throw new InternalServerErrorException('Payment failed');
}

// ✅ GOOD — full audit trail
try {
  await this.stripe.charge(amount, token);
} catch (error) {
  this.logger.error('Stripe charge failed', {
    amount,
    orderId,
    userId,
    stripeError: error instanceof Error ? error.message : String(error),
  });
  throw new InternalServerErrorException('Payment processing failed');
}
```

### Principle 5 — Empty Catch Blocks Are Never Acceptable

```typescript
// ❌ CRITICAL — errors swallowed silently, impossible to debug
try {
  await this.cacheService.set(key, value);
} catch {
  // silently ignored
}

// ✅ GOOD — even "best effort" operations should log on failure
try {
  await this.cacheService.set(key, value);
} catch (error) {
  this.logger.warn('Cache write failed (non-critical)', {
    key,
    error: error instanceof Error ? error.message : String(error),
  });
  // Continue — cache miss is handled by the caller
}
```

---

## Part 2: HTTP Status Code Consistency Guide

This is the canonical reference. Reviewers should flag any code that uses
a status code inconsistently with the rest of the codebase.

### Standard HTTP Status Codes for REST APIs

| Situation | Status Code | NestJS Exception | Notes |
|-----------|-------------|-----------------|-------|
| Success (with body) | 200 | (default) | GET, PUT, PATCH |
| Created | 201 | `@HttpCode(201)` | POST that creates |
| No content | 204 | `@HttpCode(204)` | DELETE, PATCH with no body |
| Bad request / validation | 400 | `BadRequestException` | Invalid input format |
| Unauthenticated | 401 | `UnauthorizedException` | No token, expired token |
| Forbidden | 403 | `ForbiddenException` | Valid token, wrong role |
| Not found | 404 | `NotFoundException` | Resource doesn't exist |
| Method not allowed | 405 | (framework) | |
| Conflict | 409 | `ConflictException` | Duplicate, state conflict |
| Gone | 410 | `HttpException(msg, 410)` | Resource permanently deleted |
| Unprocessable entity | 422 | `UnprocessableEntityException` | Business rule violation |
| Too many requests | 429 | `HttpException(msg, 429)` | Rate limit exceeded |
| Internal error | 500 | `InternalServerErrorException` | Catch-all server error |
| Service unavailable | 503 | `HttpException(msg, 503)` | Dependency down |

### Common Status Code Mistakes

```typescript
// ❌ WRONG — 200 for a created resource
@Post('/users')
async createUser(@Body() dto: CreateUserDto) {
  return this.userService.create(dto); // returns 200 by default
}

// ✅ GOOD
@Post('/users')
@HttpCode(HttpStatus.CREATED) // 201
async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
  return this.userService.create(dto);
}

// ❌ WRONG — 500 for a client error (bad request)
throw new InternalServerErrorException('Invalid email format');

// ✅ GOOD
throw new BadRequestException('Invalid email format');

// ❌ WRONG — 401 when user is authenticated but lacks permission
// (401 = "who are you?", 403 = "I know who you are, but no")
@UseGuards(JwtAuthGuard) // user IS authenticated
@Get('/admin/users')
async getAdminUsers() {
  throw new UnauthorizedException('Not allowed'); // ← WRONG, should be 403
}

// ✅ GOOD
throw new ForbiddenException('Admin role required');

// ❌ WRONG — 404 for a business logic error
throw new NotFoundException('Insufficient balance');

// ✅ GOOD
throw new UnprocessableEntityException('Insufficient balance for this order');
```

---

## Part 3: Error Factory Pattern

Use this pattern when the codebase needs structured error codes (for client-side handling):

### 3.1 Custom Exception Hierarchy

```typescript
// src/common/exceptions/app.exception.ts
export class AppException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ errorCode, message, details }, statusCode);
  }
}

// Domain-specific exceptions extending AppException
export class UserNotFoundException extends AppException {
  constructor(userId: string) {
    super(
      'USER_NOT_FOUND',
      `User with ID ${userId} was not found`,
      HttpStatus.NOT_FOUND,
      { userId },
    );
  }
}

export class InsufficientCreditsException extends AppException {
  constructor(required: number, available: number) {
    super(
      'INSUFFICIENT_CREDITS',
      'Not enough credits to complete this order',
      HttpStatus.UNPROCESSABLE_ENTITY,
      { required, available },
    );
  }
}

export class EmailAlreadyExistsException extends AppException {
  constructor(email: string) {
    super(
      'EMAIL_ALREADY_EXISTS',
      'An account with this email address already exists',
      HttpStatus.CONFLICT,
    );
  }
}
```

### 3.2 Error Factory (Alternative to Individual Classes)

```typescript
// src/common/errors/error.factory.ts
export class ErrorFactory {
  static notFound(resource: string, id: string | number): NotFoundException {
    return new NotFoundException(`${resource} with ID ${id} was not found`);
  }

  static conflict(errorCode: string, message: string): ConflictException {
    return new ConflictException({ errorCode, message });
  }

  static forbidden(action: string): ForbiddenException {
    return new ForbiddenException(`You do not have permission to ${action}`);
  }

  static unprocessable(errorCode: string, message: string, details?: unknown): UnprocessableEntityException {
    return new UnprocessableEntityException({ errorCode, message, details });
  }

  static badRequest(field: string, message: string): BadRequestException {
    return new BadRequestException({ field, message });
  }
}

// Usage
throw ErrorFactory.notFound('Order', orderId);
throw ErrorFactory.conflict('EMAIL_EXISTS', 'This email is already registered');
throw ErrorFactory.unprocessable('INSUFFICIENT_STOCK', 'Product is out of stock', { productId });
```

### 3.3 Structured Error Response

```typescript
// ✅ GOOD — consistent error response shape for all errors
{
  "statusCode": 404,
  "errorCode":  "USER_NOT_FOUND",    // machine-readable, for client-side handling
  "message":    "User with ID abc-123 was not found",
  "details":    { "userId": "abc-123" },
  "timestamp":  "2026-06-26T10:30:00.000Z",
  "path":       "/api/users/abc-123"
}

// ❌ BAD — inconsistent shapes across endpoints
{ "error": "not found" }             // endpoint A
{ "message": "User not found", "code": 404 } // endpoint B
{ "status": "error", "msg": "No user" }      // endpoint C
```

### 3.4 Global Exception Filter (Enforces the Shape)

```typescript
// src/common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse<Response>();
    const req  = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode  = 'INTERNAL_ERROR';
    let message: string | object = 'Internal server error';
    let details: unknown;

    if (exception instanceof AppException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse() as Record<string, unknown>;
      errorCode  = body.errorCode as string;
      message    = body.message as string;
      details    = body.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      message    = exception.getResponse();
    }

    // Log all 5xx errors in full detail
    if (statusCode >= 500) {
      this.logger.error('Server error', {
        path:   req.url,
        method: req.method,
        status: statusCode,
        error:  exception instanceof Error ? exception.message : String(exception),
        stack:  exception instanceof Error ? exception.stack  : undefined,
      });
    }

    res.status(statusCode).json({
      statusCode,
      errorCode,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path:      req.url,
    });
  }
}
```

---

## Part 4: Async Error Handling Patterns

### 4.1 Express — Global Error Handler (Required)

```typescript
// ❌ BAD — unhandled async error crashes Node process
app.get('/users', async (req, res) => {
  const users = await User.findAll(); // throws — unhandled!
  res.json(users);
});

// ✅ GOOD — async wrapper catches and forwards
const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/users', asyncHandler(async (req, res) => {
  const users = await userService.getAll();
  res.json(users);
}));

// ✅ ALSO GOOD — centralized error middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = err instanceof AppError ? err.statusCode : 500;
  res.status(status).json({
    error:   err.message,
    path:    req.url,
  });
});
```

### 4.2 NestJS — Always Let Exceptions Bubble Up

```typescript
// ❌ BAD — catching NestJS HTTP exceptions and re-throwing incorrectly
async getUserById(id: string): Promise<User> {
  try {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  } catch (error) {
    // This catches the NotFoundException above and loses it!
    throw new InternalServerErrorException('Failed to get user');
  }
}

// ✅ GOOD — only catch DB errors, let app exceptions bubble
async getUserById(id: string): Promise<User> {
  let user: User | null;

  try {
    user = await this.userRepository.findOne({ where: { id } });
  } catch (error) {
    this.logger.error('DB error fetching user', { id, error });
    throw new InternalServerErrorException('Database error');
  }

  if (!user) throw new NotFoundException(`User ${id} not found`);
  return user;
}
```

### 4.3 Unhandled Promise Rejection — Configure Node.js

```typescript
// In main.ts — always add this
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', { reason });
  // Optionally: process.exit(1) in production
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1); // Crash and let process manager restart
});
```

---

## Part 5: Error Logging Standards

### 5.1 What to Log

```typescript
// ✅ GOOD — log enough to reproduce the issue
this.logger.error('Payment charge failed', {
  // Identity context
  userId:    order.userId,
  orderId:   order.id,

  // Operation context
  amount:    order.total,
  currency:  order.currency,
  provider:  'stripe',

  // Error context
  error:     error instanceof Error ? error.message : String(error),
  stack:     error instanceof Error ? error.stack   : undefined,
  errorCode: error instanceof StripeError ? error.code : undefined,
});
```

### 5.2 What NOT to Log

```typescript
// ❌ NEVER LOG — sensitive data
this.logger.info('User authenticated', {
  password:        dto.password,         // ← CRITICAL: never log passwords
  passwordHash:    user.passwordHash,    // ← CRITICAL: never log hashes
  token:           generatedToken,       // ← HIGH: never log tokens
  creditCardNumber: dto.cardNumber,      // ← CRITICAL: PCI violation
  ssn:             dto.ssn,             // ← CRITICAL: PII
  secret:          this.config.secret,  // ← CRITICAL: never log secrets
});

// ✅ GOOD — log identifiers, not values
this.logger.info('User authenticated', {
  userId: user.id,
  email:  user.email,                  // email is usually OK in logs
  role:   user.role,
});
```

### 5.3 Structured Logging Setup (NestJS + Pino)

```typescript
// main.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  redact: ['req.headers.authorization', 'body.password', 'body.token'], // auto-redact
  serializers: {
    err: pino.stdSerializers.err,
  },
});

// Use PinoLogger from nestjs-pino package for NestJS integration
```

---

## Part 6: Error Consistency Review Checklist

```markdown
### Error Handling Checklist

- [ ] No raw `throw new Error()` in application code
- [ ] Uses codebase's established error pattern (NestJS exceptions / error factory)
- [ ] HTTP status codes match the semantics table
- [ ] 401 vs 403 used correctly (unauthenticated vs unauthorized)
- [ ] No 500 thrown for client errors (validation failures = 400)
- [ ] No internal details exposed in error responses
- [ ] Every try-catch logs context before throwing
- [ ] No empty catch blocks
- [ ] Floating promises have `.catch()` handlers
- [ ] Global exception filter registered in main.ts
- [ ] No passwords/tokens/PII in log statements
- [ ] unhandledRejection configured in main.ts
```

---

**Last Updated**: 2026-06-26  
**Applies to**: TypeScript · NestJS · Express · Node.js
