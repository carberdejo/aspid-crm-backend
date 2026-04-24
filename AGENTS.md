# AGENTS.md - NestJS Backend Development Guide

This document provides essential information for AI coding agents working in this repository.

## Project Overview

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Architecture**: Modular structure with controllers, services, entities, DTOs
- **API Prefix**: `api/v1`
- **Port**: 5000 (default)

## Build, Lint, and Test Commands

### Build & Run

```bash
npm run build                 # Build the project
npm run start                 # Start in production mode
npm run start:dev             # Start in watch mode (development)
npm run start:debug           # Start with debugger
npm run start:prod            # Run built production code
```

### Linting & Formatting

```bash
npm run lint                  # Run ESLint with auto-fix
npm run format                # Format code with Prettier
```

### Testing

```bash
npm test                      # Run all unit tests
npm run test:watch            # Run tests in watch mode
npm run test:cov              # Run tests with coverage report
npm run test:e2e              # Run end-to-end tests
npm run test:debug            # Run tests with Node debugger
```

### Running a Single Test

```bash
# Run a specific test file
npm test -- users.service.spec.ts

# Run tests matching a pattern
npm test -- --testNamePattern="create"

# Run a specific test file in watch mode
npm test -- --watch users.service.spec.ts
```

## Code Style Guidelines

### Import Organization

1. **External libraries first** (NestJS, TypeORM, etc.)
2. **Internal modules second** (src imports)
3. **Use path aliases**: `src/` for internal imports
4. **Group by type**: decorators, services, entities, DTOs, interfaces

Example:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { ApiException } from 'src/common/exceptions/api.exception';
import { DepartmentsService } from 'src/departments/departments.service';
```

### Formatting (Prettier)

- **Single quotes** for strings
- **Trailing commas** on all multi-line structures
- **End of line**: Auto (handles cross-platform)
- 2 spaces for indentation

### TypeScript Configuration

- **Target**: ES2023
- **Module**: NodeNext (ESM compatible)
- **Strict null checks**: Enabled
- **No implicit any**: Disabled (explicit `any` allowed)
- **Decorators**: Enabled (experimentalDecorators, emitDecoratorMetadata)

### ESLint Rules

- **No explicit any**: Disabled (`@typescript-eslint/no-explicit-any: off`)
- **No floating promises**: Warning (must handle promises properly)
- **No unsafe argument**: Warning
- Use TypeScript ESLint recommended config

## Naming Conventions

### Files

- **Entities**: `*.entity.ts` (e.g., `user.entity.ts`)
- **Controllers**: `*.controller.ts` (e.g., `users.controller.ts`)
- **Services**: `*.service.ts` (e.g., `users.service.ts`)
- **DTOs**: `*.dto.ts` (e.g., `create-user.dto.ts`)
- **Interfaces**: `*.interface.ts` or defined in `interfaces/index.ts`
- **Tests**: `*.spec.ts` (co-located with implementation)

### Classes and Variables

- **Classes**: PascalCase (`UsersService`, `CreateUserDto`)
- **Interfaces**: PascalCase with descriptive names (`UserResponse`, `Role`)
- **Variables/parameters**: camelCase (`createUserDto`, `mockUserRepository`)
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for config
- **Database columns**: snake_case (`cod_user`, `first_name`)

### Entity Properties

- Use `@Column` decorator with explicit names for database mapping
- Entity properties in camelCase, database columns in snake_case:

```typescript
@Column({ name: 'cod_user', type: 'varchar', length: 50, unique: true })
codUser: string;
```

## DTOs and Validation

### Use class-validator Decorators

```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  codUser: string;

  @IsEmail({}, { message: 'El formato del correo es inválido' })
  email: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  departmentIds: number[];
}
```

### Global Validation Pipe

- **Whitelist**: true (strip non-whitelisted properties)
- **ForbidNonWhitelisted**: true (throw error on unknown properties)

## Error Handling

### Use ApiException for Business Logic Errors

```typescript
throw new ApiException(
  400, // Business error code
  'User email already exists', // Message
  [errorDetails], // Optional error array
  HttpStatus.BAD_REQUEST, // HTTP status (default: 400)
);
```

### Error Response Structure

```typescript
{
  code: number;      // Business error code
  message: string;   // Human-readable message
  errors?: any[];    // Additional details
}
```

### Try-Catch Best Practices

- Always catch errors in service methods
- Log errors using Logger before throwing
- Transform database/external errors into ApiException
- Provide meaningful error messages in Spanish (business language)

## Testing Standards

### Test File Structure

Follow the **AAA pattern** (Arrange, Act, Assert):

```typescript
describe('UsersService', () => {
  let service: UsersService;

  // Define mocks
  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create user successfully', async () => {
      // ARRANGE: Setup data and mocks
      const createUserDto = {
        /* ... */
      };
      mockUserRepository.save.mockResolvedValue({ id: 1 });

      // ACT: Execute method
      const result = await service.create(createUserDto);

      // ASSERT: Verify results
      expect(result.message).toContain('created successfully');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });
});
```

### Mocking Guidelines

- **Mock ALL constructor dependencies** (repositories, services)
- Use `getRepositoryToken(Entity)` for TypeORM repositories
- Mock only the methods you actually use
- Use `jest.clearAllMocks()` in `afterEach`
- Use `mockResolvedValue()` for async methods
- Use `mockResolvedValueOnce()` for multiple different responses

### What to Test

- ✅ Business logic and validations
- ✅ Error handling and edge cases
- ✅ Data transformations
- ✅ Method calls and arguments
- ❌ Don't test trivial getters/setters
- ❌ Don't test external library behavior

## Architecture Patterns

### Module Structure

```
src/
├── module-name/
│   ├── dto/
│   │   ├── create-*.dto.ts
│   │   ├── update-*.dto.ts
│   │   └── query-*.dto.ts
│   ├── entities/
│   │   └── *.entity.ts
│   ├── interfaces/
│   │   └── index.ts
│   ├── *.controller.ts
│   ├── *.service.ts
│   ├── *.module.ts
│   ├── *.controller.spec.ts
│   └── *.service.spec.ts
```

### Dependency Injection

- Use constructor injection for all dependencies
- Inject repositories with `@InjectRepository(Entity)`
- Services are automatically injectable with `@Injectable()`

### Logger Usage

```typescript
export class UsersService {
  protected readonly logger = new Logger(UsersService.name);

