-- Supabase Database Schema for PAYX Token System

-- Users table - stores user wallet addresses and basic info
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table - stores verified USDC payments
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  transaction_hash TEXT UNIQUE NOT NULL,
  amount_usdc DECIMAL(18,6) NOT NULL,
  amount_payx BIGINT NOT NULL,
  network TEXT NOT NULL DEFAULT 'base',
  block_number BIGINT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  verification_data JSONB -- stores blockchain verification data
);

-- Token balances table - tracks user token balances
CREATE TABLE token_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  total_payx BIGINT DEFAULT 0,
  pending_payx BIGINT DEFAULT 0, -- tokens from unconfirmed payments
  claimed_payx BIGINT DEFAULT 0, -- tokens that have been claimed/sent
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_address)
);

-- Payment verification logs
CREATE TABLE payment_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  verification_method TEXT NOT NULL, -- 'blockchain', 'api'
  verification_status TEXT NOT NULL, -- 'success', 'failed', 'pending'
  verification_data JSONB,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payments_wallet ON payments(wallet_address);
CREATE INDEX idx_payments_tx_hash ON payments(transaction_hash);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_token_balances_wallet ON token_balances(wallet_address);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR ALL USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can view own payments" ON payments
  FOR ALL USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can view own balances" ON token_balances
  FOR ALL USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Functions for balance calculation
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update token balance when payment is confirmed
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    INSERT INTO token_balances (user_id, wallet_address, total_payx, pending_payx)
    VALUES (NEW.user_id, NEW.wallet_address, NEW.amount_payx, 0)
    ON CONFLICT (wallet_address) 
    DO UPDATE SET 
      total_payx = token_balances.total_payx + NEW.amount_payx,
      pending_payx = GREATEST(0, token_balances.pending_payx - NEW.amount_payx),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update balances
CREATE TRIGGER update_balance_on_payment_confirmation
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance();

-- Function to get user balance
CREATE OR REPLACE FUNCTION get_user_balance(user_wallet TEXT)
RETURNS TABLE(
  wallet_address TEXT,
  total_payx BIGINT,
  pending_payx BIGINT,
  claimed_payx BIGINT,
  available_payx BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tb.wallet_address,
    tb.total_payx,
    tb.pending_payx,
    tb.claimed_payx,
    (tb.total_payx - tb.claimed_payx) as available_payx
  FROM token_balances tb
  WHERE tb.wallet_address = user_wallet;
END;
$$ LANGUAGE plpgsql;
