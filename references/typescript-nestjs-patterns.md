# TypeScript & NestJS Patterns — Principal Engineering Reference

> All examples use TypeScript. This reference covers type safety patterns,
> NestJS architectural rules, DTO validation, Guards/Pipes/Interceptors,
> TypeORM/Prisma patterns, and NestJS testing conventions.

---

## Part 1: TypeScript Type Safety — Advanced Patterns

### 1.1 Type Guards (Narrow `unknown` Safely)

```typescript
// ❌ BAD — type assertion with no check
function processWebhook(payload: unknown) {
  const event = payload as WebhookEvent; // crashes if payload is malformed
  handleEvent(event);
}

// ✅ GOOD — type guard narrows safely
function isWebhookEvent(payload: unknown): payload is WebhookEvent {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'type' in payload &&
    'data' in payload
  );
}

function processWebhook(payload: unknown) {
  if (!isWebhookEvent(payload)) {
    throw new BadRequestException('Invalid webhook payload');
  }
  handleEvent(payload); // payload is now WebhookEvent — type-safe
}
```

### 1.2 Discriminated Unions — Model State Machines

```typescript
// ❌ BAD — optional fields make state unclear
interface Order {
  id: string;
  status: string;
  shippedAt?: Date;          // only valid in 'shipped' state
  deliveredAt?: Date;        // only valid in 'delivered' state
  cancellationReason?: string; // only valid in 'cancelled' state
}

// ✅ GOOD — discriminated union enforces valid states
type Order =
  | { id: string; status: 'pending' }
  | { id: string; status: 'confirmed'; confirmedAt: Date }
  | { id: string; status: 'shipped';   confirmedAt: Date; shippedAt: Date }
  | { id: string; status: 'cancelled'; cancellationReason: string };

// TypeScript now enforces you access the right fields for each state
function processOrder(order: Order) {
  if (order.status === 'shipped') {
    console.log(order.shippedAt); // ✅ guaranteed to exist
  }
}
```

### 1.3 Generic Types — Use Them; Don't Repeat Yourself

```typescript
// ❌ BAD — repeated wrapper type for every resource
interface UsersApiResponse {
  data: User[];
  total: number;
  page: number;
}

interface OrdersApiResponse {
  data: Order[];
  total: number;
  page: number;
}

// ✅ GOOD — single generic type
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type UsersApiResponse  = PaginatedResponse<UserResponseDto>;
type OrdersApiResponse = PaginatedResponse<OrderResponseDto>;
```

### 1.4 Branded Types — Prevent ID Mix-Ups

```typescript
// ❌ BAD — these are all just strings; easy to pass the wrong one
function getOrdersByUser(userId: string, orderId: string) { ... }
getOrdersByUser(orderId, userId); // ← silent bug, compiles fine

// ✅ GOOD — branded types make mix-ups a compile error
type UserId  = string & { readonly brand: unique symbol };
type OrderId = string & { readonly brand: unique symbol };

function makeUserId(id: string): UserId   { return id as UserId; }
function makeOrderId(id: string): OrderId { return id as OrderId; }

function getOrdersByUser(userId: UserId, orderId: OrderId) { ... }
getOrdersByUser(makeOrderId(id), makeUserId(id)); // ← compile error! correct.
```

### 1.5 `satisfies` Operator — Validate Without Widening

```typescript
// ✅ GOOD — TypeScript validates shape but infers literal types
const config = {
  port:    3000,
  logLevel: 'info',
  db: {
    host: 'localhost',
    port: 5432,
  },
} satisfies AppConfig;

// config.logLevel is inferred as 'info' (not string), keeping literal type
```

### 1.6 Mapped Types — Avoid Manual Interface Repetition

```typescript
// ❌ BAD — manually duplicated field definitions
interface CreateUserDto {
  email: string;
  name: string;
  password: string;
}

interface UpdateUserDto {
  email?: string;
  name?: string;
  // someone forgot 'password' — drift between types
}

// ✅ GOOD — derive from canonical type
type UpdateUserDto = Partial<Pick<CreateUserDto, 'email' | 'name' | 'password'>>;

// For response DTOs — strip sensitive fields
type UserResponseDto = Omit<User, 'passwordHash' | 'refreshToken'>;
```

---

## Part 2: NestJS Architecture Patterns

### 2.1 The Three-Layer Rule (Strict Enforcement)

