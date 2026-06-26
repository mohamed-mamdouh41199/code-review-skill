# Naming Conventions & Code Consistency — Principal Engineering Reference

> Consistency is a force multiplier. A codebase where every developer can predict
> where things are and what they're called scales 10x better than one where
> everyone does their own thing. Flag inconsistencies even when neither convention
> is objectively wrong.

---

## Part 1: TypeScript/Node.js Naming Rules

### 1.1 The Master Convention Table

| Element | Convention | Correct Examples | Wrong Examples |
|---------|-----------|-----------------|----------------|
| Variables | camelCase | `orderTotal`, `isActive`, `userId` | `OrderTotal`, `is_active`, `userid` |
| Function / Method | camelCase, verb + noun | `getUserById()`, `createOrder()`, `validateToken()` | `user()`, `data()`, `process()` |
| Class | PascalCase | `OrderService`, `UserRepository`, `AuthGuard` | `orderService`, `user_repository` |
| Interface | PascalCase (no `I` prefix) | `User`, `CreateOrderDto`, `PaginatedResult<T>` | `IUser`, `iUser`, `UserInterface` |
| Type alias | PascalCase | `OrderStatus`, `PaginatedResponse<T>`, `UserId` | `orderStatus`, `paginated_response` |
| Enum (name) | PascalCase | `OrderStatus`, `UserRole`, `PaymentMethod` | `ORDER_STATUS`, `userRole` |
| Enum (values) | SCREAMING_SNAKE_CASE | `OrderStatus.PENDING`, `UserRole.ADMIN` | `OrderStatus.pending`, `UserRole.admin` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE` | `maxRetryCount`, `defaultPageSize` |
| Files | kebab-case | `user.service.ts`, `create-order.dto.ts` | `UserService.ts`, `createOrder.dto.ts` |
| Folders | kebab-case | `user-management/`, `order-processing/` | `UserManagement/`, `orderProcessing/` |
| Booleans | `is/has/can/should` prefix | `isActive`, `hasPermission`, `canDelete`, `shouldRetry` | `active`, `permission`, `delete` |
| Event names | past tense | `userCreated`, `orderShipped`, `paymentFailed` | `createUser`, `shipOrder`, `failPayment` |
| Private class fields | `_` prefix or TypeScript `private` | `private readonly _cache: Map<string, T>` | (see note below) |

> **Note on `I` prefix**: Some teams use `IUserService` for interfaces. The important thing is that the team is consistent. If the codebase uses it everywhere, a PR that omits it should be flagged for inconsistency. If the codebase doesn't use it, a PR that adds it should be flagged.

### 1.2 Boolean Naming — The Litmus Test

A boolean variable should read like a yes/no question:

```typescript
// ❌ BAD — noun, not a question
const active      = user.status === 'active';
const deleted     = user.deletedAt !== null;
const admin       = user.role === 'admin';
const permission  = checkPermission(user, 'delete');
const valid       = validateEmail(email);

// ✅ GOOD — reads as a clear question
const isActive    = user.status === 'active';
const isDeleted   = user.deletedAt !== null;
const isAdmin     = user.role === UserRole.ADMIN;
const hasPermission = checkPermission(user, 'delete');
const isValidEmail  = validateEmail(email);
```

Prefix guide:
- `is` — state: `isActive`, `isVerified`, `isExpired`
- `has` — possession: `hasProfile`, `hasOrders`, `hasPermission`
- `can` — capability: `canDelete`, `canEdit`, `canPublish`
- `should` — behavior decision: `shouldRetry`, `shouldCache`, `shouldLog`

### 1.3 Function Naming — Always a Verb

```typescript
// ❌ BAD — noun-only functions are confusing
function userData(id: string) {}      // get? create? delete?
function order(dto: CreateOrderDto) {}
function token(payload: JwtPayload) {}

// ✅ GOOD — verb + noun + context
function getUserById(id: string): Promise<User | null> {}
function createOrder(dto: CreateOrderDto): Promise<Order> {}
function generateAccessToken(payload: JwtPayload): string {}
function validateJwtToken(token: string): JwtPayload {}
function sendWelcomeEmail(user: User): Promise<void> {}
```

**Standard verb conventions** (pick one and stick to it codebase-wide):

| Purpose | Preferred Verb | Avoid Mixing With |
|---------|---------------|-------------------|
| Fetch one by ID | `get` | `fetch`, `find`, `retrieve` |
| Fetch list | `getAll`, `list`, `findAll` | mixing `get`/`fetch`/`find` |
| Create new resource | `create` | `make`, `build`, `add` |
| Update existing | `update` | `edit`, `modify`, `patch` |
| Delete | `delete` | `remove`, `destroy` |
| Validate | `validate` | `check`, `verify` (for different meanings) |
| Check permission | `can`, `hasPermission` | `check`, `verify` |
| Transform/map | `map`, `toDto`, `fromEntity` | `convert`, `transform` (inconsistency) |

### 1.4 Event Naming (EventEmitter, Message Queues)

```typescript
// ❌ BAD — present tense / imperative (action, not event)
emit('create-user');
emit('ship-order');
emit('charge-payment');

