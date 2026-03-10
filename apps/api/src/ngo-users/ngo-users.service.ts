import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NgoUser, NgoUserDocument } from './ngo-user.schema';
import { Org } from '../orgs/orgs.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class NgoUsersService {
  constructor(
    @InjectModel(NgoUser.name) private ngoUserModel: Model<NgoUserDocument>,
    @InjectModel(Org.name) private orgModel: Model<Org>,
  ) {}

  async create(createNgoUserDto: {
    ngoName: string;
    name: string;
    position: string;
    mobileNo: string;
    password: string;
  }): Promise<NgoUser> {
    const existingNgo = await this.orgModel.findOne({
      name: createNgoUserDto.ngoName,
      type: 'NGO',
      isVerified: true,
    }).exec();

    if (!existingNgo) {
      throw new BadRequestException(
        'NGO not found or not verified. Please ensure the NGO name is correct and the NGO is registered and verified by admin.',
      );
    }

    const hashedPassword = await bcrypt.hash(createNgoUserDto.password, 10);
    const createdNgoUser = new this.ngoUserModel({
      ...createNgoUserDto,
      password: hashedPassword,
    });
    return createdNgoUser.save();
  }

  async findByCredentials(ngoName: string, name: string): Promise<NgoUser | null> {
    return this.ngoUserModel.findOne({ ngoName, name }).exec();
  }

  async findAll(): Promise<NgoUser[]> {
    return this.ngoUserModel.find().exec();
  }

  async findById(id: string): Promise<NgoUser | null> {
    return this.ngoUserModel.findById(id).exec();
  }

  async validatePassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }

  async getAvailableNgos(): Promise<Array<{ name: string; id: string }>> {
    const ngos = await this.orgModel.find({
      type: 'NGO',
      isVerified: true,
    }).select('name').exec();

    return ngos.map((ngo) => ({
      name: ngo.name,
      id: String(ngo._id),
    }));
  }

  async findByNgoName(ngoName: string): Promise<NgoUser[]> {
    return this.ngoUserModel.find({ ngoName }).select('-password').exec();
  }

  async updateProfile(
    id: string,
    updateData: {
      name?: string;
      mobileNo?: string;
      isActive?: boolean;
      profilePhoto?: string;
    },
  ): Promise<NgoUser | null> {
    const updatedUser = await this.ngoUserModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .select('-password')
      .exec();

    if (!updatedUser) {
      throw new BadRequestException('NGO user not found');
    }
    return updatedUser;
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    const result = await this.ngoUserModel
      .findByIdAndUpdate(id, { $set: { password: hashedPassword } })
      .exec();

    if (!result) {
      throw new BadRequestException('NGO user not found');
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.ngoUserModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new BadRequestException('NGO user not found');
    }
  }
}
