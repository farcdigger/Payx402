import { Hono } from 'hono';
import { PaymentService } from '../lib/supabase';
import { blockchainVerification } from '../lib/blockchain-verification';

const app = new Hono();

// Track payment by transaction hash
app.post('/track-payment', async (c) => {
  try {
    const { txHash, walletAddress } = await c.req.json();

    if (!txHash || !walletAddress) {
      return c.json({ error: 'Transaction hash and wallet address are required' }, 400);
    }

    // Verify transaction on blockchain
    const verification = await blockchainVerification.verifyUSDCTransaction(txHash);
    
    if (!verification.isValid) {
      return c.json({ 
        error: 'Transaction verification failed',
        details: verification.verificationData
      }, 400);
    }

    // Calculate PAYX tokens (1 USDC = 20,000 PAYX)
    const amountPayx = Math.floor(verification.amountUsdc * 20000);

    // Record payment in database
    const payment = await PaymentService.recordPayment({
      walletAddress,
      transactionHash: txHash,
      amountUsdc: verification.amountUsdc,
      amountPayx,
      network: 'base',
      blockNumber: verification.blockNumber,
      verificationData: verification.verificationData
    });

    // Update pending balance
    await PaymentService.updatePendingBalance(walletAddress, amountPayx);

    // Confirm payment
    await PaymentService.confirmPayment(payment.id);

    return c.json({
      success: true,
      message: 'Payment tracked successfully',
      payment: {
        id: payment.id,
        amountUsdc: verification.amountUsdc,
        amountPayx,
        status: 'confirmed',
        blockNumber: verification.blockNumber,
        timestamp: verification.timestamp
      }
    });

  } catch (error) {
    console.error('Payment tracking error:', error);
    return c.json({ 
      error: 'Failed to track payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get user balance
app.get('/balance/:walletAddress', async (c) => {
  try {
    const walletAddress = c.req.param('walletAddress');
    
    const balance = await PaymentService.getUserBalance(walletAddress);
    const payments = await PaymentService.getUserPayments(walletAddress);

    return c.json({
      success: true,
      walletAddress,
      balance: balance || {
        total_payx: 0,
        pending_payx: 0,
        claimed_payx: 0,
        available_payx: 0
      },
      payments: payments.map(p => ({
        id: p.id,
        amountUsdc: p.amount_usdc,
        amountPayx: p.amount_payx,
        status: p.status,
        createdAt: p.created_at,
        confirmedAt: p.confirmed_at,
        txHash: p.transaction_hash
      }))
    });

  } catch (error) {
    console.error('Balance fetch error:', error);
    return c.json({ 
      error: 'Failed to fetch balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Verify transaction status
app.get('/verify/:txHash', async (c) => {
  try {
    const txHash = c.req.param('txHash');
    
    const verification = await blockchainVerification.verifyUSDCTransaction(txHash);
    
    return c.json({
      success: true,
      txHash,
      verification: {
        isValid: verification.isValid,
        amountUsdc: verification.amountUsdc,
        fromAddress: verification.fromAddress,
        blockNumber: verification.blockNumber,
        timestamp: verification.timestamp
      }
    });

  } catch (error) {
    console.error('Transaction verification error:', error);
    return c.json({ 
      error: 'Failed to verify transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Background job to verify pending payments
app.post('/verify-pending', async (c) => {
  try {
    // This would be called by a cron job or background service
    // to verify pending payments and update balances
    
    // Get all pending payments
    const { data: pendingPayments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to fetch pending payments: ${error.message}`);
    }

    const results = [];

    for (const payment of pendingPayments || []) {
      try {
        const verification = await blockchainVerification.verifyUSDCTransaction(payment.transaction_hash);
        
        if (verification.isValid) {
          await PaymentService.confirmPayment(payment.id);
          results.push({
            paymentId: payment.id,
            status: 'confirmed',
            amountUsdc: verification.amountUsdc
          });
        } else {
          // Mark as failed if verification fails multiple times
          const { error: updateError } = await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('id', payment.id);
            
          if (!updateError) {
            results.push({
              paymentId: payment.id,
              status: 'failed'
            });
          }
        }
      } catch (error) {
        console.error(`Failed to verify payment ${payment.id}:`, error);
        results.push({
          paymentId: payment.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return c.json({
      success: true,
      message: `Processed ${results.length} pending payments`,
      results
    });

  } catch (error) {
    console.error('Pending verification error:', error);
    return c.json({ 
      error: 'Failed to verify pending payments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;
