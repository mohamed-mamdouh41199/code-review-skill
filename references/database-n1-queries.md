# Advanced Database Performance Guide

## 🔴 CRITICAL: N+1 Query Problem

The N+1 query problem is **the most common performance issue** in production applications. It occurs when code makes individual queries in a loop instead of batching them.

### What is N+1?

You need 1 query to get data, then N additional queries (one per result):
- 1 query to get users: `SELECT * FROM users` (returns 10 results)
- N queries to get posts: 10 separate `SELECT * FROM posts WHERE user_id = X`
- **Total: 1 + N = 11 queries instead of 1**

### 🚨 Examples to DETECT (HIGH SEVERITY)

#### JavaScript/Node.js Examples

**❌ BAD - N+1 Query (Loop)**
```javascript
// Gets 1000 users, then queries DB 1000 times
const users = await User.find();
for (const user of users) {
  user.posts = await Post.find({ userId: user._id });  // 1000 queries!
}
```

**⚠️ BAD - Inside map (Still N+1)**
```javascript
const users = await User.find();
const usersWithPosts = users.map(user => {
  user.posts = Post.find({ userId: user._id });  // Still N+1
  return user;
});
```

**⚠️ BAD - Inside forEach**
```javascript
users.forEach(async user => {
  user.profile = await Profile.findOne({ userId: user._id });  // N queries
});
```

**✅ GOOD - Batched with Promise.all()**
```javascript
const users = await User.find();
const userIds = users.map(u => u._id);
const posts = await Post.find({ userId: { $in: userIds } });  // 1 query!
const postMap = new Map(posts.map(p => [p.userId, p]));
users.forEach(user => {
  user.posts = postMap.get(user._id) || [];
});
```

### MongoDB Examples

**❌ BAD - N+1 in Loop**
```javascript
const users = db.collection('users').find().toArray();
users.forEach(user => {
  user.orders = db.collection('orders').find({ userId: user._id }).toArray();  // N queries
});
```

**✅ GOOD - $lookup Aggregation**
```javascript
db.collection('users').aggregate([
  {
    $lookup: {
      from: 'orders',
      localField: '_id',
      foreignField: 'userId',
      as: 'orders'
    }
  }
]).toArray();
```

**✅ GOOD - Batch query**
```javascript
const users = await db.collection('users').find().toArray();
const userIds = users.map(u => u._id);
const orders = await db.collection('orders').find({ userId: { $in: userIds } }).toArray();
const orderMap = {};
orders.forEach(order => {
  if (!orderMap[order.userId]) orderMap[order.userId] = [];
  orderMap[order.userId].push(order);
});
```

### Firestore Examples

**❌ BAD - N+1 Queries**
```javascript
const users = await admin.firestore().collection('users').get();
users.forEach(async doc => {
  const posts = await admin.firestore()
    .collection('posts')
    .where('userId', '==', doc.id)
    .get();  // N queries!
});
```

**✅ GOOD - Batch Read**
```javascript
const users = await admin.firestore().collection('users').get();
const userIds = users.docs.map(d => d.id);
const postsSnap = await admin.firestore()
  .collection('posts')
  .where('userId', 'in', userIds)
  .get();
```

---

## 🔴 Queries in Loops (HIGH SEVERITY)

**Any database query inside a loop is flagged as HIGH severity** unless explicitly batched.

### Detection Patterns

```javascript
// ❌ for loop with query - FLAG
for (const item of items) {
  const data = await db.query(...);  // HIGH SEVERITY
}

// ❌ forEach with query - FLAG
items.forEach(async item => {
  const data = await db.query(...);  // HIGH SEVERITY
});

// ❌ map with query - FLAG
items.map(item => {
  return await db.query(...);  // HIGH SEVERITY
});

// ❌ while loop with query - FLAG
while (condition) {
  const data = await db.query(...);  // HIGH SEVERITY
}

// ✅ Batched - OK
const ids = items.map(i => i.id);
const results = await db.query({ id: { $in: ids } });  // 1 query
```

---

## 🟡 Debugging Production N+1 Issues

### Logging Queries (Development)

```javascript
// Enable query logging
mongoose.set('debug', true);

// Or for MongoDB:
const logger = console.log;
db.setLogger(logger);

// Check: How many queries for a single endpoint?
console.time('GET /users');
// ... code ...
console.timeEnd('GET /users');
```

### Monitoring Tools