```typescript
// RULE: Each layer only talks to the layer directly below it.

// ❌ BAD — Controller reaches into Repository (skips Service)
@Controller('/users')
export class UserController {
  constructor(private readonly userRepository: UserRepository) {}

  @Get('/:id')
  async getUser(@Param('id') id: string) {
    return this.userRepository.findOne({ where: { id } }); // bypasses service
  }
}

// ✅ GOOD — Controller → Service → Repository
@Controller('/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/:id')
  async getUser(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.getUserById(id);
  }
}
```

### 2.2 Module Design — Explicit Boundaries

```typescript
// ✅ GOOD — clean module with explicit boundaries
@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile]),
    ConfigModule,                    // only if this module needs config
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    { provide: IEmailService, useClass: EmailService }, // abstraction
  ],
  exports: [UserService],            // expose Service, never Repository
})
export class UserModule {}

// ❌ BAD — exporting Repository breaks encapsulation
exports: [UserRepository, UserService]

// ❌ BAD — forwardRef signals a circular dependency
imports: [forwardRef(() => OrderModule)]
// Fix: extract shared logic into a SharedModule that both import
```

### 2.3 Dependency Injection — Constructor Injection Only

```typescript
// ❌ BAD — property injection hides dependencies, hard to test
@Injectable()
export class OrderService {
  @Inject(UserService)
  private userService: UserService; // implicit, not in constructor

  @Inject(PaymentService)
  private paymentService: PaymentService;
}

// ✅ GOOD — constructor injection is explicit and testable
@Injectable()
export class OrderService {
  constructor(
    private readonly userService: UserService,
    private readonly paymentService: PaymentService,
    private readonly orderRepository: OrderRepository,
    private readonly logger: Logger,
  ) {}
}
```

### 2.4 Custom Repository Pattern (TypeORM)

```typescript
// ✅ GOOD — encapsulate query logic in repository
@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  async findActiveOrdersByUser(userId: string): Promise<Order[]> {
    return this.repo
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status NOT IN (:...statuses)', {
        statuses: [OrderStatus.CANCELLED, OrderStatus.DELIVERED],
      })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async findWithPagination(options: PaginationOptions): Promise<[Order[], number]> {
    return this.repo.findAndCount({
      skip:  (options.page - 1) * options.limit,
      take:  Math.min(options.limit, 100),
      order: { createdAt: 'DESC' },
    });
  }
}
```

---

## Part 3: Guards, Pipes, Interceptors & Filters

### 3.1 Guards — Authentication & Authorization

```typescript
// ✅ GOOD — JWT guard that populates request.user
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = User>(err: Error, user: TUser): TUser {
    if (err || !user) throw new UnauthorizedException('Invalid or expired token');
    return user;
  }
}

// ✅ GOOD — role guard that reads from decorator metadata
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true; // no role requirement = public

    const { user } = context.switchToHttp().getRequest<{ user: User }>();
    return requiredRoles.some(role => user.roles.includes(role));
  }
}

// Usage in controller
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Delete('/users/:id')
async deleteUser(@Param('id') id: string): Promise<void> {
  return this.userService.delete(id);
}
```

### 3.2 Pipes — Validation & Transformation

```typescript
// ✅ GOOD — global ValidationPipe configuration (in main.ts)
app.useGlobalPipes(new ValidationPipe({
  whitelist:            true,  // strip unknown fields (prevents mass assignment)
  forbidNonWhitelisted: true,  // 400 on unknown fields (stricter)
  transform:            true,  // auto-transform to DTO class instances
  transformOptions: {
    enableImplicitConversion: true, // auto-convert query strings to numbers/booleans
  },
}));

// ✅ GOOD — custom pipe for UUID validation
@Injectable()
export class ParseUUIDPipe implements PipeTransform {
  transform(value: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new BadRequestException(`${value} is not a valid UUID`);
    }
    return value;
  }
}

// Usage
@Get('/:id')
async getUser(@Param('id', ParseUUIDPipe) id: string) { ... }
// Or use NestJS built-in: @Param('id', new ParseUUIDPipe({ version: '4' }))
```

### 3.3 Interceptors — Cross-Cutting Concerns

