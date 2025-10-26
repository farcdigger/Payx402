-- Updated Supabase schema for payment tracking
-- Run this in Supabase SQL Editor

-- Drop existing table if exists
DROP TABLE IF EXISTS payments CASCADE;

-- Create new payments table with better structure
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  amount_usdc DECIMAL(18,6) NOT NULL,
  amount_payx BIGINT NOT NULL,
  transaction_hash TEXT UNIQUE, -- Optional for manual entries
  block_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on transaction_hash to prevent duplicates
CREATE UNIQUE INDEX idx_payments_transaction_hash ON payments(transaction_hash);
CREATE INDEX idx_payments_wallet ON payments(wallet_address);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust as needed)
CREATE POLICY "Allow all operations" ON payments FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for wallet statistics
CREATE OR REPLACE VIEW wallet_stats AS
SELECT 
    wallet_address,
    COUNT(*) as payment_count,
    SUM(amount_usdc) as total_usdc,
    SUM(amount_payx) as total_payx,
    MIN(created_at) as first_payment,
    MAX(created_at) as last_payment
FROM payments
GROUP BY wallet_address
ORDER BY total_usdc DESC;

-- Create a view for recent payments
CREATE OR REPLACE VIEW recent_payments AS
SELECT 
    p.*,
    ws.payment_count,
    ws.total_usdc,
    ws.total_payx
FROM payments p
LEFT JOIN wallet_stats ws ON p.wallet_address = ws.wallet_address
ORDER BY p.created_at DESC
LIMIT 100;
