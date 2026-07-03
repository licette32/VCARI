# FUTURE WORK

Architectural improvements and production hardening for VCARI beyond the hackathon prototype.

---

## 1. Promote `max_allowed_days` to a public input

**What:** Change `max_allowed_days` from a private signal to a public signal in `circuits/compliance.circom`.

**Why it matters:** Currently an auditor cannot independently verify which calibration threshold was enforced — they must trust the prover's claim. A ZK-literate judge will notice this immediately. Making the threshold public means it appears in `public.json`, is committed to in the verification key, and is visible on-chain alongside the proof.

**What it requires:**
- Edit `circuits/compliance.circom`: change `signal input max_allowed_days` to `signal output max_allowed_days` or restructure as a public input via `component main { public [max_allowed_days] } = ComplianceCheck()`.
- Recompile the circuit (WSL + Circom).
- Regenerate the `.zkey` (full Powers of Tau ceremony — see `DEVELOPMENT.md`).
- Re-export `verification_key.json`, regenerate `proof.json` and `public.json`.
- Re-encode all hex artifacts with `circom-to-soroban-hex`.
- Redeploy the contract with the new verification key via `set_vk()`.
- Update `PROOF_HEX` and `PUBLIC_HEX` constants in `frontend/src/App.jsx`.

---

## 2. Harden the compliance logic against malicious inputs

**What:** Add range checks and boolean constraints to `circuits/compliance.circom`.

**Why it matters:** Currently `preventive_maintenance` and `documentation_complete` are unconstrained — a prover could pass `preventive_maintenance = 5` and the multiplication still yields a non-zero result. The circuit should enforce `preventive_maintenance ∈ {0, 1}` and `documentation_complete ∈ {0, 1}` explicitly.

**What it requires:**
- Add `IsZero` or boolean constraint components from circomlib for both binary inputs.
- Recompile circuit and regenerate all artifacts (same pipeline as item 1).

---

## 3. Replace the pre-generated proof with in-browser proof generation

**What:** Generate the Groth16 proof client-side using `snarkjs` WASM in the browser, using the actual input values entered by the user.

**Why it matters:** The current frontend uses a hardcoded pre-generated proof. The user can change the input values but the proof does not change — the on-chain verification always uses the same proof regardless of what the user types. This is a significant demo limitation that a judge will notice if they try non-compliant inputs.

**What it requires:**
- Bundle `compliance_js/compliance.wasm` and `compliance_final.zkey` into the frontend (large files — consider hosting on IPFS or a CDN).
- Call `snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath)` in the browser.
- Replace the hardcoded `PROOF_HEX` / `PUBLIC_HEX` with dynamically generated values from `proofToHex()` and `publicSignalsToHex()` in `snarkHex.js` (these functions already exist and are correct).
- Handle the large zkey download gracefully (progress indicator, lazy loading).

---

## 4. Rename the Soroban contract crate to `vcari-verifier`

**What:** Change `name = "soroban-groth16-verifier"` to `name = "vcari-verifier"` in `contract/Cargo.toml`.

**Why it matters:** The generated WASM is currently named `soroban_groth16_verifier.wasm`, which signals a tutorial fork rather than original work. Renaming it to `vcari_verifier.wasm` aligns the artifact name with the project identity.

**What it requires:**
- Edit `contract/Cargo.toml`: `name = "vcari-verifier"`.
- Update `demo.sh` to reference `vcari_verifier.wasm`.
- Rebuild and redeploy the contract.

---

## 5. Add a non-compliant proof rejection test to the frontend

**What:** Add a second pre-generated proof for the non-compliant case (`proving/input_noncompliant.json` already exists) and expose a toggle in the UI to submit it.

**Why it matters:** The demo only shows the happy path (`compliant = 1, verify = true`). Showing that the contract correctly rejects an invalid proof (`compliant = 0` or a tampered proof) demonstrates the security property, not just the functionality.

**What it requires:**
- Generate `proof_noncompliant.json` from `input_noncompliant.json` using the existing `.zkey`.
- Encode it with `circom-to-soroban-hex`.
- Add a `PROOF_HEX_NONCOMPLIANT` constant to `App.jsx`.
- Add a UI toggle ("Test invalid proof") in Step 3 that loads the non-compliant proof hex.
- The on-chain call should return `false` or an error — display this clearly in Step 5.

---

## 6. Multi-rule circuit with configurable compliance profiles

**What:** Extend the circuit to support multiple compliance profiles (e.g., different equipment types with different rule sets) using a profile selector as a public input.

**Why it matters:** The current circuit is hardcoded for one equipment type. A production system would need to support multiple regulatory frameworks without redeploying the contract.

**What it requires:**
- Significant circuit redesign (multiple templates, conditional constraint activation).
- New proving key per profile, or a single circuit with profile-indexed constants.
- Contract changes to store multiple verification keys keyed by profile ID.
