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

- [ ] All query inputs coerced to primitives before passing to Mongoose/MongoDB
- [ ] No object/array passed directly from `req.body` into a Mongoose query filter
- [ ] `mongoose.Schema` `strict` mode is ON (default) — never disabled
- [ ] `$where` operator is prohibited — executes arbitrary JavaScript on the server
- [ ] Mongoose schema types enforce field types (not just application-level validation)
- [ ] `express-mongo-sanitize` middleware used to strip `$` and `.` from request inputs
- [ ] Prototype pollution vectors guarded (no `JSON.parse` + direct merge without sanitisation)

```typescript
// ❌ CRITICAL — operator injection
// req.body = { email: { "$gt": "" } } → returns ALL users
const user = await this.userModel.findOne({ email: req.body.email });

// ✅ GOOD — coerce to primitive
const email = String(req.body.email);
const user = await this.userModel.findOne({ email });

// ✅ GOOD — use class-validator DTO + ValidationPipe (NestJS) — rejects non-string at boundary
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// ✅ GOOD — express-mongo-sanitize as global middleware (Express/NestJS)
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize()); // strips '$' and '.' keys from req.body, req.query, req.params

// ❌ CRITICAL — $where executes JavaScript server-side
await this.userModel.find({ $where: `this.email == '${email}'` }); // remote code execution risk
// ✅ GOOD — never use $where; use standard query operators
await this.userModel.find({ email });
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

---

## 🔷 TypeScript / NestJS Security Patterns

> The following section covers security patterns specific to NestJS and TypeScript.

### NestJS-Specific Security Checklist

- [ ] `ValidationPipe` configured globally with `whitelist: true` (prevents mass assignment)
- [ ] `ValidationPipe` configured with `forbidNonWhitelisted: true` (rejects unknown fields)
- [ ] All DTOs use `class-validator` decorators (no raw `body: any`)
- [ ] Auth guards applied to ALL sensitive routes (`@UseGuards(JwtAuthGuard)`)
- [ ] Role guards applied to privileged routes (`@UseGuards(RolesGuard)`)
- [ ] `@Roles()` decorator matches the actual business requirement
- [ ] `ThrottlerGuard` applied to auth endpoints
- [ ] Global exception filter registered (no raw errors leaking to client)
- [ ] `@Exclude()` or `select: false` on sensitive entity columns (passwordHash, etc.)
- [ ] Response DTOs used — entity never returned directly from controller
- [ ] `ConfigModule` with Joi validation — app fails at startup if secrets missing
- [ ] `helmet` middleware applied in `main.ts`
- [ ] CORS configured explicitly (not `origin: '*'`)

### Mass Assignment Prevention

```typescript
// ❌ CRITICAL — user can send { role: 'admin' } and elevate their own privileges
@Post('/users')
async createUser(@Body() body: any) {
  return this.userRepository.save(body); // takes every field from request!
}

// ✅ GOOD — ValidationPipe whitelist + explicit DTO
// In main.ts:
app.useGlobalPipes(new ValidationPipe({
  whitelist:            true, // strips any field not in DTO
  forbidNonWhitelisted: true, // throws 400 if unknown fields sent
  transform:            true,
}));

// DTO explicitly defines what's allowed:
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
  // 'role' is NOT here — can't be set by user
}

// Service sets role server-side:
async create(dto: CreateUserDto): Promise<User> {
  const user = this.userRepository.create({
    ...dto,
    role:         UserRole.USER,       // always server-set
    passwordHash: await bcrypt.hash(dto.password, 12),
  });
  return this.userRepository.save(user);
}
```

### NestJS JWT Security

```typescript
// ✅ GOOD — NestJS JWT strategy with full validation
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,                                     // NEVER ignore expiry
      secretOrKey:      configService.get<string>('JWT_SECRET'),
      algorithms:       ['HS256'],                                  // explicit algorithm
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // Always fetch fresh user — token might be for a deleted/banned user
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }
}

// ❌ BAD — trusting JWT payload without DB check
async validate(payload: JwtPayload) {
  return { id: payload.sub, email: payload.email }; // stale data; user might be deleted
}
```

### NestJS Rate Limiting

```typescript
// ✅ GOOD — rate limiting on auth endpoints
// main.ts
app.useGlobalGuards(new ThrottlerGuard());

