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
      const totalUsdc = payments.reduce((sum, p) => sum + p.amount_usdc, 0);
      
      console.log(`💰 Balance for ${walletAddress}: ${totalPayx} PAYX (${totalUsdc} USDC)`);
      
  return c.json({
    success: true,
        walletAddress,
        totalPayx,
        totalUsdc,
        payments,
        paymentCount: payments.length,
        lastPayment: payments[0] || null
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

// Test payment recording
app.post("/test-payment", async (c) => {
  try {
    const { wallet, amount } = await c.req.json();
    
    console.log('🧪 Test payment received:', { wallet, amount });
    
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
          amount_usdc: amount || 5,
          amount_payx: (amount || 5) * 20000
        })
      });
      
      if (response.ok) {
        console.log('✅ Test payment recorded in Supabase');
        return c.json({ success: true, message: "Test payment recorded successfully" });
      } else {
        console.log('❌ Failed to record test payment:', response.status);
        return c.json({ success: false, error: "Failed to record test payment" });
      }
    }
    
    return c.json({ success: true, message: "Test payment received" });
  } catch (error) {
    return c.json({ success: false, error: error.message });
  }
});

// Get USDC transactions from BaseScan API
app.get("/blockchain-transactions", async (c) => {
  try {
    const walletAddress = "0xda8d766bc482a7953b72283f56c12ce00da6a86a";
    
    console.log('🔍 Fetching transactions from BaseScan for wallet:', walletAddress);
    
    // BaseScan API endpoint for token transactions with API key
    // Using Etherscan API with Base chain ID (8453)
    // Get last 7 days of transactions
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const baseScanUrl = `https://api.etherscan.io/v2/api?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&chainid=8453&apikey=SI8ECAC19FPN92K9MCNQENMGY6Z6MRM14Q`;
    
    console.log('📡 BaseScan URL:', baseScanUrl);
    
    const response = await fetch(baseScanUrl);
    
    if (!response.ok) {
      console.log('❌ API Request failed:', response.status, response.statusText);
      return c.json({
        success: false,
        error: `API request failed: ${response.status} ${response.statusText}`,
        url: baseScanUrl
      });
    }
    
    const data = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📊 API Response Headers:', response.headers);
    console.log('📊 BaseScan response:', JSON.stringify(data, null, 2));
    console.log('📊 API URL:', baseScanUrl);
    
    if (data.status === '1' && data.result) {
      // Filter for USDC transactions (incoming only, excluding 0.01 USDC test payments)
      const usdcTransactions = data.result.filter(tx => {
        const isUsdc = tx.contractAddress.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
        const isIncoming = tx.to.toLowerCase() === walletAddress.toLowerCase(); // Sadece GELEN transfer'lar
        const isNotOutgoing = tx.from.toLowerCase() !== walletAddress.toLowerCase(); // ÇIKAN transfer'lar değil
        const amountUsdc = parseFloat(tx.value) / Math.pow(10, 6);
        const isNotTest = amountUsdc >= 0.01; // Allow 0.01 USDC test payments and above
        
        return isUsdc && isIncoming && isNotOutgoing && isNotTest;
      });
      
      console.log('✅ Found USDC transactions (>=0.01 USDC):', usdcTransactions.length);
      
      return c.json({
        success: true,
        wallet: walletAddress,
        totalTransactions: usdcTransactions.length,
        transactions: usdcTransactions.slice(0, 10), // Last 10 transactions
        message: "Blockchain transactions fetched successfully",
        rawData: data
      });
    } else {
      return c.json({
        success: false,
        error: "Failed to fetch transactions from BaseScan",
        data: data,
        status: data.status,
        message: data.message
      });
    }
  } catch (error) {
    console.log('❌ BaseScan fetch error:', error);
    return c.json({
      success: false,
      error: `Blockchain fetch error: ${error.message}`
    });
  }
});