```typescript
// ✅ GOOD — logging interceptor with request timing
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req    = context.switchToHttp().getRequest<Request>();
    const start  = Date.now();
    const method = req.method;
    const url    = req.url;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`${method} ${url} — ${duration}ms`);
      }),
    );
  }
}

// ✅ GOOD — response wrapper interceptor (consistent response shape)
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success:   true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### 3.4 Exception Filters — Unified Error Responses

```typescript
// ✅ GOOD — global exception filter for consistent error format
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx    = host.switchToHttp();
    const res    = ctx.getResponse<Response>();
    const req    = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status  = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttpException ? exception.getResponse() : 'Internal server error';

    // Log 5xx errors with full context; 4xx are client errors (less noise)
    if (status >= 500) {
      this.logger.error('Unhandled server error', {
        path:   req.url,
        method: req.method,
        body:   req.body,
        error:  exception instanceof Error ? exception.message : String(exception),
        stack:  exception instanceof Error ? exception.stack  : undefined,
      });
    }

    res.status(status).json({
      statusCode: status,
      timestamp:  new Date().toISOString(),
      path:       req.url,
      message:    typeof message === 'string'
        ? message
        : (message as Record<string, unknown>).message ?? 'Unknown error',
    });
  }
}
```

---

## Part 4: DTO Validation Patterns

### 4.1 DTO Best Practices

```typescript
// ✅ GOOD — fully decorated DTO
import {
  IsEmail, IsString, IsEnum, IsUUID, IsOptional,
  MinLength, MaxLength, IsArray, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(PaymentMethod, { message: 'Invalid payment method' })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class OrderItemDto {
  @IsUUID('4')
  productId: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}
```

### 4.2 Response DTOs — Never Return Entities Directly

```typescript
// ❌ BAD — returns raw DB entity with passwordHash, refreshToken, etc.
@Get('/:id')
async getUser(@Param('id') id: string): Promise<User> {
  return this.userService.getUserById(id);
}

// ✅ GOOD — map to safe response DTO
export class UserResponseDto {
  id:        string;
  email:     string;
  name:      string;
  role:      UserRole;
  createdAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id        = user.id;
    dto.email     = user.email;
    dto.name      = user.name;
    dto.role      = user.role;
    dto.createdAt = user.createdAt;
    return dto;
  }
}

// OR use class-transformer with @Exclude()
export class UserResponseDto {
  @Expose() id:        string;
  @Expose() email:     string;
  @Expose() name:      string;
  @Exclude() passwordHash: string; // never sent to client
}

// In controller
@Get('/:id')
async getUser(@Param('id') id: string): Promise<UserResponseDto> {
  const user = await this.userService.getUserById(id);
  return UserResponseDto.fromEntity(user);
}
```

---

## Part 5: TypeORM Patterns

### 5.1 Entity Definition Best Practices

```typescript
// ✅ GOOD — typed entity with all columns explicit
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', select: false }) // never auto-selected
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null; // soft delete
}
```

### 5.2 QueryBuilder — Complex Queries

```typescript
// ✅ GOOD — complex query with proper typing
async findOrdersReport(filters: OrderReportFilters): Promise<OrderReportRow[]> {
  return this.orderRepository
    .createQueryBuilder('order')
    .select([
      'order.id',
      'order.status',
      'order.total',
      'user.email',
      'user.name',
    ])
    .innerJoin('order.user', 'user')
    .where('order.createdAt BETWEEN :from AND :to', {
      from: filters.from,
      to:   filters.to,
    })
    .andWhere(filters.status ? 'order.status = :status' : '1=1', {
      status: filters.status,
    })
    .orderBy('order.createdAt', 'DESC')
    .limit(filters.limit ?? 100)
    .getRawMany<OrderReportRow>();
}
```

### 5.3 Transactions — Use Them for Multi-Step Writes

```typescript
// ✅ GOOD — transaction wraps all related writes atomically
async createOrderWithInventory(dto: CreateOrderDto): Promise<Order> {
  return this.dataSource.transaction(async (manager) => {
    // All operations inside this block are atomic
    const order = manager.create(Order, {
      userId:        dto.userId,
      total:         dto.total,
      status:        OrderStatus.PENDING,
      paymentMethod: dto.paymentMethod,
    });
    await manager.save(order);

    // Decrement inventory — must succeed or entire transaction rolls back
    for (const item of dto.items) {
      const result = await manager.decrement(
        Product,
        { id: item.productId, stockCount: MoreThanOrEqual(item.quantity) },
        'stockCount',
        item.quantity,
      );
      if (result.affected === 0) {
        throw new ConflictException(`Product ${item.productId} out of stock`);
      }
    }

    return order;
  });
}
```

### 5.4 Soft Delete Pattern

```typescript
// ✅ GOOD — soft delete keeps data for audit trail
@Entity()
export class User {
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}

// TypeORM automatically filters deleted records when using withDeleted: false (default)
const activeUsers = await userRepository.find(); // excludes soft-deleted
const allUsers    = await userRepository.find({ withDeleted: true }); // includes deleted

