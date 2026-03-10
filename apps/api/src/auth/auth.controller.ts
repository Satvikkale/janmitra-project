import { Body, Controller, Post, Get, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto, NgoRegisterDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    this.logger.log('Register endpoint called');
    return this.auth.register(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('register-ngo-user')
  registerNgoUser(@Body() dto: {
    ngoName: string;
    name: string;
    position: string;
    mobileNo: string;
    password: string;
  }) {
    return this.auth.registerNgoUser(dto);
  }

  @Post('register-ngo')
  registerNgo(@Body() dto: NgoRegisterDto) {
    return this.auth.registerNgo(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    this.logger.log('Login endpoint called');
    return this.auth.login(dto.identifier, dto.password, dto.userType, dto.ngoName);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    this.logger.log('Refresh endpoint called');
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('available-ngos')
  getAvailableNgos() {
    return this.auth.getAvailableNgos();
  }
}