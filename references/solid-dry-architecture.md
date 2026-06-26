# Code Quality & Architecture Guide

## 🔴 CRITICAL Issues

### 1. Unnecessary console.log() in Production Code

**🚨 CRITICAL** - Production code must not have debug logs. They pollute log files and impact performance.

#### Detection Patterns

**❌ BAD - console.log in production code**
```javascript
app.get('/users', (req, res) => {
  const users = User.find();
  console.log('Users:', users);  // ❌ CRITICAL - Remove this!
  console.log('Request from:', req.ip);  // ❌ CRITICAL
  res.json(users);
});
```

**❌ BAD - Multiple console statements**
```javascript
function processPayment(amount) {
  console.log('Processing:', amount);
  console.log('Time:', new Date());
  const result = process(amount);
  console.log('Result:', result);
  console.log('Done!');
  return result;
}
```

**✅ GOOD - Use proper logging library**
```javascript
const logger = require('pino')();

app.get('/users', (req, res) => {
  const users = User.find();
  logger.debug({ users }, 'Retrieved users');  // ✅ Proper structured logging
  res.json(users);
});
```

**✅ GOOD - Use environment-based logging**
```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');  // Only in dev
}

// Or better:
const logger = getLogger();
logger.debug('Debug info');  // Controlled by log level
```

#### What's Wrong with console.log?

1. **Unstructured** - Can't parse or filter
2. **No timestamps** - When did it happen?
3. **No log levels** - Is it error, warning, or info?
4. **Pollutes logs** - Makes real logs hard to find
5. **Performance** - I/O blocking
6. **Security** - Might leak sensitive data

#### Proper Logging Setup

```javascript
// ✅ Good - Using Winston
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Use it:
logger.info('User created', { userId: '123' });
logger.error('Payment failed', { error: err.message });

// ✅ Good - Using Pino
const pino = require('pino');
const logger = pino(pino.transport({
  target: 'pino-pretty',
  options: { colorize: true }
}));

logger.info({ user: userId }, 'User logged in');
```

#### Audit Rules

- [ ] No `console.log()` in production code
- [ ] No `console.error()` for logging (use logger)
- [ ] No `console.debug()` left behind
- [ ] No `console.table()` in final code
- [ ] Use structured logging (Winston, Pino, Bunyan)
- [ ] Log levels: ERROR, WARN, INFO, DEBUG, TRACE
- [ ] PII should never be logged (passwords, tokens, emails)

---

## 🟠 SOLID Principles

### Single Responsibility Principle (SRP)

**Definition**: A class/function should have one reason to change.

**❌ BAD - Violates SRP**
```javascript
class UserService {
  // User management
  async createUser(data) { ... }
  
  // Email sending (shouldn't be here)
  async sendWelcomeEmail(email) { ... }
  
  // Payment processing (shouldn't be here)
  async processPayment(amount) { ... }
  
  // Database operations (should be in a repository)
  async saveToDb(user) { ... }
}
```

**✅ GOOD - Each class has one responsibility**
```javascript
class UserService {
  constructor(userRepository, emailService) {
    this.repo = userRepository;
    this.email = emailService;
  }
  
  async createUser(data) {
    const user = await this.repo.save(data);
    await this.email.sendWelcome(user);
    return user;
  }
}

class UserRepository {
  async save(user) { ... }
  async findById(id) { ... }
}

class EmailService {
  async sendWelcome(user) { ... }
}
```

### Open/Closed Principle (OCP)

**Definition**: Open for extension, closed for modification.

**❌ BAD - Must modify class for new payment types**
```javascript
class PaymentProcessor {
  process(amount, type) {
    if (type === 'credit-card') {
      return this.processCreditCard(amount);
    } else if (type === 'paypal') {
      return this.processPayPal(amount);
    } else if (type === 'stripe') {
      return this.processStripe(amount);  // Must modify this class!
    }
  }
}
```

