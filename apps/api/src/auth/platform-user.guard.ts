import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { Society } from '../societies/society.schema';
import { SocietyMembership } from '../societies/membership.schema';

@Injectable()
export class PlatformUserGuard implements CanActivate {
  constructor(
    private users: UsersService,
    @InjectModel(SocietyMembership.name) private mem: Model<SocietyMembership>,
    @InjectModel(Society.name) private soc: Model<Society>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req: any = ctx.switchToHttp().getRequest();
    const sub: string | undefined = req.user?.sub; // DB user id from JWT
    if (!sub) return false;

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
    return true;
  }
}