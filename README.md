# VCARI

### Verifiable Compliance Assessment for Regulated Industries

**Privacy-preserving compliance verification powered by Zero-Knowledge Proofs on Stellar.**

VCARI enables organizations operating in regulated industries to prove regulatory compliance without exposing confidential operational records. Using Zero-Knowledge Proofs generated with Circom and verified on Stellar Soroban, organizations can demonstrate that compliance requirements were satisfied while keeping sensitive operational data private.

---

## Problem

Organizations in regulated industries—healthcare, finance, logistics, energy, manufacturing, and others—must continuously demonstrate compliance to auditors, regulators, or business partners.

Today, proving compliance usually requires exposing confidential internal records such as:

- Maintenance history
- Calibration schedules
- Operational logs
- Inspection reports
- Technical documentation

These records often contain sensitive business information that organizations would rather keep private.

---

## Why Zero-Knowledge?

Zero-Knowledge Proofs allow an organization to prove that a set of compliance rules has been satisfied **without revealing the underlying confidential data**.

Instead of sharing internal records, the organization generates a cryptographic proof.

Anyone can verify that proof on Stellar and be confident that the compliance conditions were met.

---

## Why Stellar?

VCARI leverages Stellar's native BLS12-381 cryptographic primitives together with Soroban smart contracts to verify Groth16 Zero-Knowledge proofs efficiently on-chain.

Rather than trusting an auditor or an organization, anyone can independently verify the proof while confidential operational records remain private.

---

## Architecture

```
                    Private Operational Records
                              │
                              ▼
                 Compliance Assessment Engine
                              │
                              ▼
                   Circom Compliance Circuit
                              │
                              ▼
                     Groth16 Zero-Knowledge Proof
                              │
                              ▼
                 Soroban Smart Contract (Stellar)
                              │
                              ▼
                    Compliance Successfully Verified
```

---

## Solution

VCARI implements a complete privacy-preserving compliance verification pipeline.

### 1. Compliance Circuit (`circuits/compliance.circom`)

The Circom circuit models regulatory compliance as an arithmetic constraint system over the **BLS12-381** curve.

Private inputs:

- `last_calibration_days` — days since last calibration
- `max_allowed_days` — maximum allowed calibration interval
- `preventive_maintenance` — 1 if completed, 0 otherwise
- `documentation_complete` — 1 if complete, 0 otherwise

Public output:

```
compliant = 1
```

only if all compliance rules are satisfied simultaneously.

---

### 2. Groth16 Proof Generation

Using the private operational data, the prover generates a Zero-Knowledge proof demonstrating that:

- calibration is still within the allowed interval
- preventive maintenance has been completed
- required documentation exists

without revealing any of those values.

---

### 3. Soroban Smart Contract

The Soroban verifier contract validates the Groth16 proof on Stellar Testnet.

The verification key is stored once using:

```
set_vk()
```

Auditors or counterparties can later verify proofs by calling:

```
verify()
```

using only:

- proof bytes
- public signal bytes

No confidential operational data is ever disclosed.

---

## Demonstration Scenario

The current demonstration uses **biomedical equipment compliance**.

An equipment is considered compliant only if:

- Calibration interval has not expired
- Preventive maintenance has been completed
- Technical documentation is complete

Although biomedical equipment is used as the demonstration scenario, the architecture is intentionally generic and applicable to any regulated industry.

---

## Example Applications

| Industry | Example Compliance Rule |
|-----------|-------------------------|
| Biomedical | Equipment calibrated within the allowed interval, preventive maintenance completed, documentation available |
| Finance | Suspicious transaction reported within the regulatory deadline without revealing transaction contents |
| Logistics | Cold-chain temperature remained within limits throughout transportation |
| Energy | Mandatory safety inspection completed by certified personnel before deadline |
| Manufacturing | Production batch passed every required quality control checkpoint |
| Environmental | Emissions remained below regulatory thresholds throughout the reporting period |

---

## Repository Structure