// app.module.ts
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      name:  'default',
      ttl:   60000,  // 1 minute
      limit: 100,    // 100 requests per minute globally
    }]),
  ],
})

// Stricter on auth:
@Controller('/auth')
export class AuthController {
  @Post('/login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute on login
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> { ... }
}
```

### Helmet Security Headers (Required in main.ts)

```typescript
// ✅ GOOD — security headers via helmet
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'"],
        imgSrc:     ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge:            31536000, // 1 year
      includeSubDomains: true,
      preload:           true,
    },
  }));

  // CORS — explicit allowlist only
  app.enableCors({
    origin:      process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? [],
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });
}
```

### Sensitive Data in Response DTOs

```typescript
// ❌ CRITICAL — returns entity directly including passwordHash
@Get('/me')
async getMe(@CurrentUser() user: User): Promise<User> {
  return user; // sends passwordHash, refreshToken, etc. to client!
}

// ✅ GOOD — map to safe DTO
export class UserResponseDto {
  @Expose() id:        string;
  @Expose() email:     string;
  @Expose() name:      string;
  @Expose() role:      UserRole;
  @Expose() createdAt: Date;
  // passwordHash, refreshToken — NOT exposed
}

@Get('/me')
async getMe(@CurrentUser() user: User): Promise<UserResponseDto> {
  return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
}
```

### SQL Injection with TypeORM QueryBuilder

```typescript
// ❌ CRITICAL — template literal in QueryBuilder = SQL injection
async searchUsers(searchTerm: string): Promise<User[]> {
  return this.userRepository
    .createQueryBuilder('user')
    .where(`user.name LIKE '%${searchTerm}%'`) // SQL injection!
    .getMany();
}

// ✅ GOOD — parameterized binding
async searchUsers(searchTerm: string): Promise<User[]> {
  return this.userRepository
    .createQueryBuilder('user')
    .where('user.name ILIKE :term', { term: `%${searchTerm}%` }) // safe
    .getMany();
}
```

### Environment Variable Security (NestJS ConfigModule)

```typescript
// ✅ GOOD — validate all secrets at startup, fail fast
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV:          Joi.string().valid('development', 'production', 'test').required(),
        DATABASE_URL:      Joi.string().uri().required(),
        JWT_SECRET:        Joi.string().min(32).required(), // enforce minimum length
        JWT_EXPIRES_IN:    Joi.string().default('1h'),
        BCRYPT_ROUNDS:     Joi.number().min(10).default(12),
        CORS_ALLOWED_ORIGINS: Joi.string().required(),
        STRIPE_SECRET_KEY: Joi.string().pattern(/^sk_(live|test)_/).required(),
      }),
    }),
  ],
})
export class AppModule {}
// If any variable is missing/invalid → startup fails → never reaches production
```

---

## Mongoose-Specific Security Reference

> This section is a first-class checklist because Mongoose is the primary ODM.
> Each item below is a flag the principal engineering board will raise in review.

### SEC-M1: Query Injection via Unsanitised Object Input

```typescript
// ❌ CRITICAL — attacker sends { "password": { "$gt": "" } }
const user = await this.userModel.findOne({
  email: req.body.email,
  password: req.body.password,  // operator injection bypasses password check entirely
});

// ✅ GOOD — DTO boundary enforces primitive types
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
// ValidationPipe at the controller ensures both fields are strings before they reach the service
```

---

### SEC-M2: `strict: false` — Never Acceptable

```typescript
// ❌ CRITICAL — disabling strict allows any key from req.body to be stored in MongoDB
@Schema({ strict: false })
export class User { ... }
// Attacker can inject role, isAdmin, or any field not in your schema

// ✅ GOOD — strict is ON by default; keep it that way
// If you need flexible fields, define them explicitly:
@Prop({ type: Map, of: mongoose.Schema.Types.Mixed })
metadata: Map<string, unknown>;
```

---

### SEC-M3: `select: false` — Defense in Depth for Sensitive Fields

```typescript
// ❌ BAD — password hash always returned unless caller explicitly excludes it
@Prop({ required: true })
password: string;

