# TravelScript - Medical Prescription Platform

Global Medical Prescription Platform powered by Flare Network.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Edit `.env.local` and add your Reown Project ID:

```bash
# Get your projectId from https://dashboard.reown.com
NEXT_PUBLIC_PROJECT_ID=your_project_id_here
```

**⚠️ IMPORTANT:** Get a FREE Project ID from https://dashboard.reown.com

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Features

- ✅ **Reown AppKit** - Web3 wallet connection with social login
- ✅ **Flare Network** - Only Coston2 Testnet (Chain ID: 114)
- ✅ **Social Login** - Email, Google, GitHub, Discord
- ✅ **Next.js 16** - Latest framework with Turbopack
- ✅ **TypeScript** - Full type safety
- ✅ **Tailwind CSS** - Beautiful UI styling

## 🌐 Network Configuration

This app is configured ONLY for:
- **Flare Coston2 Testnet**
- **Chain ID:** 114
- **RPC:** https://coston2-api.flare.network/ext/C/rpc
- **Explorer:** https://coston2-explorer.flare.network

## 📝 Project Structure

```
├── app/
│   ├── layout.tsx      # Root layout with Web3 provider
│   ├── page.tsx        # Home page with wallet connection
│   └── globals.css     # Global styles
├── config/
│   └── index.tsx       # Wagmi & Flare chain configuration
├── context/
│   └── index.tsx       # AppKit context provider
├── .env.local          # Environment variables
└── next.config.ts      # Next.js configuration
```

## 🔧 Technologies

- **Framework:** Next.js 16 (App Router)
- **Web3:** Reown AppKit + Wagmi
- **Blockchain:** Viem
- **State Management:** TanStack React Query
- **Styling:** Tailwind CSS
- **Language:** TypeScript

## 📚 Documentation

- [Reown AppKit Docs](https://docs.reown.com/appkit/next/core/installation)
- [Wagmi Docs](https://wagmi.sh/)
- [Flare Network Docs](https://docs.flare.network/)
- [Next.js Docs](https://nextjs.org/docs)

## ⚠️ Known Issues

### Build Error with Turbopack
There's a known issue with Next.js 16 Turbopack and the `porto` package (used by Wagmi connectors) trying to import `katana` from `viem`, which no longer exists.

**Solution:** Use development mode (`npm run dev`) which works perfectly. For production, the error only occurs during build but **does NOT affect development**.

## 🎨 Customization

### Change Network
Edit `config/index.tsx` to change or add networks. Currently configured for Flare Coston2 only.

### Update Metadata
Edit the `metadata` object in `context/index.tsx` to customize:
- App name
- Description
- URL
- Icons

### Social Login Options
Edit the `features` in `context/index.tsx` to enable/disable:
- Email login
- Social providers (Google, GitHub, Discord, etc.)
- Analytics

## 📄 License

MIT
