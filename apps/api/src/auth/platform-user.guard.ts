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
    const sub: string | undefined = req.user?.sub;
    if (!sub) return false;

    // NGO org and NGO-user tokens have sub = orgId / ngoUserId (not a User document).
    // Detect these via JWT roles to avoid spurious "User not found" warnings.
    const jwtRoles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const isOrgSession = jwtRoles.includes('ngo') || jwtRoles.includes('org_admin');
    const isNgoUserSession = jwtRoles.includes('ngo-user') || jwtRoles.includes('org_staff');

    if (isOrgSession) {
      // sub is the Org document ID — populate accordingly without a user lookup.
      req.platform = {
        user: { id: sub },
        roles: jwtRoles,
        societyIds: [],
        headSocietyIds: [],
        orgIds: [sub],
      };
      return true;
    }

    if (isNgoUserSession) {
      // sub is an NgoUser document ID — no User/Society data needed.
      req.platform = {
        user: { id: sub },
        roles: jwtRoles,
        societyIds: [],
        headSocietyIds: [],
        orgIds: [],
      };
      return true;
    }

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