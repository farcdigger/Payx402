# PAYx402 - PAYX Token Sale

PAYX token satışı için x402 protokolü ile USDC ödemeleri alan payment gateway.

**x402'nin otomatik paywall'u kullanılıyor** - Coinbase'in resmi UI!

## Token Bilgileri

- **Token Name**: PAYX
- **Total Supply**: 1,000,000,000 PAYX
- **Rate**: 1 USDC = 20,000 PAYX
- **Network**: Base Mainnet
- **Distribution**: Otomatik (Smart Contract)

## Kurulum

1. Bağımlılıkları yükle:
```bash
npm install
```

2. `.env` dosyası oluştur:
```env
FACILITATOR_URL=https://x402.org/facilitator
NETWORK=base
ADDRESS=0xda8d766bc482a7953b72283f56c12ce00da6a86a
CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
```

> **⚠️ Önemli**: `BASE_RPC_URL` eklemezseniz public RPC kullanılır ve **rate limit** hatası alabilirsiniz!
> - Ücretsiz Alchemy account oluşturun: https://www.alchemy.com/
> - Base Mainnet için RPC URL alın
> - `.env` dosyasına ekleyin

3. Serveri çalıştır:
```bash
npm run dev
```

4. Tarayıcıda aç:
```
http://localhost:3000
```

## Kullanım

1. Ana sayfaya git: `http://localhost:3000`
2. "Buy PAYX Tokens" butonuna tıkla
3. **x402 otomatik paywall açılır!** ✅
4. "Connect wallet" → MetaMask bağla
5. "Pay Now" → USDC öde
6. PAYX token al (otomatik dağıtım)

## x402 Otomatik Paywall

x402 middleware otomatik olarak şu UI'ı oluşturur:
- ✅ Payment Required ekranı
- ✅ "Pay USDC → Get PAYX tokens"
- ✅ Wallet connection
- ✅ Pay Now butonu
- ✅ Transaction status
- ✅ Automatic payment verification

**Manuel kod yazmaya gerek yok!** x402 her şeyi halleder.

## Payment Flow

1. User clicks "Buy PAYX Tokens"
2. x402 paywall appears: "To access this content, please pay $1 Base USDC"
3. User connects wallet (MetaMask)
4. User pays USDC on Base Mainnet
5. x402 verifies payment
6. Server confirms: "Payment received! You will receive PAYX tokens"
7. Tokens distributed automatically via smart contract

## Environment Variables

- `FACILITATOR_URL` - x402 facilitator URL
- `NETWORK` - base (mainnet) veya base-sepolia (testnet)
- `ADDRESS` - USDC alacak wallet adresi
- `CDP_API_KEY_ID` - Coinbase Developer Platform API Key
- `CDP_API_KEY_SECRET` - Coinbase Developer Platform API Secret
- `BASE_RPC_URL` - **Custom RPC URL (Alchemy/Infura) - Rate limit sorunlarını önler!**

## Teknoloji

- **Framework**: Hono
- **Protocol**: x402 (HTTP 402)
- **Network**: Base Mainnet
- **Payment**: USDC
- **Facilitator**: Coinbase CDP
- **UI**: x402 Otomatik Paywall
