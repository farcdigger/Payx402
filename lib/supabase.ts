import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for our database
export interface User {
  id: string;
  wallet_address: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  wallet_address: string;
  transaction_hash: string;
  amount_usdc: number;
  amount_payx: number;
  network: string;
  block_number?: number;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  confirmed_at?: string;
  verification_data?: any;
}

export interface TokenBalance {
  id: string;
  user_id: string;
  wallet_address: string;
  total_payx: number;
  pending_payx: number;
  claimed_payx: number;
  updated_at: string;
}

// Database operations
export class PaymentService {
  
  // Create or get user by wallet address
  static async getOrCreateUser(walletAddress: string): Promise<User> {
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    return newUser;
  }

  // Record a payment
  static async recordPayment(paymentData: {
    walletAddress: string;
    transactionHash: string;
    amountUsdc: number;
    amountPayx: number;
    network?: string;
    blockNumber?: number;
    verificationData?: any;
  }): Promise<Payment> {
    const user = await this.getOrCreateUser(paymentData.walletAddress);

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        wallet_address: paymentData.walletAddress,
        transaction_hash: paymentData.transactionHash,
        amount_usdc: paymentData.amountUsdc,
        amount_payx: paymentData.amountPayx,
        network: paymentData.network || 'base',
        block_number: paymentData.blockNumber,
        status: 'pending',
        verification_data: paymentData.verificationData
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record payment: ${error.message}`);
    }

    return payment;
  }

  // Verify payment on blockchain
  static async verifyPaymentOnBlockchain(transactionHash: string, network: string = 'base'): Promise<{
    isVerified: boolean;
    amountUsdc: number;
    toAddress: string;
    blockNumber?: number;
    verificationData: any;
  }> {
    // This would integrate with actual blockchain APIs
    // For now, we'll create a mock verification
    const mockVerification = {
      isVerified: true,
      amountUsdc: 5, // This would come from blockchain data
      toAddress: process.env.PAYMENT_ADDRESS || '0xda8d766bc482a7953b72283f56c12ce00da6a86a',
      blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
      verificationData: {
        method: 'blockchain_verification',
        network: network,
        verified_at: new Date().toISOString(),
        tx_hash: transactionHash
      }
    };

    return mockVerification;
  }

  // Confirm payment after verification
  static async confirmPayment(paymentId: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (error) {
      throw new Error(`Failed to confirm payment: ${error.message}`);
    }
  }

  // Get user balance
  static async getUserBalance(walletAddress: string): Promise<TokenBalance | null> {
    const { data, error } = await supabase
      .from('token_balances')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to get user balance: ${error.message}`);
    }

    return data;
  }

  // Get user payment history
  static async getUserPayments(walletAddress: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user payments: ${error.message}`);
    }

    return data || [];
  }

  // Update pending balance (for unconfirmed payments)
  static async updatePendingBalance(walletAddress: string, amountPayx: number): Promise<void> {
    const user = await this.getOrCreateUser(walletAddress);

    const { error } = await supabase
      .from('token_balances')
      .upsert({
        user_id: user.id,
        wallet_address: walletAddress,
        pending_payx: amountPayx,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet_address'
      });

    if (error) {
      throw new Error(`Failed to update pending balance: ${error.message}`);
    }
  }
}
