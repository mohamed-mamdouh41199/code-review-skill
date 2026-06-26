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