// Restore
await userRepository.restore({ id: userId });
```

---

## Part 6: NestJS Testing Patterns

### 6.1 Unit Test Structure

```typescript
// ✅ GOOD — clean unit test with explicit mocking
describe('OrderService', () => {
  let service:         OrderService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let userService:     jest.Mocked<UserService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: OrderRepository,
          useValue: {
            findOne:        jest.fn(),
            save:           jest.fn(),
            findAndCount:   jest.fn(),
          } satisfies Partial<jest.Mocked<OrderRepository>>,
        },
        {
          provide: UserService,
          useValue: {
            getUserById: jest.fn(),
          } satisfies Partial<jest.Mocked<UserService>>,
        },
      ],
    }).compile();

    service         = module.get<OrderService>(OrderService);
    orderRepository = module.get(OrderRepository);
    userService     = module.get(UserService);
  });

  describe('createOrder', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      userService.getUserById.mockResolvedValueOnce(null);

      await expect(service.create(mockCreateOrderDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should return created order with correct status', async () => {
      userService.getUserById.mockResolvedValueOnce(mockUser);
      orderRepository.save.mockResolvedValueOnce(mockOrder);

      const result = await service.create(mockCreateOrderDto);

      expect(result.status).toBe(OrderStatus.PENDING);
      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockCreateOrderDto.userId }),
      );
    });
  });
});
```

### 6.2 Integration Test with TestingModule

```typescript
// ✅ GOOD — integration test that spins up full module
describe('UserController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({ ...testDbConfig }),
        UserModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /users should return 201 with valid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com', password: 'SecurePass123!' })
      .expect(201);

    expect(response.body.data.email).toBe('test@example.com');
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });

  it('POST /users should return 400 with invalid email', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'not-an-email', password: 'SecurePass123!' })
      .expect(400);
  });
});
```

### 6.3 Test Factories (Avoid Repetitive Mock Data)

```typescript
// ✅ GOOD — test factories for consistent test data
// tests/factories/user.factory.ts
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id:           'user-uuid-123',
    email:        'test@example.com',
    name:         'Test User',
    role:         UserRole.USER,
    isActive:     true,
    passwordHash: '$2b$12$hashedpassword',
    createdAt:    new Date('2026-01-01'),
    updatedAt:    new Date('2026-01-01'),
    deletedAt:    null,
    ...overrides,
  };
}

export function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id:        'order-uuid-456',
    userId:    'user-uuid-123',
    status:    OrderStatus.PENDING,
    total:     99.99,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}
```

---

## Part 7: Common NestJS Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Logic in `main.ts` | Untestable bootstrap code | Move to `AppModule` providers |
| `@InjectRepository` directly in Service | Leaks data layer concern | Use custom Repository class |
| Multiple `forRoot()` calls | Multiple DB connections | One `forRoot()` in `AppModule` |
| `forwardRef()` everywhere | Circular dependencies | Extract shared module |
| No `exports` in module | Breaks encapsulation | Define explicit public API |
| `useGlobalGuards` in module (not `AppModule`) | Order-dependent | Register in `AppModule` or `main.ts` |
| Missing `@nestjs/schedule` for cron | Manual `setInterval` in service | Use `@Cron()` decorator |
| Fat Controller (50+ lines of logic) | SRP violation | Move logic to Service |
| Directly modifying `req.user` type | Unsafe | Extend `Request` with `declare module` |

### Extending Request Type Safely

```typescript
// ✅ GOOD — extend Express Request type globally
// src/types/express.d.ts
declare module 'express' {
  interface Request {
    user?: User;
    requestId?: string;
  }
}

// Now you can safely access req.user without casting
@Get('/me')
getMe(@Req() req: Request): UserResponseDto {
  return UserResponseDto.fromEntity(req.user!);
}
```

---

## Part 9: Mongoose + NestJS — Full Pattern Reference

> Mongoose is the primary ODM in this codebase. Every pattern below is what the
> principal engineering board expects to see. Deviations need justification.

---

### 9.1 Schema Definition — `@Schema` / `@Prop` Decorators

```typescript
// ❌ BAD — plain JS object schema, no TypeScript contract
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
});

// ✅ GOOD — typed schema with decorators (NestJS @nestjs/mongoose)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,         // adds createdAt / updatedAt automatically
  collection: 'users',      // explicit collection name — no magic pluralisation surprises
  versionKey: false,        // removes __v field unless you need optimistic locking
})
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })  // select:false — NEVER sent in queries by default
  password: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),          // enum validated at DB level too
    default: UserRole.USER,
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  // ✅ Ref typed — use Types.ObjectId for raw, or populate with typed ref
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true })
  organizationId: mongoose.Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);

