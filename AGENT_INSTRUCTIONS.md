# Agent Instructions: TravelScript Implementation

## Mission
Build a production-ready medical prescription platform integrating Semaphore ZK proofs, Flare FDC attestation, EVVM gasless transactions, and Reown authentication for ETHGlobal Buenos Aires hackathon.

## Context
This is a POC/MVP with real technology integration (not mocks) for a hackathon targeting $17,500+ in prizes across 5 tracks. The platform solves international prescription verification using decentralized identity and blockchain attestation.

## Implementation Phases

### Phase 1: Project Foundation
**Goal**: Setup Next.js with TypeScript, Tailwind, and core dependencies

**Tasks**:
1. Initialize Next.js 14+ with App Router
2. Install dependencies (see IMPLEMENTATION_GUIDE.md section 1.2)
3. Configure TypeScript with strict mode
4. Setup Tailwind CSS with custom theme
5. Create base folder structure:
   ```
   src/
   ├── app/
   │   ├── doctor/
   │   ├── pharmacy/
   │   └── patient/
   ├── components/
   │   ├── ui/
   │   └── providers/
   ├── lib/
   │   ├── semaphore/
   │   ├── flare/
   │   ├── evvm/
   │   └── utils/
   ├── config/
   └── types/
   contracts/
   scripts/
   test/
   ```

**Validation**:
- `npm run dev` starts without errors
- TypeScript compiles cleanly
- Tailwind classes render correctly

---

### Phase 2: Reown Authentication
**Goal**: Implement wallet connection with WalletConnect v3 (Reown)

**Reference**: IMPLEMENTATION_GUIDE.md sections 2.1-2.2

**Tasks**:
1. Create `src/config/reown.ts` with AppKit configuration
2. Add MATE Metaprotocol custom chain definition
3. Create `AppKitProvider` component
4. Wrap app in providers (layout.tsx)
5. Add wallet connect button to UI
6. Test multi-wallet support (MetaMask, WalletConnect, email)

**Key Files**:
- `src/config/reown.ts` - AppKit config with 3 chains (Sepolia, Flare, MATE)
- `src/components/providers/appkit-provider.tsx` - Wagmi + QueryClient wrapper
- `src/app/layout.tsx` - Root provider integration

**Environment Variables**:
```bash
NEXT_PUBLIC_REOWN_PROJECT_ID=
```

**Validation**:
- Wallet connects successfully
- Chain switching works (Sepolia ↔ Flare ↔ MATE)
- Account displays correctly
- Signatures work via `useSignMessage`

---

### Phase 3: Smart Contract Development
**Goal**: Deploy 3 core contracts (Semaphore, Flare, EVVM)

**Reference**: IMPLEMENTATION_GUIDE.md Phase 3-5

**Tasks**:
1. Setup Hardhat with TypeScript
2. Install OpenZeppelin and Semaphore contracts
3. Create `DoctorRegistry.sol` (Semaphore integration)
4. Create `FlareAttestationRegistry.sol` (Flare FDC)
5. Create `EVVMPrescriptionMetadata.sol` (EVVM MATE)
6. Write deployment script (`scripts/deploy.ts`)
7. Deploy to Sepolia testnet
8. Verify contracts on Etherscan
9. Save addresses to `deployed-addresses.json`

**Contract Addresses** (save after deployment):
```json
{
  "doctorRegistry": "0x...",
  "flareRegistry": "0x...",
  "evvmMetadata": "0x..."
}
```

**Validation**:
- All contracts deploy successfully
- Contracts verified on Etherscan
- Can call view functions
- Events emit correctly

---

### Phase 4: Semaphore ZK Proof System
**Goal**: Implement doctor identity management with zero-knowledge proofs

**Reference**: IMPLEMENTATION_GUIDE.md sections 3.1-3.2

**Tasks**:
1. Create `DoctorIdentityManager` class
2. Implement identity generation from credentials
3. Implement proof generation for prescriptions
4. Add secure identity storage (encrypted localStorage)
5. Create doctor registration flow
6. Implement prescription signing with ZK proof
7. Add proof verification UI component

**Key Files**:
- `src/lib/semaphore/doctor-identity.ts` - Identity manager
- `src/lib/semaphore/group-manager.ts` - Group operations
- `src/lib/semaphore/proof-verifier.ts` - Proof verification

**Security Requirements**:
- NEVER store identity plaintext
- Encrypt with user-derived key
- Validate all proofs on-chain
- Prevent nullifier reuse

