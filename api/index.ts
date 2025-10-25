import { Hono } from "hono";

// Vercel optimization
const isVercel = process.env.VERCEL === '1';

const facilitatorUrl: string = process.env.FACILITATOR_URL || 'https://x402.org/facilitator';
const payTo = (process.env.ADDRESS || '0xda8d766bc482a7953b72283f56c12ce00da6a86a') as `0x${string}`;
const network = 'base'; // Always use Base network
const rpcUrl = process.env.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/demo'; // Custom RPC to avoid rate limits

const app = new Hono();

// Load x402 immediately - not lazy
const { paymentMiddleware: x402Middleware, facilitator: cdpFacilitator } = await (async () => {
  const x402Hono = await import("x402-hono");
  const coinbaseX402 = await import("@coinbase/x402");
  return {
    paymentMiddleware: x402Hono.paymentMiddleware,
    facilitator: coinbaseX402.facilitator
  };
})();

// For Base Mainnet: CDP facilitator is REQUIRED
// For testnet: use { url: "https://x402.org/facilitator" }
const facilitatorConfig = cdpFacilitator;

// x402 Payment Middleware - MUST be before route definitions
app.use(
  x402Middleware(
    payTo,
    {
      "GET /payment/test": {
        price: "$0.01",
        network: network,
        rpcUrl: rpcUrl,
        config: {
          description: "🧪 TEST: Pay 0.01 USDC → Get 50 PAYX tokens. Tokens will be sent to your wallet later.",
        }
      },
      "GET /payment/5usdc": {
        price: "$5",
        network: network,
        rpcUrl: rpcUrl,
        config: {
          description: "💎 Pay 5 USDC → Get 100,000 PAYX tokens. Tokens will be sent to your wallet later.",
        }
      },
      "GET /payment/10usdc": {
        price: "$10",
        network: network,
        rpcUrl: rpcUrl,
        config: {
          description: "🚀 Pay 10 USDC → Get 200,000 PAYX tokens. Tokens will be sent to your wallet later.",
        }
      },
      "GET /payment/100usdc": {
        price: "$100",
        network: network,
        rpcUrl: rpcUrl,
        config: {
          description: "🌟 Pay 100 USDC → Get 2,000,000 PAYX tokens (Best Value!). Tokens will be sent to your wallet later.",
        }
      }
    },
    facilitatorConfig
  )
);

// Protected endpoints - Only accessible after payment
app.get("/payment/test", (c) => {
  return c.json({
    success: true,
    message: "Test payment confirmed! Your PAYX tokens will be sent to your wallet soon.",
    payment: {
      amount: "0.01 USDC",
      tokens: "50 PAYX",
      status: "Payment recorded - Tokens will be distributed later"
    }
  });
});


app.get("/payment/5usdc", async (c) => {
  // Simple payment tracking without Supabase dependency
  const walletAddress = c.req.query('wallet');
  if (walletAddress && process.env.SUPABASE_URL) {
    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'apikey': process.env.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount_usdc: 5,
          amount_payx: 100000,
          created_at: new Date().toISOString()
        })
      });
      if (response.ok) console.log('Payment tracked');
    } catch (error) {
      console.error('Tracking failed:', error);
    }
  }

  return c.json({
    success: true,
    message: "Payment confirmed! Your PAYX tokens will be sent to your wallet soon.",
    payment: {
      amount: "5 USDC",
      tokens: "100,000 PAYX",
      status: "Payment recorded - Tokens will be distributed later"
    }
  });
});

app.get("/payment/10usdc", async (c) => {
  const walletAddress = c.req.query('wallet');
  if (walletAddress && process.env.SUPABASE_URL) {
    try {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'apikey': process.env.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount_usdc: 10,
          amount_payx: 200000,
          created_at: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Tracking failed:', error);
    }
  }

  return c.json({
    success: true,
    message: "Payment confirmed! Your PAYX tokens will be sent to your wallet soon.",
    payment: {
      amount: "10 USDC",
      tokens: "200,000 PAYX",
      status: "Payment recorded - Tokens will be distributed later"
    }
  });
});

app.get("/payment/100usdc", async (c) => {
  const walletAddress = c.req.query('wallet');
  if (walletAddress && process.env.SUPABASE_URL) {
    try {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'apikey': process.env.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          amount_usdc: 100,
          amount_payx: 2000000,
          created_at: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Tracking failed:', error);
    }
  }

  return c.json({
    success: true,
    message: "Payment confirmed! Your PAYX tokens will be sent to your wallet soon.",
    payment: {
      amount: "100 USDC",
      tokens: "2,000,000 PAYX",
      status: "Payment recorded - Tokens will be distributed later"
    }
  });
});