// ✅ Compound index defined OUTSIDE the class, ON the schema
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1, isActive: 1 });   // compound for common query
UserSchema.index({ createdAt: -1 });                    // for time-sorted list queries
```

---

### 9.2 Module Registration — `MongooseModule.forFeature`

```typescript
// ❌ BAD — registering without typed injection token
@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema }])],
})

// ✅ GOOD — use the class as the token (type-safe injection)
// users.module.ts
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [UsersService, UsersRepository],
  exports: [UsersRepository],   // export the repository, not the service, for cross-module use
})
export class UsersModule {}

// ✅ GOOD — root connection in AppModule
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
        // DO NOT set these here — prefer connection string params or atlas options
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

---

### 9.3 Repository Pattern — Correct `@InjectModel` Usage

```typescript
// ❌ BAD — fat service doing DB operations directly
@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();   // DB logic leaking into service
  }
}

// ✅ GOOD — thin repository owns all DB access; service owns business logic
// users.repository.ts
@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .lean()     // returns plain JS object — faster for reads that don't call .save()
      .exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!mongoose.isValidObjectId(id)) return null;  // ✅ validate before query
    return this.userModel.findById(id).exec();
  }

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const user = new this.userModel(dto);
    return user.save();
  }

  async findActiveByOrg(orgId: string): Promise<UserDocument[]> {
    return this.userModel
      .find({ organizationId: new mongoose.Types.ObjectId(orgId), isActive: true })
      .select('-password')   // ✅ never return password hash — belt + suspenders over select:false
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}

// users.service.ts — no Mongoose imports here
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }
}
```

---

### 9.4 `lean()` — When to Use and When NOT To

```typescript
// lean() returns a plain JS object (POJO), NOT a Mongoose Document.
// That means: no .save(), no virtuals, no middleware hooks.

// ✅ USE lean() for:
//   - Read-only queries (list endpoints, GET by ID, reports)
//   - Any query where you only need the data, not Mongoose methods
//   - Performance-critical paths — lean is 2-5x faster than hydrated docs

const users = await this.userModel
  .find({ isActive: true })
  .select('email name role')
  .lean<User[]>()   // ✅ typed lean — returns User[] not Document[]
  .exec();

// ❌ DO NOT use lean() when:
//   - You need to call .save() after modifying the doc
//   - You rely on virtual fields
//   - You use pre/post hooks that need the Mongoose document instance

const user = await this.userModel.findById(id).exec(); // no .lean()
user.lastLoginAt = new Date();
await user.save(); // ✅ works because it's a full Document
```

---

### 9.5 Populate — Do It Right

```typescript
// ❌ BAD — untyped populate, no field selection
const order = await this.orderModel
  .findById(id)
  .populate('userId')   // returns entire user document including password hash!
  .exec();

// ✅ GOOD — typed, field-selected populate
import { Types, PopulatedDoc } from 'mongoose';

// In Order schema:
@Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
userId: Types.ObjectId;

// Populated type
type PopulatedOrder = Omit<Order, 'userId'> & { userId: Pick<User, 'email' | 'name'> };

const order = await this.orderModel
  .findById(id)
  .populate<{ userId: Pick<User, 'email' | 'name'> }>({
    path: 'userId',
    select: 'email name',   // ✅ only select what you need — never expose password
  })
  .lean<PopulatedOrder>()
  .exec();

// ✅ For N+1: use $lookup aggregation instead of populate() in loops
// See references/database-n1-queries.md — Mongoose section
```

---

### 9.6 ObjectId Validation — Never Skip This

```typescript
// ❌ BAD — invalid ObjectId passed to findById → Mongoose throws CastError → 500 error
@Get(':id')
async getUser(@Param('id') id: string) {
  return this.usersService.findById(id); // if id = 'abc', Mongoose crashes
}

// ✅ GOOD — validate in the DTO / param pipe, or guard in the repository

// Option 1: Custom Pipe
@Injectable()
export class ParseObjectIdPipe implements PipeTransform {
  transform(value: string): string {
    if (!mongoose.isValidObjectId(value)) {
      throw new BadRequestException(`'${value}' is not a valid MongoDB ObjectId`);
    }
    return value;
  }
}

@Get(':id')
async getUser(@Param('id', ParseObjectIdPipe) id: string): Promise<UserResponseDto> {
  return this.usersService.findById(id);
}

// Option 2: IsMongoId decorator in DTO
import { IsMongoId } from 'class-validator';

export class GetUserParamsDto {
  @IsMongoId()
  id: string;
}
```

