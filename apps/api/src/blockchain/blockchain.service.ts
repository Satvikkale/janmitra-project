import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import * as crypto from 'crypto';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;

  private readonly CONTRACT_ABI = [
    'function fileComplaint(string complaintId, bytes32 complaintHash) external',
    'function assignComplaint(string complaintId, string orgId, string assignedTo) external',
    'function updateStatus(string complaintId, uint8 newStatus) external',
    'function verifyComplaint(string complaintId, bytes32 expectedHash) external view returns (bool)',
    'function complaints(string) external view returns (bytes32, address, string, string, uint8, uint256, uint256)',
    'event ComplaintFiled(string indexed complaintId, bytes32 complaintHash, uint256 timestamp)',
    'event ComplaintAssigned(string indexed complaintId, string orgId, string assignedTo, uint256 timestamp)',
    'event StatusUpdated(string indexed complaintId, uint8 newStatus, uint256 timestamp)',
  ];

  constructor() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    const contractAddress = process.env.COMPLAINT_CONTRACT_ADDRESS;

    if (rpcUrl && privateKey && contractAddress) {
      try {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(contractAddress, this.CONTRACT_ABI, this.wallet);
        this.logger.log('Blockchain service initialized successfully');
      } catch (error: any) {
        this.logger.warn(`Blockchain init failed: ${error.message}`);
      }
    } else {
      this.logger.warn('Blockchain not configured — running without blockchain integration');
    }
  }

  isEnabled(): boolean {
    return this.contract !== null;
  }

  generateComplaintHash(data: {
    category: string;
    description?: string;
    reporterId: string;
    createdAt: string;
  }): string {
    const raw = JSON.stringify({
      category: data.category,
      description: data.description || '',
      reporterId: data.reporterId,
      createdAt: data.createdAt,
    });
    return '0x' + crypto.createHash('sha256').update(raw).digest('hex');
  }

  async recordComplaintOnChain(complaintId: string, complaintHash: string): Promise<string | null> {
    if (!this.contract) return null;

    try {
      const tx = await this.contract.fileComplaint(complaintId, complaintHash);
      const receipt = await tx.wait();
      this.logger.log(`Complaint ${complaintId} recorded on-chain. Tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      this.logger.error(`Failed to record complaint on-chain: ${error.message}`);
      return null;
    }
  }

  async recordAssignmentOnChain(
    complaintId: string,
    orgId: string,
    assignedTo: string,
  ): Promise<string | null> {
    if (!this.contract) return null;

    try {
      const tx = await this.contract.assignComplaint(complaintId, orgId, assignedTo);
      const receipt = await tx.wait();
      this.logger.log(`Assignment for ${complaintId} recorded on-chain. Tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      this.logger.error(`Failed to record assignment on-chain: ${error.message}`);
      return null;
    }
  }

  async recordStatusUpdateOnChain(
    complaintId: string,
    status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed',
  ): Promise<string | null> {
    if (!this.contract) return null;

    const statusMap: Record<string, number> = {
      open: 0,
      assigned: 1,
      in_progress: 2,
      resolved: 3,
      closed: 4,
    };

    try {
      const tx = await this.contract.updateStatus(complaintId, statusMap[status]);
      const receipt = await tx.wait();
      this.logger.log(`Status update for ${complaintId} recorded on-chain. Tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      this.logger.error(`Failed to record status on-chain: ${error.message}`);
      return null;
    }
  }

  async verifyComplaintIntegrity(complaintId: string, complaintHash: string): Promise<boolean> {
    if (!this.contract) return false;

    try {
      return await this.contract.verifyComplaint(complaintId, complaintHash);
    } catch (error: any) {
      this.logger.error(`Failed to verify complaint: ${error.message}`);
      return false;
    }
  }

  async getOnChainRecord(complaintId: string): Promise<any | null> {
    if (!this.contract) return null;

    try {
      const record = await this.contract.complaints(complaintId);
      return {
        complaintHash: record[0],
        filedBy: record[1],
        orgId: record[2],
        assignedTo: record[3],
        status: ['open', 'assigned', 'in_progress', 'resolved', 'closed'][Number(record[4])],
        createdAt: new Date(Number(record[5]) * 1000).toISOString(),
        lastUpdatedAt: new Date(Number(record[6]) * 1000).toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get on-chain record: ${error.message}`);
      return null;
    }
  }
}
