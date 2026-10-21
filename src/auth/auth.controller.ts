import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginUserDto, LogoutDto, RefreshTokenDto } from './dto';
import { JwtTokens } from './interfaces';
import { Auth, CurrentUser, Public } from './decorators';
import { Role } from 'src/users/interfaces';
import { User } from 'src/users/entities';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  create(
    @Body() loginUserDto: LoginUserDto,
    @Req() req: Request,
  ): Promise<JwtTokens> {
    return this.authService.login(loginUserDto, req);
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    return await this.authService.refreshTokens(refreshTokenDto);
  }

  @Auth(Role.ADMIN, Role.USER)
  @Post('logout')
  async logout(
    @CurrentUser() user: User,
    @Body() logoutDto: LogoutDto,
  ): Promise<{ message: string }> {
    return await this.authService.logout(logoutDto, user);
  }

  @Auth(Role.ADMIN, Role.USER)
  @Get('profile/:codUser')
  async findSession(
    @Param('codUser') codUser: string,
    @CurrentUser() user: User,
  ) {
    return await this.authService.profile(codUser, user);
  }
}