// Sync blockchain transactions to Supabase
app.post("/sync-blockchain", async (c) => {
  try {
    const walletAddress = "0xda8d766bc482a7953b72283f56c12ce00da6a86a";
    
    console.log('🔄 Syncing blockchain transactions to Supabase...');
    
    // Get transactions from BaseScan with API key
    // Using Etherscan API with Base chain ID (8453)
    // Get last 7 days of transactions
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const baseScanUrl = `https://api.etherscan.io/v2/api?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&chainid=8453&apikey=SI8ECAC19FPN92K9MCNQENMGY6Z6MRM14Q`;
    
    const response = await fetch(baseScanUrl);
    
    if (!response.ok) {
      console.log('❌ API Request failed:', response.status, response.statusText);
      return c.json({
        success: false,
        error: `API request failed: ${response.status} ${response.statusText}`,
        url: baseScanUrl
      });
    }
    
    const data = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📊 API Response Headers:', response.headers);
    console.log('📊 API Response Data:', JSON.stringify(data, null, 2));
    console.log('📊 API URL:', baseScanUrl);
    
    if (data.status === '1' && data.result) {
      // Filter for USDC transactions TO our wallet (incoming payments only)
      const usdcTransactions = data.result.filter(tx => {
        const isUsdc = tx.contractAddress.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
        const isIncoming = tx.to.toLowerCase() === walletAddress.toLowerCase(); // Sadece GELEN transfer'lar
        const isNotOutgoing = tx.from.toLowerCase() !== walletAddress.toLowerCase(); // ÇIKAN transfer'lar değil
        const amountUsdc = parseFloat(tx.value) / Math.pow(10, 6);
        const isNotTest = amountUsdc >= 0.01; // Allow 0.01 USDC test payments and above
        
        console.log(`🔍 Transaction: ${tx.hash}`);
        console.log(`   From: ${tx.from}`);
        console.log(`   To: ${tx.to}`);
        console.log(`   Amount: ${amountUsdc} USDC`);
        console.log(`   Is Incoming: ${isIncoming}`);
        console.log(`   Is Not Outgoing: ${isNotOutgoing}`);
        
        return isUsdc && isIncoming && isNotOutgoing && isNotTest;
      });
      
      console.log('✅ Found incoming USDC transactions (>=0.01 USDC):', usdcTransactions.length);
      
      // Send to Supabase
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        let syncedCount = 0;
        
        for (const tx of usdcTransactions.slice(0, 50)) { // Sync last 50 transactions
          try {
            // Convert from wei to USDC (USDC has 6 decimals)
            const amountUsdc = parseFloat(tx.value) / Math.pow(10, 6);
            const amountPayx = amountUsdc * 20000; // 1 USDC = 20,000 PAYX
            
            console.log(`📊 Processing transaction: ${tx.hash}`);
            console.log(`💰 Amount: ${amountUsdc} USDC → ${amountPayx} PAYX`);
            console.log(`👤 From: ${tx.from}`);
            console.log(`📅 Time: ${new Date(parseInt(tx.timeStamp) * 1000).toISOString()}`);
            
            // Check if transaction already exists
            const checkResponse = await fetch(`${supabaseUrl}/rest/v1/payments?transaction_hash=eq.${tx.hash}&select=id`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            });
            
            if (checkResponse.ok) {
              const existingTransactions = await checkResponse.json();
              if (existingTransactions.length > 0) {
                console.log(`⏭️ Transaction already exists: ${tx.hash}`);
                continue; // Skip this transaction
              }
            }
            
            const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/payments`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                wallet_address: tx.from, // Who sent the payment
                amount_usdc: amountUsdc,
                amount_payx: amountPayx,
                transaction_hash: tx.hash,
                block_number: tx.blockNumber,
                created_at: new Date(parseInt(tx.timeStamp) * 1000).toISOString()
              })
            });
            
            if (supabaseResponse.ok) {
              syncedCount++;
              console.log(`✅ Synced transaction: ${tx.hash} from ${tx.from}`);
            } else {
              console.log(`❌ Failed to sync transaction: ${tx.hash}`, await supabaseResponse.text());
            }
          } catch (error) {
            console.log(`❌ Failed to sync transaction: ${tx.hash}`, error);
          }
        }
        
        return c.json({
          success: true,
          message: `Synced ${syncedCount} incoming USDC transactions to Supabase`,
          totalFound: usdcTransactions.length,
          synced: syncedCount,
          transactions: usdcTransactions.slice(0, 5) // Show first 5 transactions
        });
      }
    }
    
    return c.json({
      success: false,
      error: "Failed to fetch or sync transactions",
      apiResponse: data,
      status: data.status,
      message: data.message
    });
  } catch (error) {
    return c.json({
      success: false,
      error: `Sync error: ${error.message}`
    });
  }
});

// Dashboard endpoint - Supabase'de düzenli görüntüleme
app.get("/dashboard", async (c) => {
  if (!process.env.SUPABASE_URL) {
    return c.json({ success: false, error: 'Supabase not configured' });
  }

  try {
    // Get all payments grouped by wallet
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments?select=*&order=created_at.desc`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'apikey': process.env.SUPABASE_ANON_KEY
      }
    });

    if (response.ok) {
      const payments = await response.json();
      
      // Group by wallet address
      const walletStats = {};
      
      payments.forEach(payment => {
        const wallet = payment.wallet_address;
        if (!walletStats[wallet]) {
          walletStats[wallet] = {
            wallet_address: wallet,
            total_usdc: 0,
            total_payx: 0,
            payment_count: 0,
            first_payment: null,
            last_payment: null,
            payments: []
          };
        }
        
        walletStats[wallet].total_usdc += payment.amount_usdc;
        walletStats[wallet].total_payx += payment.amount_payx;
        walletStats[wallet].payment_count++;
        walletStats[wallet].payments.push(payment);
        
        if (!walletStats[wallet].first_payment || payment.created_at < walletStats[wallet].first_payment) {
          walletStats[wallet].first_payment = payment.created_at;
        }
        if (!walletStats[wallet].last_payment || payment.created_at > walletStats[wallet].last_payment) {
          walletStats[wallet].last_payment = payment.created_at;
        }
      });
      
      // Convert to array and sort by total USDC
      const sortedWallets = Object.values(walletStats).sort((a, b) => b.total_usdc - a.total_usdc);
      
      return c.json({
        success: true,
        total_wallets: sortedWallets.length,
        total_payments: payments.length,
        total_usdc: payments.reduce((sum, p) => sum + p.amount_usdc, 0),
        total_payx: payments.reduce((sum, p) => sum + p.amount_payx, 0),
        wallets: sortedWallets
      });
    }
  } catch (error) {
    console.error('Dashboard fetch error:', error);
  }

  return c.json({ success: false, error: 'Failed to fetch dashboard data' });
});