```javascript
// Newrelic, DataDog, or Sentry will catch N+1
// Look for: Same query running many times in a single request

// Use APM to see query waterfall:
// GET /users (starts)
//   ├─ SELECT * FROM users (1ms)
//   ├─ SELECT * FROM posts WHERE user_id=1 (5ms)
//   ├─ SELECT * FROM posts WHERE user_id=2 (5ms)
//   ├─ ... (repeated 10x)
//   └─ Total: 1 main + 10 per-user queries = 11
```

### Profiling with Mongoose

```javascript
// Use mongoose-profile to catch N+1
const mongooseProfile = require('mongoose-profile');

app.get('/users', async (req, res) => {
  const profile = mongooseProfile.start();
  
  const users = await User.find();
  // If you do this, you'll see multiple queries:
  // users.map(u => u.posts = Post.find(...))
  
  const stats = profile.end();
  console.log(`Queries: ${stats.count}, Time: ${stats.time}ms`);
});
```

---

## 🟢 Best Practices for Database Queries

### 1. Always Batch Queries

```javascript
// ❌ Bad
user.friends = await User.find({ _id: { $in: friendIds } });
user.followers = await User.find({ _id: { $in: followerIds } });
user.posts = await Post.find({ userId: user._id });

// ✅ Good - Parallel
[user.friends, user.followers, user.posts] = await Promise.all([
  User.find({ _id: { $in: friendIds } }),
  User.find({ _id: { $in: followerIds } }),
  Post.find({ userId: user._id })
]);
```

### 2. Use Aggregation Pipelines (MongoDB)

```javascript
// ❌ Bad - Separate queries
const user = await User.findById(userId);
const posts = await Post.find({ userId: user._id });
const comments = await Comment.find({ userId: user._id });

// ✅ Good - Single aggregation
const user = await User.aggregate([
  { $match: { _id: ObjectId(userId) } },
  {
    $lookup: {
      from: 'posts',
      localField: '_id',
      foreignField: 'userId',
      as: 'posts'
    }
  },
  {
    $lookup: {
      from: 'comments',
      localField: '_id',
      foreignField: 'userId',
      as: 'comments'
    }
  }
]).exec();
```

### 3. Use JOIN (PostgreSQL/MySQL)

```javascript
// ❌ Bad
const users = await db.query('SELECT * FROM users');
users.forEach(u => {
  u.posts = db.query('SELECT * FROM posts WHERE user_id = ?', [u.id]);
});

// ✅ Good - Single JOIN
const results = await db.query(`
  SELECT u.*, p.* 
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
`);

// Map results:
const userMap = new Map();
results.forEach(row => {
  if (!userMap.has(row.user_id)) {
    userMap.set(row.user_id, { ...row, posts: [] });
  }
  if (row.post_id) {
    userMap.get(row.user_id).posts.push(row);
  }
});
```

### 4. Pagination for Large Result Sets

```javascript
// ✅ Good - Paginate to avoid loading too much
app.get('/users', async (req, res) => {
  const page = req.query.page || 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  
  const users = await User.find()
    .skip(skip)
    .limit(limit)
    .populate('posts');  // One join operation
  
  res.json(users);
});
```

### 5. Select Only Needed Fields

```javascript
// ❌ Bad - Gets all fields
const users = await User.find();

// ✅ Good - Select specific fields
const users = await User.find().select('id name email');
// Much faster, smaller payload

// ✅ Also good with exclude
const users = await User.find().select('-password -internalId');
```

---

## 📊 Performance Checklist

Before pushing code:

- [ ] No queries inside loops
- [ ] No implicit N+1 queries (check for sub-queries)
- [ ] Large result sets are paginated
- [ ] Indexes are on foreign key fields
- [ ] JOINs used instead of multiple queries
- [ ] Aggregation pipelines optimized (filter before $lookup)
- [ ] Query results are cached if accessed multiple times
- [ ] No unnecessary SELECT * queries
- [ ] Connection pooling configured
- [ ] Query timeouts set

---

## 🧪 Testing for N+1

### Unit Test Example

```javascript
describe('User Service', () => {
  it('should not have N+1 queries', async () => {
    // Mock the database query counter
    let queryCount = 0;
    const originalFind = User.find;
    User.find = jest.fn(() => {
      queryCount++;
      return originalFind.call(User);
    });

    const users = await getUsersWithPosts();
    
    // Should only make 1 or 2 queries, not 11
    expect(queryCount).toBeLessThanOrEqual(2);
  });
});
```

