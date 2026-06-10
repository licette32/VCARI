pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template ComplianceCheck() {
    signal input last_calibration_days;
    signal input max_allowed_days;
    signal input preventive_maintenance;
    signal input documentation_complete;
    signal output compliant;

    component lessOrEqual = LessEqThan(32);
    lessOrEqual.in[0] <== last_calibration_days;
    lessOrEqual.in[1] <== max_allowed_days;

    signal intermediate;
    intermediate <== lessOrEqual.out * preventive_maintenance;
    compliant <== intermediate * documentation_complete;
}

component main = ComplianceCheck();