**✅ GOOD - Extend without modifying**
```javascript
class PaymentProcessor {
  process(amount, strategy) {
    return strategy.pay(amount);  // Delegates to strategy
  }
}

interface PaymentStrategy {
  pay(amount): Promise<Result>;
}

class CreditCardPayment implements PaymentStrategy {
  pay(amount) { ... }
}

class PayPalPayment implements PaymentStrategy {
  pay(amount) { ... }
}

class StripePayment implements PaymentStrategy {
  pay(amount) { ... }  // New payment method - no need to modify PaymentProcessor
}
```

### Liskov Substitution Principle (LSP)

**Definition**: Subclasses must be substitutable for their base class.

**❌ BAD - Rectangle can't be substituted for Square**
```javascript
class Rectangle {
  setWidth(w) { this.width = w; }
  setHeight(h) { this.height = h; }
  area() { return this.width * this.height; }
}

class Square extends Rectangle {
  setWidth(w) {
    this.width = w;
    this.height = w;  // Both must be same!
  }
}

// This breaks if Square is used instead of Rectangle:
const shape = new Square();
shape.setWidth(5);
shape.setHeight(10);
// Expected: 50, Actual: 100 (both sides are 10)
```

**✅ GOOD - Proper inheritance**
```javascript
class Shape {
  area(): number;
}

class Rectangle implements Shape {
  constructor(w, h) { this.width = w; this.height = h; }
  area() { return this.width * this.height; }
}

class Square implements Shape {
  constructor(side) { this.side = side; }
  area() { return this.side * this.side; }
}

// Both are substitutable for Shape
```

### Interface Segregation Principle (ISP)

**Definition**: Clients shouldn't depend on interfaces they don't use.

**❌ BAD - Fat interface**
```javascript
interface Animal {
  eat(): void;
  sleep(): void;
  fly(): void;      // Not all animals fly!
  swim(): void;     // Not all animals swim!
}

class Dog implements Animal {
  fly() { throw new Error('Dogs cannot fly'); }  // Forced to implement unused method
  swim() { ... }
}
```

**✅ GOOD - Segregated interfaces**
```javascript
interface Eater {
  eat(): void;
}

interface Sleeper {
  sleep(): void;
}

interface Flyer {
  fly(): void;
}

interface Swimmer {
  swim(): void;
}

class Dog implements Eater, Sleeper, Swimmer {
  // Only implements what it needs
}

class Bird implements Eater, Sleeper, Flyer {
  // Only implements what it needs
}
```

### Dependency Inversion Principle (DIP)

**Definition**: Depend on abstractions, not concrete implementations.

**❌ BAD - High-level depends on low-level**
```javascript
class UserService {
  constructor() {
    this.db = new MongoDatabase();  // Tightly coupled!
  }
  
  async getUser(id) {
    return this.db.findById(id);
  }
}

// Can't test without MongoDB!
// Can't switch to PostgreSQL without modifying UserService!
```

**✅ GOOD - Depend on abstraction**
```javascript
class UserService {
  constructor(database) {  // Inject dependency
    this.db = database;
  }
  
  async getUser(id) {
    return this.db.findById(id);
  }
}

// Can test with mock:
const mockDb = { findById: jest.fn() };
const service = new UserService(mockDb);

// Can use any database:
const service1 = new UserService(new MongoDatabase());
const service2 = new UserService(new PostgresDatabase());
```

---

## 🟡 DRY - Don't Repeat Yourself

### Code Duplication Detection

**❌ BAD - Repeated validation logic**
```javascript
router.post('/users', (req, res) => {
  // Validation scattered everywhere
  if (!req.body.email) return res.status(400).send('Email required');
  if (!req.body.email.includes('@')) return res.status(400).send('Invalid email');
  if (!req.body.password) return res.status(400).send('Password required');
  if (req.body.password.length < 8) return res.status(400).send('Password too short');
  // ... more code ...
});

router.post('/admins', (req, res) => {
  // Same validation repeated!
  if (!req.body.email) return res.status(400).send('Email required');
  if (!req.body.email.includes('@')) return res.status(400).send('Invalid email');
  if (!req.body.password) return res.status(400).send('Password required');
  if (req.body.password.length < 8) return res.status(400).send('Password too short');
  // ...
});
```