// Auto-sync all historical data
app.post("/sync-all-historical", async (c) => {
  try {
    const walletAddress = "0xda8d766bc482a7953b72283f56c12ce00da6a86a";
    
    console.log('🔄 Syncing ALL historical data...');
    
    // Get all transactions from the beginning
    const baseScanUrl = `https://api.etherscan.io/v2/api?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&chainid=8453&apikey=SI8ECAC19FPN92K9MCNQENMGY6Z6MRM14Q`;
    
    const response = await fetch(baseScanUrl);
    const data = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📊 Total transactions found:', data.result ? data.result.length : 0);
    
    if (data.status === '1' && data.result) {
      // Filter for USDC transactions TO our wallet (incoming payments only)
      const usdcTransactions = data.result.filter(tx => {
        const isUsdc = tx.contractAddress.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
        const isIncoming = tx.to.toLowerCase() === walletAddress.toLowerCase(); // Sadece GELEN transfer'lar
        const isNotOutgoing = tx.from.toLowerCase() !== walletAddress.toLowerCase(); // ÇIKAN transfer'lar değil
        const amountUsdc = parseFloat(tx.value) / Math.pow(10, 6);
        const isNotTest = amountUsdc >= 0.01; // Allow 0.01 USDC test payments and above
        
        console.log(`🔍 Transaction: ${tx.hash}`);
        console.log(`   From: ${tx.from}`);
        console.log(`   To: ${tx.to}`);
        console.log(`   Amount: ${amountUsdc} USDC`);
        console.log(`   Is Incoming: ${isIncoming}`);
        console.log(`   Is Not Outgoing: ${isNotOutgoing}`);
        
        return isUsdc && isIncoming && isNotOutgoing && isNotTest;
      });
      
      console.log('✅ Found incoming USDC transactions (>=0.01 USDC):', usdcTransactions.length);
      
      // Send to Supabase
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        let syncedCount = 0;
        let skippedCount = 0;
        
        for (const tx of usdcTransactions) {
          try {
            // Convert from wei to USDC (USDC has 6 decimals)
            const amountUsdc = parseFloat(tx.value) / Math.pow(10, 6);
            const amountPayx = amountUsdc * 20000; // 1 USDC = 20,000 PAYX
            
            // Check if transaction already exists
            const checkResponse = await fetch(`${supabaseUrl}/rest/v1/payments?transaction_hash=eq.${tx.hash}&select=id`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            });
            
            if (checkResponse.ok) {
              const existingTransactions = await checkResponse.json();
              if (existingTransactions.length > 0) {
                console.log(`⏭️ Transaction already exists: ${tx.hash}`);
                skippedCount++;
                continue; // Skip this transaction
              }
            }
            
            const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/payments`, {
              method: 'POST',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                wallet_address: tx.from, // Who sent the payment
                amount_usdc: amountUsdc,
                amount_payx: amountPayx,
                transaction_hash: tx.hash,
                block_number: tx.blockNumber,
                created_at: new Date(parseInt(tx.timeStamp) * 1000).toISOString()
              })
            });
            
            if (supabaseResponse.ok) {
              syncedCount++;
              console.log(`✅ Synced transaction: ${tx.hash} from ${tx.from}`);
            } else {
              console.log(`❌ Failed to sync transaction: ${tx.hash}`, await supabaseResponse.text());
            }
          } catch (error) {
            console.log(`❌ Failed to sync transaction: ${tx.hash}`, error);
          }
        }
        
        return c.json({
          success: true,
          message: `Synced ${syncedCount} new transactions, skipped ${skippedCount} existing`,
          totalFound: usdcTransactions.length,
          synced: syncedCount,
          skipped: skippedCount,
          transactions: usdcTransactions.slice(0, 10) // Show first 10 transactions
        });
      }
    }
    
    return c.json({
      success: false,
      error: "Failed to fetch or sync transactions",
      apiResponse: data,
      status: data.status,
      message: data.message
    });
  } catch (error) {
    return c.json({
      success: false,
      error: `Sync error: ${error.message}`
    });
  }
});

// Test blockchain connection with API key
app.get("/test-blockchain", async (c) => {
  try {
    const walletAddress = "0xda8d766bc482a7953b72283f56c12ce00da6a86a";
    const apiKey = "SI8ECAC19FPN92K9MCNQENMGY6Z6MRM14Q";
    
    console.log('🧪 Testing blockchain connection with API key...');
    
    // Test with API key using Etherscan API with Base chain ID (8453)
    // Get last 7 days of transactions
    const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const baseScanUrl = `https://api.etherscan.io/v2/api?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&chainid=8453&apikey=${apiKey}`;
    
    console.log('📡 Testing URL:', baseScanUrl);
    
    const response = await fetch(baseScanUrl);
    
    if (!response.ok) {
      console.log('❌ API Request failed:', response.status, response.statusText);
      return c.json({
        success: false,
        error: `API request failed: ${response.status} ${response.statusText}`,
        url: baseScanUrl
      });
    }
    
    const data = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📊 API Response Headers:', response.headers);
    console.log('📊 API Response:', JSON.stringify(data, null, 2));
    console.log('📊 API URL:', baseScanUrl);
    
    if (data.status === '1' && data.result) {
      const usdcTransactions = data.result.filter(tx => {
        const isUsdc = tx.contractAddress.toLowerCase() === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
        const isIncoming = tx.to.toLowerCase() === walletAddress.toLowerCase(); // Sadece GELEN transfer'lar
        const isNotOutgoing = tx.from.toLowerCase() !== walletAddress.toLowerCase(); // ÇIKAN transfer'lar değil
        const amountUsdc = parseFloat(tx.value) / Math.pow(10, 6);
        const isNotTest = amountUsdc >= 0.01; // Allow 0.01 USDC test payments and above
        
        return isUsdc && isIncoming && isNotOutgoing && isNotTest;
      });
      
      return c.json({
        success: true,
        message: "Blockchain connection successful!",
        wallet: walletAddress,
        totalTransactions: data.result.length,
        usdcTransactions: usdcTransactions.length,
        sampleTransaction: usdcTransactions[0] || null,
        apiKey: apiKey.substring(0, 10) + '...',
        rawData: data
      });
    } else {
      return c.json({
        success: false,
        error: "Blockchain API failed",
        status: data.status,
        message: data.message,
        rawData: data
      });
    }
  } catch (error) {
    console.log('❌ Blockchain test error:', error);
    return c.json({
      success: false,
      error: `Blockchain test error: ${error.message}`
    });
  }
});

// Manual Supabase entry for missing payment
app.post("/add-manual-payment", async (c) => {
  try {
    const { wallet_address, amount_usdc, amount_payx, transaction_hash, block_number } = await c.req.json();
    
    if (!process.env.SUPABASE_URL) {
      return c.json({ success: false, error: 'Supabase not configured' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    console.log('📝 Adding manual payment to Supabase...');
    console.log('Wallet:', wallet_address);
    console.log('Amount USDC:', amount_usdc);
    console.log('Amount PAYX:', amount_payx);
    console.log('Transaction Hash:', transaction_hash);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/payments`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        wallet_address: wallet_address,
        amount_usdc: amount_usdc,
        amount_payx: amount_payx,
        transaction_hash: transaction_hash || null,
        block_number: block_number || null,
        created_at: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      console.log('✅ Manual payment added successfully');
      return c.json({
        success: true,
        message: 'Payment added successfully',
        wallet_address,
        amount_usdc,
        amount_payx
      });
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to add manual payment:', errorText);
      return c.json({
        success: false,
        error: `Failed to add payment: ${errorText}`
      });
    }
  } catch (error) {
    console.log('❌ Manual payment error:', error);
    return c.json({
      success: false,
      error: `Manual payment error: ${error.message}`
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
        let currentUserWallet = null; // Kullanıcının cüzdan adresi
        
        // Define openPaymentModal function
        function openPaymentModal(url, title, type) {
          const modal = document.getElementById('paymentModal');
          const modalContent = document.getElementById('modalContent');
          const modalTitle = document.getElementById('modalTitle');
          const iframe = document.getElementById('paymentIframe');
          
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
          
          // Show iframe directly
          iframe.style.display = 'block';
          
          // Load payment directly - blockchain will track automatically
          iframe.src = url;
          
          // Start blockchain monitoring
          setTimeout(() => startBlockchainMonitoring(), 1000);
          
          // Show modal
          modal.classList.add('active');
          
          // Prevent body scroll
          document.body.style.overflow = 'hidden';
        }
        
        // Legacy connect wallet function (kept for compatibility)
        async function connectWallet() {
          console.log('⚠️ Legacy connect wallet - use blockchain monitoring instead');
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
          const iframe = document.getElementById('paymentIframe');
          
          // Show iframe directly
          iframe.style.display = 'block';
          
          // Load payment directly - blockchain will track automatically
          iframe.src = currentPaymentUrl;
          
          console.log('🚀 Starting payment with blockchain tracking...');
          
          // Start blockchain monitoring
          setTimeout(() => startBlockchainMonitoring(), 1000);
        }
        
        // Blockchain monitoring function
        function startBlockchainMonitoring() {
                 console.log('🔍 Starting blockchain monitoring...');
                 
                 // Monitor for 15 minutes
                 let monitoringAttempts = 0;
                 const maxAttempts = 5; // 5 attempts (5 * 3 minutes = 15 minutes)
                 
                 const checkInterval = setInterval(() => {
                   monitoringAttempts++;
                   console.log('📊 Blockchain monitoring attempt:', monitoringAttempts);
                   
                   // Sync blockchain transactions every 3 minutes
                   syncBlockchainTransactions();
                   
                   // Stop monitoring after max attempts
                   if (monitoringAttempts >= maxAttempts) {
                     console.log('⏰ Blockchain monitoring timeout reached');
                     clearInterval(checkInterval);
                   }
                 }, 180000); // 3 minutes = 180,000 milliseconds
               }
        
        // Sync blockchain transactions
        async function syncBlockchainTransactions() {
          try {
            console.log('🔄 Syncing blockchain transactions...');
            
            const response = await fetch('/sync-blockchain', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            const data = await response.json();
            
            if (data.success) {
              console.log('✅ Blockchain sync successful:', data.message);
              
              // Sadece kullanıcının kendi işlemi için başarı mesajı göster
              if (data.synced > 0 && data.transactions) {
                // Yeni sync edilen transaction'ları kontrol et
                const hasUserTransaction = data.transactions.some(tx => 
                  currentUserWallet && tx.from && tx.from.toLowerCase() === currentUserWallet.toLowerCase()
                );
                
                if (hasUserTransaction) {
                  console.log('🎉 User transaction detected! Showing success overlay...');
                  showSuccessOverlay();
                } else {
                  console.log('📊 Other users transactions detected, not showing success overlay');
                }
              }
            } else {
              console.log('❌ Blockchain sync failed:', data.error);
            }
          } catch (error) {
            console.log('❌ Blockchain sync error:', error);
          }
        }
        
        // Legacy payment monitoring (kept for compatibility)
        function startPaymentMonitoring() {
          console.log('⚠️ Legacy payment monitoring - use blockchain monitoring instead');
        }
        
        // Legacy functions (kept for compatibility)
        async function sendWalletToBackend(walletAddress) {
          console.log('⚠️ Legacy wallet tracking - use blockchain monitoring instead');
        }
        
        async function sendPaymentConfirmation(walletAddress) {
          console.log('⚠️ Legacy payment confirmation - use blockchain monitoring instead');
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
              balanceDetails.innerHTML = \`
                <div style="color: #2ecc71; font-size: 12px; margin-bottom: 5px;">
                  💰 Total: \${data.totalPayx.toLocaleString()} PAYX
                </div>
                <div style="color: #4d94ff; font-size: 10px;">
                  💵 USDC Paid: \${data.totalUsdc.toFixed(2)} USDC
                </div>
                <div style="color: #4d94ff; font-size: 10px;">
                  📊 Payments: \${data.paymentCount} transactions
                </div>
                <div style="color: #4d94ff; font-size: 10px;">
                  🏠 Wallet: \${walletAddress.substring(0, 6)}...\${walletAddress.substring(38)}
                </div>
              \`;
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
          console.log('📨 Message received from iframe:', event.data);
          
          // Check if message contains wallet address
          if (event.data && event.data.wallet) {
            console.log('✅ Wallet address received via postMessage:', event.data.wallet);
            currentUserWallet = event.data.wallet; // Kullanıcının cüzdan adresini sakla
          }
          
          // Check if message contains payment success
          if (event.data && event.data.success) {
            console.log('✅ Payment success received via postMessage');
            if (event.data.wallet) {
              currentUserWallet = event.data.wallet; // Kullanıcının cüzdan adresini sakla
            }
            showSuccessOverlay();
          }
        });
        
        // Legacy enhanced monitoring (kept for compatibility)
        function enhancedIframeMonitoring() {
          console.log('⚠️ Legacy enhanced monitoring - use blockchain monitoring instead');
          return null;
        }
        
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
          
          // Kullanıcının cüzdan adresini sakla
          currentUserWallet = walletAddress;
          
          try {
            balanceResult.style.display = 'block';
            balanceAmount.textContent = 'Loading...';
            balanceDetails.textContent = 'Fetching balance...';
            
            const response = await fetch(\`/balance/\${walletAddress}\`);
            const data = await response.json();
            
            if (data.success) {
              balanceAmount.textContent = \`\${data.totalPayx.toLocaleString()} PAYX\`;
              balanceDetails.innerHTML = \`
                <div style="color: #2ecc71; font-size: 12px; margin-bottom: 5px;">
                  💰 Total: \${data.totalPayx.toLocaleString()} PAYX
                </div>
                <div style="color: #4d94ff; font-size: 10px;">
                  💵 USDC Paid: \${data.totalUsdc.toFixed(2)} USDC
                </div>
                <div style="color: #4d94ff; font-size: 10px;">
                  📊 Payments: \${data.paymentCount} transactions
                </div>
                <div style="color: #4d94ff; font-size: 10px;">
                  🏠 Wallet: \${walletAddress.substring(0, 6)}...\${walletAddress.substring(38)}
                </div>
              \`;
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