**Validation**:
- Doctor can create identity
- Proof generates successfully
- Proof verifies on-chain
- Nullifier prevents double-signing

---

### Phase 5: Flare Data Connector Integration
**Goal**: Attest prescription data using Flare FDC Web2Json

**Reference**: IMPLEMENTATION_GUIDE.md sections 4.1-4.2

**Tasks**:
1. Create `FlareFDCClient` class
2. Implement Web2Json attestation request
3. Create prescription data API endpoint (`/api/prescriptions/[id]`)
4. Implement attestation verification
5. Link attestation hash to on-chain contract
6. Add attestation status UI

**Key Files**:
- `src/lib/flare/fdc-client.ts` - FDC client
- `src/app/api/prescriptions/[id]/route.ts` - Prescription API
- `src/lib/flare/attestation-verifier.ts` - Verification logic

**API Endpoint**:
```typescript
// GET /api/prescriptions/[id]
{
  "data": {
    "prescription": {
      "id": "rx-001",
      "doctorCommitment": "0x...",
      "medication": "Amoxicillin",
      "dosage": "500mg",
      "timestamp": 1234567890
    }
  }
}
```

**Validation**:
- Attestation request succeeds
- Attestation hash returns
- Verification works
- Data matches on-chain

---

### Phase 6: EVVM MATE Metaprotocol
**Goal**: Implement gasless metadata storage using EVVM

**Reference**: IMPLEMENTATION_GUIDE.md sections 5.1-5.2

**Tasks**:
1. Create `MATEClient` class
2. Configure EVVM SDK with MATE addresses
3. Implement async nonce generation
4. Create gasless transaction submission
5. Integrate MATE NameService
6. Add executor authorization
7. Implement metadata retrieval

**Key Files**:
- `src/lib/evvm/mate-config.ts` - MATE configuration
- `src/lib/evvm/mate-client.ts` - Client implementation
- `src/lib/evvm/executor.ts` - Executor logic

**MATE Addresses** (Sepolia - Nov 17th update):
```typescript
EVVM: 0xF817e9ad82B4a19F00dA7A248D9e556Ba96e6366
Staking: 0x8eB2525239781e06dBDbd95d83c957C431CF2321
NameService: 0x8038e87dc67D87b31d890FD01E855a8517ebfD24
Treasury: 0x213F4c8b5a228977436c2C4929F7bd67B29Af8CD
P2PSwap: 0xC175f4Aa8b761ca7D0B35138969DF8095A1657B5
```

**Validation**:
- Gasless transaction submits
- MATE tokens acquired from faucet
- NameService registration works
- Metadata retrievable

---

### Phase 7: Doctor Dashboard UI
**Goal**: Build complete doctor prescription creation flow

**Reference**: IMPLEMENTATION_GUIDE.md section 6.1

**Tasks**:
1. Create doctor dashboard page (`app/doctor/page.tsx`)
2. Build prescription form with validation (Zod + React Hook Form)
3. Implement dual signature flow (doctor + patient)
4. Integrate all 3 systems (Semaphore → Flare → EVVM)
5. Add loading states and error handling
6. Create prescription list view
7. Add prescription revocation feature

**UI Components**:
- `PrescriptionForm` - Form with validation
- `SignatureRequest` - Dual signature UI
- `PrescriptionCard` - Display component
- `LoadingSpinner` - Loading state
- `ErrorAlert` - Error handling

**User Flow**:
1. Doctor connects wallet (Reown)
2. Creates/loads Semaphore identity
3. Fills prescription form
4. Generates ZK proof
5. Signs prescription
6. Requests patient signature
7. Attests on Flare
8. Stores metadata on EVVM
9. Registers with NameService
10. Shows success + prescription ID

**Validation**:
- Form validation works
- All integrations execute
- Errors handled gracefully
- Success state shows correctly

---

### Phase 8: Pharmacy Verification Portal
**Goal**: Build pharmacy prescription verification interface

**Reference**: IMPLEMENTATION_GUIDE.md section 6.2

**Tasks**:
1. Create pharmacy portal (`app/pharmacy/page.tsx`)
2. Implement prescription ID search
3. Fetch metadata from EVVM
4. Verify Flare attestation
5. Verify Semaphore proof
6. Display verification results
7. Add QR code scanning (optional)

**UI Components**:
- `VerificationSearch` - Search input
- `VerificationResult` - Result display
- `QRScanner` - QR code scanner (optional)
- `PrescriptionDetails` - Detailed view