### Integration Test with APM

```javascript
// Use New Relic or DataDog trace to verify
test('GET /users returns fast', async () => {
  const response = await request(app).get('/users');
  
  // Check APM metrics
  const apmMetrics = getAPMMetrics();
  expect(apmMetrics.dbQueryCount).toBeLessThanOrEqual(2);
});
```

---

## 🔍 Code Review Rules

When reviewing code, look for:

1. **Loop with Query** = ⚠️ HIGH
   ```javascript
   for (x of xs) await db.query()  // Flag this
   ```

2. **Map with Query** = ⚠️ HIGH
   ```javascript
   xs.map(x => db.query())  // Flag this
   ```

3. **forEach with Query** = ⚠️ HIGH
   ```javascript
   xs.forEach(x => db.query())  // Flag this
   ```

4. **Async Sequence** = ⚠️ MEDIUM
   ```javascript
   // OK if just 2-3 queries, but prefer Promise.all
   const a = await db.query();
   const b = await db.query();
   ```

5. **Uncached Repeated Query** = 🟡 MEDIUM
   ```javascript
   // If same query is called multiple times in request
   const data = await db.query(); // Line 10
   // ... 100 lines ...
   const data = await db.query(); // Line 110 - Same query!
   ```

---

## 🚀 Real-World Example

### Before (N+1 Problem)
```javascript
router.get('/users/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId);
  
  // N+1: Gets user, then queries for friends one by one
  user.friends = [];
  for (const friendId of user.friendIds) {
    const friend = await User.findById(friendId);  // N queries!
    user.friends.push(friend);
  }
  
  res.json(user);
});
// Problem: 1 + friendIds.length queries (could be 1 + 500)
```

### After (Optimized)
```javascript
router.get('/users/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId);
  
  // Batch query: Get all friends in one query
  user.friends = await User.find({ _id: { $in: user.friendIds } });
  
  res.json(user);
});
// Solution: 1 + 1 = 2 queries max
```

---

## Summary

**🔴 CRITICAL RULES:**
1. **No queries in loops** - Always batch
2. **N+1 is HIGH severity** - Must be fixed
3. **Batch operations** - Use `$in`, `IN`, aggregation
4. **Measure first** - Use APM/logging to find issues

**When you see a query in a loop → Flag it immediately → Suggest batching solution**

---

## 🔷 TypeScript / TypeORM / Prisma Patterns

> The following section covers N+1 patterns specific to TypeScript ORMs.

### TypeORM — N+1 Detection & Fixes

**❌ BAD — N+1 via loop (TypeORM)**
```typescript
// order.service.ts
async getOrdersWithUsers(): Promise<Order[]> {
  const orders = await this.orderRepository.find();
  for (const order of orders) {
    // 1 query per order — N queries for N orders
    order.user = await this.userRepository.findOne({ where: { id: order.userId } });
  }
  return orders;
}
```

**✅ GOOD — TypeORM: `relations` option (1 JOIN query)**
```typescript
async getOrdersWithUsers(): Promise<Order[]> {
  return this.orderRepository.find({
    relations: ['user'], // TypeORM does LEFT JOIN automatically
  });
}
```

**✅ GOOD — TypeORM: QueryBuilder with JOIN**
```typescript
async getOrdersWithUsers(): Promise<Order[]> {
  return this.orderRepository
    .createQueryBuilder('order')
    .leftJoinAndSelect('order.user', 'user')
    .leftJoinAndSelect('order.items', 'item')
    .leftJoinAndSelect('item.product', 'product')
    .getMany();
}
```

