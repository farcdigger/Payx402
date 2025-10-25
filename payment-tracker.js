// External payment tracking service
// This runs separately from the main x402 app

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Simple fetch-based Supabase client
async function trackPayment(walletAddress, amountUsdc, amountPayx) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('Supabase not configured, skipping tracking');
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        wallet_address: walletAddress,
        amount_usdc: amountUsdc,
        amount_payx: amountPayx,
        created_at: new Date().toISOString()
      })
    });

    if (response.ok) {
      console.log('Payment tracked successfully');
    } else {
      console.error('Payment tracking failed:', response.status);
    }
  } catch (error) {
    console.error('Payment tracking error:', error);
  }
}

async function getUserBalance(walletAddress) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { total_payx: 0, payments: [] };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/payments?wallet_address=eq.${walletAddress}&order=created_at.desc`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (response.ok) {
      const payments = await response.json();
      const totalPayx = payments.reduce((sum, p) => sum + p.amount_payx, 0);
      return { total_payx: totalPayx, payments };
    }
  } catch (error) {
    console.error('Balance fetch error:', error);
  }

  return { total_payx: 0, payments: [] };
}

module.exports = { trackPayment, getUserBalance };