// Balance endpoint - simple fetch to Supabase
app.get("/balance/:walletAddress", async (c) => {
  const walletAddress = c.req.param('walletAddress');
  
  if (!process.env.SUPABASE_URL) {
    return c.json({ success: false, error: 'Supabase not configured' });
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments?wallet_address=eq.${walletAddress}&order=created_at.desc`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'apikey': process.env.SUPABASE_ANON_KEY
      }
    });

    if (response.ok) {
      const payments = await response.json();
      const totalPayx = payments.reduce((sum, p) => sum + p.amount_payx, 0);
      
      return c.json({
        success: true,
        walletAddress,
        totalPayx,
        payments
      });
    }
  } catch (error) {
    console.error('Balance fetch error:', error);
  }

  return c.json({ success: false, error: 'Failed to fetch balance' });
});

// Track wallet address from x402 payment
app.post("/track-wallet", async (c) => {
  try {
    const { wallet, paymentUrl, paymentType } = await c.req.json();
    
    console.log('Tracking wallet:', wallet, 'for payment:', paymentUrl);
    
    // Store wallet address for this payment session
    // This will be used when payment is confirmed
    return c.json({ success: true, message: "Wallet address tracked" });
  } catch (error) {
    return c.json({ success: false, error: error.message });
  }
});

// Payment confirmation from x402
app.post("/payment-confirmation", async (c) => {
  try {
    const { wallet, paymentUrl, paymentType, status } = await c.req.json();
    
    console.log('Payment confirmation received:', { wallet, paymentUrl, paymentType, status });
    
    // Determine payment amount based on URL
    let amountUsdc = 0;
    let amountPayx = 0;
    
    if (paymentUrl.includes('/payment/5usdc')) {
      amountUsdc = 5;
      amountPayx = 100000;
    } else if (paymentUrl.includes('/payment/10usdc')) {
      amountUsdc = 10;
      amountPayx = 200000;
    } else if (paymentUrl.includes('/payment/100usdc')) {
      amountUsdc = 100;
      amountPayx = 2000000;
    } else if (paymentUrl.includes('/payment/test')) {
      amountUsdc = 0.01;
      amountPayx = 50;
    }
    
    // Send to Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey && wallet) {
      const response = await fetch(`${supabaseUrl}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          wallet_address: wallet,
          amount_usdc: amountUsdc,
          amount_payx: amountPayx
        })
      });
      
      if (response.ok) {
        console.log('Payment recorded in Supabase:', { wallet, amountUsdc, amountPayx });
        return c.json({ success: true, message: "Payment recorded successfully" });
      } else {
        console.log('Failed to record payment in Supabase:', response.status);
        return c.json({ success: false, error: "Failed to record payment" });
      }
    }
    
    return c.json({ success: true, message: "Payment confirmation received" });
  } catch (error) {
    return c.json({ success: false, error: error.message });
  }
});

// Test Supabase connection
app.get("/test-supabase", async (c) => {
  if (!process.env.SUPABASE_URL) {
    return c.json({ 
      success: false, 
      error: 'Supabase not configured',
      message: 'Add SUPABASE_URL and SUPABASE_ANON_KEY to environment variables'
    });
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments?limit=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'apikey': process.env.SUPABASE_ANON_KEY
      }
    });

    if (response.ok) {
      return c.json({
        success: true,
        message: 'Supabase connection successful!',
        supabaseUrl: process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_ANON_KEY
      });
    } else {
      return c.json({
        success: false,
        error: `Supabase connection failed: ${response.status}`,
        supabaseUrl: process.env.SUPABASE_URL
      });
    }
  } catch (error) {
    return c.json({
      success: false,
      error: `Supabase connection error: ${error}`,
      supabaseUrl: process.env.SUPABASE_URL
    });
  }
});

