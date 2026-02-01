import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { Society } from '../societies/society.schema';
import { SocietyMembership } from '../societies/membership.schema';

/**
 * Optional Platform User Guard - populates req.platform if user is authenticated
 * Does NOT reject the request if user is not authenticated
 * Use with OptionalJwtAuthGuard for endpoints that work for both public and authenticated users
 */
@Injectable()
export class OptionalPlatformUserGuard implements CanActivate {
  constructor(
    private users: UsersService,
    @InjectModel(SocietyMembership.name) private mem: Model<SocietyMembership>,
    @InjectModel(Society.name) private soc: Model<Society>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: any = ctx.switchToHttp().getRequest();
    const sub: string | undefined = req.user?.sub;
    
    // If no user (not authenticated), just continue without platform info
    if (!sub) {
      req.platform = null;
      return true;
    }

    try {
      const u = await this.users.getById(sub);
      const approved = await this.mem.find({ userSub: sub, status: 'approved' }).lean();
      const societyIds = approved.map(m => m.societyId);
      const headSocieties = await this.soc.find({ headUserSub: sub, status: 'approved' }).lean();
      const headSocietyIds = headSocieties.map(s => String(s._id));

      req.platform = {
        user: { id: sub, name: u?.name, email: u?.email },
        roles: u?.roles || [],
        societyIds,
        headSocietyIds,
        orgIds: u?.orgIds || [],
      };
    } catch {
      req.platform = null;
    }
    
    return true;
  }
}