**✅ GOOD - Extract to reusable function**
```javascript
function validateUserInput(data) {
  if (!data.email) throw new Error('Email required');
  if (!data.email.includes('@')) throw new Error('Invalid email');
  if (!data.password) throw new Error('Password required');
  if (data.password.length < 8) throw new Error('Password too short');
}

router.post('/users', async (req, res) => {
  try {
    validateUserInput(req.body);
    await User.create(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

router.post('/admins', async (req, res) => {
  try {
    validateUserInput(req.body);  // Reuse!
    await Admin.create(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(400).send(err.message);
  }
});
```

### Detecting DRY Violations

```javascript
// ❌ Pattern repeating: Similar query logic
const users = await User.find().select('id name');
const posts = await Post.find().select('id title');
const comments = await Comment.find().select('id text');

// ✅ Extract to helper
async function findByIds(model, fields) {
  return model.find().select(fields);
}

const users = await findByIds(User, 'id name');
const posts = await findByIds(Post, 'id title');
```

```javascript
// ❌ Repeated error handling
try {
  const user = await User.findById(id);
} catch (err) {
  logger.error('User not found', { id, error: err });
  res.status(404).send('Not found');
}

try {
  const post = await Post.findById(id);
} catch (err) {
  logger.error('Post not found', { id, error: err });
  res.status(404).send('Not found');
}

// ✅ Extract to middleware
async function handleNotFound(model, id) {
  try {
    return await model.findById(id);
  } catch (err) {
    logger.error(`${model.name} not found`, { id, error: err });
    throw new NotFoundError(`${model.name} not found`);
  }
}
```

### Common DRY Violations

| Violation | Solution |
|-----------|----------|
| Same validation logic repeated | Extract to validation middleware |
| Same query pattern repeated | Create query builder/helper |
| Same error handling repeated | Extract to error handler middleware |
| Similar function signatures | Use generics or factory functions |
| Duplicate constants | Move to config/constants file |
| Similar API responses | Create response formatter |
| Duplicate test setup | Extract to test fixtures/factories |

---

## 📁 Folder Structure & Architecture

### Recommended Project Structure

```
project/
├── src/
│   ├── controllers/       # Handle HTTP requests
│   │   ├── userController.js
│   │   └── postController.js
│   │
│   ├── services/         # Business logic
│   │   ├── userService.js
│   │   └── postService.js
│   │
│   ├── repositories/     # Database access
│   │   ├── userRepository.js
│   │   └── postRepository.js
│   │
│   ├── middleware/       # Express middleware
│   │   ├── authMiddleware.js
│   │   └── errorHandler.js
│   │
│   ├── models/           # Data models/schemas
│   │   ├── user.js
│   │   └── post.js
│   │
│   ├── utils/            # Helper functions
│   │   ├── logger.js
│   │   └── validators.js
│   │
│   ├── config/           # Configuration files
│   │   ├── database.js
│   │   └── constants.js
│   │
│   └── app.js           # App initialization
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── .env                 # Environment variables
├── .env.example
└── package.json
```

### What Goes Where

**Controllers** - Only handle HTTP:
```javascript
// ✅ GOOD
class UserController {
  async getUser(req, res) {
    const user = await this.userService.findById(req.params.id);
    res.json(user);
  }
}
```

**Services** - Business logic:
```javascript
// ✅ GOOD
class UserService {
  constructor(repository) {
    this.repo = repository;
  }
  
  async findById(id) {
    return this.repo.findById(id);
  }
}
```

