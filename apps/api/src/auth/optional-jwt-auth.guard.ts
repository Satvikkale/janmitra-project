import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Auth Guard - doesn't throw if token is missing
 * Use this for endpoints that work for both public and authenticated users
 * If token is present and valid, req.user will be populated
 * If token is missing or invalid, request continues without req.user
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Call the parent canActivate to attempt authentication
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // Don't throw an error if authentication fails
    // Just return null/undefined user and let the request continue
    if (err || !user) {
      return null;
    }
    return user;
  }
}
