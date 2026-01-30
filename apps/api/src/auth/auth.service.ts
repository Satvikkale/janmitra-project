import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { User } from '../users/user.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectModel(User.name) private users: Model<User>,
    private jwt: JwtService,
  ) {}

  /**
   * Register a new user
   */
  async register({ name, email, phone, password }: { name: string; email?: string; phone?: string; password: string }) {
    try {
      if (!email && !phone) throw new BadRequestException('email or phone required');
      const existing = await this.users.findOne({ $or: [{ email }, { phone }] }).lean();
      if (existing) throw new BadRequestException('User already exists');
      const passwordHash = await argon2.hash(password);
      const u = await this.users.create({ name, email, phone, passwordHash, roles: ['resident'] });
      const tokens = this.signPair(String(u._id), u.roles);
      this.logger.log(`User registered: ${u._id}`);
      return { user: this.publicUser(u), ...tokens };
    } catch (error) {
      this.logger.error('Error registering user', error.stack);
      throw error;
    }
  }

  /**
   * Login user with identifier and password
   */
  async login(identifier: string, password: string) {
    try {
      const u = await this.users.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
      if (!u || !u.passwordHash || !(await argon2.verify(u.passwordHash, password))) {
        this.logger.warn(`Failed login attempt for identifier: ${identifier}`);
        throw new UnauthorizedException('Invalid credentials');
      }
      const tokens = this.signPair(String(u._id), u.roles);
      this.logger.log(`User logged in: ${u._id}`);
      return { user: this.publicUser(u), ...tokens };
    } catch (error) {
      this.logger.error('Error logging in user', error.stack);
      throw error;
    }
  }

  /**
   * Refresh JWT tokens
   */
  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, { secret: process.env.JWT_SECRET });
      if (payload.typ !== 'refresh') throw new UnauthorizedException();
      const tokens = this.signPair(payload.sub, payload.roles || []);
      this.logger.log(`Token refreshed for user: ${payload.sub}`);
      return tokens;
    } catch (error) {
      this.logger.warn('Invalid refresh token');
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private signPair(sub: string, roles: string[]) {
    const accessToken = this.jwt.sign(
      { sub, roles, typ: 'access' },
      { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' } as any,
    );
    const refreshToken = this.jwt.sign(
      { sub, roles, typ: 'refresh' },
      { expiresIn: process.env.REFRESH_TOKEN_TTL || '7d' } as any,
    );
    return { accessToken, refreshToken };
  }

  private publicUser(u: any) {
    return { id: String(u._id), name: u.name, email: u.email, phone: u.phone, roles: u.roles };
  }
  
}