# Supabase Setup Guide

## 1. Supabase Projesi Oluştur

1. **https://supabase.com** adresine git
2. **"Start your project"** butonuna tıkla
3. **GitHub ile giriş yap**
4. **"New Project"** oluştur:
   - **Name:** `payx402-tracking`
   - **Database Password:** Güçlü bir şifre oluştur
   - **Region:** Europe (Frankfurt) veya en yakın bölge
   - **Pricing Plan:** Free tier

## 2. Database Schema Oluştur

Supabase Dashboard'da **SQL Editor**'a git ve şu kodu çalıştır:

```sql
-- Minimal Supabase schema for payment tracking
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  amount_usdc DECIMAL(18,6) NOT NULL,
  amount_payx BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_payments_wallet ON payments(wallet_address);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Simple RLS policy
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust as needed)
CREATE POLICY "Allow all operations" ON payments FOR ALL USING (true);
```

## 3. Environment Variables Al

**Settings > API** sayfasından:

- **Project URL:** `https://your-project.supabase.co`
- **anon public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 4. Vercel'e Environment Variables Ekle

Vercel Dashboard'da **Settings > Environment Variables**:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 5. Test Et

- **Payment tracking:** `/payment/5usdc?wallet=0x123...`
- **Balance display:** `/balance/0x123...`

## 6. Database Tablosunu Kontrol Et

Supabase Dashboard'da **Table Editor** > **payments** tablosunu kontrol et.
