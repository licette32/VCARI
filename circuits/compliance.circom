pragma circom 2.0.0;

// VCARI Compliance Circuit
// Curve: BLS12-381  |  Proof system: Groth16
//
// Encodes three biomedical equipment compliance rules as arithmetic constraints:
//   1. Calibration interval has not expired  (last_calibration_days <= max_allowed_days)
//   2. Preventive maintenance has been completed  (preventive_maintenance == 1)
//   3. Technical documentation is complete  (documentation_complete == 1)
//
// Output: compliant = 1 iff all three rules are satisfied simultaneously.
//         compliant = 0 otherwise (the product of any zero factor is zero).
//
// NOTE — max_allowed_days is currently a private input.
// This means an auditor cannot independently verify which threshold was enforced
// without trusting the prover. In a production deployment this signal should be
// either (a) promoted to a public input so the threshold is visible on-chain, or
// (b) hardcoded as a constant in the circuit so it is fixed at compile time and
// embedded in the verification key. The current design is intentional for the
// hackathon prototype to demonstrate the full private-input flow.

include "circomlib/circuits/comparators.circom";

template ComplianceCheck() {
    signal input last_calibration_days;  // private: days since last calibration
    signal input max_allowed_days;       // private: maximum allowed calibration interval (see note above)
    signal input preventive_maintenance; // private: 1 if completed, 0 otherwise
    signal input documentation_complete; // private: 1 if complete, 0 otherwise
    signal output compliant;             // public:  1 iff all rules satisfied

    component lessOrEqual = LessEqThan(32);
    lessOrEqual.in[0] <== last_calibration_days;
    lessOrEqual.in[1] <== max_allowed_days;

    // Combine rules multiplicatively: any failing rule (0) zeroes the product.
    signal intermediate;
    intermediate <== lessOrEqual.out * preventive_maintenance;
    compliant <== intermediate * documentation_complete;
}

component main = ComplianceCheck();
