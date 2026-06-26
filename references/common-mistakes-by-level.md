# Common Mistakes by Developer Level — Principal Engineering Reference

> After reviewing thousands of PRs, principal engineers develop a mental model of
> what each career level gets wrong. These aren't edge cases — they are the
> **recurring patterns** that appear again and again. Recognizing them instantly
> is what separates a principal's review from a linter.
>
> All examples use TypeScript / Node.js / NestJS.

---

## Junior Developer Mistakes (0–2 years)

Junior mistakes share a common theme: **they work in the happy path but break on any edge case**.

---

### J-1: `console.log` Left in Production Code

The #1 junior signal. Always present. Always must be removed.

```typescript
// ❌ BAD — in production service
async createOrder(dto: CreateOrderDto): Promise<Order> {
  console.log('Creating order:', dto);    // includes passwords if dto has them!
  console.log('User:', dto.userId);
  const order = await this.orderRepository.save(dto);
  console.log('Order created:', order);
  return order;
}

// ✅ GOOD — structured logger with appropriate level
async createOrder(dto: CreateOrderDto): Promise<Order> {
  this.logger.debug('Creating order', { userId: dto.userId });
  const order = await this.orderRepository.save(dto);
  this.logger.log('Order created', { orderId: order.id });
  return order;
}
```

---

### J-2: No Input Validation

Juniors write for the happy path and forget that users send garbage.

```typescript
// ❌ BAD — raw request body used without any validation
@Post('/orders')
async createOrder(@Body() body: any) {
  const order = await this.orderService.create({
    userId:   body.userId,        // could be undefined, null, SQL injection string
    amount:   body.amount,        // could be negative, NaN, Infinity
    items:    body.items,         // could be empty array, undefined, not an array
  });
  return order;
}

// ✅ GOOD — DTO + ValidationPipe
export class CreateOrderDto {
  @IsUUID('4')
  userId: string;

  @IsNumber()
  @IsPositive()
  @Max(100000) // cap the amount
  amount: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

---

### J-3: Hardcoded Credentials, URLs, and Magic Numbers

```typescript
// ❌ BAD — all of these will get committed to git
const DB_HOST   = 'mongodb://admin:secret123@prod.db.example.com:27017';
const API_KEY   = 'sk-live-abc123def456xyz789';
const PAGE_SIZE = 20;  // magic number, scattered across 10 files
const BASE_URL  = 'https://api.example.com/v1'; // breaks in dev environment

// ✅ GOOD — environment + constants
const DB_HOST = process.env.DATABASE_URL!;
const API_KEY = process.env.STRIPE_API_KEY!;

// src/common/constants/pagination.constants.ts
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE     = 100;
```

---

### J-4: Missing `await` on Async Operations

One of the most dangerous silent bugs. Code "works" but race conditions emerge.

```typescript
// ❌ BAD — user is deleted before function returns, but caller doesn't know
async deleteUser(id: string): Promise<void> {
  this.userRepository.delete(id); // missing await! Returns void immediately
  this.auditService.log('user_deleted', id); // this might run after or never
}

// ❌ BAD — response sent before async operation completes
app.post('/users', (req, res) => {
  userService.create(req.body).then(user => { // not awaited properly
    res.json(user);
  });
  // execution continues here immediately
});

// ✅ GOOD
async deleteUser(id: string): Promise<void> {
  await this.userRepository.delete(id);
  await this.auditService.log('user_deleted', id);
}
```

---

### J-5: Copy-Paste Code (DRY Violation)

Juniors copy-paste because they don't yet see abstractions.

```typescript
// ❌ BAD — same pagination logic in every service
// user.service.ts
const skip  = (page - 1) * 20;
const users = await this.userRepository.find({ skip, take: 20 });

// order.service.ts
const skip   = (page - 1) * 20;
const orders = await this.orderRepository.find({ skip, take: 20 });

// product.service.ts — same thing again...

