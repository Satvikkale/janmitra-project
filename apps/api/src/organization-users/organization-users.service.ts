import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrganizationUser, OrganizationUserDocument } from './organization-user.schema';
import { Org } from '../orgs/orgs.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrganizationUsersService {
  constructor(
    @InjectModel(OrganizationUser.name) private orgUserModel: Model<OrganizationUserDocument>,
    @InjectModel(Org.name) private orgModel: Model<Org>,
  ) {}

  async create(createOrgUserDto: {
    organizationId: string;
    organizationName: string;
    name: string;
    email: string;
    mobileNo?: string;
    position?: string;
    password: string;
  }): Promise<OrganizationUser> {
    const existingOrg = await this.orgModel.findOne({
      _id: createOrgUserDto.organizationId,
      type: 'Organization',
      isVerified: true,
    }).exec();

    if (!existingOrg) {
      throw new BadRequestException(
        'Organization not found or not verified. Please ensure the organization ID is correct and the organization is verified.',
      );
    }

    const existingUser = await this.orgUserModel.findOne({
      email: createOrgUserDto.email,
      organizationId: createOrgUserDto.organizationId,
    }).exec();

    if (existingUser) {
      throw new BadRequestException('User already exists with this email in this organization');
    }

    const hashedPassword = await bcrypt.hash(createOrgUserDto.password, 10);
    const createdOrgUser = new this.orgUserModel({
      ...createOrgUserDto,
      password: hashedPassword,
    });
    return createdOrgUser.save();
  }

  async findByCredentials(email: string, organizationId: string): Promise<OrganizationUser | null> {
    return this.orgUserModel.findOne({ email, organizationId }).exec();
  }

  async findByEmail(email: string): Promise<OrganizationUser | null> {
    return this.orgUserModel.findOne({ email }).exec();
  }

  async findAll(): Promise<OrganizationUser[]> {
    return this.orgUserModel.find().exec();
  }

  async findById(id: string): Promise<OrganizationUser | null> {
    return this.orgUserModel.findById(id).exec();
  }

  async validatePassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }

  async findByOrganizationId(organizationId: string): Promise<OrganizationUser[]> {
    return this.orgUserModel.find({ organizationId }).select('-password').exec();
  }

  async updateProfile(
    id: string,
    updateData: {
      name?: string;
      email?: string;
      isActive?: boolean;
      profilePhoto?: string;
    },
  ): Promise<OrganizationUser | null> {
    const updatedUser = await this.orgUserModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .select('-password')
      .exec();

    if (!updatedUser) {
      throw new BadRequestException('Organization user not found');
    }
    return updatedUser;
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    const result = await this.orgUserModel
      .findByIdAndUpdate(id, { $set: { password: hashedPassword } })
      .exec();

    if (!result) {
      throw new BadRequestException('Organization user not found');
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.orgUserModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new BadRequestException('Organization user not found');
    }
  }
}