// ✅ GOOD — past tense (fact that happened)
emit('user.created');
emit('order.shipped');
emit('payment.charged');
emit('payment.failed');

// ✅ GOOD — queue message types
const EVENT = {
  USER_CREATED:      'user.created',
  ORDER_SHIPPED:     'order.shipped',
  PAYMENT_CHARGED:   'payment.charged',
  PAYMENT_FAILED:    'payment.failed',
} as const;
```

---

## Part 2: File & Folder Naming

### 2.1 File Naming Conventions

```
✅ CORRECT                      ❌ WRONG
user.service.ts                 UserService.ts
create-order.dto.ts             CreateOrderDTO.ts
jwt-auth.guard.ts               JwtAuthGuard.ts
order-status.enum.ts            OrderStatusEnum.ts
pagination.helper.ts            PaginationHelper.ts
transform.interceptor.ts        TransformInterceptor.ts
global-exception.filter.ts      GlobalExceptionFilter.ts
user.controller.spec.ts         UserControllerTest.ts
```

### 2.2 Recommended Project Structure (NestJS)

```
src/
├── modules/                    # Feature modules (preferred over flat structure)
│   ├── user/
│   │   ├── controllers/
│   │   │   └── user.controller.ts
│   │   │   └── user.controller.spec.ts
│   │   ├── services/
│   │   │   └── user.service.ts
│   │   │   └── user.service.spec.ts
│   │   ├── repositories/
│   │   │   └── user.repository.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   ├── update-user.dto.ts
│   │   │   └── user-response.dto.ts
│   │   └── user.module.ts
│   │
│   ├── order/
│   │   └── ... (same structure)
│   │
│   └── auth/
│       ├── strategies/
│       │   └── jwt.strategy.ts
│       ├── guards/
│       │   ├── jwt-auth.guard.ts
│       │   └── roles.guard.ts
│       ├── decorators/
│       │   └── roles.decorator.ts
│       └── auth.module.ts
│
├── common/                     # Shared across modules
│   ├── constants/
│   │   ├── auth.constants.ts
│   │   └── pagination.constants.ts
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   ├── dto/
│   │   ├── pagination.dto.ts
│   │   └── api-response.dto.ts
│   ├── enums/
│   │   ├── order-status.enum.ts
│   │   └── user-role.enum.ts
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── guards/
│   │   └── (shared guards)
│   ├── interceptors/
│   │   ├── transform.interceptor.ts
│   │   └── logging.interceptor.ts
│   ├── interfaces/
│   │   └── paginated-result.interface.ts
│   └── pipes/
│       └── parse-uuid.pipe.ts
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   └── jwt.config.ts
│
├── database/
│   └── migrations/
│
├── app.module.ts
└── main.ts
```

### 2.3 Express / Non-NestJS Structure

```
src/
├── routes/                     # HTTP route definitions
│   ├── user.routes.ts
│   └── order.routes.ts
├── controllers/                # Request/response handling
│   ├── user.controller.ts
│   └── order.controller.ts
├── services/                   # Business logic
│   ├── user.service.ts
│   └── order.service.ts
├── repositories/               # Data access
│   ├── user.repository.ts
│   └── order.repository.ts
├── models/                     # DB models / schemas
│   ├── user.model.ts
│   └── order.model.ts
├── middleware/
│   ├── auth.middleware.ts
│   └── error-handler.middleware.ts
├── utils/
│   ├── logger.ts
│   └── validators.ts
├── types/
│   └── express.d.ts            # Extend Express types
├── constants/
│   └── index.ts
├── config/
│   └── index.ts
└── app.ts
```

---

## Part 3: Consistency Enforcement Rules

### 3.1 Same Concept, One Name — Always

This is the most common mid-level mistake. Flag it every time:

```typescript
// ❌ BAD — three different verbs for the same operation across services
// user.service.ts
async getUserById(id: string) { ... }

// order.service.ts
async fetchOrderById(id: string) { ... }   // "fetch" vs "get"

// product.service.ts
async findProduct(id: string) { ... }      // "find" vs "get"

// ✅ GOOD — one verb, applied everywhere
async getUserById(id: string)    { ... }
async getOrderById(id: string)   { ... }
async getProductById(id: string) { ... }
```

### 3.2 Response Shape — One Contract

```typescript
// ❌ BAD — different response shapes in the same API
// users endpoint returns:
{ user: UserResponseDto, status: 'ok' }

// orders endpoint returns:
{ data: OrderResponseDto[], total: number }

// auth endpoint returns:
{ success: true, token: string }

// ✅ GOOD — one shape for all successful responses
{
  success: true,
  data: T,
  timestamp: string,
}

