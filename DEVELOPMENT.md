# DEVELOPMENT.md

Developer reference for regenerating circuit artifacts, running tests, and working with the full toolchain.

---

## Regenerating the ZKey

The `.zkey` file is included in `proving/` for convenience. To regenerate from scratch (WSL required for Circom compilation):

```bash
# Compile circuit
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

# Production frontend build
cd frontend && npm run build
```

---

## Environment Configuration

Copy `frontend/.env.example` to `frontend/.env` and fill in the required values.

`VITE_SOURCE_SECRET` is for test purposes only. Use a disposable funded Testnet account.

---

## Coding Style

- Rust: 4-space indentation, `snake_case` functions/variables, `PascalCase` types, `SCREAMING_SNAKE_CASE` constants. Run `cargo fmt --all` before opening a PR.
- React/JS: 2-space indentation, `PascalCase` components, `camelCase` helpers.