```
circuits/
    compliance.circom — Compliance circuit (BLS12-381, Groth16)

contract/
    Soroban verifier smart contract (set_vk + verify)

proving/
    Proving key, witness, and sample inputs

frontend/
    React demo UI — interactive compliance verification flow

tools/circom_to_soroban_hex/
    Rust CLI: converts snarkjs JSON outputs to Soroban-compatible hex

build/
    Generated circuit artifacts and proof outputs (disposable)

demo.sh
    End-to-end execution script
```

---

## Prerequisites

- Rust + `rustup target add wasm32v1-none`
- Soroban CLI (`stellar`)
- Node.js + npm
- WSL (required for Circom compilation)
- Stellar Testnet account

---

## Quick Start

> The `.zkey` file is included in `proving/` for convenience.
> Full regeneration instructions are provided below.

```bash
git clone https://github.com/licette32/VCARI.git
cd VCARI
./demo.sh
```

The script performs the complete pipeline:

1. Install Node dependencies
2. Build the Soroban contract
3. Deploy to Stellar Testnet
4. Generate Groth16 proof from witness
5. Verify locally with snarkjs
6. Encode proof for Soroban
7. Store verification key on-chain
8. Verify proof on-chain

Expected output:

```
On-chain verification result: true

Success: Groth16 proof verified on Stellar testnet.
```

---

## Regenerating the ZKey

```bash
# Compile circuit (WSL required)
circom --prime bls12381 --r1cs --wasm --sym \
  -o build/ \
  -l node_modules \
  circuits/compliance.circom

# Powers of Tau (BLS12-381)
npx snarkjs powersoftau new bls12381 12 build/pot12_0000.ptau
npx snarkjs powersoftau contribute build/pot12_0000.ptau build/pot12_0001.ptau --name="First contribution" -v
npx snarkjs powersoftau prepare phase2 build/pot12_0001.ptau build/pot12_final.ptau -v

# Groth16 Setup
npx snarkjs groth16 setup build/compliance.r1cs build/pot12_final.ptau build/compliance_0000.zkey
echo "entropy" | npx snarkjs zkey contribute build/compliance_0000.zkey build/compliance_final.zkey --name="1st contributor" -v

cp build/compliance_final.zkey proving/
```

---

## Latest Testnet Deployment

```
Contract ID: CAY3NMUAZEHW5LL453KL2CCJT5VCOS47C2GXPFV3KAPOUTTVT4XRNST5
```

Verify directly from the CLI:

```bash
stellar contract invoke \
  --id CAY3NMUAZEHW5LL453KL2CCJT5VCOS47C2GXPFV3KAPOUTTVT4XRNST5 \
  --network testnet \
  -- verify \
  --proof_bytes "$(cat build/proof.hex)" \
  --pub_signals_bytes "$(cat build/public.hex)"
```

---

## Useful Commands

```bash
# Compile check
cargo check --workspace

# Run tests
cargo test --workspace

# Encode artifacts for Soroban
cargo run -p circom-to-soroban-hex -- vk build/verification_key.json
cargo run -p circom-to-soroban-hex -- proof build/proof.json
cargo run -p circom-to-soroban-hex -- public build/public.json

# Run frontend locally
cd frontend && npm install && npm run dev
```

---

## Frontend

The frontend provides an interactive demo of the full compliance verification flow:

1. Enter private operational records (calibration days, maintenance status, documentation)
2. Evaluate compliance rules locally
3. Load the pre-generated Groth16 proof
4. Submit to the Soroban verifier contract on Stellar Testnet
5. View the on-chain verification result

```bash
cd frontend && npm install && npm run dev
```

---

## Acknowledgements

This project uses the **Soroban Groth16 verifier contract** and **circom-to-soroban-hex** tooling originally developed by **James Bachini** in the [CircomStellar](https://github.com/jamesbachini/CircomStellar) project.

The compliance circuit, application domain, regulatory use case, and frontend were developed specifically for VCARI.

---

## Disclaimer

This project is an experimental prototype created for the **Stellar Real-World ZK Hackathon**.

It has **not** been security audited and should not be used in production environments.

---

## License

MIT
