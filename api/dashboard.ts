import { Hono } from 'hono';
import { PaymentService } from '../lib/supabase';

const app = new Hono();

// User dashboard page
app.get('/dashboard/:walletAddress', async (c) => {
  const walletAddress = c.req.param('walletAddress');
  
  try {
    // Get user balance and payment history
    const balance = await PaymentService.getUserBalance(walletAddress);
    const payments = await PaymentService.getUserPayments(walletAddress);

    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PAYX Token Dashboard</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box;
            image-rendering: pixelated;
          }
          
          body {
            font-family: 'Press Start 2P', monospace;
            background: #000814;
            min-height: 100vh;
            padding: 40px 20px;
            color: #0052FF;
          }
          
          .container {
            background: #001d3d;
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            border: 4px solid #0052FF;
            box-shadow: 0 0 20px rgba(0, 82, 255, 0.3);
          }
          
          h1 {
            font-size: 28px;
            color: #0052FF;
            margin-bottom: 20px;
            text-shadow: 2px 2px 0px #001845;
            letter-spacing: 2px;
          }
          
          .wallet-info {
            background: #000814;
            border: 3px solid #003d99;
            padding: 20px;
            margin-bottom: 30px;
            font-size: 10px;
            line-height: 2;
          }
          
          .balance-card {
            background: #000814;
            border: 3px solid #2ecc71;
            padding: 25px;
            margin-bottom: 30px;
            text-align: center;
          }
          
          .balance-title {
            font-size: 14px;
            color: #2ecc71;
            margin-bottom: 15px;
          }
          
          .balance-amount {
            font-size: 24px;
            color: #2ecc71;
            text-shadow: 2px 2px 0px #000;
            margin-bottom: 10px;
          }
          
          .balance-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 20px;
            font-size: 9px;
          }
          
          .balance-item {
            background: #001845;
            border: 2px solid #0052FF;
            padding: 10px;
            text-align: center;
          }
          
          .balance-item.pending {
            border-color: #f39c12;
            color: #f39c12;
          }
          
          .balance-item.claimed {
            border-color: #e74c3c;
            color: #e74c3c;
          }
          
          .payments-section {
            background: #000814;
            border: 3px solid #003d99;
            padding: 20px;
          }
          
          .payments-title {
            font-size: 12px;
            color: #0052FF;
            margin-bottom: 15px;
          }
          
          .payment-item {
            background: #001845;
            border: 2px solid #0052FF;
            padding: 15px;
            margin-bottom: 10px;
            font-size: 9px;
            line-height: 1.6;
          }
          
          .payment-item.confirmed {
            border-color: #2ecc71;
          }
          
          .payment-item.pending {
            border-color: #f39c12;
          }
          
          .payment-item.failed {
            border-color: #e74c3c;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 8px;
            font-size: 8px;
            margin-left: 10px;
          }
          
          .status-confirmed {
            background: #2ecc71;
            color: #000;
          }
          
          .status-pending {
            background: #f39c12;
            color: #000;
          }
          
          .status-failed {
            background: #e74c3c;
            color: #fff;
          }
          
          .back-button {
            display: inline-block;
            background: #001845;
            color: #0052FF;
            text-decoration: none;
            padding: 12px 20px;
            border: 3px solid #0052FF;
            margin-bottom: 20px;
            font-size: 10px;
            transition: all 0.1s;
          }
          
          .back-button:hover {
            background: #0052FF;
            color: #fff;
          }
          
          .refresh-button {
            background: #2ecc71;
            color: #000;
            border: 3px solid #000;
            padding: 10px 20px;
            font-size: 10px;
            cursor: pointer;
            margin-top: 20px;
            transition: all 0.1s;
          }
          
          .refresh-button:hover {
            transform: translate(2px, 2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <a href="/" class="back-button">← BACK TO HOME</a>
          
          <h1>PAYX TOKEN DASHBOARD</h1>
          
          <div class="wallet-info">
            <strong>Wallet Address:</strong><br>
            ${walletAddress}
          </div>
          
          <div class="balance-card">
            <div class="balance-title">YOUR PAYX TOKENS</div>
            <div class="balance-amount">${balance?.total_payx?.toLocaleString() || '0'} PAYX</div>
            
            <div class="balance-details">
              <div class="balance-item">
                <div>AVAILABLE</div>
                <div>${(balance?.total_payx || 0) - (balance?.claimed_payx || 0)} PAYX</div>
              </div>
              <div class="balance-item pending">
                <div>PENDING</div>
                <div>${balance?.pending_payx || 0} PAYX</div>
              </div>
              <div class="balance-item claimed">
                <div>CLAIMED</div>
                <div>${balance?.claimed_payx || 0} PAYX</div>
              </div>
            </div>
          </div>
          
          <div class="payments-section">
            <div class="payments-title">PAYMENT HISTORY</div>
            
            ${payments.length === 0 ? 
              '<div style="text-align: center; color: #4d94ff; font-size: 10px; padding: 20px;">No payments found</div>' :
              payments.map(payment => `
                <div class="payment-item ${payment.status}">
                  <div><strong>Amount:</strong> ${payment.amount_usdc} USDC → ${payment.amount_payx.toLocaleString()} PAYX</div>
                  <div><strong>Status:</strong> ${payment.status.toUpperCase()}<span class="status-badge status-${payment.status}">${payment.status}</span></div>
                  <div><strong>Date:</strong> ${new Date(payment.created_at).toLocaleString()}</div>
                  <div><strong>TX Hash:</strong> ${payment.transaction_hash}</div>
                  ${payment.confirmed_at ? `<div><strong>Confirmed:</strong> ${new Date(payment.confirmed_at).toLocaleString()}</div>` : ''}
                </div>
              `).join('')
            }
          </div>
          
          <button class="refresh-button" onclick="location.reload()">🔄 REFRESH</button>
        </div>
        
        <script>
          // Auto-refresh every 30 seconds
          setTimeout(() => {
            location.reload();
          }, 30000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - PAYX Dashboard</title>
        <style>
          body { font-family: 'Press Start 2P', monospace; background: #000814; color: #ff4d4d; padding: 40px; text-align: center; }
          .container { background: #001d3d; border: 4px solid #ff4d4d; padding: 30px; max-width: 600px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>ERROR</h1>
          <p>Failed to load dashboard</p>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          <a href="/" style="color: #0052FF;">← BACK TO HOME</a>
        </div>
      </body>
      </html>
    `);
  }
});

export default app; 