import { Controller, Post, Body, UseGuards, Get, HttpCode, HttpStatus, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { RateLimit, RateLimitGuard } from '../common/guards/rate-limit.guard';
import { User } from '@prisma/client';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ ttl: 3600000, limit: 3 })
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    return this.authService.register(registerDto, req.ip);
  }

  @Public()
  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit({ ttl: 900000, limit: 5 })
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, req.ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.logout(refreshTokenDto.refreshToken, req.ip);
  }

  @Public()
  @Get('verify-email/:token')
  verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@GetUser() user: User) {
    return this.authService.resendVerificationEmail(user.id);
  }

  @Get('me')
  getProfile(@GetUser() user: User) {
    return { user };
  }
}