**✅ GOOD — TypeORM: Manual batch (when relations aren't available)**
```typescript
async getOrdersWithUsers(): Promise<Order[]> {
  const orders  = await this.orderRepository.find();
  const userIds = [...new Set(orders.map(o => o.userId))];
  const users   = await this.userRepository.findByIds(userIds);
  const userMap = new Map(users.map(u => [u.id, u]));
  return orders.map(o => ({ ...o, user: userMap.get(o.userId)! }));
}
```

### TypeORM — N+1 in Repository Pattern

```typescript
// ❌ BAD — N+1 inside a repository method
@Injectable()
export class OrderRepository {
  async findWithDetails(orderIds: string[]): Promise<Order[]> {
    const orders = await this.repo.findByIds(orderIds);
    for (const order of orders) {
      order.items = await this.itemRepo.find({ where: { orderId: order.id } }); // N queries!
    }
    return orders;
  }
}

// ✅ GOOD — single query with relation
@Injectable()
export class OrderRepository {
  async findWithDetails(orderIds: string[]): Promise<Order[]> {
    return this.repo.find({
      where:     { id: In(orderIds) },
      relations: ['items', 'items.product'],
    });
  }
}
```

---

### Prisma — N+1 Detection & Fixes

**❌ BAD — N+1 with Prisma**
```typescript
async getOrdersWithUsers() {
  const orders = await this.prisma.order.findMany();
  for (const order of orders) {
    // N separate queries
    order.user = await this.prisma.user.findUnique({ where: { id: order.userId } });
  }
  return orders;
}
```

**✅ GOOD — Prisma: `include` (single JOIN query)**
```typescript
async getOrdersWithUsers() {
  return this.prisma.order.findMany({
    include: {
      user:  true,
      items: {
        include: { product: true }, // nested eager load
      },
    },
  });
}
```

**✅ GOOD — Prisma: `select` (fetch only needed fields — avoids over-fetching)**
```typescript
async getOrdersWithUsers() {
  return this.prisma.order.findMany({
    select: {
      id:     true,
      total:  true,
      status: true,
      user: {
        select: { id: true, email: true, name: true },
        // passwordHash is NOT included — explicit allowlist
      },
    },
  });
}
```

**✅ GOOD — Prisma: Manual batch with `findMany` + `$in`**
```typescript
async enrichOrdersWithUsers(orders: Order[]) {
  const userIds = [...new Set(orders.map(o => o.userId))];
  const users   = await this.prisma.user.findMany({
    where: { id: { in: userIds } },
  });
  const userMap = new Map(users.map(u => [u.id, u]));
  return orders.map(o => ({ ...o, user: userMap.get(o.userId)! }));
}
```

---

### Mongoose (TypeScript) — N+1 Detection & Fixes

**❌ BAD — N+1 with Mongoose**
```typescript
async getPostsWithAuthors(): Promise<Post[]> {
  const posts = await PostModel.find().exec();
  for (const post of posts) {
    post.author = await UserModel.findById(post.authorId).exec(); // N queries
  }
  return posts;
}
```

**✅ GOOD — Mongoose: `.populate()` (single JOIN query)**
```typescript
async getPostsWithAuthors(): Promise<Post[]> {
  return PostModel.find()
    .populate('author', 'id email name') // only fetch needed fields
    .exec();
}
```

**✅ GOOD — Mongoose: `$lookup` aggregation**
```typescript
async getPostsWithAuthors() {
  return PostModel.aggregate([
    {
      $lookup: {
        from:         'users',
        localField:   'authorId',
        foreignField: '_id',
        as:           'author',
        pipeline: [
          { $project: { id: 1, email: 1, name: 1 } }, // project inside lookup
        ],
      },
    },
    { $unwind: '$author' }, // if author is always present (1:1)
  ]);
}
```

---

### NestJS DataLoader Pattern (GraphQL N+1 Prevention)

When building GraphQL APIs with NestJS, `@ResolveField` creates N+1 by nature.
Use DataLoader to batch database calls per request.

```typescript
// ❌ BAD — N+1 in GraphQL resolver
@ResolveField('user', () => UserType)
async getUser(@Parent() order: Order): Promise<User> {
  return this.userService.getUserById(order.userId); // 1 query per order!
}

// ✅ GOOD — DataLoader batches all user IDs in a single request tick
@Injectable()
export class UserLoader implements NestDataLoader<string, User> {
  constructor(private readonly userService: UserService) {}

  generateDataLoader(): DataLoader<string, User> {
    return new DataLoader<string, User>(
      async (userIds: readonly string[]) => {
        const users   = await this.userService.findByIds([...userIds]);
        const userMap = new Map(users.map(u => [u.id, u]));
        return userIds.map(id => userMap.get(id) ?? new Error(`User ${id} not found`));
      },
      { cache: true }, // cache within a single request
    );
  }
}

// In resolver:
@ResolveField('user', () => UserType)
async getUser(
  @Parent() order: Order,
  @Loader(UserLoader) userLoader: DataLoader<string, User>,
): Promise<User> {
  return userLoader.load(order.userId); // batched automatically!
}
```

---

**Last Updated**: 2026-06-26  
**Covers**: TypeORM · Prisma · Mongoose · NestJS DataLoader · TypeScript

