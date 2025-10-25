-- Minimal Supabase schema for payment tracking
-- Run this in Supabase SQL Editor

CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  amount_usdc DECIMAL(18,6) NOT NULL,
  amount_payx BIGINT NOT NULL,
  transaction_hash TEXT,
  block_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_payments_wallet ON payments(wallet_address);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Simple RLS policy
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust as needed)
CREATE POLICY "Allow all operations" ON payments FOR ALL USING (true);
