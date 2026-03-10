import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformUserGuard } from '../auth/platform-user.guard';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('status')
  getStatus() {
    return {
      enabled: this.blockchainService.isEnabled(),
      message: this.blockchainService.isEnabled()
        ? 'Blockchain integration is active'
        : 'Blockchain is not configured. Set BLOCKCHAIN_RPC_URL, BLOCKCHAIN_PRIVATE_KEY, and COMPLAINT_CONTRACT_ADDRESS in .env',
    };
  }

  @UseGuards(JwtAuthGuard, PlatformUserGuard)
  @Get('complaint/:id')
  async getOnChainRecord(@Param('id') complaintId: string) {
    if (!this.blockchainService.isEnabled()) {
      return { found: false, message: 'Blockchain is not configured' };
    }
    const record = await this.blockchainService.getOnChainRecord(complaintId);
    if (!record) {
      return { found: false, message: 'No on-chain record found for this complaint' };
    }
    return { found: true, record };
  }

  @UseGuards(JwtAuthGuard, PlatformUserGuard)
  @Get('verify/:id/:hash')
  async verifyComplaint(
    @Param('id') complaintId: string,
    @Param('hash') hash: string,
  ) {
    if (!this.blockchainService.isEnabled()) {
      return { complaintId, isValid: false, message: 'Blockchain is not configured' };
    }
    const isValid = await this.blockchainService.verifyComplaintIntegrity(complaintId, hash);
    return { complaintId, isValid };
  }
}