  async create() {
    this.logger.log('Creating user...');
    this.logger.error(`Error: ${message}`);
  }
}
```

## Additional Resources

- Main documentation: `README.md`
- Testing guide (Spanish): `TESTING-GUIDE.md` - comprehensive testing tutorial
- NestJS docs: https://docs.nestjs.com
- TypeORM docs: https://typeorm.io

## Module Refactoring History

### Clients Module (Completed - April 2026)

The Clients module has been fully refactored and optimized following best practices. This serves as a reference implementation for future module refactorings.

#### Phase 1: Critical Issues (Security & Bugs) ✅

1. **Authentication Security**
   - Added `@Auth(Role.USER, Role.ADMIN)` to all endpoints
   - Fixed `AuthGuard('jwt')` specification in Swagger context
   - Protected all routes with proper role-based access control

2. **Route Ordering Fixed**
   - Reordered routes: specific routes (`/sunat/:ruc`) before generic routes (`/:ruc`)
   - Prevents NestJS from matching wrong routes

3. **Eager Loading Removed**
   - Removed `eager: true` from `Client.contacts` relationship
   - Prevents N+1 query problems and unwanted data loading
   - Use QueryBuilder with `leftJoinAndSelect` when relationships are needed

4. **Pagination Fixed**
   - `findAll()` now returns `{ message, data, total, limit, offset }`
   - Total count properly exposed for frontend pagination

#### Phase 2: Code Improvements ✅

1. **Complete Swagger Documentation**
   - All endpoints documented with `@ApiOperation`, `@ApiResponse`
   - Proper HTTP status codes and error descriptions

2. **Enhanced Validations**
   - Added `ParseIntPipe` for ID parameters
   - Improved DTO validations with meaningful Spanish error messages

3. **Improved Error Handling**
   - All service methods wrapped in try-catch blocks
   - Proper error typing: `error instanceof Error ? error.message : 'Error desconocido'`
   - Consistent ApiException usage with proper HTTP status codes

4. **Proper Logging**
   - Logger statements in all service methods
   - Log success operations and errors with context

5. **Timeout for External APIs**
   - 10-second timeout on `consultSunatApi()` using AbortController
   - Proper timeout error handling with 408 status

6. **Better Response Structures**
   - All methods return consistent: `{ message: string, data: any, total?: number }`
   - `create()` returns saved entity with ID, not just DTO

#### Phase 3: Quality Enhancements ✅

1. **UPDATE Endpoint Created**
   - Added `PATCH /clients/:id` endpoint
   - Validates client exists and prevents duplicate RUC
   - Proper error handling and logging
   - Uses existing `UpdateClientDto` (PartialType)

2. **Consistent Naming**
   - Renamed `consultaApiSunat` → `consultSunatApi` (English convention)
   - Controller method: `consultaSunat()` (Spanish route name preserved)

3. **Proper TypeScript Typing**
   - Removed all `any[]` from `ruc-response.interfaces.ts`
   - Created specific interfaces: `Telefono`, `ActividadEconomica`, `ComprobantePago`, etc.
   - Changed nullable types from `null` to `string | null`

4. **Comprehensive Unit Tests**
   - **28 tests total** (17 service + 11 controller)
   - All tests follow AAA pattern (Arrange, Act, Assert)
   - Service tests cover: create, update, findAll, findByRuc, contacts operations
   - Controller tests verify all endpoints and service interactions
   - 100% pass rate, 0 lint errors

#### Key Implementation Patterns

**Service Method Template:**

```typescript
async methodName(params) {
  try {
    this.logger.log('Operation description');

    // Validations
    // Business logic
    // Database operations

    this.logger.log('Success message');
    return { message: 'Success message', data: result };
  } catch (error) {
    if (error instanceof ApiException) throw error;

    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    this.logger.error(`Error: ${errorMessage}`);
    throw new ApiException(500, 'Error message', [errorMessage], 500);
  }
}
```

**QueryBuilder for Selective Loading:**

```typescript
const client = await this.clientRepository
  .createQueryBuilder('client')
  .leftJoinAndSelect('client.contacts', 'contacts')
  .where('client.ruc = :ruc', { ruc })
  .getOne();
