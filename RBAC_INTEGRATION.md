# RBAC Integration Guide

This guide covers integrating JWT tokens from the auth service into client applications and microservices.

## Token Structure

Tokens include role information in the payload:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1234567890,
  "exp": 1234568890
}
```

## Integration Patterns

### 1. Shared JWT Secret (Microservices)

All services verify tokens independently with the same secret.

**Setup:**
```typescript
// In your service
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
})
export class AppModule {}
```

**Create JWT strategy and roles guard** (similar to auth service implementation).

**Usage:**
```typescript
@Controller('products')
export class ProductsController {
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  createProduct(@Body() dto: CreateProductDto) {
    // Token verified, role checked
  }
}
```

### 2. Token Verification Endpoint

Call the auth service to validate tokens and fetch user data.

**Client service:**
```typescript
async function verifyToken(token: string) {
  const response = await fetch('http://auth-service:3000/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  if (!response.ok) throw new Error('Invalid token');
  return response.json();
}

async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const { user } = await verifyToken(token);
    if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/admin/products', requireAdmin, (req, res) => {
  // Handle request
});
```

### 3. API Gateway

Centralized authentication layer validates tokens once, forwards user info to downstream services.

**Gateway verifies:**
```typescript
@Injectable()
export class GatewayAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    
    if (!token) return false;
    
    try {
      const user = verify(token, process.env.JWT_SECRET);
      request.headers['x-user-id'] = user.sub;
      request.headers['x-user-role'] = user.role;
      return true;
    } catch {
      return false;
    }
  }
}
```

**Downstream service reads headers:**
```typescript
@Controller('products')
export class ProductsController {
  @Post()
  @Roles('ADMIN')
  createProduct(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string
  ) {
    // User already authenticated by gateway
  }
}
```

## Real-World Example: E-Commerce

**Scenario:** E-commerce service with product and order endpoints.

**Requirements:**
- Users browse products (public)
- Users create orders (auth required)
- Admins manage products (admin role)
- Admins view all orders (admin role)

**Implementation:**
```typescript
// products.controller.ts
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  @Get()
  @Public()
  findAll() {
    return this.productsService.findAll();
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }
}

// orders.controller.ts
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  @Post()
  @Roles('USER', 'ADMIN')
  create(@GetUser() user, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get('my-orders')
  @Roles('USER', 'ADMIN')
  getMyOrders(@GetUser() user) {
    return this.ordersService.findByUserId(user.id);
  }

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.ordersService.findAll();
  }
}
```

**Frontend (React):**
```typescript
class AuthService {
  async login(email: string, password: string) {
    const response = await fetch('http://auth-service:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  }

  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

const apiClient = {
  async request(url, options = {}) {
    const auth = new AuthService();
    const token = auth.getAccessToken();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 401) {
      await this.refreshToken();
      return this.request(url, options);
    }
    
    return response.json();
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await fetch('http://auth-service:3000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  }
};

function App() {
  return (
    <Routes>
      <Route path="/products" element={<Products />} />
      <Route path="/orders" element={
        <ProtectedRoute>
          <Orders />
        </ProtectedRoute>
      } />
      <Route path="/admin/products" element={
        <ProtectedRoute requiredRole="ADMIN">
          <AdminProducts />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
```

## Best Practices

**Token Storage:**
- Use HTTP-only cookies for refresh tokens (most secure)
- Store access token in memory (React state) or HTTP-only cookie
- Never use localStorage for sensitive tokens

**Token Refresh:**
- Implement automatic refresh before expiration
- Refresh every 14 minutes (token expires at 15m)
- Handle refresh failures with redirect to login

**Authorization:**
- Always validate roles on backend (frontend is for UX only)
- Use consistent role names across services
- Log failed authorization attempts

**Error Handling:**
- Return 401 (Unauthorized) for invalid/expired tokens
- Return 403 (Forbidden) for insufficient permissions
- Never expose detailed error messages to clients

## Troubleshooting

**"Invalid token" errors:**
- Verify JWT secret matches across services
- Check token format in Authorization header (Bearer <token>)
- Confirm token hasn't expired

**"Forbidden" errors despite valid token:**
- Verify user role in token payload
- Check role guard decorator on route
- Ensure roles match exactly (case-sensitive)

**Token refresh not working:**
- Verify refresh token exists in database
- Check if refresh token is expired or revoked
- Ensure refresh secret is configured correctly

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Store refresh tokens in HTTP-only cookies
- [ ] Implement token refresh mechanism
- [ ] Add rate limiting to auth endpoints
- [ ] Validate all requests on backend
- [ ] Never trust frontend validation
- [ ] Rotate secrets periodically
- [ ] Implement logout and token revocation
- [ ] Monitor authentication failures
- [ ] Enable CORS with specific origins only
- [ ] Use Helmet middleware for security headers
- [ ] Set up request validation globally