**Repositories** - Database access only:
```javascript
// ✅ GOOD
class UserRepository {
  async findById(id) {
    return User.findById(id);
  }
}
```

### Anti-Patterns (What NOT to do)

**❌ BAD - Business logic in controller**
```javascript
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).send('Not found');
  
  // Business logic in controller!
  const profile = await Profile.findOne({ userId: user.id });
  const posts = await Post.find({ userId: user.id });
  user.profile = profile;
  user.posts = posts;
  
  res.json(user);
});
```

**✅ GOOD - Business logic in service**
```javascript
// Controller - Clean, focused
router.get('/users/:id', async (req, res) => {
  const user = await userService.getUserWithDetails(req.params.id);
  res.json(user);
});

// Service - Contains business logic
class UserService {
  async getUserWithDetails(id) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError();
    
    const profile = await this.profileRepository.findByUserId(id);
    const posts = await this.postRepository.findByUserId(id);
    
    return { ...user, profile, posts };
  }
}
```

---

## ✅ Code Review Checklist

### Architecture
- [ ] Single Responsibility Principle followed
- [ ] Open/Closed Principle applied
- [ ] Dependencies injected (not hardcoded)
- [ ] Proper folder structure maintained
- [ ] Controllers are thin (HTTP only)
- [ ] Services contain business logic
- [ ] Repositories handle data access

### Code Quality
- [ ] No code duplication (DRY)
- [ ] No unnecessary console.log()
- [ ] Proper error handling
- [ ] Meaningful variable/function names
- [ ] Comments explain "why", not "what"
- [ ] Functions are small and focused
- [ ] No deeply nested conditions

### Database
- [ ] No N+1 queries
- [ ] No queries in loops
- [ ] Large result sets are paginated
- [ ] Indexes on foreign keys
- [ ] Connection pooling configured
- [ ] Query timeouts set

### Production Ready
- [ ] No debug code left behind
- [ ] Proper logging (not console.log)
- [ ] Environment variables used
- [ ] Error handling comprehensive
- [ ] Input validation present
- [ ] Rate limiting configured
- [ ] Tests exist and pass

---

## 🔷 TypeScript SOLID — Full Implementation Examples

> The following section provides TypeScript implementations of all SOLID principles
> and DRY patterns in the NestJS context.

### SRP — TypeScript / NestJS Example

```typescript
// ❌ BAD — UserService does everything
@Injectable()
export class UserService {
  async createUser(dto: CreateUserDto) { ... }
  async sendWelcomeEmail(email: string) { ... }  // email concern
  async processPayment(amount: number) { ... }   // payment concern
  async saveToDatabase(user: User) { ... }        // data layer concern
  async generateInvoicePdf(order: Order) { ... } // PDF concern
  async logAuditEvent(event: string) { ... }      // audit concern
}

// ✅ GOOD — each class has exactly one reason to change
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const user = await this.userRepository.create(dto);
    await this.emailService.sendWelcome(user);
    this.eventEmitter.emit('user.created', { userId: user.id });
    return user;
  }
}

@Injectable()
export class UserRepository {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}
  async create(dto: CreateUserDto): Promise<User> { ... }
  async findById(id: string): Promise<User | null> { ... }
}

@Injectable()
export class EmailService {
  async sendWelcome(user: User): Promise<void> { ... }
  async sendPasswordReset(user: User, token: string): Promise<void> { ... }
}
```

### OCP — TypeScript Interface + Strategy Pattern

