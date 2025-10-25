import { ethers } from 'ethers';

// Blockchain verification service
export class BlockchainVerification {
  private provider: ethers.Provider;
  private paymentAddress: string;

  constructor() {
    // Initialize provider (Base network)
    this.provider = new ethers.JsonRpcProvider(
      process.env.BASE_RPC_URL || 'https://mainnet.base.org'
    );
    this.paymentAddress = process.env.PAYMENT_ADDRESS || '0xda8d766bc482a7953b72283f56c12ce00da6a86a';
  }

  // Verify USDC transaction on Base network
  async verifyUSDCTransaction(txHash: string): Promise<{
    isValid: boolean;
    amountUsdc: number;
    fromAddress: string;
    blockNumber: number;
    timestamp: number;
    verificationData: any;
  }> {
    try {
      // Get transaction details
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) {
        throw new Error('Transaction not found');
      }

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed or not confirmed');
      }

      // Get block details
      const block = await this.provider.getBlock(tx.blockNumber!);
      
      // Parse transaction data to get USDC transfer details
      const usdcTransfer = await this.parseUSDCTransfer(tx, receipt);
      
      if (!usdcTransfer) {
        throw new Error('No USDC transfer found in transaction');
      }

      // Verify it's sent to our payment address
      if (usdcTransfer.to.toLowerCase() !== this.paymentAddress.toLowerCase()) {
        throw new Error('Payment not sent to correct address');
      }

      return {
        isValid: true,
        amountUsdc: parseFloat(ethers.formatUnits(usdcTransfer.amount, 6)), // USDC has 6 decimals
        fromAddress: usdcTransfer.from,
        blockNumber: tx.blockNumber!,
        timestamp: block!.timestamp,
        verificationData: {
          txHash,
          blockNumber: tx.blockNumber,
          blockTimestamp: block!.timestamp,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: tx.gasPrice?.toString(),
          network: 'base',
          verified_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Blockchain verification failed:', error);
      return {
        isValid: false,
        amountUsdc: 0,
        fromAddress: '',
        blockNumber: 0,
        timestamp: 0,
        verificationData: {
          error: error instanceof Error ? error.message : 'Unknown error',
          verified_at: new Date().toISOString()
        }
      };
    }
  }

  // Parse USDC transfer from transaction
  private async parseUSDCTransfer(tx: any, receipt: any): Promise<{
    from: string;
    to: string;
    amount: string;
  } | null> {
    try {
      // USDC contract address on Base
      const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      
      // Look for USDC transfer events in logs
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === usdcAddress.toLowerCase()) {
          // Parse Transfer event
          const transferEvent = this.parseTransferEvent(log);
          if (transferEvent) {
            return transferEvent;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to parse USDC transfer:', error);
      return null;
    }
  }

  // Parse Transfer event from log
  private parseTransferEvent(log: any): {
    from: string;
    to: string;
    amount: string;
  } | null {
    try {
      // Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      if (log.topics[0] !== transferTopic) {
        return null;
      }

      // Extract from and to addresses from indexed parameters
      const from = '0x' + log.topics[1].slice(26); // Remove 0x and first 6 chars
      const to = '0x' + log.topics[2].slice(26);
      
      // Extract amount from data
      const amount = log.data;

      return {
        from,
        to,
        amount
      };
    } catch (error) {
      console.error('Failed to parse transfer event:', error);
      return null;
    }
  }

  // Get current block number
  async getCurrentBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  // Check if transaction is confirmed (has enough confirmations)
  async isTransactionConfirmed(txHash: string, requiredConfirmations: number = 1): Promise<boolean> {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx || !tx.blockNumber) {
        return false;
      }

      const currentBlock = await this.getCurrentBlockNumber();
      const confirmations = currentBlock - tx.blockNumber;
      
      return confirmations >= requiredConfirmations;
    } catch (error) {
      console.error('Failed to check transaction confirmations:', error);
      return false;
    }
  }
}

// Singleton instance
export const blockchainVerification = new BlockchainVerification();