```

**Test Structure Template:**

```typescript
describe('methodName', () => {
  it('should perform action successfully', async () => {
    // ARRANGE: Setup data and mocks
    const input = {
      /* test data */
    };
    mockRepository.method.mockResolvedValue(expectedResult);

    // ACT: Execute method
    const result = await service.methodName(input);

    // ASSERT: Verify results
    expect(result.message).toContain('exitosamente');
    expect(mockRepository.method).toHaveBeenCalledWith(input);
  });
});
```

#### Files Modified

- `src/clients/clients.controller.ts` - All endpoints with auth, Swagger, validation
- `src/clients/clients.service.ts` - All methods refactored with proper error handling
- `src/clients/entities/client.entity.ts` - Removed eager loading
- `src/clients/interfaces/ruc-response.interfaces.ts` - Proper TypeScript types
- `src/clients/clients.service.spec.ts` - 17 comprehensive tests
- `src/clients/clients.controller.spec.ts` - 11 comprehensive tests

#### Lessons Learned

1. **Always remove `eager: true`** - Use QueryBuilder for selective loading
2. **Order routes correctly** - Specific before generic
3. **Type catch errors** - `error instanceof Error ? error.message : 'Error desconocido'`
4. **Mock repository methods** - Don't forget `.create()` and `.findOne()` vs `.findOneBy()`
5. **Test with AAA pattern** - Clear separation improves readability
6. **Return structured responses** - Consistent `{ message, data, total? }` format

This module now serves as the **reference implementation** for all future refactorings.