// ✅ GOOD — extract once, use everywhere
// src/common/helpers/pagination.helper.ts
export function getPaginationOptions(page: number, limit: number = DEFAULT_PAGE_SIZE) {
  return {
    skip: (page - 1) * Math.min(limit, MAX_PAGE_SIZE),
    take: Math.min(limit, MAX_PAGE_SIZE),
  };
}
```

---

### J-6: No Error Handling on Async Operations

```typescript
// ❌ BAD — if userRepository throws, the entire Node process crashes
app.get('/users/:id', async (req, res) => {
  const user = await userRepository.findById(req.params.id);
  res.json(user);
});

// ✅ GOOD — wrapped and handled
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    next(error); // passes to error middleware
  }
});
```

---

### J-7: Returning Passwords and Sensitive Fields

```typescript
// ❌ CRITICAL — passwordHash sent to client
@Get('/:id')
async getUser(@Param('id') id: string): Promise<User> {
  return this.userRepository.findOne({ where: { id } });
  // Returns: { id, email, name, passwordHash, refreshToken, ... }
}

// ✅ GOOD — explicit response DTO
@Get('/:id')
async getUser(@Param('id') id: string): Promise<UserResponseDto> {
  const user = await this.userService.getUserById(id);
  return UserResponseDto.fromEntity(user); // strips sensitive fields
}
```

---

### J-8: Not Handling `null` / `undefined` Returns

```typescript
// ❌ BAD — findOne can return null; this crashes
async getUser(id: string): Promise<UserResponseDto> {
  const user = await this.userRepository.findOne({ where: { id } });
  return UserResponseDto.fromEntity(user); // TypeError: user is null
}

// ✅ GOOD — explicit null check
async getUser(id: string): Promise<UserResponseDto> {
  const user = await this.userRepository.findOne({ where: { id } });
  if (!user) throw new NotFoundException(`User ${id} not found`);
  return UserResponseDto.fromEntity(user);
}
```

---

### J-9: Modifying Function Arguments (Mutation)

```typescript
// ❌ BAD — modifies the caller's object; unexpected side effects
function applyDiscount(order: Order, discountPct: number): Order {
  order.total = order.total * (1 - discountPct); // mutates input!
  return order;
}

// ✅ GOOD — returns new object, never mutates input
function applyDiscount(order: Order, discountPct: number): Order {
  return {
    ...order,
    total: order.total * (1 - discountPct),
  };
}
```

---

### J-10: `any` Type Used Everywhere

```typescript
// ❌ BAD — defeats the entire purpose of TypeScript
function processPayment(data: any): any {
  const result: any = data.charge(data.amount);
  return result;
}

// ✅ GOOD
function processPayment(data: ChargeRequest): Promise<ChargeResult> {
  return this.paymentProvider.charge(data.amount, data.currency, data.token);
}
```

---

## Mid-Level Developer Mistakes (2–5 years)

Mid-level mistakes share a theme: **they know the patterns but apply them wrong, too early, or too late**.

---

### M-1: N+1 Queries (Knows About It, Still Writes It)

The most common mid-level database mistake. They know N+1 exists but write it anyway under time pressure.

```typescript
// ❌ BAD — mid-level engineer "just needs to make it work"
const orders = await this.orderRepository.find();
for (const order of orders) {
  // 1 query per order = N queries for N orders
  order.user = await this.userRepository.findOne({ where: { id: order.userId } });
}

// ✅ GOOD — 2 queries total regardless of N
const orders  = await this.orderRepository.find();
const userIds = [...new Set(orders.map(o => o.userId))];
const users   = await this.userRepository.findByIds(userIds);
const userMap = new Map(users.map(u => [u.id, u]));
orders.forEach(o => { o.user = userMap.get(o.userId)!; });

// ✅ ALSO GOOD — TypeORM relation loading
const orders = await this.orderRepository.find({ relations: ['user'] });
```

---

### M-2: Missing Database Transactions for Multi-Step Writes

Mid-levels know transactions exist but forget them under deadline pressure.

```typescript
// ❌ BAD — partial failure leaves inconsistent state
async transferCredits(fromId: string, toId: string, amount: number): Promise<void> {
  await this.userRepository.decrement({ id: fromId }, 'credits', amount);
  // If this line throws, fromId has lost credits but toId never received them:
  await this.userRepository.increment({ id: toId }, 'credits', amount);
}