```typescript
// ❌ BAD — must modify this class for every new payment type
@Injectable()
export class PaymentService {
  process(amount: number, method: string): Promise<PaymentResult> {
    if (method === 'stripe') { ... }
    else if (method === 'paypal') { ... }
    else if (method === 'apple-pay') { ... } // must add new branch
    throw new Error('Unknown payment method');
  }
}

// ✅ GOOD — open for extension, closed for modification
interface PaymentStrategy {
  readonly name: string;
  charge(amount: number, currency: string): Promise<PaymentResult>;
}

@Injectable()
export class StripePaymentStrategy implements PaymentStrategy {
  readonly name = 'stripe';
  async charge(amount: number, currency: string): Promise<PaymentResult> { ... }
}

@Injectable()
export class PayPalPaymentStrategy implements PaymentStrategy {
  readonly name = 'paypal';
  async charge(amount: number, currency: string): Promise<PaymentResult> { ... }
}

// New provider: just add a new class, zero changes to existing code
@Injectable()
export class ApplePayStrategy implements PaymentStrategy {
  readonly name = 'apple-pay';
  async charge(amount: number, currency: string): Promise<PaymentResult> { ... }
}

@Injectable()
export class PaymentService {
  constructor(
    @InjectStrategies() private readonly strategies: PaymentStrategy[],
  ) {}

  async process(amount: number, currency: string, method: PaymentMethod): Promise<PaymentResult> {
    const strategy = this.strategies.find(s => s.name === method);
    if (!strategy) throw new BadRequestException(`Unknown payment method: ${method}`);
    return strategy.charge(amount, currency);
  }
}
```

### DIP — TypeScript Dependency Inversion with NestJS

```typescript
// ❌ BAD — high-level module depends on concrete low-level module
@Injectable()
export class OrderService {
  private readonly db = new TypeORMOrderRepository(); // hardcoded!

  async getOrder(id: string): Promise<Order> {
    return this.db.findById(id); // can't swap or mock
  }
}

// ✅ GOOD — depend on abstraction (interface), inject concrete via DI
// Define the contract:
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string): Promise<Order[]>;
  save(order: Partial<Order>): Promise<Order>;
}

// Implement the contract:
@Injectable()
export class TypeORMOrderRepository implements IOrderRepository {
  constructor(@InjectRepository(Order) private repo: Repository<Order>) {}
  async findById(id: string): Promise<Order | null> { ... }
  async findByUserId(userId: string): Promise<Order[]> { ... }
  async save(order: Partial<Order>): Promise<Order> { ... }
}

// Use via token injection:
@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository, // depends on interface
  ) {}

  async getOrder(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }
}

// Wire up in module:
@Module({
  providers: [
    OrderService,
    { provide: ORDER_REPOSITORY, useClass: TypeORMOrderRepository },
    // Swap entire implementation without changing OrderService:
    // { provide: ORDER_REPOSITORY, useClass: MongoOrderRepository },
  ],
})
export class OrderModule {}
```

### ISP — TypeScript Interface Segregation

```typescript
// ❌ BAD — one big interface forces implementers to implement unused methods
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  generateReport(): Promise<Report>;     // unrelated to data access
  sendNotification(userId: string): void; // unrelated to data access
}

// AuditService needs only read access but is forced to implement write methods:
class AuditUserRepository implements UserRepository {
  generateReport(): Promise<Report> { throw new Error('Not supported'); }
  sendNotification(): void { throw new Error('Not supported'); }
  save(): never { throw new Error('Read-only!'); } // LSP violation
}

// ✅ GOOD — segregated interfaces
interface UserReader {
  findById(id: string): Promise<User | null>;
  findAll(options?: FindManyOptions<User>): Promise<User[]>;
}

interface UserWriter {
  save(user: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

interface UserReporter {
  generateActivityReport(userId: string): Promise<UserReport>;
}

// Read-only service gets only what it needs:
class AuditService {
  constructor(private readonly reader: UserReader) {} // only read access
}

// Admin service gets full access:
class AdminUserService {
  constructor(
    private readonly reader: UserReader,
    private readonly writer: UserWriter,
  ) {}
}
```

### DRY — TypeScript Generics to Eliminate Repetition

