# Repository Guidelines

## Project Structure & Module Organization
- `circuits/`: Circom source circuit (`compliance.circom`) — BLS12-381, Groth16.
- `proving/`: Proving key (`compliance_final.zkey`), witness, and sample inputs.
- `contract/`: Soroban verifier contract (`contract/src/lib.rs`) — `set_vk` + `verify`.
- `tools/circom_to_soroban_hex/`: Rust CLI that converts snarkjs JSON outputs to Soroban-ready hex.
- `frontend/`: Vite + React demo UI (`frontend/src`).
- `build/`: Generated runtime artifacts (`proof.json`, `public.json`, hex outputs, circuit WASM). Treat as disposable.

## Build, Test, and Development Commands
- `./demo.sh`: End-to-end flow (build contract, deploy to testnet, generate proof, verify on-chain).
- `cargo check --workspace`: Compile-check all Rust crates quickly.
- `cargo test --workspace`: Run Rust tests.
- `cargo run -p circom-to-soroban-hex -- <vk|proof|public> <json-file>`: Encode proof inputs for contract calls.
- `cd frontend && npm install && npm run dev`: Run the frontend locally.
- `cd frontend && npm run build`: Production frontend build.

## Coding Style & Naming Conventions
- Rust: 4-space indentation, `snake_case` for functions/variables, `PascalCase` for types, `SCREAMING_SNAKE_CASE` for constants.
- React/JS: 2-space indentation, `PascalCase` components (`App.jsx`), `camelCase` helpers (`verifyProofOnSoroban`).
- Keep module names descriptive and aligned with function (`snarkHex.js`, `stellarVerify.js`).
- Run `cargo fmt --all` before opening a PR.

## Testing Guidelines
- Primary validation is integration-style: run `./demo.sh` and confirm final `true` verification output.
- For frontend changes, run `cd frontend && npm run build` to catch compile/runtime issues.
- When adding Rust tests, keep them near the module with `#[cfg(test)]` and clear behavior-oriented names.

## Commit & Pull Request Guidelines
- Follow concise imperative commit subjects (e.g., `Add compliance circuit`, `Fix proof encoding`).
- Keep commits scoped to one concern (contract logic, tooling, circuit, or frontend).
- PRs should include: purpose, key changes, verification steps run, and any testnet assumptions (`NETWORK`, `SOURCE`, contract ID).

## Security & Configuration Tips
- Never commit real secrets. Use `frontend/.env.example` as the template.
- Treat `VITE_SOURCE_SECRET` as test-only; prefer disposable accounts for demos.