// ✅ GOOD — atomic: either both succeed or neither does
async transferCredits(fromId: string, toId: string, amount: number): Promise<void> {
  await this.dataSource.transaction(async (manager) => {
    await manager.decrement(User, { id: fromId }, 'credits', amount);
    await manager.increment(User, { id: toId }, 'credits', amount);
  });
}
```

---

### M-3: Over-Engineering Simple Solutions

Mid-levels have learned design patterns and apply them everywhere, including where they don't belong.

```typescript
// ❌ BAD — factory + strategy + observer for a 3-line function
class EmailFormatterFactory {
  createFormatter(type: EmailType): EmailFormatter {
    return FormatterRegistry.get(type);
  }
}

interface EmailFormatter {
  format(data: EmailData): FormattedEmail;
}

class WelcomeEmailFormatter implements EmailFormatter {
  format(data: EmailData): FormattedEmail { ... }
}

// ✅ GOOD — just a function, for now
function formatWelcomeEmail(user: User): EmailData {
  return {
    to:      user.email,
    subject: `Welcome, ${user.name}!`,
    body:    `Hi ${user.name}, your account is ready.`,
  };
}
// Add the factory when you have 5+ formatters with different behaviors.
// YAGNI: You Aren't Gonna Need It (until you do).
```

---

### M-4: Race Conditions in Concurrent Operations

Mid-levels start using `Promise.all()` but don't think about shared state.

```typescript
// ❌ BAD — race condition: two concurrent requests can both pass the check
async reserveSeat(eventId: string, userId: string): Promise<Ticket> {
  const event = await this.eventRepository.findOne({ where: { id: eventId } });

  if (event.seatsAvailable <= 0) {
    throw new ConflictException('No seats available');
  }

  // RACE: another request passes the check here before decrement
  await this.eventRepository.decrement({ id: eventId }, 'seatsAvailable', 1);
  return this.ticketRepository.save({ eventId, userId });
}

// ✅ GOOD — atomic decrement with condition (optimistic locking)
async reserveSeat(eventId: string, userId: string): Promise<Ticket> {
  const result = await this.eventRepository
    .createQueryBuilder()
    .update(Event)
    .set({ seatsAvailable: () => 'seats_available - 1' })
    .where('id = :eventId AND seats_available > 0', { eventId })
    .execute();

  if (result.affected === 0) {
    throw new ConflictException('No seats available');
  }

  return this.ticketRepository.save({ eventId, userId });
}
```

---

### M-5: `as` Type Assertions Instead of Proper Typing

Mid-levels know about `as` and use it to silence TypeScript errors.

```typescript
// ❌ BAD — silences TypeScript, hides real type mismatch
const user = this.request.user as User;
const dto  = body as CreateOrderDto; // body is 'any' from Express — no guarantee

// ✅ GOOD — type guard or proper middleware typing
// In JWT strategy, return User object, not any:
validate(payload: JwtPayload): User {
  return { id: payload.sub, email: payload.email, role: payload.role };
}

// In controller, use @CurrentUser() decorator:
@Get('/me')
getMe(@CurrentUser() user: User): UserResponseDto {
  return UserResponseDto.fromEntity(user);
}
```

---

### M-6: Leaking Repository Through Module Exports

Mid-levels export everything "just in case."

```typescript
// ❌ BAD — other modules can bypass UserService and query DB directly
@Module({
  exports: [UserService, UserRepository], // Repository exported!
})
export class UserModule {}

// Another module can now do this:
constructor(private readonly userRepository: UserRepository) {}
const user = await this.userRepository.findOne(id); // bypasses business logic

// ✅ GOOD — export only the Service (the public API)
@Module({
  exports: [UserService], // only the Service
})
export class UserModule {}
```

---

### M-7: Wrong Abstraction (Premature or Incorrect)

```typescript
// ❌ BAD — abstract base class that forces all services into the same shape
abstract class BaseService<T> {
  abstract findById(id: string): Promise<T>;
  abstract create(data: unknown): Promise<T>;
  abstract update(id: string, data: unknown): Promise<T>;
  abstract delete(id: string): Promise<void>;
}

