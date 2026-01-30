import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET ?? '',
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }
  validate(payload: any) {
    // payload.sub = DB user id
    return { sub: payload.sub, roles: payload.roles || [] };
  }
}