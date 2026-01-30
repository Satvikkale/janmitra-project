import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;
    const req: any = ctx.switchToHttp().getRequest();
    const roles: string[] = req.user?.roles || req.user?.permissions || [];
    // We’ll store roles on our User doc; attach to req.user in a middleware later
    return required.some(r => roles.includes(r));
  }
}