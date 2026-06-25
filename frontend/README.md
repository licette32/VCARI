# VCARI Frontend

Interactive demo UI for the VCARI compliance verification pipeline.

## Stack

- Vite + React 18
- `@stellar/stellar-sdk` — Soroban RPC calls
- `snarkjs` — ZK proof utilities

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_CONTRACT_ID` | Soroban contract ID (defaults to the deployed testnet contract) |
| `VITE_SOURCE_SECRET` | Testnet account secret key (SB...) for signing transactions |
| `VITE_SOURCE_PUBLIC` | Testnet account public key (GD...) — alternative to secret |
| `VITE_RPC_URL` | Soroban RPC endpoint |
| `VITE_NETWORK_PASSPHRASE` | Stellar network passphrase |

> **Note:** `VITE_SOURCE_SECRET` is for testnet demos only. Never use a funded mainnet key.

## Demo Flow

1. **Input** — Enter private operational records (calibration days, maintenance status, documentation)
2. **Assessment** — Compliance rules evaluated locally against private inputs
3. **Proof** — Pre-generated Groth16 proof loaded (from `circuits/compliance.circom`, BLS12-381)
4. **Verification** — Proof submitted to the Soroban verifier contract on Stellar Testnet
5. **Result** — On-chain verification result displayed

## Production Build

```bash
npm run build
```