// AuditService doesn't create/update/delete — wrong abstraction
class AuditService extends BaseService<AuditLog> {
  create(data: unknown): Promise<AuditLog> { ... }
  update(): never { throw new Error('Not supported'); } // ← LSP violation
  delete(): never { throw new Error('Not supported'); }
}

// ✅ GOOD — each service only has what it needs
class AuditService {
  async log(event: AuditEvent): Promise<AuditLog> { ... }
  async findByUser(userId: string): Promise<AuditLog[]> { ... }
}
```

---

### M-8: No Pagination on List Endpoints

Mid-levels know it's needed but skip it under deadline pressure, promising "we'll add it later."

```typescript
// ❌ BAD — "we only have 100 users now, it's fine"
async getAllOrders(): Promise<Order[]> {
  return this.orderRepository.find(); // returns 0 to ∞ records
}

// ✅ GOOD — paginated from day one (never costs more than 30 lines)
async getOrders(options: PaginationDto): Promise<PaginatedResult<OrderResponseDto>> {
  const [items, total] = await this.orderRepository.findAndCount({
    skip:  (options.page - 1) * options.limit,
    take:  Math.min(options.limit, MAX_PAGE_SIZE),
    order: { createdAt: 'DESC' },
  });
  return {
    data:       items.map(OrderResponseDto.fromEntity),
    total,
    page:       options.page,
    limit:      options.limit,
    totalPages: Math.ceil(total / options.limit),
  };
}
```

---

### M-9: Ignoring TypeORM/Mongoose `select: false` Pattern

```typescript
// ❌ BAD — passwordHash always loaded, even when not needed
@Column()
passwordHash: string;

// And then returned accidentally in responses
const user = await this.userRepository.findOne({ where: { id } });
return user; // includes passwordHash!

// ✅ GOOD — never auto-selected
@Column({ select: false }) // must opt-in with .addSelect('user.passwordHash')
passwordHash: string;

// To check password:
const user = await this.userRepository
  .createQueryBuilder('user')
  .addSelect('user.passwordHash')
  .where('user.id = :id', { id })
  .getOne();
```

---

### M-10: Not Validating Configuration at Startup

Mid-levels use `process.env.SOMETHING` throughout code without checking it exists at boot.

```typescript
// ❌ BAD — crashes at runtime when env var is missing, not at startup
async chargePayment(amount: number) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // undefined at runtime
  return stripe.charges.create({ amount });
}

// ✅ GOOD — fail fast at startup using NestJS ConfigModule + Joi validation
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        STRIPE_SECRET_KEY: Joi.string().required(),
        JWT_SECRET:        Joi.string().required().min(32),
        DATABASE_URL:      Joi.string().uri().required(),
      }),
    }),
  ],
})
export class AppModule {}
// App fails to start if any required env var is missing — never hits production
```

---

## Senior Developer Mistakes (5+ years)

Senior mistakes share a theme: **they know the code is right, but they miss the operational or systemic impact**.

---

### S-1: No Idempotency on Payment / Side-Effect Endpoints

Seniors build the feature correctly but forget that networks fail and clients retry.

```typescript
// ❌ BAD — if client retries (network timeout), order is created twice
@Post('/orders')
async createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
  return this.orderService.create(dto);
}

// ✅ GOOD — idempotency key prevents double-processing
@Post('/orders')
async createOrder(
  @Body() dto: CreateOrderDto,
  @Headers('X-Idempotency-Key') idempotencyKey: string,
): Promise<OrderResponseDto> {
  // Check if we've seen this key before
  const cached = await this.idempotencyService.get(idempotencyKey);
  if (cached) return cached; // return the original response

  const order  = await this.orderService.create(dto);
  const result = OrderResponseDto.fromEntity(order);
  await this.idempotencyService.set(idempotencyKey, result, ONE_DAY_SECONDS);
  return result;
}
```

---

### S-2: No Retry Logic on External Service Calls

Seniors call external services without handling transient failures.

```typescript
// ❌ BAD — single attempt, any transient failure = user-visible error
async sendEmail(to: string, subject: string, body: string): Promise<void> {
  await this.sendgrid.send({ to, subject, text: body });
}