**Verification Checks**:
- ✅ Metadata exists on EVVM
- ✅ Flare attestation valid
- ✅ Doctor commitment verified
- ✅ Not revoked
- ✅ Timestamp within valid range

**Validation**:
- Can find prescription by ID
- All verification checks run
- Valid prescription shows green
- Invalid shows red with reason

---

### Phase 9: Integration Testing
**Goal**: End-to-end testing of complete flow

**Reference**: IMPLEMENTATION_GUIDE.md section 8.1

**Tasks**:
1. Setup testing framework (Vitest + Testing Library)
2. Write unit tests for each lib module
3. Write integration test for full flow
4. Test contract interactions
5. Test error scenarios
6. Add test coverage reporting

**Test Cases**:
```typescript
describe('TravelScript E2E', () => {
  it('doctor creates prescription', async () => {})
  it('prescription stored across all systems', async () => {})
  it('pharmacy verifies prescription', async () => {})
  it('revoked prescription fails verification', async () => {})
  it('invalid proof rejected', async () => {})
})
```

**Coverage Target**: >70%

**Validation**:
- All tests pass
- Coverage >70%
- No console errors
- Performance acceptable

---

### Phase 10: Deployment & Documentation
**Goal**: Deploy demo and create submission materials

**Tasks**:
1. Deploy to Vercel/Netlify
2. Configure environment variables
3. Create comprehensive README
4. Add EVVM feedback section
5. Create demo video (<3 min)
6. Write submission description
7. Verify all prize requirements

**README Sections**:
- Problem statement
- Solution architecture
- Technology integration details
- Prize track qualification
- Setup instructions
- Demo link
- Video demo
- EVVM feedback (required for $500)

**EVVM Feedback Requirements**:
- Developer experience review
- Documentation gaps
- Feature requests
- Improvement suggestions

**Validation**:
- Demo accessible online
- All features work in production
- README complete
- Video uploaded
- Submission ready

---

## Critical Implementation Rules

### Security
- ✅ Never store private keys or identity plaintext
- ✅ Validate all inputs
- ✅ Verify all proofs on-chain
- ✅ Use proper error handling
- ✅ Prevent nullifier reuse
- ✅ Encrypt sensitive data

### Integration Requirements
- ✅ **Semaphore**: Must generate and verify real ZK proofs (no mocks)
- ✅ **Flare**: Must use actual FDC Web2Json attestation
- ✅ **EVVM**: Must submit gasless transactions to MATE Metaprotocol
- ✅ **Reown**: Must use AppKit for authentication

### Code Quality
- ✅ TypeScript strict mode
- ✅ Proper error handling
- ✅ Loading states for async operations
- ✅ Responsive design
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ No console.log in production

### Prize Qualification
- ✅ Use at least ONE Flare protocol (we use FDC)
- ✅ Address real-world problem ✓
- ✅ Provide feedback in README ✓
- ✅ Use MATE Metaprotocol ✓
- ✅ External data source documented ✓

---

## Environment Setup

### Required Accounts
1. **Reown**: https://cloud.reown.com (get project ID)
2. **Infura/Alchemy**: RPC endpoints
3. **MATE Faucet**: https://evvm.dev or https://t.me/EVVMorg

### Environment Variables
```bash
# Reown
NEXT_PUBLIC_REOWN_PROJECT_ID=

# RPC Endpoints
NEXT_PUBLIC_SEPOLIA_RPC=
NEXT_PUBLIC_FLARE_RPC=https://coston2-api.flare.network/ext/C/rpc

# Flare FDC
NEXT_PUBLIC_FDC_PROVIDER=https://fdc-api.flare.network

# EVVM MATE (Sepolia)
NEXT_PUBLIC_MATE_EVVM=0xF817e9ad82B4a19F00dA7A248D9e556Ba96e6366
NEXT_PUBLIC_MATE_STAKING=0x8eB2525239781e06dBDbd95d83c957C431CF2321
NEXT_PUBLIC_MATE_NS=0x8038e87dc67D87b31d890FD01E855a8517ebfD24

# Deployed Contracts (fill after deployment)
NEXT_PUBLIC_DOCTOR_REGISTRY=
NEXT_PUBLIC_FLARE_REGISTRY=
NEXT_PUBLIC_EVVM_METADATA=

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Development Workflow

### Daily Workflow
```bash
# 1. Start development
npm run dev

# 2. Watch tests
npm test -- --watch

# 3. Type check
npm run typecheck

# 4. Lint
npm run lint

# 5. Deploy contracts (when needed)
npx hardhat run scripts/deploy.ts --network sepolia
```

### Git Workflow
```bash
# Feature branch
git checkout -b feature/phase-X

