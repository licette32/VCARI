import { useState, useRef, useCallback, useEffect } from "react";
import { verifyProofOnSoroban } from "./lib/stellarVerify";

// Pre-generated Groth16 proof for the compliant case (compliant = 1).
// Generated from: last_calibration_days=120, max_allowed_days=180,
//                 preventive_maintenance=1, documentation_complete=1
// Circuit: circuits/compliance.circom (BLS12-381, Groth16)
const PROOF_HEX =
  "00637ed2e41736853b347f97eb729a34c64e873fc1824459ce122942f529ebf73d38248f1037c7ce68f7a9f98ce02218037f0f992bbc18a88fd7a8fbcb7645169821069f230fee8b4f1ebccb6e34aedc0ff585add0358a59a0cf214c3b8a97dc00a751ceb7ac07435797b50e7fef28facb67c0b820e8fb60ff55bd1b868d418ea119e9de589dfe57c5a3c2be99287bf615241176557d2aff2009f6c3b5136fbfd0f2a99466b84d0271fd38a15f901d1f09a9311899500325330b747e108a565d18dd79d87c4dcfb98ff2b92ab93d13cd4184adc3fc6b4e3805f1db8661464be23896ec380a8e048c115e364b3b8267ee16787915f4d03c83006194e86936e8b876efe204537d0c83aff69d0ba685c9f94352ad93c70ac762133c8f8c9dda8af509bd751b7ce18e13078da64cd4ae26f2435f8006ab2211f540be94f9d1b7f5c59fd877315a7b5edb6dec3b89a0d27cb317a0ce0f9200ef68f8952888eb9e40465d99b27329a8163b49b84847d3eeac8929d294f14f9e10173d2a408ce1a77aef";

// Public signals: [compliant = 1]
const PUBLIC_HEX =
  "000000010000000000000000000000000000000000000000000000000000000000000001";

const envSecret = import.meta.env.VITE_SOURCE_SECRET || "";

const DEFAULTS = {
  contractId:
    import.meta.env.VITE_CONTRACT_ID ||
    "CAY3NMUAZEHW5LL453KL2CCJT5VCOS47C2GXPFV3KAPOUTTVT4XRNST5",
  sourceSecret: envSecret.includes("REPLACE_WITH") ? "" : envSecret,
  sourcePublicKey: import.meta.env.VITE_SOURCE_PUBLIC || "",
  rpcUrl:
    import.meta.env.VITE_RPC_URL || "https://soroban-testnet.stellar.org",
  networkPassphrase:
    import.meta.env.VITE_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015",
};

const STEP_LABELS = [
  "Input",
  "Assessment",
  "Proof",
  "Verification",
  "Result",
];

const INITIAL_PROOF = { hex: "", public: "" };

