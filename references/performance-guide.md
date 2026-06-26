# Performance Optimization Guide

## Database Query Optimization

### MongoDB Performance

- [ ] Indexes are used for frequently queried fields
- [ ] Queries project only needed fields
- [ ] Aggregation pipelines are optimized
- [ ] $lookup is used sparingly and has indexes
- [ ] Sorting happens after filtering
- [ ] Connection pooling is configured

```javascript
// ❌ SLOW - Fetches all fields, no index
db.collection('orders').find({ status: 'completed' });

// ✅ FAST - Indexed query, projects needed fields only
db.collection('orders')
  .find({ status: 'completed' })
  .project({ _id: 1, total: 1, date: 1 })
  .hint({ status: 1 });
```

### Aggregation Pipeline Performance

```javascript
// ❌ SLOW - Processes all documents before filtering
db.collection('sales')
  .aggregate([
    { $lookup: { ... } },
    { $match: { date: { $gte: new Date('2024-01-01') } } }
  ]);

// ✅ FAST - Filters first, then joins
db.collection('sales')
  .aggregate([
    { $match: { date: { $gte: new Date('2024-01-01') } } },
    { $lookup: { ... } }
  ]);
```

### General Database Optimization

- [ ] N+1 queries are avoided
- [ ] Batch operations are used where possible
- [ ] Connection pooling is configured
- [ ] Query results are cached appropriately
- [ ] Database indexes are analyzed

## Caching Strategies

- [ ] HTTP caching headers are set (Cache-Control, ETag)
- [ ] Redis or similar is used for frequently accessed data
- [ ] Cache invalidation strategy is clear
- [ ] Cache keys are well-designed
- [ ] Cache size limits are respected

```javascript
// ✅ GOOD - Caching with TTL
const redis = require('redis');
const client = redis.createClient();

async function getUser(userId) {
  const cached = await client.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);
  
  const user = await db.users.findById(userId);
  await client.setex(`user:${userId}`, 3600, JSON.stringify(user));
  return user;
}
```

## Async/Await Optimization

- [ ] Parallel operations use Promise.all()
- [ ] Sequential operations use proper await
- [ ] Unnecessary awaits are removed
- [ ] Error handling doesn't block other operations

```javascript
// ❌ SLOW - Sequential when can be parallel
const user = await getUser(id);
const posts = await getPosts(id);
const comments = await getComments(id);

// ✅ FAST - Parallel execution
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id)
]);
```

## Memory Management

- [ ] Large datasets are streamed, not loaded entirely
- [ ] Event listeners are properly cleaned up
- [ ] Circular references are avoided
- [ ] Memory leaks are not present
- [ ] Buffer objects are properly disposed

```javascript
// ❌ BAD - Loads entire file into memory
const file = fs.readFileSync(largePath);

// ✅ GOOD - Streams file
fs.createReadStream(largePath).pipe(destination);
```

## API Request Optimization

- [ ] Batch endpoints reduce multiple requests
- [ ] GraphQL queries fetch only needed fields
- [ ] Pagination is implemented for large datasets
- [ ] Request deduplication is used
- [ ] Compression (gzip) is enabled

```javascript
// ✅ GOOD - Pagination
app.get('/users', (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const users = db.users.find().skip(skip).limit(limit);
  res.json(users);
});
```

## Response Optimization

- [ ] Responses are compressed (gzip)
- [ ] Unnecessary fields are not included
- [ ] Response size is minimized
- [ ] CDN is used for static assets

```javascript
// ✅ GOOD - Compression middleware
const compression = require('compression');
app.use(compression());
```

## Algorithm Complexity

- [ ] O(n log n) or better for sorting
- [ ] O(1) or O(log n) for lookups
- [ ] Nested loops are analyzed for efficiency
- [ ] Recursive functions have proper base cases

```javascript
// ❌ O(n²) - Nested loops
for (let i = 0; i < users.length; i++) {
  for (let j = 0; j < users.length; j++) {
    if (users[i].id === users[j].referrer) { }
  }
}

// ✅ O(n) - Using Map for O(1) lookup
const referrerMap = new Map(users.map(u => [u.id, u]));
for (const user of users) {
  const referrer = referrerMap.get(user.referrer);
}
```

## Node.js Specific Optimizations

### Worker Threads for CPU-Intensive Tasks

```javascript
// ✅ GOOD - Use worker threads for heavy computation
const { Worker } = require('worker_threads');

app.post('/compute', (req, res) => {
  const worker = new Worker('./compute.js');
  worker.on('message', (result) => {
    res.json(result);
  });
  worker.postMessage(req.body);
});
```