---

### 9.7 Transactions — Session-Based Write Integrity

```typescript
// ❌ BAD — two writes, no transaction; partial failure = corrupted state
async transferBalance(fromId: string, toId: string, amount: number): Promise<void> {
  await this.walletModel.updateOne({ _id: fromId }, { $inc: { balance: -amount } });
  await this.walletModel.updateOne({ _id: toId },   { $inc: { balance: +amount } });
  // If the second write fails — money vanishes
}

// ✅ GOOD — MongoDB multi-document transaction with session
async transferBalance(fromId: string, toId: string, amount: number): Promise<void> {
  const session = await this.connection.startSession();
  session.startTransaction();
  try {
    await this.walletModel.updateOne(
      { _id: fromId },
      { $inc: { balance: -amount } },
      { session },
    );
    await this.walletModel.updateOne(
      { _id: toId },
      { $inc: { balance: +amount } },
      { session },
    );
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// Inject connection in constructor:
constructor(
  @InjectConnection() private readonly connection: mongoose.Connection,
  @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
) {}
```

---

### 9.8 Virtuals & Transforms — Control the Response Shape

```typescript
// ❌ BAD — Mongoose _id and __v leak into API responses
// Response: { "_id": "...", "__v": 0, "email": "..." }

// ✅ GOOD — schema-level transform controls serialisation
@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();  // expose 'id' not '_id'
      delete ret._id;
      delete ret.password;          // belt + suspenders — never expose password
      return ret;
    },
  },
})
export class User { ... }

// ✅ GOOD — add a virtual for computed fields
UserSchema.virtual('fullName').get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// ⚠️ REMINDER: virtuals are NOT available on lean() queries
// If you need a virtual in a response, either hydrate the document OR compute it in the DTO
```

---

### 9.9 `strict` Mode — Never Disable It

```typescript
// ❌ CRITICAL — turning off strict allows arbitrary fields into the DB
const userSchema = new mongoose.Schema({ email: String }, { strict: false });
// Any field from req.body can now be stored — mass assignment / prototype pollution risk

// ✅ GOOD — strict is ON by default; never override it
// If you need to store dynamic fields, use a typed Map or explicit Mixed field:
@Prop({ type: Map, of: String })
metadata: Map<string, string>;  // controlled flexible field
```

---

### 9.10 Common Mongoose Mistakes to Flag in Review

| # | Mistake | Severity | Fix |
|---|---------|----------|-----|
| M-1 | `findOne({ email: req.body.email })` without coercing to string | 🔴 Critical | `const email = String(req.body.email)` |
| M-2 | `populate()` without `select` — exposes full document including sensitive fields | 🔴 Critical | Always pass `select: 'field1 field2'` |
| M-3 | `lean()` on a document you then call `.save()` on | 🔴 Critical | Remove `.lean()` when you need to mutate |
| M-4 | No `mongoose.isValidObjectId()` check before `findById` | 🟠 High | Add `ParseObjectIdPipe` or validate in repo |
| M-5 | Multi-document writes without a session/transaction | 🟠 High | Use `startSession()` + `startTransaction()` |
| M-6 | No index on fields used in `.find()` / `.findOne()` filters | 🟠 High | Add `SchemaName.index({ field: 1 })` |
| M-7 | Using numeric enum values in `enum` prop — unreadable in DB | 🟡 Medium | Switch to string enums |
| M-8 | `select: false` on password but no belt+suspenders `.select('-password')` in repo | 🟡 Medium | Add `.select('-password')` to all find queries as defence-in-depth |
| M-9 | `{ strict: false }` on any schema | 🔴 Critical | Remove — never disable strict mode |
| M-10 | Creating `Model<any>` instead of `Model<UserDocument>` | 🟠 High | Always type the model with `HydratedDocument<T>` |
| M-11 | Not using `connection.startSession()` — using `mongoose.startSession()` directly in NestJS | 🟡 Medium | Inject `@InjectConnection()` and use that |
| M-12 | Missing `versionKey: false` when __v is not used | 🟡 Medium | Add to schema options to keep responses clean |

---

**Last Updated**: 2026-06-26  
**Stack**: TypeScript 5.x · NestJS 10+ · Mongoose 8+ · MongoDB 7+ · Node.js 20+