function HowItWorks({ onStartDemo }) {
  const industries = [
    {
      emoji: "🏥",
      name: "Biomedical",
      badge: "Live Demo",
      rule:
        "Equipment calibrated within allowed interval, preventive maintenance completed, documentation available",
    },
    {
      emoji: "🏦",
      name: "Finance",
      rule:
        "Suspicious transaction reported within regulatory deadline without revealing transaction contents",
    },
    {
      emoji: "⚡",
      name: "Energy",
      rule:
        "Mandatory safety inspection completed by certified personnel before deadline",
    },
    {
      emoji: "🚛",
      name: "Logistics",
      rule:
        "Cold-chain temperature remained within limits throughout transportation",
    },
    {
      emoji: "🏭",
      name: "Manufacturing",
      rule:
        "Production batch passed all required quality control checkpoints",
    },
    {
      emoji: "🌱",
      name: "Environmental",
      rule:
        "Emissions remained below regulatory thresholds throughout the reporting period",
    },
  ];

  const pipeline = [
    {
      icon: "🔒",
      title: "Private Records",
      text: "Operational data stays local. Never transmitted.",
    },
    {
      icon: "⚙️",
      title: "Compliance Engine",
      text: "Rules evaluated against private inputs.",
    },
    {
      icon: "〇",
      title: "Circom Circuit",
      text: "Compliance rules encoded as arithmetic constraints (BLS12-381).",
    },
    {
      icon: "∑",
      title: "Groth16 Proof",
      text: "Cryptographic proof that all rules are satisfied.",
    },
    {
      icon: "⭐",
      title: "Soroban Contract",
      text: "On-chain verification using Stellar's native BLS12-381 primitives.",
    },
    {
      icon: "✓",
      title: "Verified",
      text: "Anyone can verify the result. No private data is disclosed.",
    },
  ];

  return (
    <div className="container">
      <div className="how-it-works">
        <h1>How VCARI Works</h1>
        <p className="page-sub">
          Privacy-preserving compliance verification pipeline
        </p>

        <div className="pipeline">
          {pipeline.map((item, i) => (
            <div key={i}>
              <div className="pipeline-card">
                <div className="pipeline-icon">{item.icon}</div>
                <div className="pipeline-body">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
              {i < pipeline.length - 1 && (
                <div className="pipeline-arrow">↓</div>
              )}
            </div>
          ))}
        </div>

        <div className="industries-section">
          <h2>Supported Industries</h2>
          <div className="industries-grid">
            {industries.map((ind) => (
              <div className="industry-card" key={ind.name}>
                <h4>
                  {ind.emoji} {ind.name}
                  {ind.badge && (
                    <span className="industry-badge">{ind.badge}</span>
                  )}
                </h4>
                <p>{ind.rule}</p>
              </div>
            ))}
          </div>
          <p className="industry-note">
            The architecture is generic. Biomedical is the demonstration
            scenario.
          </p>
        </div>

        <div className="how-it-works-footer">
          <button className="cta-btn" onClick={onStartDemo}>
            Start Demo →
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="sidebar-card">
      <h3>Current Demonstration</h3>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Industry</div>
        <p className="sidebar-item">🏥 Biomedical</p>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Compliance Rules</div>
        <ul className="sidebar-rules">
          <li>Calibration Interval</li>
          <li>Preventive Maintenance</li>
          <li>Documentation Complete</li>
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Blockchain</div>
        <p className="sidebar-item">⭐ Stellar Testnet</p>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Proof System</div>
        <p className="sidebar-item">Groth16</p>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Circuit</div>
        <p className="sidebar-item">Circom</p>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Curve</div>
        <p className="sidebar-item">BLS12-381</p>
      </div>

      <p className="sidebar-note">
        Compliance evaluation runs locally in this demo. The proof is then
        submitted for verification on Stellar Testnet.
      </p>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState("demo");
  const [demoStarted, setDemoStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [equipmentId, setEquipmentId] = useState("MRI-001");
  const [lastCalibration, setLastCalibration] = useState("120");
  const [maxAllowed, setMaxAllowed] = useState("180");
  const [maintenanceStatus, setMaintenanceStatus] = useState("Completed");
  const [documentationStatus, setDocumentationStatus] = useState("Complete");

  const [evaluated, setEvaluated] = useState(false);
  const [rulesVisible, setRulesVisible] = useState([false, false, false]);
  const [showBadge, setShowBadge] = useState(false);

  const [proofData, setProofData] = useState(INITIAL_PROOF);
  const [proofProgress, setProofProgress] = useState(0);
  const [proofStatus, setProofStatus] = useState("");
  const [proofReady, setProofReady] = useState(false);

  const [configOpen, setConfigOpen] = useState(false);
  const [contractId, setContractId] = useState(DEFAULTS.contractId);
  const [rpcUrl, setRpcUrl] = useState(DEFAULTS.rpcUrl);
  const [networkPassphrase, setNetworkPassphrase] = useState(
    DEFAULTS.networkPassphrase
  );
  const [sourceSecret, setSourceSecret] = useState(DEFAULTS.sourceSecret);
  const [sourcePublicKeyInput, setSourcePublicKeyInput] = useState(
    DEFAULTS.sourcePublicKey
  );
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyDone, setVerifyDone] = useState(false);
  const [sourcePublicKeyDisplay, setSourcePublicKeyDisplay] = useState("");

  const progressTimer = useRef(null);

  const calRule =
    parseInt(lastCalibration, 10) <= parseInt(maxAllowed, 10);
  const maintRule = maintenanceStatus === "Completed";
  const docRule = documentationStatus === "Complete";
  const isCompliant = calRule && maintRule && docRule;

  const startDemo = useCallback(() => {
    setDemoStarted(true);
    setCurrentStep(1);
    setEvaluated(false);
    setRulesVisible([false, false, false]);
    setShowBadge(false);
    setProofData(INITIAL_PROOF);
    setProofProgress(0);
    setProofStatus("");
    setProofReady(false);
    setVerifyDone(false);
    setVerifyError("");
  }, []);

  const resetDemo = useCallback(() => {
    setCurrentStep(1);
    setEvaluated(false);
    setRulesVisible([false, false, false]);
    setShowBadge(false);
    setProofData(INITIAL_PROOF);
    setProofProgress(0);
    setProofStatus("");
    setProofReady(false);
    setVerifyDone(false);
    setVerifyError("");
    setEquipmentId("MRI-001");
    setLastCalibration("120");
    setMaxAllowed("180");
    setMaintenanceStatus("Completed");
    setDocumentationStatus("Complete");
  }, []);

  function handleNav(view) {
    setActiveView(view);
  }

  function handleEvaluate(e) {
    e.preventDefault();
    setEvaluated(true);
    setProofData(INITIAL_PROOF);
    setProofReady(false);
    setShowBadge(false);
    setRulesVisible([false, false, false]);

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    async function animate() {
      for (let i = 0; i < 3; i++) {
        await delay(300);
        setRulesVisible((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }
      await delay(400);
      setShowBadge(true);
    }

    animate();
  }

  function handlePrepareProof() {
    setCurrentStep(3);
    setProofProgress(0);
    setProofReady(false);

    const phases = [
      { end: 25, label: "Loading compliance circuit proof..." },
      { end: 60, label: "Parsing Groth16 proof elements..." },
      { end: 90, label: "Encoding for Soroban contract..." },
      { end: 100, label: "Proof ready for submission" },
    ];

    const totalDuration = 2500;
    const startTime = Date.now();

    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      setProofProgress(pct);

      let currentLabel = "";
      for (let i = phases.length - 1; i >= 0; i--) {
        if (pct >= (i === 0 ? 0 : phases[i - 1].end)) {
          currentLabel = phases[i].label;
          break;
        }
      }
      setProofStatus(currentLabel);

      if (pct >= 100) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
        setProofReady(true);
        setProofData({ hex: PROOF_HEX, public: PUBLIC_HEX });
      }
    }, 50);
  }

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyBusy(true);
    setVerifyError("");

    try {
      const result = await verifyProofOnSoroban({
        rpcUrl,
        networkPassphrase,
        contractId,
        sourceSecret,
        sourcePublicKey: sourcePublicKeyInput,
        proofHex: proofData.hex,
        publicHex: proofData.public,
      });

      setSourcePublicKeyDisplay(result.sourcePublicKey);
      setVerifyDone(true);
      setCurrentStep(5);
    } catch (err) {
      setVerifyError(err.message || String(err));
    } finally {
      setVerifyBusy(false);
    }
  }

  function goToStep(step) {
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  }

  const renderStep1 = () => (
    <div className="step-panel">
      <div className="step-header">
        <h2>🔒 Private Operational Records</h2>
        <p className="step-sub">
          These values are evaluated locally and never transmitted.
        </p>
      </div>

      <form onSubmit={handleEvaluate}>
        <div className="field-group">
          <label>
            Equipment ID
            <input
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
            />
          </label>

          <div className="field-row">
            <label>
              Last calibration (days ago)
              <input
                value={lastCalibration}
                onChange={(e) => setLastCalibration(e.target.value)}
                inputMode="numeric"
                required
              />
            </label>
            <label>
              Maximum allowed interval (days)
              <input
                value={maxAllowed}
                onChange={(e) => setMaxAllowed(e.target.value)}
                inputMode="numeric"
                required
              />
            </label>
          </div>

          <div className="field-row">
            <label>
              Preventive maintenance
              <select
                value={maintenanceStatus}
                onChange={(e) => setMaintenanceStatus(e.target.value)}
              >
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
            </label>
            <label>
              Documentation
              <select
                value={documentationStatus}
                onChange={(e) => setDocumentationStatus(e.target.value)}
              >
                <option value="Complete">Complete</option>
                <option value="Incomplete">Incomplete</option>
              </select>
            </label>
          </div>
        </div>

        <button type="submit" className="btn btn-primary">
          Evaluate Compliance →
        </button>
      </form>
    </div>
  );

  const renderStep2 = () => (
    <div className="step-panel">
      <div className="step-header">
        <h2>Compliance Assessment Engine</h2>
        <p className="step-sub">
          Rules evaluated locally against private inputs.
        </p>
      </div>

      <div className="rules-list">
        <div
          className={`rule-check ${rulesVisible[0] ? "visible" : ""} ${
            rulesVisible[0] ? (calRule ? "rule-pass" : "rule-fail") : ""
          }`}
        >
          <span className="rule-icon">
            {rulesVisible[0] ? (calRule ? "✓" : "✗") : ""}
          </span>
          Calibration within allowed interval
          {rulesVisible[0] && (
            <span style={{ marginLeft: "auto", fontSize: "0.75rem" }}>
              {lastCalibration} ≤ {maxAllowed}
            </span>
          )}
        </div>

        <div
          className={`rule-check ${rulesVisible[1] ? "visible" : ""} ${
            rulesVisible[1] ? (maintRule ? "rule-pass" : "rule-fail") : ""
          }`}
        >
          <span className="rule-icon">
            {rulesVisible[1] ? (maintRule ? "✓" : "✗") : ""}
          </span>
          Preventive maintenance completed
          {rulesVisible[1] && (
            <span style={{ marginLeft: "auto", fontSize: "0.75rem" }}>
              {maintenanceStatus}
            </span>
          )}
        </div>

        <div
          className={`rule-check ${rulesVisible[2] ? "visible" : ""} ${
            rulesVisible[2] ? (docRule ? "rule-pass" : "rule-fail") : ""
          }`}
        >
          <span className="rule-icon">
            {rulesVisible[2] ? (docRule ? "✓" : "✗") : ""}
          </span>
          Documentation complete
          {rulesVisible[2] && (
            <span style={{ marginLeft: "auto", fontSize: "0.75rem" }}>
              {documentationStatus}
            </span>
          )}
        </div>
      </div>

      {showBadge && (
        <>
          <div
            className={`compliance-badge ${
              isCompliant ? "compliant" : "noncompliant"
            }`}
          >
            {isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}
          </div>

          {isCompliant ? (
            <button
              className="btn btn-primary"
              onClick={handlePrepareProof}
            >
              Prepare Proof for Verification →
            </button>
          ) : (
            <p className="compliance-message">
              Resolve the compliance issues above to continue.
            </p>
          )}
        </>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="step-panel">
      <div className="step-header">
        <h2>Preparing Proof for Verification</h2>
        <p className="step-sub">
          This demo uses a pre-generated proof from the VCARI compliance circuit
          (Circom · Groth16 · BLS12-381).
        </p>
      </div>

      {!proofReady && (
        <div className="progress-bar-container">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${proofProgress}%` }}
            />
          </div>
          <p className="progress-status">{proofStatus}</p>
        </div>
      )}

      {proofReady && (
        <>
          <div className="hex-output-group">
            <label>
              Proof (hex)
              <textarea
                value={proofData.hex}
                onChange={(e) =>
                  setProofData((p) => ({ ...p, hex: e.target.value }))
                }
                rows={6}
              />
            </label>
            <label>
              Public signals (hex)
              <textarea
                value={proofData.public}
                onChange={(e) =>
                  setProofData((p) => ({ ...p, public: e.target.value }))
                }
                rows={3}
              />
            </label>
          </div>

          <p className="hex-note">
            Proof generated by the VCARI compliance circuit. Edit to test
            invalid proof rejection.
          </p>

          <button
            className="btn btn-primary"
            onClick={() => setCurrentStep(4)}
          >
            Submit to Stellar →
          </button>
        </>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="step-panel">
      <div className="step-header">
        <h2>Soroban Smart Contract Verification</h2>
        <p className="step-sub">
          Submitting proof to the VCARI verifier contract on Stellar Testnet.
        </p>
      </div>

      <button
        className="config-toggle"
        onClick={() => setConfigOpen(!configOpen)}
      >
        {configOpen ? "▼" : "▶"} Contract Configuration
      </button>

      {configOpen && (
        <div className="config-panel">
          <label>
            Contract ID
            <input
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            />
          </label>
          <label>
            RPC URL
            <input
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
            />
          </label>
          <label>
            Network passphrase
            <input
              value={networkPassphrase}
              onChange={(e) => setNetworkPassphrase(e.target.value)}
            />
          </label>
          <label>
            Source secret key (optional)
            <input
              type="password"
              value={sourceSecret}
              onChange={(e) => setSourceSecret(e.target.value)}
            />
          </label>
          <label>
            Source public key (optional fallback)
            <input
              value={sourcePublicKeyInput}
              onChange={(e) => setSourcePublicKeyInput(e.target.value)}
            />
          </label>
        </div>
      )}

      {verifyError && <div className="error-msg">{verifyError}</div>}

      <button
        className="btn btn-primary"
        disabled={verifyBusy}
        onClick={handleVerify}
      >
        {verifyBusy ? (
          <>
            <span className="spinner" /> Submitting to Stellar Testnet...
          </>
        ) : (
          "Verify On-Chain →"
        )}
      </button>
    </div>
  );

  const renderStep5 = () => (
    <div className="step-panel">
      <div className="step-header">
        <h2>Compliance Verified ✓</h2>
        <p className="step-sub">
          without exposing private operational records
        </p>
      </div>

      <div className="result-items">
        <div className="result-item">
          <span className="result-label">Network</span>
          <span className="result-value">Stellar Testnet</span>
        </div>
        <div className="result-item">
          <span className="result-label">Contract</span>
          <span className="result-value">
            {contractId.slice(0, 12)}...{contractId.slice(-8)}
          </span>
        </div>
        <div className="result-item">
          <span className="result-label">On-chain result</span>
          <span className="result-value" style={{ color: "var(--green-600)" }}>
            true
          </span>
        </div>
      </div>

      <div className="success-banner">
        Zero-Knowledge Proof verified on Stellar Soroban
      </div>

      <button className="btn btn-secondary" onClick={resetDemo}>
        Verify Another Equipment
      </button>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return !evaluated ? renderStep1() : renderStep2();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  const renderProgress = () => (
    <div className="progress-indicator">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <span key={i} style={{ display: "flex", alignItems: "center" }}>
            <span
              className={`progress-step ${
                isActive ? "active" : isCompleted ? "completed" : ""
              }`}
              onClick={() => goToStep(stepNum)}
              style={{ cursor: stepNum <= currentStep ? "pointer" : "default" }}
            >
              <span className="step-num">
                {isCompleted ? "✓" : stepNum}
              </span>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <span
                className={`progress-connector ${
                  isCompleted ? "done" : ""
                }`}
              />
            )}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="page-shell">
      <nav className="app-nav">
        <div className="app-nav-inner">
          <a
            className={activeView === "demo" ? "active" : ""}
            onClick={() => handleNav("demo")}
          >
            Demo
          </a>
          <a
            className={activeView === "how-it-works" ? "active" : ""}
            onClick={() => handleNav("how-it-works")}
          >
            How It Works
          </a>
        </div>
      </nav>

      {activeView === "how-it-works" && (
        <HowItWorks onStartDemo={startDemo} />
      )}

      {activeView === "demo" && !demoStarted && (
        <div className="container">
          <div className="hero-section">
            <div className="hero-content">
              <h1>VCARI</h1>
              <p className="hero-sub">
                Verifiable Compliance Assessment for Regulated Industries
              </p>
              <p className="hero-body">
                Privacy-preserving compliance verification powered by
                Zero-Knowledge Proofs on Stellar.
              </p>
              <button className="cta-btn" onClick={startDemo}>
                Start Demo →
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === "demo" && demoStarted && (
        <div className="container">
          <div className="demo-layout">
            <div className="step-flow">
              {renderProgress()}
              {renderStepContent()}
            </div>
            <div className="sidebar">
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