### Clustering for Multi-Core Usage

```javascript
// ✅ GOOD - Use cluster to utilize multiple cores
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  app.listen(3000);
}
```

## Stream Processing

- [ ] Large files are streamed
- [ ] API responses use streams where appropriate
- [ ] Backpressure is handled correctly

```javascript
// ✅ GOOD - Streaming large file
app.get('/download', (req, res) => {
  const stream = fs.createReadStream(largePath);
  stream.pipe(res);
});
```

## Bundle Size & Code Splitting

- [ ] Unused dependencies are removed
- [ ] Tree-shaking is enabled
- [ ] Code is split appropriately
- [ ] Source maps are generated for production

## Database Connection Management

- [ ] Connection pooling is configured
- [ ] Min and max pool sizes are appropriate
- [ ] Idle connections are cleaned up
- [ ] Connection timeouts are set

```javascript
// ✅ GOOD - Configured connection pool
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Monitoring & Profiling

- [ ] Response times are monitored
- [ ] Database query performance is tracked
- [ ] Memory usage is monitored
- [ ] CPU usage is monitored
- [ ] Slow queries are logged

## Benchmarking Recommendations

- [ ] Critical paths have performance benchmarks
- [ ] Benchmarks are run before and after changes
- [ ] Performance regressions are tracked
- [ ] Tools: clinic.js, autocannon, ab

---

**Performance Tiers**:
- 🔴 **Critical**: Causes timeouts or crashes
- 🟠 **High**: Significantly slows down operations
- 🟡 **Medium**: Noticeable performance impact
- 🟢 **Low**: Optimization opportunity

---

## 🔷 TypeScript / NestJS Performance Patterns

> This section covers performance issues specific to NestJS and TypeScript ORMs.

### NestJS Interceptor for Response Time Monitoring

```typescript
// ✅ GOOD — measure and log slow responses
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly SLOW_THRESHOLD_MS = 1000;

  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req   = context.switchToHttp().getRequest<Request>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > this.SLOW_THRESHOLD_MS) {
          this.logger.warn('Slow response detected', {
            path:     req.url,
            method:   req.method,
            duration: `${duration}ms`,
          });
        }
      }),
    );
  }
}
```

### TypeORM — Select Only Needed Columns

```typescript
// ❌ BAD — fetches all columns including large fields (e.g., body, metadata)
const orders = await this.orderRepository.find();

// ✅ GOOD — explicit column selection
const orders = await this.orderRepository.find({
  select: {
    id:        true,
    status:    true,
    total:     true,
    createdAt: true,
    user: {
      id:    true,
      email: true,
      name:  true,
    },
  },
  relations: ['user'],
});

// ✅ GOOD — QueryBuilder with SELECT
const orders = await this.orderRepository
  .createQueryBuilder('order')
  .select(['order.id', 'order.status', 'order.total', 'user.email'])
  .leftJoin('order.user', 'user')
  .getMany();
```

### TypeORM — Index on Frequently Queried Columns

```typescript
// ❌ BAD — querying by email but no index; full table scan
const user = await userRepository.findOne({ where: { email } });

// ✅ GOOD — index defined on entity
@Entity('users')
export class User {
  @Column({ unique: true })
  @Index()                // indexed for fast lookups
  email: string;

  @Column()
  @Index()                // indexed for filtering
  status: string;

  @Column()
  @Index()                // if frequently used in ORDER BY
  createdAt: Date;
}

// ✅ GOOD — composite index for common query patterns
@Entity('orders')
@Index(['userId', 'status'])  // composite index: WHERE userId = ? AND status = ?
@Index(['createdAt'])
export class Order {
  @Column()
  userId: string;

  @Column()
  status: string;
}
```

### TypeORM — Connection Pool Configuration

```typescript
// ✅ GOOD — proper pool configuration for production
TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type:     'postgres',
    url:      configService.get('DATABASE_URL'),

    // Pool settings — tune for your load
    extra: {
      max:                  20,    // max connections in pool
      min:                  2,     // min connections kept alive
      idleTimeoutMillis:    30000, // remove idle connections after 30s
      connectionTimeoutMillis: 2000, // fail fast if no connection in 2s
    },

    // TypeORM-level settings
    connectTimeoutMS: 5000,

    logging: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'slow-query']
      : ['error', 'slow-query'],
    maxQueryExecutionTime: 1000, // log queries slower than 1s
  }),
}),
```

### Prisma — Performance Patterns

```typescript
// ❌ BAD — no pagination, no field selection
async getAllUsers() {
  return this.prisma.user.findMany(); // could return millions of rows
}

