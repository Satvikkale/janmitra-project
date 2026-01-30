import { Body, Controller, Post, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private auth: AuthService) {}

  /**
   * Register endpoint
   */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    this.logger.log('Register endpoint called');
    return this.auth.register(dto);
  }

  /**
   * Login endpoint
   */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    this.logger.log('Login endpoint called');
    return this.auth.login(dto.identifier, dto.password);
  }

  /**
   * Refresh endpoint
   */
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    this.logger.log('Refresh endpoint called');
    return this.auth.refresh(dto.refreshToken);
  }
}