# Commit after each phase
git add .
git commit -m "feat: complete phase X - [description]"

# Push and create PR
git push origin feature/phase-X
```

### Testing Workflow
```bash
# Run all tests
npm test

# Run specific test
npm test -- doctor-identity

# Coverage
npm run test:coverage
```

---

## Troubleshooting Guide

### Semaphore Issues
**Problem**: Proof generation fails
**Solution**: Check identity loaded, group exists, signal format correct

**Problem**: Nullifier already used
**Solution**: Each prescription needs unique external nullifier (use patient ID + timestamp)

### Flare FDC Issues
**Problem**: Attestation request fails
**Solution**: Verify API endpoint accessible, correct format, network connection

**Problem**: Verification fails
**Solution**: Check attestation hash correct, sufficient time passed for confirmation

### EVVM Issues
**Problem**: Gasless transaction rejected
**Solution**: Check executor authorized, MATE balance sufficient, nonce correct

**Problem**: MATE faucet not working
**Solution**: Use Telegram bot: https://t.me/EVVMorg or request in dev group

### Reown Issues
**Problem**: Wallet won't connect
**Solution**: Check project ID correct, network supported, browser wallet extension installed

---

## Success Metrics

### Functionality
- [ ] Doctor can create prescription with ZK proof
- [ ] Prescription attested on Flare
- [ ] Metadata stored gaslessly on EVVM
- [ ] Pharmacy can verify prescription
- [ ] All 4 technologies integrated (Semaphore, Flare, EVVM, Reown)

### Prize Qualification
- [ ] Uses Flare FDC (Main Track)
- [ ] External data source documented (Bonus Track)
- [ ] Uses MATE Metaprotocol (EVVM Best Integration)
- [ ] Feedback provided (EVVM Feedback)
- [ ] Reown AppKit integrated

### Quality
- [ ] Test coverage >70%
- [ ] No TypeScript errors
- [ ] Responsive design
- [ ] Error handling complete
- [ ] Loading states implemented

### Documentation
- [ ] README complete
- [ ] EVVM feedback detailed
- [ ] Setup instructions clear
- [ ] Demo video created
- [ ] Code commented

---

## Resources

### Documentation
- Semaphore: https://docs.semaphore.pse.dev/
- Flare FDC: https://dev.flare.network/fdc/overview
- EVVM: https://www.evvm.info/llms-full.txt
- Reown: https://docs.reown.com/mcp
- Next.js: https://nextjs.org/docs

### Support
- EVVM Telegram: https://t.me/EVVMorg
- MATE Faucet: https://evvm.dev
- GitHub Discussions: [Your repo]

### Example Code
- zkPrescription Reference: https://github.com/troopdegen/zkPrescription
- Semaphore Examples: https://github.com/semaphore-protocol/semaphore/tree/main/examples

---

## Agent Execution Instructions

When implementing this project:

1. **Follow phases sequentially** - Don't skip ahead
2. **Validate each phase** - Run all validation steps
3. **Use real integrations** - No mocks or placeholders
4. **Handle errors properly** - Never silent failures
5. **Test incrementally** - Write tests as you build
6. **Document as you go** - Comment complex logic
7. **Ask for clarification** - If requirements unclear
8. **Check prize requirements** - Ensure qualification
9. **Save work frequently** - Commit after each phase
10. **Track progress** - Use TodoWrite for task management

### When You Get Stuck
1. Check IMPLEMENTATION_GUIDE.md for reference code
2. Review official documentation links
3. Check troubleshooting guide
4. Ask for help in EVVM Telegram
5. Review example repositories

### Quality Gates
Before moving to next phase:
- [ ] Code compiles without errors
- [ ] Tests pass
- [ ] No TypeScript warnings
- [ ] Feature works in browser
- [ ] Committed to git

---

## Final Submission Checklist

- [ ] All 10 phases complete
- [ ] Demo deployed and accessible
- [ ] All contracts verified on Etherscan
- [ ] README with comprehensive documentation
- [ ] EVVM feedback section complete (300+ words)
- [ ] Demo video uploaded (<3 min)
- [ ] All environment variables documented
- [ ] Test coverage >70%
- [ ] No console errors in production
- [ ] Responsive on mobile/desktop
- [ ] Accessibility tested
- [ ] All prize requirements met
- [ ] Source code on GitHub (public)
- [ ] ETHGlobal submission form completed

---

**Good luck! Build something amazing! 🚀**
