import { Module } from '@nestjs/common';
import { OrgsModule } from '../orgs/orgs.module';
import { RoutingService } from './routing.service';

@Module({
  imports: [OrgsModule],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}