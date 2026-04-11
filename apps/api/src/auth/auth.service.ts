import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.schema';
import { Org } from '../orgs/orgs.schema';
import { NgoUsersService } from '../ngo-users/ngo-users.service';
import { OrganizationUsersService } from '../organization-users/organization-users.service';
import { NgoRegisterDto, ForgotPasswordDto, ResetPasswordDto, OrganizationRegisterDto, OrganizationUserRegisterDto } from './dto';

// Simple in-memory store for verification codes (in production, use Redis or DB)
const verificationCodes = new Map<string, { code: string; expires: Date }>();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectModel(User.name) private users: Model<User>,
    @InjectModel(Org.name) private orgs: Model<Org>,
    private ngoUsersService: NgoUsersService,
    private organizationUsersService: OrganizationUsersService,
    private jwt: JwtService,
  ) {}

  /**
   * Register a new user (admin)
   */
  async register({ name, email, phone, password }: { name: string; email?: string; phone?: string; password: string }) {
    try {
      if (!name || name.trim().length === 0) throw new BadRequestException('name is required');
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
   * Register an NGO user (employee of an NGO)
   */
  async registerNgoUser(dto: {
    ngoName: string;
    name: string;
    email: string;
    position: string;
    mobileNo: string;
    password: string;
  }) {
    const ngoName = dto.ngoName?.trim();
    const email = dto.email?.trim().toLowerCase();

    if (!ngoName) {
      throw new BadRequestException('NGO name is required');
    }

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existingUser = await this.ngoUsersService.findByCredentials(ngoName, email);
    if (existingUser) {
      throw new BadRequestException('NGO user already exists with this NGO name and email');
    }

    const ngoUser = await this.ngoUsersService.create({
      ...dto,
      ngoName,
      email,
    });
    const tokens = this.signPair(String(ngoUser.id), ['ngo-user']);

    return {
      user: this.publicNgoUserFromSchema(ngoUser),
      ...tokens,
    };
  }

  /**
   * Register an Organization user (employee of an Organization)
   */
  async registerOrgUser(dto: OrganizationUserRegisterDto) {
    const existingUser = await this.organizationUsersService.findByCredentials(dto.email, dto.organizationId);
    if (existingUser) {
      throw new BadRequestException('Organization user already exists with this email in this organization');
    }

    const orgUser = await this.organizationUsersService.create(dto);
    const tokens = this.signPair(String(orgUser._id), ['org-user']);

    return {
      user: this.publicOrgUserFromSchema(orgUser),
      ...tokens,
    };
  }

  /**
   * Register an NGO organization
   */
  async registerNgo(dto: NgoRegisterDto) {
    const existingNgo = await this.orgs.findOne({
      $or: [
        { name: dto.ngoInfo.name, type: 'NGO' },
        { contactEmail: dto.ngoInfo.contactEmail },
        { contactPhone: dto.ngoInfo.contactPhone },
      ],
    });
    if (existingNgo) {
      throw new BadRequestException('NGO already registered with this name, email, or phone');
    }

    const passwordHash = await argon2.hash(dto.password);
    const orgData = {
      name: dto.ngoInfo.name,
      type: 'NGO' as const,
      subtype: dto.ngoInfo.subtype,
      city: dto.ngoInfo.city,
      categories: dto.ngoInfo.categories,
      contactPersonName: dto.name,
      contactEmail: dto.ngoInfo.contactEmail,
      contactPhone: dto.ngoInfo.contactPhone,
      address: dto.ngoInfo.address,
      registrationNumber: dto.ngoInfo.registrationNumber,
      establishedYear: dto.ngoInfo.establishedYear,
      website: dto.ngoInfo.website,
      passwordHash: passwordHash,
      isVerified: false,
      roles: ['ngo'],
    };

    const org = await this.orgs.create(orgData);

    return {
      message: 'NGO registration successful. Please wait for admin verification.',
      org: this.publicOrg(org),
    };
  }

  /**
   * Register an Organization
   */
  async registerOrganization(dto: OrganizationRegisterDto) {
    const existingOrg = await this.orgs.findOne({
      $or: [
        { businessName: dto.businessName },
        { 'owner.email': dto.owner.email },
        { registrationNumber: dto.registrationNumber },
        { gstNumber: dto.gstNumber },
      ],
    });
    if (existingOrg) {
      throw new BadRequestException('Organization already registered with this name, email, registration number, or GST number');
    }

    const passwordHash = await argon2.hash(dto.password);
    const orgData = {
      name: dto.businessName,
      type: 'Organization' as const,
      businessName: dto.businessName,
      businessType: dto.businessType,
      industryType: dto.industryType,
      registrationNumber: dto.registrationNumber,
      gstNumber: dto.gstNumber,
      owner: {
        fullName: dto.owner.fullName,
        email: dto.owner.email,
        phoneNumber: dto.owner.phoneNumber,
        panNumber: dto.owner.panNumber,
        aadhaarNumber: dto.owner.aadhaarNumber,
      },
      businessAddress: {
        addressLine1: dto.businessAddress.addressLine1,
        addressLine2: dto.businessAddress.addressLine2,
        city: dto.businessAddress.city,
        state: dto.businessAddress.state,
        pincode: dto.businessAddress.pincode,
        country: dto.businessAddress.country,
      },
      passwordHash: passwordHash,
      isVerified: true, // Organizations are verified by default
      roles: ['organization'],
      contactEmail: dto.owner.email,
      contactPhone: dto.owner.phoneNumber,
      contactPersonName: dto.owner.fullName,
    };

    const org = await this.orgs.create(orgData);

    const tokens = this.signPair(String(org._id), ['organization']);
    return {
      message: 'Organization registration successful',
      org: this.publicOrganization(org),
      ...tokens,
    };
  }

  /**
   * Login user with identifier and password
   */
  async login(identifier: string, password: string, userType?: 'admin' | 'ngo' | 'ngo-user' | 'organization' | 'org-user', ngoName?: string, organizationId?: string) {
    try {
      if (userType === 'ngo-user') {
        if (!ngoName) {
          throw new BadRequestException('NGO name is required for NGO user login');
        }

        const ngoUser = await this.ngoUsersService.findByCredentials(ngoName, identifier);
        if (!ngoUser || !(await this.ngoUsersService.validatePassword(password, ngoUser.password))) {
          throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = this.signPair(String(ngoUser.id), ['ngo-user']);
        return {
          user: this.publicNgoUserFromSchema(ngoUser),
          ...tokens,
        };
      } else if (userType === 'org-user') {
        const orgUser = await this.organizationUsersService.findByEmail(identifier);
        if (!orgUser || !(await this.organizationUsersService.validatePassword(password, orgUser.password))) {
          throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = this.signPair(String(orgUser._id), ['org-user']);
        return {
          user: this.publicOrgUserFromSchema(orgUser),
          ...tokens,
        };
      } else if (userType === 'ngo') {
        const ngoOrg = await this.orgs.findOne({
          type: 'NGO',
          $or: [{ contactEmail: identifier }, { contactPhone: identifier }],
        });

        if (!ngoOrg || !ngoOrg.passwordHash || !(await argon2.verify(ngoOrg.passwordHash, password))) {
          throw new UnauthorizedException('Invalid credentials');
        }

        if (!ngoOrg.isVerified) {
          throw new UnauthorizedException('Your NGO account is not yet verified by admin. Please wait for verification.');
        }

        const tokens = this.signPair(String(ngoOrg._id), ngoOrg.roles || ['ngo']);
        return {
          user: this.publicNgoOrg(ngoOrg),
          org: this.publicOrg(ngoOrg),
          ...tokens,
        };
      } else if (userType === 'organization') {
        const organization = await this.orgs.findOne({
          type: 'Organization',
          $or: [{ 'owner.email': identifier }, { contactEmail: identifier }],
        });

        if (!organization || !organization.passwordHash || !(await argon2.verify(organization.passwordHash, password))) {
          throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = this.signPair(String(organization._id), organization.roles || ['organization']);
        return {
          user: this.publicOrganization(organization),
          ...tokens,
        };
      } else {
        // Admin login
        const u = await this.users.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
        if (!u || !u.passwordHash || !(await argon2.verify(u.passwordHash, password))) {
          this.logger.warn(`Failed login attempt for identifier: ${identifier}`);
          throw new UnauthorizedException('Invalid credentials');
        }
        const tokens = this.signPair(String(u._id), u.roles);
        this.logger.log(`User logged in: ${u._id}`);
        return { user: this.publicUser(u), ...tokens };
      }
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

  /**
   * Get available verified NGOs for user registration
   */
  async getAvailableNgos() {
    return this.ngoUsersService.getAvailableNgos();
  }

  /**
   * Get available verified Organizations for user registration
   */
  async getAvailableOrganizations() {
    const organizations = await this.orgs
      .find({ type: 'Organization', isVerified: true })
      .select('_id businessName')
      .lean();

    return organizations.map(org => ({
      id: String(org._id),
      name: org.businessName,
    }));
  }

  /**
   * Forgot password - generate verification code
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const { identifier, userType, ngoName } = dto;
    let userExists = false;
    let codeKey = '';

    if (userType === 'ngo-user') {
      if (!ngoName) {
        throw new BadRequestException('NGO name is required for NGO user');
      }
      const ngoUser = await this.ngoUsersService.findByCredentials(ngoName, identifier);
      if (ngoUser) {
        userExists = true;
        codeKey = `ngo-user:${ngoName}:${identifier}`;
      }
    } else if (userType === 'ngo') {
      const ngoOrg = await this.orgs.findOne({
        type: 'NGO',
        $or: [{ contactEmail: identifier }, { contactPhone: identifier }],
      });
      if (ngoOrg) {
        userExists = true;
        codeKey = `ngo:${identifier}`;
      }
    } else {
      const user = await this.users.findOne({
        $or: [{ email: identifier }, { phone: identifier }],
      });
      if (user) {
        userExists = true;
        codeKey = `admin:${identifier}`;
      }
    }

    if (!userExists) {
      throw new BadRequestException('User not found with the provided credentials');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    verificationCodes.set(codeKey, { code, expires });

    console.log(`Verification code for ${codeKey}: ${code}`);

    return {
      message: 'Verification code generated. In production, this would be sent via email/SMS.',
      verificationCode: code,
      expiresIn: '10 minutes',
    };
  }

  /**
   * Reset password with verification code
   */
  async resetPassword(dto: ResetPasswordDto) {
    const { identifier, userType, ngoName, newPassword, verificationCode } = dto;
    let codeKey = '';

    if (userType === 'ngo-user') {
      if (!ngoName) {
        throw new BadRequestException('NGO name is required for NGO user');
      }
      codeKey = `ngo-user:${ngoName}:${identifier}`;
    } else if (userType === 'ngo') {
      codeKey = `ngo:${identifier}`;
    } else {
      codeKey = `admin:${identifier}`;
    }

    const storedCode = verificationCodes.get(codeKey);

    if (!storedCode) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (new Date() > storedCode.expires) {
      verificationCodes.delete(codeKey);
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (storedCode.code !== verificationCode) {
      throw new BadRequestException('Invalid verification code');
    }

    if (userType === 'ngo-user') {
      const ngoUser = await this.ngoUsersService.findByCredentials(ngoName!, identifier);
      if (!ngoUser) {
        throw new BadRequestException('User not found');
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.ngoUsersService.updatePassword(String(ngoUser.id), hashedPassword);
    } else if (userType === 'ngo') {
      const ngoOrg = await this.orgs.findOne({
        type: 'NGO',
        $or: [{ contactEmail: identifier }, { contactPhone: identifier }],
      });
      if (!ngoOrg) {
        throw new BadRequestException('NGO not found');
      }
      const passwordHash = await argon2.hash(newPassword);
      await this.orgs.findByIdAndUpdate(ngoOrg._id, { passwordHash });
    } else {
      const user = await this.users.findOne({
        $or: [{ email: identifier }, { phone: identifier }],
      });
      if (!user) {
        throw new BadRequestException('User not found');
      }
      const passwordHash = await argon2.hash(newPassword);
      await this.users.findByIdAndUpdate(user._id, { passwordHash });
    }

    verificationCodes.delete(codeKey);

    return { message: 'Password reset successfully' };
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

  private publicNgoOrg(org: any) {
    return {
      id: String(org._id),
      name: org.contactPersonName || org.name,
      email: org.contactEmail,
      phone: org.contactPhone,
      roles: org.roles || ['ngo'],
      isVerified: org.isVerified || false,
      userType: 'ngo',
    };
  }

  private publicNgoUserFromSchema(ngoUser: any) {
    return {
      id: String(ngoUser.id || ngoUser._id),
      name: ngoUser.name,
      ngoName: ngoUser.ngoName,
      position: ngoUser.position,
      mobileNo: ngoUser.mobileNo,
      roles: ['ngo-user'],
      userType: 'ngo-user',
    };
  }

  private publicOrgUserFromSchema(orgUser: any) {
    return {
      id: String(orgUser._id),
      name: orgUser.name,
      email: orgUser.email,
      organizationId: orgUser.organizationId,
      organizationName: orgUser.organizationName,
      roles: ['org-user'],
      userType: 'org-user',
    };
  }

  private publicOrg(org: any) {
    return {
      id: String(org._id),
      name: org.name,
      type: org.type,
      subtype: org.subtype,
      city: org.city,
      categories: org.categories,
      contactPersonName: org.contactPersonName,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      address: org.address,
      registrationNumber: org.registrationNumber,
      establishedYear: org.establishedYear,
      website: org.website,
      isVerified: org.isVerified,
    };
  }

  private publicOrganization(org: any) {
    return {
      id: String(org._id),
      businessName: org.businessName,
      businessType: org.businessType,
      industryType: org.industryType,
      registrationNumber: org.registrationNumber,
      gstNumber: org.gstNumber,
      owner: org.owner,
      businessAddress: org.businessAddress,
      isVerified: org.isVerified,
      userType: 'organization',
      roles: org.roles,
    };
  }
}