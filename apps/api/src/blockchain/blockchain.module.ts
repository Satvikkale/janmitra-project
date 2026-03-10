import { Module, Global } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { UsersModule } from '../users/users.module';
import { SocietiesModule } from '../societies/societies.module';

@Global()
@Module({
  imports: [UsersModule, SocietiesModule],
  controllers: [BlockchainController],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
