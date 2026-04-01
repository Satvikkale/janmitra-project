import { Body, Controller, Post, Get, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto, NgoRegisterDto, ForgotPasswordDto, ResetPasswordDto, OrganizationRegisterDto, OrganizationUserRegisterDto } from './dto';

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
    email: string;
    position: string;
    mobileNo: string;
    password: string;
  }) {
    return this.auth.registerNgoUser(dto);
  }

  @Post('register-org-user')
  registerOrgUser(@Body() dto: OrganizationUserRegisterDto) {
    return this.auth.registerOrgUser(dto);
  }

  @Post('register-ngo')
  registerNgo(@Body() dto: NgoRegisterDto) {
    return this.auth.registerNgo(dto);
  }

  @Post('register-organization')
  registerOrganization(@Body() dto: OrganizationRegisterDto) {
    return this.auth.registerOrganization(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    this.logger.log('Login endpoint called');
    return this.auth.login(dto.identifier, dto.password, dto.userType, dto.ngoName, dto.organizationId);
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

  @Get('available-organizations')
  getAvailableOrganizations() {
    return this.auth.getAvailableOrganizations();
  }
}