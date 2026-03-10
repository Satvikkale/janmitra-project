import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(@InjectModel(User.name) private model: Model<User>) { }

  /**
   * Find or create a user by Auth0 sub
   */
  async findOrCreateBySub(sub: string, profile?: Partial<User>) {
    try {
      if (!sub) throw new Error('User sub is required');
      let u = await this.model.findOne({ auth0Sub: sub });
      if (!u) u = await this.model.create({ auth0Sub: sub, roles: ['resident'], ...profile });
      this.logger.log(`User found/created: ${u._id}`);
      return u;
    } catch (error) {
      this.logger.error('Error finding/creating user', error.stack);
      throw error;
    }
  }

  /**
   * Get user by Auth0 sub
   */
  async getMe(sub: string) {
    try {
      if (!sub) throw new Error('User sub is required');
      const user = await this.model.findOne({ auth0Sub: sub }).lean();
      if (!user) throw new Error('User not found');
      this.logger.log(`User fetched: ${user._id}`);
      return user;
    } catch (error) {
      this.logger.error('Error fetching user', error.stack);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getById(id: string) {
    try {
      if (!id) throw new Error('User ID is required');
      const user = await this.model.findById(id).lean();
      if (!user) {
        this.logger.warn(`User not found by ID: ${id}`);
        return null;
      }
      this.logger.log(`User fetched by ID: ${user._id}`);
      return user;
    } catch (error) {
      this.logger.error('Error fetching user by ID', error.stack);
      return null;
    }
  }

  /**
   * Create a new user
   */
  async create(data: { name: string; email?: string; phone?: string; passwordHash?: string; roles: string[] }) {
    try {
      const user = await this.model.create(data);
      this.logger.log(`User created: ${user._id}`);
      return user;
    } catch (error) {
      this.logger.error('Error creating user', error.stack);
      throw error;
    }
  }

  /**
   * Bulk lookup by Auth0 sub(s)
   */
  async getBySubs(subs: string[]) {
    try {
      const uniqueSubs = Array.from(new Set((subs || []).filter(Boolean)));
      if (uniqueSubs.length === 0) return [];
      return this.model.find({ auth0Sub: { $in: uniqueSubs } }).lean();
    } catch (error) {
      this.logger.error('Error fetching users by subs', error.stack);
      throw error;
    }
  }
}