// ✅ GOOD — retry with exponential backoff
async sendEmail(to: string, subject: string, body: string): Promise<void> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await this.sendgrid.send({ to, subject, text: body });
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        this.logger.error('Email send failed after all retries', { to, error });
        throw error;
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 2 ** (attempt - 1) * 1000));
    }
  }
}

// ✅ EVEN BETTER — use a message queue for reliability
// Don't send email synchronously in the request path — queue it
await this.emailQueue.add('send-welcome', { to, subject, body }, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
});
```

---

### S-3: Breaking API Changes Without Versioning

Seniors change API contracts without thinking about existing clients.

```typescript
// ❌ BAD — renamed field breaks all API clients
// Before: { "userId": "123" }
// After:  { "user_id": "123" }  ← breaking change without version bump

// ❌ BAD — removed field that clients depend on
// Before: { "id", "email", "name", "phone" }
// After:  { "id", "email", "name" }  ← 'phone' removed silently

// ✅ GOOD — versioned endpoint
// /api/v1/users — unchanged, old clients still work
// /api/v2/users — new contract with new field names

// ✅ ALSO GOOD — deprecation header for old clients
@Get('/users/:id')
@Header('Deprecation', 'true')
@Header('Sunset', 'Sat, 31 Dec 2026 00:00:00 GMT')
@Header('Link', '</api/v2/users/:id>; rel="successor-version"')
async getUserV1(@Param('id') id: string) { ... }
```

---

### S-4: Shared Mutable State (Hidden Coupling)

Seniors sometimes use module-level or class-level state that creates hidden dependencies.

```typescript
// ❌ BAD — class-level mutable state shared across requests (concurrency bug)
@Injectable()
export class ReportService {
  private currentUser: User; // ← WRONG: shared across all concurrent requests!

  setUser(user: User) { this.currentUser = user; }

  async generateReport(): Promise<Report> {
    // In concurrent requests, currentUser could be from a different request
    return this.buildReport(this.currentUser);
  }
}

// ✅ GOOD — pass context explicitly, no shared state
@Injectable()
export class ReportService {
  async generateReport(user: User): Promise<Report> {
    return this.buildReport(user); // user is request-scoped, not class-scoped
  }
}
```

---

### S-5: Not Planning for Observability

Seniors ship features that work but can't be debugged in production.

```typescript
// ❌ BAD — black box: if this fails in production, no idea what happened
async processOrder(orderId: string): Promise<void> {
  const order = await this.orderRepository.findOne({ where: { id: orderId } });
  await this.inventoryService.reserve(order.items);
  await this.paymentService.charge(order.total, order.paymentToken);
  await this.orderRepository.update(orderId, { status: OrderStatus.CONFIRMED });
}

// ✅ GOOD — every step is observable
async processOrder(orderId: string): Promise<void> {
  this.logger.log('Processing order started', { orderId });

  const order = await this.orderRepository.findOne({ where: { id: orderId } });
  if (!order) throw new NotFoundException(`Order ${orderId} not found`);

  this.logger.log('Reserving inventory', { orderId, itemCount: order.items.length });
  await this.inventoryService.reserve(order.items);

  this.logger.log('Charging payment', { orderId, amount: order.total });
  const charge = await this.paymentService.charge(order.total, order.paymentToken);

  await this.orderRepository.update(orderId, { status: OrderStatus.CONFIRMED });

  this.logger.log('Order processed successfully', {
    orderId,
    chargeId: charge.id,
    amount:   order.total,
  });
}
```

---

### S-6: Premature Optimization That Sacrifices Readability

Seniors sometimes optimize code before measuring that it's actually slow.

```typescript
// ❌ BAD — "optimized" but unreadable (and not actually faster)
const r = await this.uRepo.find().then(us =>
  Promise.all(us.map(u => this.oRepo.findBy({ uId: u.id })
    .then(os => ({ ...u, os }))))
);