// ✅ GOOD — excluded by default; must be explicitly opted in with .select('+password')
@Prop({ required: true, select: false })
password: string;

// ✅ GOOD — belt + suspenders in repository: even if schema is misconfigured, never return it
async findByEmail(email: string): Promise<UserDocument | null> {
  return this.userModel
    .findOne({ email })
    .select('-password -__v')   // explicit exclusion regardless of schema default
    .lean()
    .exec();
}

// ✅ GOOD — only select password when you need to verify it (login flow)
async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
  return this.userModel
    .findOne({ email })
    .select('+password')   // explicitly opt in — makes the intent obvious in code review
    .exec();
}
```

---

### SEC-M4: Prototype Pollution via `$`-key Inputs

```typescript
// ❌ BAD — merging unvalidated object into a query or model
const filter = { ...req.query };  // req.query could contain { __proto__: { isAdmin: true } }
await this.userModel.find(filter);

// ✅ GOOD — never spread unvalidated external input into a Mongoose query
// Always transform through a DTO or explicit field extraction:
const { email, role } = req.query as { email?: string; role?: string };
await this.userModel.find({
  ...(email ? { email: String(email) } : {}),
  ...(role   ? { role: String(role) }   : {}),
});

// ✅ GOOD — use express-mongo-sanitize globally to strip prototype keys
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize({ replaceWith: '_' }));
```

---

### SEC-M5: Population of Sensitive Referenced Documents

```typescript
// ❌ CRITICAL — populate without select exposes the entire referenced document
const order = await this.orderModel
  .findById(id)
  .populate('userId')   // returns full User including passwordHash, tokens, etc.
  .exec();

// ✅ GOOD — always restrict what populated documents expose
const order = await this.orderModel
  .findById(id)
  .populate<{ userId: Pick<User, 'email' | 'name'> }>({
    path: 'userId',
    select: 'email name',    // only what the consumer actually needs
  })
  .lean()
  .exec();
```

---

### SEC-M6: Mass Assignment via `new Model(req.body)`

```typescript
// ❌ CRITICAL — attacker can set role, isAdmin, balance, or any schema field
const user = new this.userModel(req.body);
await user.save();

// ✅ GOOD — map explicitly from a validated DTO
async create(dto: CreateUserDto): Promise<UserDocument> {
  const user = new this.userModel({
    email: dto.email,
    name: dto.name,
    // role is NOT accepted from the client — hardcoded to default
    role: UserRole.USER,
  });
  return user.save();
}
```

---

### SEC-M7: CastError Leaks Internal Schema Info

```typescript
// ❌ BAD — Mongoose CastError message reveals schema field names and types
// Error: Cast to ObjectId failed for value "abc" at path "_id"
// This tells an attacker your ID field type and structure

// ✅ GOOD — catch CastErrors and translate to generic 400/404
import { Error as MongooseError } from 'mongoose';

// In a global exception filter:
if (exception instanceof MongooseError.CastError) {
  return res.status(400).json({ message: 'Invalid identifier format' });
}

// ✅ GOOD — validate ObjectId before it reaches Mongoose (preferred — fail fast)
@Injectable()
export class ParseObjectIdPipe implements PipeTransform {
  transform(value: string): string {
    if (!mongoose.isValidObjectId(value)) {
      throw new BadRequestException('Invalid identifier format');
    }
    return value;
  }
}
```

---

### Mongoose Security Pre-Merge Checklist

```
□ No req.body / req.query passed directly into a Mongoose filter without DTO validation
□ express-mongo-sanitize (or equivalent) applied as global middleware
□ No $where operator anywhere in the codebase
□ strict: false not present on any schema
□ Sensitive fields (password, tokens, secrets) have select: false AND are excluded in repos
□ All populate() calls have an explicit select field list
□ new Model(req.body) pattern is absent — always explicit field mapping from DTO
□ CastErrors are caught and translated — no Mongoose internals leaked to clients
□ All ObjectId params validated before reaching the service/repository layer
```

---

**Last Updated**: 2026-06-26  
**Covers**: NestJS · TypeScript · Express · Node.js Security Patterns · Mongoose Security