// One shape for all errors:
{
  success: false,
  statusCode: number,
  message: string,
  timestamp: string,
  path: string,
}
```

### 3.3 Error Handling Style — Pick One

```typescript
// ❌ BAD — three styles in the same codebase
// Route A: callback style
app.get('/a', (req, res, next) => {
  User.findById(id).then(u => res.json(u)).catch(next);
});

// Route B: async/await + try-catch
app.get('/b', async (req, res) => {
  try {
    const u = await User.findById(id);
    res.json(u);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Route C: NestJS exception
@Get('/c')
async getC() {
  const u = await this.userService.findById(id);
  if (!u) throw new NotFoundException();
  return u;
}

// ✅ GOOD — pick async/await + exceptions (NestJS) and use it everywhere
```

### 3.4 Import Order Convention

```typescript
// ✅ GOOD — consistent import ordering
// 1. External packages (Node built-ins first, then npm)
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// 2. Internal absolute paths (via path aliases)
import { UserRepository } from '@modules/user/repositories/user.repository';
import { OrderService } from '@modules/order/services/order.service';

// 3. Relative imports (closest to farthest)
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderResponseDto } from '../dto/order-response.dto';
import { ORDER_STATUS } from '../../common/constants/order.constants';
```

---

## Part 4: Naming Anti-Patterns — The Full List

### 4.1 Generic / Vague Names (Always Flag)

```typescript
// ❌ BAD — these names say nothing
const data    = await getUserData();
const result  = processOrder();
const info    = { ... };
const temp    = user.something;
const val     = calculateTotal();
const obj     = buildResponse();

// ✅ GOOD — names communicate intent
const userProfile    = await getUserProfile(userId);
const createdOrder   = await orderService.create(dto);
const orderSummary   = buildOrderSummary(order);
const discountedTotal = applyDiscount(subtotal, coupon);
```

### 4.2 Abbreviations (Flag These)

```typescript
// ❌ BAD — cryptic abbreviations
const usr  = await getUser();
const ord  = await getOrder();
const cfg  = loadConfig();
const mgr  = new UserManager();
const req  = buildRequest();   // conflicts with Express req
const res  = buildResponse();  // conflicts with Express res
const cb   = () => {};         // what callback?

// ✅ GOOD — full words; TypeScript autocomplete makes length irrelevant
const user          = await getUser();
const order         = await getOrder();
const config        = loadConfig();
const userManager   = new UserManager();
const httpRequest   = buildRequest();
const httpResponse  = buildResponse();
const onSuccess     = () => {};
```

### 4.3 Misleading Names

```typescript
// ❌ BAD — name implies one thing, does another
async function getUsers(): Promise<User[]> {
  // also creates audit log, sends analytics event — not just "get"!
}

async function deleteUser(id: string): Promise<User> {
  // returns the user? "delete" implies void
}

function validateEmail(email: string): boolean {
  // throws an error instead of returning false — "validate" implies boolean return
}

// ✅ GOOD — name matches behavior
async function listUsers(): Promise<User[]> { ... }
async function softDeleteUser(id: string): Promise<void> { ... }
function isValidEmail(email: string): boolean { ... } // returns bool
function assertValidEmail(email: string): void { ... } // throws on invalid
```

### 4.4 Inconsistent Plural/Singular

```typescript
// ❌ BAD — inconsistent plurality
const userList = await getUsers();    // "List" suffix
const orders   = await getOrders();   // no suffix
const itemArr  = await getItems();    // "Arr" suffix

// ✅ GOOD — always plural variable for arrays, no suffix
const users  = await getUsers();
const orders = await getOrders();
const items  = await getItems();
```

---

## Part 5: Consistency Review Checklist

Before approving any PR, verify these consistency rules:

```markdown
### Naming Consistency Checklist

- [ ] Service method verbs consistent (get/find/fetch — pick one codebase-wide)
- [ ] Boolean variables prefixed (is/has/can/should)
- [ ] All enum values SCREAMING_SNAKE_CASE
- [ ] Constants SCREAMING_SNAKE_CASE and centralized
- [ ] Files use kebab-case
- [ ] Folders use kebab-case
- [ ] No generic names (data, result, info, temp, val, obj)
- [ ] No unexplained abbreviations
- [ ] No I prefix on interfaces (or all use it — be consistent)
- [ ] DTOs named with purpose (Create/Update/Response suffix)
- [ ] Events past tense (userCreated, not createUser)
- [ ] Functions are verbs (not nouns)

### Structure Consistency Checklist

- [ ] New module follows same folder structure as existing modules
- [ ] New files in correct layer (controller/service/repository)
- [ ] Exports follow module pattern (Service exported, Repository not)
- [ ] API response shape matches existing endpoints
- [ ] Error handling style matches codebase convention
- [ ] Import order follows codebase convention
```

---

**Last Updated**: 2026-06-26  
**Applies to**: TypeScript · NestJS · Express · Node.js