// ✅ GOOD — paginated, select only needed fields
async getUsers(page: number, limit: number) {
  return this.prisma.user.findMany({
    skip:   (page - 1) * limit,
    take:   Math.min(limit, 100),
    select: {
      id:        true,
      email:     true,
      name:      true,
      createdAt: true,
      // passwordHash: NOT selected
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ✅ GOOD — Prisma: use $transaction for atomic multi-step writes
async createOrderWithInventory(dto: CreateOrderDto) {
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: dto });

    // Atomic stock decrement with condition check
    const updated = await tx.product.updateMany({
      where: { id: dto.productId, stockCount: { gte: dto.quantity } },
      data:  { stockCount: { decrement: dto.quantity } },
    });

    if (updated.count === 0) {
      throw new ConflictException('Insufficient stock');
    }

    return order;
  });
}
```

### NestJS Caching with CacheModule

```typescript
// ✅ GOOD — NestJS built-in caching (Redis-backed in production)
// app.module.ts
@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        store:  redisStore,
        host:   configService.get('REDIS_HOST'),
        port:   configService.get('REDIS_PORT'),
        ttl:    300, // 5 minutes default
      }),
      inject: [ConfigService],
    }),
  ],
})

// In service:
@Injectable()
export class UserService {
  constructor(
    private readonly cacheManager: Cache,
    private readonly userRepository: UserRepository,
  ) {}

  async getUserById(id: string): Promise<User> {
    const cacheKey = `user:${id}`;
    const cached   = await this.cacheManager.get<User>(cacheKey);
    if (cached) return cached;

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    await this.cacheManager.set(cacheKey, user, 300); // 5 min TTL
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.save({ id, ...dto });
    await this.cacheManager.del(`user:${id}`); // invalidate cache on update
    return user;
  }
}
```

### NestJS Queue (BullMQ) for Heavy Processing

```typescript
// ❌ BAD — heavy processing in the request path blocks event loop
@Post('/reports')
async generateReport(@Body() dto: ReportDto): Promise<Report> {
  return this.reportService.generateHeavyReport(dto); // blocks for seconds
}

// ✅ GOOD — offload to queue, return immediately
@Post('/reports')
async generateReport(@Body() dto: ReportDto): Promise<{ jobId: string }> {
  const job = await this.reportQueue.add('generate', dto, {
    attempts:  3,
    backoff:   { type: 'exponential', delay: 2000 },
    removeOnComplete: 100, // keep last 100 completed jobs
  });
  return { jobId: String(job.id) };
}

@Get('/reports/:jobId/status')
async getReportStatus(@Param('jobId') jobId: string) {
  const job = await this.reportQueue.getJob(jobId);
  if (!job) throw new NotFoundException('Report job not found');
  return {
    jobId,
    status:   await job.getState(),
    progress: job.progress,
    result:   job.returnvalue ?? null,
  };
}

// Worker:
@Processor('reports')
export class ReportProcessor {
  @Process('generate')
  async handleGenerate(job: Job<ReportDto>): Promise<Report> {
    await job.updateProgress(10);
    const report = await this.reportService.generateHeavyReport(job.data);
    await job.updateProgress(100);
    return report;
  }
}
```

### Mongoose — Performance Patterns

```typescript
// ✅ GOOD — lean queries (plain JS objects, not Mongoose documents) for read-only
const users = await UserModel
  .find({ isActive: true })
  .select('id email name')    // project only needed fields
  .lean()                      // skip Mongoose hydration — 2-5x faster for reads
  .exec();

// ✅ GOOD — compound index on Mongoose schema
const orderSchema = new Schema({
  userId:    { type: String, index: true },
  status:    { type: String },
  createdAt: { type: Date },
});

orderSchema.index({ userId: 1, status: 1 });  // compound index
orderSchema.index({ createdAt: -1 });          // DESC for sorting

// ✅ GOOD — cursor for large dataset processing (avoids loading all into memory)
const cursor = OrderModel.find({ status: 'pending' }).cursor();
for await (const order of cursor) {
  await processOrder(order);
}
cursor.close();
```

---

**Last Updated**: 2026-06-26  
**Covers**: TypeORM · Prisma · Mongoose · NestJS · Node.js Performance