// ✅ GOOD — readable, and just as fast
const users = await this.userRepository.find({ relations: ['orders'] });
// Profile first. Optimize second. Maintain always.
```

---

### S-7: Not Considering Backward Compatibility on Database Migrations

```typescript
// ❌ BAD — migration that drops column while old code still uses it
// (Blue-green deployments mean old pods are still running)
async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.dropColumn('users', 'phone_number'); // old pods crash!
}

// ✅ GOOD — expand/contract migration strategy
// Step 1 (this migration): Add new column, keep old one
async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.addColumn('users', new TableColumn({
    name: 'phone', type: 'varchar', isNullable: true,
  }));
  // Migrate data from old to new
  await queryRunner.query('UPDATE users SET phone = phone_number');
}

// Step 2 (next deployment): Update code to use new column
// Step 3 (migration after that): Drop old column when no code references it
```

---

### S-8: Synchronous Operations in Async Context (Blocking Event Loop)

Seniors know Node.js is single-threaded but sometimes write blocking code in services.

```typescript
// ❌ BAD — CPU-intensive work blocks the event loop for ALL requests
@Post('/reports/generate')
async generateReport(@Body() dto: ReportDto): Promise<Report> {
  // This blocks Node's event loop for seconds while processing
  const report = this.processLargeDataset(dto.data); // synchronous, CPU-heavy
  return report;
}

// ✅ GOOD — offload to worker thread
import { Worker } from 'worker_threads';

@Post('/reports/generate')
async generateReport(@Body() dto: ReportDto): Promise<{ jobId: string }> {
  // Queue the job and return immediately
  const job = await this.reportQueue.add('generate', dto);
  return { jobId: job.id };
}

@Get('/reports/:jobId')
async getReportStatus(@Param('jobId') jobId: string) {
  return this.reportQueue.getJob(jobId);
}
```

---

### S-9: Circular Dependencies Between Services

Seniors design complex systems and accidentally create circular imports.

```typescript
// ❌ BAD — UserService depends on OrderService, OrderService depends on UserService
@Injectable()
export class UserService {
  constructor(private readonly orderService: OrderService) {} // circular!
}

@Injectable()
export class OrderService {
  constructor(private readonly userService: UserService) {} // circular!
}

// ✅ GOOD OPTION 1 — extract shared logic to a third service
@Injectable()
export class UserLookupService {
  // Only user data access, no cross-service dependencies
}

// ✅ GOOD OPTION 2 — use events/messaging to decouple
// OrderService emits 'order.created' event
// UserService listens to it — no direct dependency
```

---

### S-10: Not Cleaning Up Resources (Memory Leaks)

Seniors build long-running services but sometimes forget to clean up.

```typescript
// ❌ BAD — interval never cleared; accumulates on every request
@Injectable()
export class MetricsService implements OnModuleInit {
  private intervals: NodeJS.Timeout[] = [];

  onModuleInit() {
    this.intervals.push(setInterval(() => this.collectMetrics(), 5000));
    this.intervals.push(setInterval(() => this.flushMetrics(), 30000));
    // If module re-initialized in tests, intervals accumulate
  }
}

// ✅ GOOD — clean up on module destroy
@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private intervals: NodeJS.Timeout[] = [];

  onModuleInit(): void {
    this.intervals.push(setInterval(() => this.collectMetrics(), 5000));
    this.intervals.push(setInterval(() => this.flushMetrics(), 30000));
  }

  onModuleDestroy(): void {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  }
}
```

---

## Quick Reference Table

| Level | Top 3 Signals | Root Cause |
|-------|--------------|-----------|
| Junior | `console.log`, no validation, missing `await` | Writes for happy path only |
| Mid | N+1 queries, no transactions, over-engineering | Knows patterns, applies them inconsistently |
| Senior | No idempotency, no observability, breaking changes | Technically correct, operationally incomplete |

---

**Last Updated**: 2026-06-26  
**Applies to**: TypeScript · NestJS · Express · Node.js