```typescript
// ❌ BAD — same CRUD pattern copy-pasted for every resource
class UserService {
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
  async findAll(page: number, limit: number): Promise<[User[], number]> {
    return this.userRepository.findAndCount({ skip: (page-1)*limit, take: limit });
  }
  async save(dto: CreateUserDto): Promise<User> {
    return this.userRepository.save(dto);
  }
}

class OrderService {
  async findById(id: string): Promise<Order | null> { // duplicated!
    return this.orderRepository.findOne({ where: { id } });
  }
  // ... same pattern repeated
}

// ✅ GOOD — generic base service for standard CRUD
abstract class BaseCrudService<T extends { id: string }, CreateDto, UpdateDto> {
  constructor(protected readonly repository: Repository<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as unknown as FindOptionsWhere<T> });
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResult<T>> {
    const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
    const [data, total] = await this.repository.findAndCount({
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });
    return { data, total, page, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }

  async save(dto: CreateDto): Promise<T> {
    return this.repository.save(dto as unknown as DeepPartial<T>);
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}

// Now each service only adds domain-specific methods:
@Injectable()
export class UserService extends BaseCrudService<User, CreateUserDto, UpdateUserDto> {
  constructor(@InjectRepository(User) repo: Repository<User>) {
    super(repo);
  }

  // Only domain-specific method — not repeated from base
  async getUserByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }
}
```

### Clean Code — Other Principles Beyond SOLID/DRY

**YAGNI (You Aren't Gonna Need It)**
```typescript
// ❌ BAD — abstract factory for a thing that only has one implementation
abstract class AbstractUserFactory {
  abstract createStrategy(): UserCreationStrategy;
}

class StandardUserFactory extends AbstractUserFactory {
  createStrategy(): UserCreationStrategy {
    return new StandardUserCreationStrategy();
  }
}

// YAGNI: there's only one strategy. Just use the strategy directly.

// ✅ GOOD — solve the actual problem, not the imagined one
@Injectable()
export class UserService {
  async create(dto: CreateUserDto): Promise<User> {
    // Direct implementation — add abstraction when you have 2+ implementations
  }
}
```

**Law of Demeter (Don't Chain More Than 2 Levels)**
```typescript
// ❌ BAD — violates Law of Demeter
const country = user.profile.address.country.code; // 4-level chain!
const tax     = order.user.profile.taxSettings.vatRate;

// ✅ GOOD — expose what callers need at the right level
class User {
  getCountryCode(): string { return this.profile.address.country.code; }
}

// Or use dedicated query for specific needs:
const countryCode = await this.userRepository.getCountryCode(userId);
```

**Small Functions — Single Level of Abstraction**
```typescript
// ❌ BAD — function mixes levels of abstraction
async processOrder(dto: CreateOrderDto): Promise<Order> {
  // High-level
  const user = await this.userService.findById(dto.userId);
  if (!user) throw new NotFoundException();

  // Low-level detail inside high-level function
  const hash = crypto.createHash('sha256')
    .update(`${dto.userId}:${dto.timestamp}`)
    .digest('hex');
  dto.idempotencyKey = hash;

  // Back to high-level
  return this.orderRepository.save(dto);
}

// ✅ GOOD — one level per function
async processOrder(dto: CreateOrderDto): Promise<Order> {
  const user = await this.getUserOrFail(dto.userId);
  const enriched = this.enrichWithIdempotencyKey(dto);
  return this.orderRepository.save(enriched);
}

private async getUserOrFail(userId: string): Promise<User> {
  const user = await this.userService.findById(userId);
  if (!user) throw new NotFoundException(`User ${userId} not found`);
  return user;
}

private enrichWithIdempotencyKey(dto: CreateOrderDto): CreateOrderDto {
  const key = crypto.createHash('sha256')
    .update(`${dto.userId}:${dto.timestamp}`)
    .digest('hex');
  return { ...dto, idempotencyKey: key };
}
```

---

**Last Updated**: 2026-06-26  
**Covers**: SOLID · DRY · YAGNI · Law of Demeter · TypeScript · NestJS