// Simple info page with links to protected endpoints
app.get("/", (c) => {
  // Vercel optimization - faster response
  if (isVercel) {
    c.header('Cache-Control', 'public, max-age=60');
  }
  
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PAYx402 - x402 Payment</title>
      <link rel="icon" type="image/png" href="/favicon.png">
      <link rel="shortcut icon" type="image/png" href="/favicon.png">
      <link rel="apple-touch-icon" href="/favicon.png">
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
          max-width: 700px;
          margin: 0 auto;
          padding: 30px;
          border: 4px solid #0052FF;
          box-shadow: 0 0 20px rgba(0, 82, 255, 0.3);
        }
        h1 {
          font-size: 32px;
          color: #0052FF;
          margin-bottom: 20px;
          text-shadow: 2px 2px 0px #001845;
          letter-spacing: 2px;
        }
        .subtitle {
          color: #4d94ff;
          font-size: 12px;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        a {
          display: block;
          background: #001845;
          color: #0052FF;
          text-decoration: none;
          padding: 16px 20px;
          font-size: 11px;
          margin-bottom: 16px;
          border: 3px solid #0052FF;
          cursor: pointer;
          transition: all 0.1s;
          text-align: center;
          letter-spacing: 1px;
        }
        a:hover {
          background: #0052FF;
          color: #fff;
          box-shadow: 0 0 10px rgba(0, 82, 255, 0.8);
        }
        a:active {
          transform: scale(0.98);
        }
        .info {
          margin-top: 30px;
          padding: 20px;
          background: #000814;
          border: 3px solid #003d99;
          font-size: 10px;
          line-height: 2;
        }
        .info strong {
          color: #0052FF;
        }
        .info p {
          margin-bottom: 10px;
          color: #4d94ff;
        }
        .social-links {
          display: flex;
          gap: 15px;
          margin-bottom: 30px;
          justify-content: center;
        }
        .social-links a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          padding: 0;
          margin: 0;
          background: #001845;
          border: 3px solid #0052FF;
          font-size: 24px;
          text-decoration: none;
        }
        .social-links a:hover {
          background: #0052FF;
          color: #fff;
          transform: scale(1.1);
        }
        .test-button {
          background: #1a472a !important; /* Dark green */
          border-color: #2ecc71 !important; /* Light green */
          color: #2ecc71 !important;
          font-size: 10px !important;
          margin-top: 25px !important;
          position: relative;
        }
        .test-button::before {
          content: '🧪 TEST';
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          color: #2ecc71;
        }
        .test-button:hover {
          background: #2ecc71 !important;
          color: #000 !important;
        }
        
        /* Pixel Art Modal */
        .modal-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          z-index: 9999;
          animation: fadeIn 0.2s;
        }
        .modal-overlay.active {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          background: #001d3d;
          border: 4px solid #0052FF;
          box-shadow: 0 0 40px rgba(0, 82, 255, 0.8), 8px 8px 0px #000;
          max-width: 90%;
          max-height: 90%;
          width: 800px;
          height: 600px;
          position: relative;
          animation: pixelPop 0.3s;
        }
        .modal-content.test {
          border-color: #2ecc71;
          box-shadow: 0 0 40px rgba(46, 204, 113, 0.8), 8px 8px 0px #000;
        }
        .modal-content.premium {
          border-color: #FFD700;
          box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 8px 8px 0px #000;
        }
        .modal-header {
          background: #000814;
          border-bottom: 4px solid #0052FF;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-content.test .modal-header {
          border-bottom-color: #2ecc71;
        }
        .modal-content.premium .modal-header {
          border-bottom-color: #FFD700;
        }
        .modal-title {
          font-size: 16px;
          color: #0052FF;
          text-shadow: 2px 2px 0px #000;
        }
        .modal-content.test .modal-title {
          color: #2ecc71;
        }
        .modal-content.premium .modal-title {
          color: #FFD700;
        }
        .modal-close {
          background: #ff4d4d;
          border: 3px solid #000;
          color: #fff;
          cursor: pointer;
          padding: 8px 16px;
          font-size: 12px;
          box-shadow: 3px 3px 0px #000;
          transition: all 0.1s;
        }
        .modal-close:hover {
          transform: translate(2px, 2px);
          box-shadow: 1px 1px 0px #000;
        }
        .modal-body {
          width: 100%;
          height: calc(100% - 68px);
        }
        .modal-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pixelPop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* Coin Rain Animation */
        .coin-rain {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 99999;
        }
        .coin {
          position: absolute;
          font-size: 32px;
          animation: coinFall 3s linear forwards;
          text-shadow: 2px 2px 0px #000;
        }
        @keyframes coinFall {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes coinRotate {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(180deg); }
        }
        
        /* Success Message */
        .success-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.95);
          z-index: 100000;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s;
        }
        .success-overlay.active {
          display: flex;
        }
        .success-box {
          background: #001d3d;
          border: 4px solid #2ecc71;
          box-shadow: 0 0 50px rgba(46, 204, 113, 1), 8px 8px 0px #000;
          padding: 40px;
          text-align: center;
          max-width: 500px;
          animation: pixelPop 0.5s;
        }
        .success-icon {
          font-size: 64px;
          margin-bottom: 20px;
          animation: coinRotate 2s infinite;
        }
        .success-title {
          font-size: 24px;
          color: #2ecc71;
          text-shadow: 3px 3px 0px #000;
          margin-bottom: 15px;
        }
        .success-text {
          font-size: 12px;
          color: #4d94ff;
          line-height: 1.8;
          margin-bottom: 25px;
        }
        .success-button {
          background: #2ecc71;
          border: 4px solid #000;
          color: #000;
          padding: 12px 32px;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 4px 4px 0px #000;
          transition: all 0.1s;
          font-weight: bold;
        }
        .success-button:hover {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px #000;
        }
      </style>
    </head>
    <body>
      <div class="container">
               <div class="social-links">
                 <a href="https://x.com/Payx402token" title="X (Twitter)" target="_blank" rel="noopener noreferrer">𝕏</a>
                 <a href="#" title="Telegram">✈</a>
               </div>
        
        <h1>PAYx402</h1>
        <p class="subtitle">Buy PAYX Tokens with USDC</p>
        
        <!-- Balance Display -->
        <div class="balance-section">
          <h3 style="color: #2ecc71; margin-bottom: 15px;">💰 Your PAYX Balance</h3>
          <div class="balance-input">
            <input type="text" id="walletInput" placeholder="Enter your wallet address (0x...)" style="width: 100%; padding: 10px; margin-bottom: 10px; font-family: 'Press Start 2P', monospace; font-size: 10px; background: #000814; color: #0052FF; border: 2px solid #0052FF;">
            <button onclick="checkBalance()" style="background: #2ecc71; border: 3px solid #000; color: #000; padding: 10px 20px; font-size: 10px; cursor: pointer; box-shadow: 3px 3px 0px #000; transition: all 0.1s;">Check Balance</button>
          </div>
          <div id="balanceResult" style="margin-top: 15px; padding: 15px; background: #000814; border: 2px solid #2ecc71; display: none;">
            <div id="balanceAmount" style="font-size: 18px; color: #2ecc71; font-weight: bold;"></div>
            <div id="balanceDetails" style="font-size: 10px; color: #4d94ff; margin-top: 10px;"></div>
          </div>
        </div>
        
        <a href="#" onclick="openPaymentModal('/payment/5usdc', '💎 5 USDC Payment'); return false;">5 USDC → 100,000 PAYX</a>
        <a href="#" onclick="openPaymentModal('/payment/10usdc', '🚀 10 USDC Payment'); return false;">10 USDC → 200,000 PAYX</a>
        <a href="#" onclick="openPaymentModal('/payment/100usdc', '🌟 100 USDC Payment', 'premium'); return false;">100 USDC → 2,000,000 PAYX</a>
        
        <a href="#" onclick="openPaymentModal('/payment/test', '🧪 Test Payment', 'test'); return false;" class="test-button">0.01 USDC → 50 PAYX</a>
        
        <div class="info">
          <p><strong>Token Information:</strong></p>
          <p>• Token: PAYX</p>
          <p>• Total Supply: 1,000,000,000 PAYX</p>
          <p>• Rate: 1 USDC = 20,000 PAYX</p>
          <p>• Network: Base Mainnet</p>
          
          <p style="margin-top: 15px;"><strong>Payment Options:</strong></p>
          <p>• 0.01 USDC = 50 PAYX (Test)</p>
          <p>• 5 USDC = 100,000 PAYX</p>
          <p>• 10 USDC = 200,000 PAYX</p>
          <p>• 100 USDC = 2,000,000 PAYX</p>
          
          <p style="margin-top: 15px;"><strong>How it works:</strong></p>
          <p>1. Choose your payment amount</p>
          <p>2. x402 paywall will appear</p>
          <p>3. Connect your wallet</p>
          <p>4. Complete USDC payment on Base</p>
          <p>5. Payment will be recorded</p>
          
          <p style="margin-top: 15px; color: #4d94ff;">
            <strong>✅ PAYX tokens will be distributed to your wallet later</strong>
          </p>
          
          <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #003d99; font-size: 0.85rem; color: #4d94ff;">
            <strong>About PAYx402:</strong><br>
            This is an experimental project testing x402 protocol for automated token distribution. 
            PAYX is a meme token created for demonstration purposes.
          </p>
          
          <p style="margin-top: 10px; font-size: 0.85rem; color: #ff4d4d;">
            <strong>⚠️ DISCLAIMER:</strong><br>
            Use at your own risk. This is not financial advice. 
            PAYX is an experimental meme token with no intrinsic value. 
            Only participate with funds you can afford to lose.
          </p>
        </div>
      </div>
      
      <!-- Pixel Art Modal -->
      <div id="paymentModal" class="modal-overlay">
        <div id="modalContent" class="modal-content">
          <div class="modal-header">
            <div class="modal-title" id="modalTitle">Payment</div>
            <button class="modal-close" onclick="closePaymentModal()">✕ CLOSE</button>
          </div>
          <div class="modal-body">
                   <!-- Wallet Address Input -->
                   <div id="walletInputSection" style="padding: 20px; background: #000814; border-bottom: 2px solid #0052FF;">
                     <h4 style="color: #2ecc71; margin-bottom: 15px; font-size: 14px; text-align: center;">💰 OPTIONAL: Enter Your Wallet Address</h4>
                     <p style="font-size: 10px; color: #4d94ff; margin-bottom: 15px; text-align: center; background: #001d3d; padding: 10px; border: 2px solid #4d94ff;">
                       <strong>💡 TIP:</strong> Enter your wallet address to receive PAYX tokens. This is optional but recommended for tracking.
                     </p>
                     
                     <!-- Manual Input -->
                     <input type="text" id="paymentWalletInput" placeholder="Enter wallet address (0x...) - Optional but recommended" style="width: 100%; padding: 15px; margin-bottom: 15px; font-family: 'Press Start 2P', monospace; font-size: 12px; background: #001d3d; color: #0052FF; border: 3px solid #4d94ff; text-align: center;">
                     <p style="font-size: 9px; color: #4d94ff; margin-bottom: 15px; text-align: center;">This address will receive your PAYX tokens after payment</p>
                     
                     <button onclick="startPayment()" id="startPaymentBtn" style="background: #2ecc71; border: 4px solid #000; color: #000; padding: 15px 30px; font-size: 12px; cursor: pointer; box-shadow: 4px 4px 0px #000; width: 100%; font-weight: bold;">🚀 START PAYMENT</button>
                   </div>
            <iframe id="paymentIframe" class="modal-iframe" src="about:blank" style="display: none;"></iframe>
          </div>
        </div>
      </div>
      
      <!-- Success Overlay with Coin Rain -->
      <div id="successOverlay" class="success-overlay">
        <div class="success-box">
          <div class="success-icon">💰</div>
          <div class="success-title">PAYMENT SUCCESSFUL!</div>
          <div class="success-text">
            Your payment has been confirmed!<br>
            PAYX tokens will be sent to your wallet soon.<br><br>
            <strong>Thank you for your purchase! 🎉</strong>
          </div>
          <button class="success-button" onclick="closeSuccessOverlay()">AWESOME!</button>
        </div>
      </div>
      
      <!-- Coin Rain Container -->
      <div id="coinRain" class="coin-rain"></div>
      
      <script>
        let currentPaymentUrl = '';
        let currentPaymentTitle = '';
        let currentPaymentType = '';
        
        // Define openPaymentModal function
        function openPaymentModal(url, title, type) {
          const modal = document.getElementById('paymentModal');
          const modalContent = document.getElementById('modalContent');
          const modalTitle = document.getElementById('modalTitle');
          const iframe = document.getElementById('paymentIframe');
          const walletInputSection = document.getElementById('walletInputSection');
          
          // Store payment info
          currentPaymentUrl = url;
          currentPaymentTitle = title;
          currentPaymentType = type;
          
          // Set title
          modalTitle.textContent = title;
          
          // Set modal class based on type
          modalContent.className = 'modal-content';
          if (type === 'test') {
            modalContent.classList.add('test');
          } else if (type === 'premium') {
            modalContent.classList.add('premium');
          }
          
          // Show both wallet input and iframe
          walletInputSection.style.display = 'block';
          iframe.style.display = 'block';
          
          // Load payment directly - x402 will handle wallet connection
          // Add a random parameter to track this payment session
          const sessionId = Date.now();
          iframe.src = url + '?session=' + sessionId;
          
          // Start monitoring for payment success and wallet address
          setTimeout(() => startPaymentMonitoring(), 1000);
          
          // Show modal
          modal.classList.add('active');
          
          // Prevent body scroll
          document.body.style.overflow = 'hidden';
        }
        
        // Connect wallet function
        async function connectWallet() {
          const connectBtn = document.getElementById('connectWalletBtn');
          const manualSection = document.getElementById('manualInputSection');
          const startBtn = document.getElementById('startPaymentBtn');
          const walletInput = document.getElementById('paymentWalletInput');
          
          // Show loading state
          connectBtn.innerHTML = '🔄 Connecting...';
          connectBtn.disabled = true;
          
          try {
            // Check if MetaMask is installed
            if (typeof window.ethereum !== 'undefined') {
              // Request account access
              const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
              
              if (accounts && accounts.length > 0) {
                const walletAddress = accounts[0];
                walletInput.value = walletAddress;
                
                // Show success state
                connectBtn.innerHTML = '✅ Wallet Connected: ' + walletAddress.substring(0, 6) + '...' + walletAddress.substring(38);
                connectBtn.style.background = '#2ecc71';
                connectBtn.style.color = '#000';
                
                // Show manual input section with connected wallet
                manualSection.style.display = 'block';
                walletInput.style.border = '3px solid #2ecc71';
                walletInput.style.background = '#001d3d';
                
                // Show start payment button
                startBtn.style.display = 'block';
                
                // Add success message
                const successMsg = document.createElement('div');
                successMsg.innerHTML = '🎉 Wallet connected successfully! You can now proceed with payment.';
                successMsg.style.color = '#2ecc71';
                successMsg.style.fontSize = '10px';
                successMsg.style.marginTop = '10px';
                successMsg.style.textAlign = 'center';
                successMsg.style.background = '#001d3d';
                successMsg.style.padding = '8px';
                successMsg.style.border = '2px solid #2ecc71';
                
                // Remove existing success message
                const existingMsg = manualSection.querySelector('.wallet-success');
                if (existingMsg) existingMsg.remove();
                
                successMsg.className = 'wallet-success';
                manualSection.appendChild(successMsg);
                
                return true;
              }
            } else {
              // MetaMask not installed
              connectBtn.innerHTML = '❌ MetaMask Not Found';
              connectBtn.style.background = '#ff4d4d';
              connectBtn.style.color = '#fff';
              
              // Show manual input option
              manualSection.style.display = 'block';
              startBtn.style.display = 'block';
              
              // Show error message
              const errorMsg = document.createElement('div');
              errorMsg.innerHTML = '⚠️ MetaMask not detected. Please enter your wallet address manually.';
              errorMsg.style.color = '#ff4d4d';
              errorMsg.style.fontSize = '10px';
              errorMsg.style.marginTop = '10px';
              errorMsg.style.textAlign = 'center';
              errorMsg.style.background = '#001d3d';
              errorMsg.style.padding = '8px';
              errorMsg.style.border = '2px solid #ff4d4d';
              
              // Remove existing error message
              const existingMsg = manualSection.querySelector('.wallet-error');
              if (existingMsg) existingMsg.remove();
              
              errorMsg.className = 'wallet-error';
              manualSection.appendChild(errorMsg);
            }
          } catch (error) {
            console.log('Wallet connection failed:', error);
            
            // Show error state
            connectBtn.innerHTML = '❌ Connection Failed';
            connectBtn.style.background = '#ff4d4d';
            connectBtn.style.color = '#fff';
            
            // Show manual input option
            manualSection.style.display = 'block';
            startBtn.style.display = 'block';
            
            // Show error message
            const errorMsg = document.createElement('div');
            errorMsg.innerHTML = '⚠️ Wallet connection failed. Please enter your wallet address manually.';
            errorMsg.style.color = '#ff4d4d';
            errorMsg.style.fontSize = '10px';
            errorMsg.style.marginTop = '10px';
            errorMsg.style.textAlign = 'center';
            errorMsg.style.background = '#001d3d';
            errorMsg.style.padding = '8px';
            errorMsg.style.border = '2px solid #ff4d4d';
            
            // Remove existing error message
            const existingMsg = manualSection.querySelector('.wallet-error');
            if (existingMsg) existingMsg.remove();
            
            errorMsg.className = 'wallet-error';
            manualSection.appendChild(errorMsg);
          }
          
          // Re-enable button after 3 seconds
          setTimeout(() => {
            connectBtn.disabled = false;
            if (connectBtn.innerHTML.includes('🔄')) {
              connectBtn.innerHTML = '🔗 CONNECT WALLET';
              connectBtn.style.background = '#0052FF';
              connectBtn.style.color = '#fff';
            }
          }, 3000);
        }
        
        // Auto-detect wallet address (fallback)
        async function autoDetectWallet() {
          const walletInput = document.getElementById('paymentWalletInput');
          
          // Try to get wallet from MetaMask or other providers
          if (typeof window.ethereum !== 'undefined') {
            try {
              // Request account access
              const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
              if (accounts && accounts.length > 0) {
                walletInput.value = accounts[0];
                walletInput.style.border = '3px solid #2ecc71';
                walletInput.style.background = '#001d3d';
                
                // Show success message
                const successMsg = document.createElement('div');
                successMsg.innerHTML = '✅ Wallet detected: ' + accounts[0].substring(0, 6) + '...' + accounts[0].substring(38);
                successMsg.style.color = '#2ecc71';
                successMsg.style.fontSize = '10px';
                successMsg.style.marginTop = '5px';
                successMsg.style.textAlign = 'center';
                
                // Remove existing success message
                const existingMsg = walletInput.parentNode.querySelector('.wallet-success');
                if (existingMsg) existingMsg.remove();
                
                successMsg.className = 'wallet-success';
                walletInput.parentNode.appendChild(successMsg);
                
                return true;
              }
            } catch (error) {
              console.log('Wallet connection failed:', error);
            }
          }
          
          // If no wallet detected, show manual input option
          walletInput.placeholder = 'Enter wallet address manually (0x...)';
          walletInput.style.border = '3px solid #ff4d4d';
          walletInput.style.background = '#001d3d';
          
          return false;
        }
        
        function startPayment() {
          const walletInput = document.getElementById('paymentWalletInput');
          const walletAddress = walletInput.value.trim();
          const walletInputSection = document.getElementById('walletInputSection');
          const iframe = document.getElementById('paymentIframe');
          
          // If wallet address provided, validate it
          if (walletAddress) {
            if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
              alert('❌ ERROR: Please enter a valid wallet address (0x... format, 42 characters)');
              return;
            }
            
            // Send wallet address to backend for tracking
            sendWalletToBackend(walletAddress);
          }
          
          // Hide wallet input, show iframe
          walletInputSection.style.display = 'none';
          iframe.style.display = 'block';
          
          // Load payment with wallet address (if provided)
          const paymentUrl = walletAddress ? 
            \`\${currentPaymentUrl}?wallet=\${encodeURIComponent(walletAddress)}\` : 
            currentPaymentUrl;
          
          iframe.src = paymentUrl;
          
          // Start monitoring for payment success
          setTimeout(() => startPaymentMonitoring(), 1000);
        }
        
        // Payment monitoring function
        function startPaymentMonitoring() {
          const iframe = document.getElementById('paymentIframe');
          let checkInterval;
          let walletAddress = null;
          let monitoringAttempts = 0;
          const maxAttempts = 30; // Monitor for 60 seconds
          
          console.log('Starting payment monitoring...');
          
          checkInterval = setInterval(() => {
            monitoringAttempts++;
            console.log('Monitoring attempt:', monitoringAttempts);
            
            try {
              // Try to access iframe content
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              if (iframeDoc && iframeDoc.body) {
                const bodyText = iframeDoc.body.textContent || iframeDoc.body.innerText;
                console.log('Iframe content detected:', bodyText.substring(0, 200));
                
                // Try to extract wallet address from x402 payment interface
                if (bodyText.includes('0x') && bodyText.length > 40) {
                  const addressMatch = bodyText.match(/0x[a-fA-F0-9]{40}/);
                  if (addressMatch && !walletAddress) {
                    walletAddress = addressMatch[0];
                    console.log('✅ Wallet address detected:', walletAddress);
                    
                    // Send wallet address to backend for tracking
                    sendWalletToBackend(walletAddress);
                  }
                }
                
                // Check for payment success
                if (bodyText.includes('success') || bodyText.includes('confirmed') || bodyText.includes('complete') || bodyText.includes('Payment successful') || bodyText.includes('Transaction successful')) {
                  console.log('✅ Payment success detected!');
                  clearInterval(checkInterval);
                  
                  // Send final payment confirmation with wallet address
                  if (walletAddress) {
                    sendPaymentConfirmation(walletAddress);
                  } else {
                    // If no wallet detected, try to extract it now
                    const addressMatch = bodyText.match(/0x[a-fA-F0-9]{40}/);
                    if (addressMatch) {
                      walletAddress = addressMatch[0];
                      console.log('✅ Wallet address detected on success:', walletAddress);
                      sendPaymentConfirmation(walletAddress);
                    }
                  }
                  
                  showSuccessOverlay();
                }
              } else {
                console.log('Iframe not ready yet...');
              }
            } catch (e) {
              // Cross-origin error, continue monitoring
              console.log('Cross-origin error, continuing monitoring...');
            }
            
            // Stop monitoring after max attempts
            if (monitoringAttempts >= maxAttempts) {
              console.log('Monitoring timeout reached');
              clearInterval(checkInterval);
              
              // Try to get wallet address from URL parameters as fallback
              const urlParams = new URLSearchParams(window.location.search);
              const walletParam = urlParams.get('wallet');
              if (walletParam && !walletAddress) {
                walletAddress = walletParam;
                console.log('✅ Wallet address from URL parameter:', walletAddress);
                sendWalletToBackend(walletAddress);
              }
            }
          }, 2000);
        }
        
        // Send wallet address to backend for tracking
        async function sendWalletToBackend(walletAddress) {
          try {
            const response = await fetch('/track-wallet', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                wallet: walletAddress,
                paymentUrl: currentPaymentUrl,
                paymentType: currentPaymentType
              })
            });
            
            if (response.ok) {
              console.log('Wallet address sent to backend:', walletAddress);
            }
          } catch (error) {
            console.log('Failed to send wallet address:', error);
          }
        }
        
        // Send payment confirmation to backend
        async function sendPaymentConfirmation(walletAddress) {
          try {
            const response = await fetch('/payment-confirmation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                wallet: walletAddress,
                paymentUrl: currentPaymentUrl,
                paymentType: currentPaymentType,
                status: 'completed'
              })
            });
            
            if (response.ok) {
              console.log('Payment confirmation sent:', walletAddress);
            }
          } catch (error) {
            console.log('Failed to send payment confirmation:', error);
          }
        }
        
        // Success overlay function
        function showSuccessOverlay() {
          const overlay = document.getElementById('successOverlay');
          overlay.style.display = 'flex';
          createCoinRain();
        }
        
        function closeSuccessOverlay() {
          const overlay = document.getElementById('successOverlay');
          overlay.style.display = 'none';
        }
        
        // Close payment modal function
        function closePaymentModal() {
          const modal = document.getElementById('paymentModal');
          const iframe = document.getElementById('paymentIframe');
          
          // Stop monitoring
          if (checkInterval) {
            clearInterval(checkInterval);
          }
          
          // Hide modal
          modal.classList.remove('active');
          
          // Clear iframe
          iframe.src = 'about:blank';
          
          // Restore body scroll
          document.body.style.overflow = '';
        }
        
        // Balance check function
        async function checkBalance() {
          const walletInput = document.getElementById('walletInput');
          const balanceResult = document.getElementById('balanceResult');
          const balanceAmount = document.getElementById('balanceAmount');
          const balanceDetails = document.getElementById('balanceDetails');
          
          const walletAddress = walletInput.value.trim();
          
          if (!walletAddress) {
            alert('Please enter a wallet address');
            return;
          }
          
          if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
            alert('Please enter a valid wallet address (0x...)');
            return;
          }
          
          try {
            balanceResult.style.display = 'block';
            balanceAmount.textContent = 'Loading...';
            balanceDetails.textContent = 'Fetching balance...';
            
            const response = await fetch(\`/balance/\${walletAddress}\`);
            const data = await response.json();
            
            if (data.success) {
              balanceAmount.textContent = \`\${data.totalPayx.toLocaleString()} PAYX\`;
              balanceDetails.textContent = \`Wallet: \${walletAddress.substring(0, 6)}...\${walletAddress.substring(38)} | Payments: \${data.payments.length}\`;
            } else {
              balanceAmount.textContent = 'Error loading balance';
              balanceDetails.textContent = data.error || 'Failed to fetch balance';
            }
          } catch (error) {
            balanceAmount.textContent = 'Error';
            balanceDetails.textContent = 'Failed to connect to server';
            console.error('Balance check error:', error);
          }
        }
        
        // Coin rain animation
        function createCoinRain(duration = 5000) {
          const coinRain = document.getElementById('coinRain');
          const coins = ['💰', '🪙', '💎', '⭐', '✨'];
          const coinsToCreate = 50; // Number of coins
          
          for (let i = 0; i < coinsToCreate; i++) {
            setTimeout(() => {
              const coin = document.createElement('div');
              coin.className = 'coin';
              coin.textContent = coins[Math.floor(Math.random() * coins.length)];
              coin.style.left = Math.random() * 100 + '%';
              coin.style.animationDuration = (Math.random() * 2 + 2) + 's';
              coin.style.animationDelay = (Math.random() * 0.5) + 's';
              
              coinRain.appendChild(coin);
              
              // Remove coin after animation
              coin.addEventListener('animationend', () => {
                coin.remove();
              });
            }, i * 50); // Stagger creation
          }
          
          // Stop after duration
          setTimeout(() => {
            coinRain.innerHTML = ''; // Clear all coins
          }, duration);
        }
        
        // Close modal on overlay click
        document.getElementById('paymentModal').addEventListener('click', function(e) {
          if (e.target === this) {
            closePaymentModal();
          }
        });
        
        // Close modal on ESC key
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            closePaymentModal();
          }
        });
        
        // Listen for messages from iframe (x402 payment)
        window.addEventListener('message', function(event) {
          console.log('Message received from iframe:', event.data);
          
          // Check if message contains wallet address
          if (event.data && event.data.wallet) {
            console.log('✅ Wallet address received via postMessage:', event.data.wallet);
            sendWalletToBackend(event.data.wallet);
          }
          
          // Check if message contains payment success
          if (event.data && event.data.success) {
            console.log('✅ Payment success received via postMessage');
            if (event.data.wallet) {
              sendPaymentConfirmation(event.data.wallet);
            }
            showSuccessOverlay();
          }
        });
        
        // Initial check for wallet in URL (if user navigates directly)
        document.addEventListener('DOMContentLoaded', () => {
          const urlParams = new URLSearchParams(window.location.search);
          const wallet = urlParams.get('wallet');
          if (wallet) {
            document.getElementById('walletInput').value = wallet;
            checkBalance();
          }
        });
        
        function closePaymentModal() {
          const modal = document.getElementById('paymentModal');
          const iframe = document.getElementById('paymentIframe');
          
          // Stop monitoring
          if (checkInterval) {
            clearInterval(checkInterval);
          }
          
          // Hide modal
          modal.classList.remove('active');
          
          // Clear iframe
          iframe.src = 'about:blank';
          
          // Restore body scroll
          document.body.style.overflow = '';
        }
        
        // Close modal on overlay click
        document.getElementById('paymentModal').addEventListener('click', function(e) {
          if (e.target === this) {
            closePaymentModal();
          }
        });
        
        // Close modal on ESC key
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            closePaymentModal();
          }
        });
        
        // Balance Check Function
        async function checkBalance() {
          const walletInput = document.getElementById('walletInput');
          const balanceResult = document.getElementById('balanceResult');
          const balanceAmount = document.getElementById('balanceAmount');
          const balanceDetails = document.getElementById('balanceDetails');
          
          const walletAddress = walletInput.value.trim();
          
          if (!walletAddress) {
            alert('Please enter a wallet address');
            return;
          }
          
          if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
            alert('Please enter a valid wallet address (0x...)');
            return;
          }
          
          try {
            balanceResult.style.display = 'block';
            balanceAmount.textContent = 'Loading...';
            balanceDetails.textContent = 'Fetching balance...';
            
            const response = await fetch(\`/balance/\${walletAddress}\`);
            const data = await response.json();
            
            if (data.success) {
              balanceAmount.textContent = \`\${data.totalPayx.toLocaleString()} PAYX\`;
              balanceDetails.textContent = \`Wallet: \${walletAddress.substring(0, 6)}...\${walletAddress.substring(38)} | Payments: \${data.payments.length}\`;
            } else {
              balanceAmount.textContent = 'Error loading balance';
              balanceDetails.textContent = data.error || 'Failed to fetch balance';
            }
          } catch (error) {
            balanceAmount.textContent = 'Error';
            balanceDetails.textContent = 'Failed to connect to server';
            console.error('Balance check error:', error);
          }
        }
        
        // Coin Rain Animation
        function createCoinRain(duration = 5000) {
          const coinRain = document.getElementById('coinRain');
          const coins = ['💰', '🪙', '💎', '⭐', '✨'];
          const coinsToCreate = 50; // Number of coins
          
          for (let i = 0; i < coinsToCreate; i++) {
            setTimeout(() => {
              const coin = document.createElement('div');
              coin.className = 'coin';
              coin.textContent = coins[Math.floor(Math.random() * coins.length)];
              coin.style.left = Math.random() * 100 + '%';
              coin.style.animationDuration = (Math.random() * 2 + 2) + 's';
              coin.style.animationDelay = (Math.random() * 0.5) + 's';
              
              coinRain.appendChild(coin);
              
              // Remove coin after animation
              setTimeout(() => {
                coin.remove();
              }, 4000);
            }, i * 100);
          }
        }
        
        // Show success overlay with coin rain
        function showPaymentSuccess() {
          // Close payment modal
          closePaymentModal();
          
          // Show success overlay
          const successOverlay = document.getElementById('successOverlay');
          successOverlay.classList.add('active');
          
          // Start coin rain
          createCoinRain();
          
          // Auto close after 8 seconds
          setTimeout(() => {
            closeSuccessOverlay();
          }, 8000);
        }
        
        // Close success overlay
        function closeSuccessOverlay() {
          const successOverlay = document.getElementById('successOverlay');
          successOverlay.classList.remove('active');
          
          // Clear any remaining coins
          const coinRain = document.getElementById('coinRain');
          coinRain.innerHTML = '';
        }
        
        // Listen for iframe navigation (payment success detection)
        let checkInterval;
        function startPaymentMonitoring() {
          const iframe = document.getElementById('paymentIframe');
          if (!iframe) return;
          
          checkInterval = setInterval(() => {
            try {
              // Check if iframe URL changed or if we can detect success
              const iframeSrc = iframe.src;
              
              // If iframe shows JSON response or success page
              if (iframeSrc.includes('/payment/') && iframe.contentDocument) {
                try {
                  const body = iframe.contentDocument.body;
                  const text = body.innerText || body.textContent;
                  
                  // Check for success indicators in response
                  if (text.includes('"success":true') || 
                      text.includes('Payment confirmed') ||
                      text.includes('PAYX tokens will be sent')) {
                    clearInterval(checkInterval);
                    showPaymentSuccess();
                  }
                } catch (e) {
                  // Cross-origin restriction - that's ok
                }
              }
            } catch (e) {
              // Ignore errors
            }
          }, 500);
        }
        
        // Also listen for postMessage from iframe
        window.addEventListener('message', function(event) {
          // Check if message is from payment iframe
          if (event.data && (event.data.type === 'payment_success' || event.data.success === true)) {
            clearInterval(checkInterval);
            showPaymentSuccess();
          }
        });
        
        // Simulate payment success for testing (remove in production)
        // Uncomment to test coin rain: setTimeout(() => showPaymentSuccess(), 3000);
        
        // Test button for coin rain (temporary - remove before production)
        document.addEventListener('keydown', function(e) {
          if (e.key === 'c' && e.ctrlKey) {
            showPaymentSuccess();
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Export for Vercel - NO app.listen() needed!
export default app;
