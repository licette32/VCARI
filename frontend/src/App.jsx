import { useState, useRef, useCallback, useEffect } from "react";
import { verifyProofOnSoroban } from "./lib/stellarVerify";

// Pre-generated Groth16 proof for the compliant case (compliant = 1).
const PROOF_HEX =
  "00637ed2e41736853b347f97eb729a34c64e873fc1824459ce122942f529ebf73d38248f1037c7ce68f7a9f98ce02218037f0f992bbc18a88fd7a8fbcb7645169821069f230fee8b4f1ebccb6e34aedc0ff585add0358a59a0cf214c3b8a97dc00a751ceb7ac07435797b50e7fef28facb67c0b820e8fb60ff55bd1b868d418ea119e9de589dfe57c5a3c2be99287bf615241176557d2aff2009f6c3b5136fbfd0f2a99466b84d0271fd38a15f901d1f09a9311899500325330b747e108a565d18dd79d87c4dcfb98ff2b92ab93d13cd4184adc3fc6b4e3805f1db8661464be23896ec380a8e048c115e364b3b8267ee16787915f4d03c83006194e86936e8b876efe204537d0c83aff69d0ba685c9f94352ad93c70ac762133c8f8c9dda8af509bd751b7ce18e13078da64cd4ae26f2435f8006ab2211f540be94f9d1b7f5c59fd877315a7b5edb6dec3b89a0d27cb317a0ce0f9200ef68f8952888eb9e40465d99b27329a8163b49b84847d3eeac8929d294f14f9e10173d2a408ce1a77aef";

const PUBLIC_HEX =
  "000000010000000000000000000000000000000000000000000000000000000000000001";

// Tampered proof: the compliant proof with the first 4 bytes of pi_a flipped.
// This produces a point that does NOT lie on the BLS12-381 curve, so the
// Soroban pairing check returns false — demonstrating proof rejection.
const PROOF_HEX_NONCOMPLIANT =
  "ff637ed2e41736853b347f97eb729a34c64e873fc1824459ce122942f529ebf73d38248f1037c7ce68f7a9f98ce02218037f0f992bbc18a88fd7a8fbcb7645169821069f230fee8b4f1ebccb6e34aedc0ff585add0358a59a0cf214c3b8a97dc00a751ceb7ac07435797b50e7fef28facb67c0b820e8fb60ff55bd1b868d418ea119e9de589dfe57c5a3c2be99287bf615241176557d2aff2009f6c3b5136fbfd0f2a99466b84d0271fd38a15f901d1f09a9311899500325330b747e108a565d18dd79d87c4dcfb98ff2b92ab93d13cd4184adc3fc6b4e3805f1db8661464be23896ec380a8e048c115e364b3b8267ee16787915f4d03c83006194e86936e8b876efe204537d0c83aff69d0ba685c9f94352ad93c70ac762133c8f8c9dda8af509bd751b7ce18e13078da64cd4ae26f2435f8006ab2211f540be94f9d1b7f5c59fd877315a7b5edb6dec3b89a0d27cb317a0ce0f9200ef68f8952888eb9e40465d99b27329a8163b49b84847d3eeac8929d294f14f9e10173d2a408ce1a77aef";

const PUBLIC_HEX_NONCOMPLIANT =
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

const STEP_LABELS = ["Input", "Assessment", "Proof", "Verification", "Result"];
const INITIAL_PROOF = { hex: "", public: "" };

// ── Logo components ───────────────────────────────────────────────────────────
// Logo mark (icon only) — used in navbar and footer
function LogoMark({ className = "w-8 h-8" }) {
  return <img src="/logo-v.png" alt="VCARI" className={className} style={{ objectFit: "contain" }} />;
}

// Full logo — used in hero pipeline card and Why ZK section
function LogoFull({ className = "w-24 h-24" }) {
  return <img src="/logo-v cari.png" alt="VCARI" className={className} style={{ objectFit: "contain" }} />;
}

// Stellar logo — used in sidebar and footer
function StellarLogo({ className = "w-5 h-5" }) {
  return <img src="/stellar.png" alt="Stellar" className={className} style={{ objectFit: "contain" }} />;
}

// Keep SVG fallback for light variant (used in dark backgrounds)
function Logo({ className = "w-8 h-8", light = false }) {
  const primary   = light ? "#FFFDF8" : "#4A2545";
  const secondary = light ? "#D8D2C2" : "#7A4A72";
  const accent    = light ? "#FFFDF8" : "#2F6E4F";
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="15,15 40,15 60,85 45,85" fill={primary} />
      <line x1="48" y1="85" x2="70" y2="15" stroke={secondary} strokeWidth="4" />
      <line x1="55" y1="85" x2="77" y2="15" stroke={accent}    strokeWidth="4" />
      <line x1="62" y1="85" x2="84" y2="15" stroke={secondary} strokeWidth="4" />
      <line x1="69" y1="85" x2="91" y2="15" stroke={primary}   strokeWidth="4" strokeDasharray="6 6" />
    </svg>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ activeView, onNav }) {
  return (
    <nav style={{ backgroundColor: "#4A2545" }} className="w-full px-8 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <LogoMark className="w-8 h-8" />
        <span className="font-serif text-xl tracking-widest font-medium text-white">VCARI</span>
      </div>
      <div className="flex items-center gap-1 font-sans text-sm">
        <button
          onClick={() => onNav("demo")}
          style={activeView === "demo" ? { backgroundColor: "rgba(255,255,255,0.12)" } : {}}
          className={`px-4 py-2 rounded transition-colors ${activeView === "demo" ? "text-white" : "text-white/70 hover:text-white"}`}
        >
          Demo
        </button>
        <button
          onClick={() => onNav("how-it-works")}
          style={activeView === "how-it-works" ? { backgroundColor: "rgba(255,255,255,0.12)" } : {}}
          className={`px-4 py-2 rounded transition-colors ${activeView === "how-it-works" ? "text-white" : "text-white/70 hover:text-white"}`}
        >
          How It Works
        </button>
      </div>
    </nav>
  );
}

// ── Pipeline step ─────────────────────────────────────────────────────────────
function FlowStep({ icon, title, isLast = false }) {
  return (
    <div className="flex flex-col items-center">
      <div
        style={isLast
          ? { backgroundColor: "#2F6E4F", borderColor: "#2F6E4F", color: "#fff" }
          : { backgroundColor: "#FFFDF8", borderColor: "#D8D2C2", color: "#4A2545" }
        }
        className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg z-10 relative"
      >
        {icon}
      </div>
      <span
        style={{ color: isLast ? "#2F6E4F" : "#8C8579" }}
        className="mt-2 text-xs font-mono text-center max-w-[100px]"
      >
        {title}
      </span>
      {!isLast && <div style={{ backgroundColor: "#D8D2C2" }} className="w-px h-8 my-1" />}
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onStartDemo, onHowItWorks }) {
  return (
    <section className="relative w-full max-w-7xl mx-auto px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      {/* Subtle grid background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D8D2C2" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Left: text */}
      <div className="relative z-10 flex flex-col items-start">
        <h1 className="font-serif text-6xl md:text-7xl leading-tight tracking-tight mb-4" style={{ color: "#1C1A17" }}>
          VCARI
        </h1>
        <h2 className="font-sans text-2xl md:text-3xl font-medium mb-5 leading-snug" style={{ color: "#4A2545" }}>
          Verifiable Compliance Assessment<br className="hidden md:block" /> for Regulated Industries
        </h2>
        <p className="font-mono text-sm md:text-base mb-10 max-w-lg leading-relaxed" style={{ color: "#55504A" }}>
          Privacy-preserving compliance verification powered by Zero-Knowledge Proofs on Stellar.
        </p>
        <div className="flex flex-wrap gap-4 mb-10">
          <button
            onClick={onStartDemo}
            className="font-sans font-medium flex items-center gap-2 px-8 py-4 rounded transition-colors text-white"
            style={{ backgroundColor: "#4A2545" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#7A4A72"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "#4A2545"}
          >
            Launch Demo <span aria-hidden="true">→</span>
          </button>
          <button
            onClick={onHowItWorks}
            className="font-sans font-medium px-8 py-4 rounded transition-colors"
            style={{ border: "1px solid #4A2545", color: "#4A2545", backgroundColor: "transparent" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(74,37,69,0.05)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          >
            How It Works
          </button>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-3">
          {[
            { icon: "🔒", label: "Private by Design" },
            { icon: "〇", label: "Zero-Knowledge Proofs" },
            { icon: "⭐", label: "Verified on Stellar" },
          ].map((f) => (
            <span
              key={f.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-sans"
              style={{ backgroundColor: "#FFFDF8", border: "1px solid #D8D2C2", color: "#55504A" }}
            >
              <span>{f.icon}</span> {f.label}
            </span>
          ))}
        </div>
      </div>

      {/* Right: pipeline card */}
      <div className="relative z-10 flex justify-center lg:justify-end">
        <div
          className="rounded-xl p-8 shadow-sm flex flex-col items-center w-full max-w-xs"
          style={{ backgroundColor: "#FFFDF8", border: "1px solid #D8D2C2" }}
        >
          <div className="text-xs font-mono mb-6 uppercase tracking-widest" style={{ color: "#8C8579" }}>
            Verification Pipeline
          </div>
          {[
            { icon: "🔒", title: "Private Records" },
            { icon: "⚙️", title: "Compliance Engine" },
            { icon: "〇", title: "Circom Circuit" },
            { icon: "∑",  title: "Groth16 Proof" },
            { icon: "⭐", title: "Soroban Contract" },
            { icon: "✓",  title: "Verified", isLast: true },
          ].map((s) => (
            <FlowStep key={s.title} icon={s.icon} title={s.title} isLast={s.isLast} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works page ─────────────────────────────────────────────────────────
function HowItWorks({ onStartDemo }) {
  const industries = [
    { emoji: "🏥", name: "Biomedical",    badge: "Live Demo", rule: "Equipment calibrated within allowed interval, preventive maintenance completed, documentation available" },
    { emoji: "🏦", name: "Finance",       rule: "Suspicious transaction reported within regulatory deadline without revealing transaction contents" },
    { emoji: "⚡", name: "Energy",        rule: "Mandatory safety inspection completed by certified personnel before deadline" },
    { emoji: "🚛", name: "Logistics",     rule: "Cold-chain temperature remained within limits throughout transportation" },
    { emoji: "🏭", name: "Manufacturing", rule: "Production batch passed all required quality control checkpoints" },
    { emoji: "🌱", name: "Environmental", rule: "Emissions remained below regulatory thresholds throughout the reporting period" },
  ];

  const steps = [
    { step: "01", title: "Local Assessment",      icon: "🗄️", desc: "Operational data is evaluated locally against regulatory rules using our Compliance Engine. Data never leaves your infrastructure." },
    { step: "02", title: "Zero-Knowledge Proof",  icon: "🔐", desc: "A cryptographic proof (Groth16) is generated via Circom circuits, attesting that the rules were met without revealing the underlying data." },
    { step: "03", title: "On-Chain Verification", icon: "🌐", desc: "The proof is submitted to a Soroban smart contract on the Stellar network, providing an immutable, publicly verifiable compliance record." },
  ];

  return (
    <div style={{ backgroundColor: "#F5F2EA" }}>
      {/* How It Works */}
      <section className="w-full py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="mb-16 text-center">
            <h2 className="font-serif text-4xl mb-4" style={{ color: "#1C1A17" }}>How It Works</h2>
            <p className="font-mono text-sm uppercase tracking-widest" style={{ color: "#55504A" }}>The VCARI Verification Pipeline</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((block) => (
              <div
                key={block.step}
                className="p-8 relative overflow-hidden"
                style={{ backgroundColor: "#FFFDF8", border: "1px solid #D8D2C2" }}
              >
                <div className="text-6xl font-serif absolute -top-4 -right-4 select-none" style={{ color: "#D8D2C2", opacity: 0.5 }}>
                  {block.step}
                </div>
                <div className="text-2xl mb-6 relative z-10">{block.icon}</div>
                <h3 className="font-sans text-xl font-medium mb-4 relative z-10" style={{ color: "#1C1A17" }}>{block.title}</h3>
                <p className="font-sans leading-relaxed relative z-10 text-sm" style={{ color: "#55504A" }}>{block.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="w-full py-24" style={{ backgroundColor: "#FFFDF8", borderTop: "1px solid #D8D2C2", borderBottom: "1px solid #D8D2C2" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="mb-16">
            <h2 className="font-serif text-4xl mb-4" style={{ color: "#1C1A17" }}>Supported Industries</h2>
            <p className="font-mono text-sm uppercase tracking-widest" style={{ color: "#55504A" }}>Applicable sectors for zero-knowledge compliance</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ border: "1px solid #D8D2C2", gap: "1px", backgroundColor: "#D8D2C2" }}>
            {industries.map((ind) => (
              <div
                key={ind.name}
                className="p-8 group cursor-default transition-colors"
                style={{ backgroundColor: "#FFFDF8" }}
              >
                <div className="text-3xl mb-4 inline-block group-hover:scale-110 transition-transform">{ind.emoji}</div>
                <h3 className="font-serif text-xl mb-2 flex items-center gap-2" style={{ color: "#1C1A17" }}>
                  {ind.name}
                  {ind.badge && (
                    <span
                      className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                      style={{ backgroundColor: "#E8EFE9", color: "#2F6E4F" }}
                    >
                      {ind.badge}
                    </span>
                  )}
                </h3>
                <p className="font-sans text-sm leading-relaxed" style={{ color: "#55504A" }}>{ind.rule}</p>
                <div className="w-8 h-px mt-4" style={{ backgroundColor: "#D8D2C2" }} />
              </div>
            ))}
          </div>
          <p className="font-sans text-sm italic text-center mt-6" style={{ color: "#8C8579" }}>
            The architecture is generic. Biomedical is the demonstration scenario.
          </p>
        </div>
      </section>

      {/* Why ZK */}
      <section className="w-full py-24" style={{ backgroundColor: "#4A2545" }}>
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-serif text-4xl mb-6 text-white">Why Zero-Knowledge?</h2>
            <p className="font-sans text-lg leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.8)" }}>
              Traditional compliance requires exposing sensitive operational data to auditors or third parties.
              Zero-Knowledge Proofs (ZKPs) fundamentally change this paradigm.
            </p>
            <ul className="space-y-6 font-mono text-sm">
              {[
                { t: "Privacy by Design",      d: "Operational records never leave the organization." },
                { t: "Mathematical Certainty", d: "Only the proof is verified. No confidential information is disclosed." },
                { t: "Public Verifiability",   d: "Anyone can verify the proof on-chain without needing access to the original data." },
              ].map((item) => (
                <li key={item.t} className="flex items-start gap-4">
                  <span
                    className="mt-1 shrink-0 w-4 h-4 flex items-center justify-center"
                    style={{ border: "2px solid #2F6E4F" }}
                    aria-hidden="true"
                  >
                    <span className="w-1.5 h-1.5" style={{ backgroundColor: "#2F6E4F" }} />
                  </span>
                  <span>
                    <strong className="font-sans text-base block mb-1 text-white">{item.t}</strong>
                    <span style={{ color: "rgba(255,255,255,0.7)" }}>{item.d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className="p-8 rounded-xl flex items-center justify-center min-h-[320px]"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="text-center">
              <LogoFull className="w-32 h-32 mx-auto mb-6 opacity-90" />
              <div className="font-mono text-xs tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
                CRYPTOGRAPHIC PROOF GENERATION
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full py-16 text-center" style={{ backgroundColor: "#F5F2EA" }}>
        <button
          className="font-sans font-medium text-base px-10 py-4 rounded transition-colors text-white"
          style={{ backgroundColor: "#4A2545" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "#7A4A72"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "#4A2545"}
          onClick={onStartDemo}
        >
          Start Demo →
        </button>
      </section>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar() {
  return (
    <div
      className="p-6"
      style={{ backgroundColor: "#FFFDF8", border: "1px solid #D8D2C2", position: "sticky", top: "5rem" }}
    >
      <h3 className="font-serif text-base font-semibold mb-4" style={{ color: "#1C1A17" }}>About VCARI</h3>
      <p
        className="font-sans text-sm leading-relaxed mb-4 pb-4"
        style={{ color: "#55504A", borderBottom: "1px solid #D8D2C2" }}
      >
        VCARI allows regulated organizations to prove compliance without revealing confidential operational data.
      </p>

      {[
        { title: "Industry",     content: "🏥 Biomedical" },
        { title: "Proof System", content: "Groth16" },
        { title: "Circuit",      content: "Circom" },
        { title: "Curve",        content: "BLS12-381" },
      ].map((s, i, arr) => (
        <div
          key={s.title}
          className="mb-4 pb-4"
          style={{ borderBottom: "1px solid #D8D2C2" }}
        >
          <div className="text-xs font-mono font-semibold uppercase tracking-widest mb-1" style={{ color: "#8C8579" }}>{s.title}</div>
          <p className="font-sans text-sm" style={{ color: "#55504A" }}>{s.content}</p>
        </div>
      ))}

      {/* Blockchain with Stellar logo */}
      <div className="mb-4 pb-4" style={{ borderBottom: "1px solid #D8D2C2" }}>
        <div className="text-xs font-mono font-semibold uppercase tracking-widest mb-1" style={{ color: "#8C8579" }}>Blockchain</div>
        <div className="flex items-center gap-2">
          <StellarLogo className="w-4 h-4" />
          <p className="font-sans text-sm" style={{ color: "#55504A", margin: 0 }}>Stellar Testnet</p>
        </div>
      </div>

      <div className="mb-4 pb-4" style={{ borderBottom: "1px solid #D8D2C2" }}>
        <div className="text-xs font-mono font-semibold uppercase tracking-widest mb-2" style={{ color: "#8C8579" }}>Compliance Rules</div>
        <ul className="space-y-1">
          {["Calibration Interval", "Preventive Maintenance", "Documentation Complete"].map((r) => (
            <li key={r} className="font-sans text-sm pl-4 relative" style={{ color: "#55504A" }}>
              <span className="absolute left-0" style={{ color: "#4A2545" }}>—</span>
              {r}
            </li>
          ))}
        </ul>
        <p className="font-mono text-xs mt-3 leading-relaxed" style={{ color: "#8C8579" }}>
          <span style={{ color: "#4A2545", fontWeight: 600 }}>Note:</span> The calibration threshold (<code>max_allowed_days</code>) is a private input in this prototype. In production it should be a public input or hardcoded in the circuit so auditors can independently verify the enforced threshold.
        </p>
      </div>

      <div>
        <div className="text-xs font-mono font-semibold uppercase tracking-widest mb-2" style={{ color: "#8C8579" }}>Powered by</div>
        <ul className="space-y-1">
          {[
            { label: "Circom",          icon: null },
            { label: "Groth16",         icon: null },
            { label: "Stellar Soroban", icon: "stellar" },
          ].map((p) => (
            <li key={p.label} className="font-sans text-sm flex items-center gap-2" style={{ color: "#55504A" }}>
              {p.icon === "stellar"
                ? <StellarLogo className="w-3.5 h-3.5" />
                : <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: "#4A2545" }} />
              }
              {p.label}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 font-sans text-xs italic leading-relaxed" style={{ color: "#8C8579" }}>
        Compliance evaluation runs locally in this demo. The proof is then submitted for verification on Stellar Testnet.
      </p>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeView, setActiveView]     = useState("demo");
  const [demoStarted, setDemoStarted]   = useState(false);
  const [currentStep, setCurrentStep]   = useState(1);

  const [equipmentId, setEquipmentId]                   = useState("MRI-001");
  const [lastCalibration, setLastCalibration]           = useState("120");
  const [maxAllowed, setMaxAllowed]                     = useState("180");
  const [maintenanceStatus, setMaintenanceStatus]       = useState("Completed");
  const [documentationStatus, setDocumentationStatus]   = useState("Complete");

  const [evaluated, setEvaluated]       = useState(false);
  const [rulesVisible, setRulesVisible] = useState([false, false, false]);
  const [showBadge, setShowBadge]       = useState(false);

  const [proofData, setProofData]       = useState(INITIAL_PROOF);
  const [proofProgress, setProofProgress] = useState(0);
  const [proofStatus, setProofStatus]   = useState("");
  const [proofReady, setProofReady]     = useState(false);

  const [configOpen, setConfigOpen]     = useState(false);
  const [contractId, setContractId]     = useState(DEFAULTS.contractId);
  const [rpcUrl, setRpcUrl]             = useState(DEFAULTS.rpcUrl);
  const [networkPassphrase, setNetworkPassphrase] = useState(DEFAULTS.networkPassphrase);
  const [sourceSecret, setSourceSecret] = useState(DEFAULTS.sourceSecret);
  const [sourcePublicKeyInput, setSourcePublicKeyInput] = useState(DEFAULTS.sourcePublicKey);
  const [useInvalidProof, setUseInvalidProof] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const [verifyBusy, setVerifyBusy]     = useState(false);
  const [verifyError, setVerifyError]   = useState("");
  const [verifyDone, setVerifyDone]     = useState(false);
  const [sourcePublicKeyDisplay, setSourcePublicKeyDisplay] = useState("");

  const progressTimer = useRef(null);

  const calRule    = parseInt(lastCalibration, 10) <= parseInt(maxAllowed, 10);
  const maintRule  = maintenanceStatus === "Completed";
  const docRule    = documentationStatus === "Complete";
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
    setActiveView("demo");
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

  function handleNav(view) { setActiveView(view); }

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
        setRulesVisible((prev) => { const next = [...prev]; next[i] = true; return next; });
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
      { end: 25,  label: "Loading compliance circuit proof..." },
      { end: 60,  label: "Parsing Groth16 proof elements..." },
      { end: 90,  label: "Encoding for Soroban contract..." },
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
        if (pct >= (i === 0 ? 0 : phases[i - 1].end)) { currentLabel = phases[i].label; break; }
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
    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, []);

  // Sync proofData when the invalid-proof toggle changes (only after proof is ready).
  useEffect(() => {
    if (!proofReady) return;
    if (useInvalidProof) {
      setProofData({ hex: PROOF_HEX_NONCOMPLIANT, public: PUBLIC_HEX_NONCOMPLIANT });
    } else {
      setProofData({ hex: PROOF_HEX, public: PUBLIC_HEX });
    }
  }, [useInvalidProof, proofReady]);

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyBusy(true);
    setVerifyError("");
    // Compute hex inline to avoid stale closure over proofData state.
    const hexToUse    = useInvalidProof ? PROOF_HEX_NONCOMPLIANT : PROOF_HEX;
    const publicToUse = useInvalidProof ? PUBLIC_HEX_NONCOMPLIANT : PUBLIC_HEX;
    console.log("proofHex being sent:", hexToUse.slice(0, 20));
    console.log("useInvalidProof:", useInvalidProof);
    try {
      const result = await verifyProofOnSoroban({
        rpcUrl, networkPassphrase, contractId, sourceSecret,
        sourcePublicKey: sourcePublicKeyInput,
        proofHex: hexToUse,
        publicHex: publicToUse,
      });
      setSourcePublicKeyDisplay(result.sourcePublicKey);
      setVerifyResult(result.verified);
      setVerifyDone(true);
      setCurrentStep(5);
    } catch (err) {
      const msg = err.message || String(err);
      // A malformed/invalid proof causes the contract to throw rather than return false.
      // Treat these as a proof rejection (verifyResult = false) rather than a network error.
      const isProofRejection =
        msg.includes("InvalidInput") ||
        msg.includes("MalformedProof") ||
        msg.includes("Crypto") ||
        msg.includes("Error(Contract, #3)") ||
        msg.includes("Error(Contract, #4)");
      if (isProofRejection) {
        setVerifyResult(false);
        setVerifyDone(true);
        setCurrentStep(5);
      } else {
        setVerifyError(msg);
      }
    } finally {
      setVerifyBusy(false);
    }
  }

  function goToStep(step) {
    if (step <= currentStep) setCurrentStep(step);
  }

  // ── Shared styles ──
  const inputStyle = {
    width: "100%",
    border: "1px solid #D8D2C2",
    borderRadius: "3px",
    backgroundColor: "#F5F2EA",
    color: "#1C1A17",
    padding: "0.625rem 0.75rem",
    fontSize: "0.875rem",
    fontFamily: '"IBM Plex Sans", sans-serif',
    outline: "none",
  };

  const labelStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "#55504A",
    fontFamily: '"IBM Plex Sans", sans-serif',
  };

  const btnPrimary = {
    backgroundColor: "#4A2545",
    color: "#FFFDF8",
    border: "none",
    borderRadius: "3px",
    fontWeight: 600,
    fontSize: "0.875rem",
    fontFamily: '"IBM Plex Sans", sans-serif',
    padding: "0.75rem 1.25rem",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  const panelStyle = {
    backgroundColor: "#FFFDF8",
    border: "1px solid #D8D2C2",
    borderTop: "none",
    padding: "1.75rem 1.5rem",
    marginBottom: "1.5rem",
  };

  // ── Steps ──────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div style={panelStyle}>
      <div style={{ marginBottom: "1.4rem" }}>
        <h2 className="font-serif" style={{ fontSize: "1.3rem", fontWeight: 600, color: "#1C1A17", margin: "0 0 0.3rem" }}>
          🔒 Private Operational Records
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#8C8579", margin: 0 }}>
          These values are evaluated locally and never transmitted.
        </p>
      </div>

      <form onSubmit={handleEvaluate}>
        <div style={{ display: "grid", gap: "1rem", marginBottom: "1.25rem" }}>
          <label style={labelStyle}>
            Equipment ID
            <input style={inputStyle} value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label style={labelStyle}>
              Last calibration (days ago)
              <input style={inputStyle} value={lastCalibration} onChange={(e) => setLastCalibration(e.target.value)} inputMode="numeric" required />
            </label>
            <label style={labelStyle}>
              Maximum allowed interval (days)
              <input style={inputStyle} value={maxAllowed} onChange={(e) => setMaxAllowed(e.target.value)} inputMode="numeric" required />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label style={labelStyle}>
              Preventive maintenance
              <select style={inputStyle} value={maintenanceStatus} onChange={(e) => setMaintenanceStatus(e.target.value)}>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
            </label>
            <label style={labelStyle}>
              Documentation
              <select style={inputStyle} value={documentationStatus} onChange={(e) => setDocumentationStatus(e.target.value)}>
                <option value="Complete">Complete</option>
                <option value="Incomplete">Incomplete</option>
              </select>
            </label>
          </div>
        </div>
        <button type="submit" style={btnPrimary}>Evaluate Compliance →</button>
      </form>
    </div>
  );

  const renderStep2 = () => (
    <div style={panelStyle}>
      <div style={{ marginBottom: "1.4rem" }}>
        <h2 className="font-serif" style={{ fontSize: "1.3rem", fontWeight: 600, color: "#1C1A17", margin: "0 0 0.3rem" }}>
          Compliance Assessment Engine
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#8C8579", margin: 0 }}>Rules evaluated locally against private inputs.</p>
      </div>

      <div style={{ display: "grid", gap: "0.6rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Calibration within allowed interval", pass: calRule,   visible: rulesVisible[0], detail: `${lastCalibration} ≤ ${maxAllowed}` },
          { label: "Preventive maintenance completed",    pass: maintRule,  visible: rulesVisible[1], detail: maintenanceStatus },
          { label: "Documentation complete",              pass: docRule,    visible: rulesVisible[2], detail: documentationStatus },
        ].map((rule, i) => (
          <div
            key={i}
            className={`rule-check${rule.visible ? " visible" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.7rem 1rem",
              borderRadius: "3px",
              borderLeft: `3px solid ${rule.visible ? (rule.pass ? "#2F6E4F" : "#8C3B2E") : "#D8D2C2"}`,
              backgroundColor: rule.visible ? (rule.pass ? "#E8EFE9" : "#F4E9E6") : "#ECE7DA",
              color: rule.visible ? (rule.pass ? "#2F6E4F" : "#8C3B2E") : "#55504A",
              fontSize: "0.875rem",
            }}
          >
            <span style={{ fontSize: "1rem", flexShrink: 0 }}>
              {rule.visible ? (rule.pass ? "✓" : "✗") : ""}
            </span>
            {rule.label}
            {rule.visible && (
              <span style={{ marginLeft: "auto", fontSize: "0.75rem" }}>{rule.detail}</span>
            )}
          </div>
        ))}
      </div>

      {showBadge && (
        <>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            padding: "1.1rem 1.25rem",
            borderRadius: "6px",
            border: `2px solid ${isCompliant ? "#2F6E4F" : "#8C3B2E"}`,
            backgroundColor: isCompliant ? "#E8EFE9" : "#F4E9E6",
            color: isCompliant ? "#2F6E4F" : "#8C3B2E",
            fontFamily: '"IBM Plex Mono", monospace',
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "0.06em",
            marginBottom: "1rem",
          }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "1.5rem",
              height: "1.5rem",
              borderRadius: "50%",
              backgroundColor: isCompliant ? "#2F6E4F" : "#8C3B2E",
              color: "white",
              fontSize: "0.85rem",
              flexShrink: 0,
            }}>
              {isCompliant ? "✓" : "✗"}
            </span>
            {isCompliant ? "COMPLIANT" : "NON-COMPLIANT"}
          </div>

          {isCompliant ? (
            <button style={btnPrimary} onClick={handlePrepareProof}>
              Prepare Proof for Verification →
            </button>
          ) : (
            <p style={{ fontSize: "0.875rem", color: "#8C8579", fontStyle: "italic", textAlign: "center", margin: 0 }}>
              Resolve the compliance issues above to continue.
            </p>
          )}
        </>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div style={panelStyle}>
      <div style={{ marginBottom: "1.4rem" }}>
        <h2 className="font-serif" style={{ fontSize: "1.3rem", fontWeight: 600, color: "#1C1A17", margin: "0 0 0.3rem" }}>
          Preparing Proof for Verification
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#8C8579", margin: 0 }}>
          This demo uses a pre-generated proof from the VCARI compliance circuit (Circom · Groth16 · BLS12-381).
        </p>
      </div>

      {!proofReady && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ width: "100%", height: "4px", backgroundColor: "#ECE7DA", borderRadius: 0, overflow: "hidden", marginBottom: "0.75rem" }}>
            <div className="progress-fill" style={{ height: "100%", backgroundColor: "#4A2545", width: `${proofProgress}%` }} />
          </div>
          <p style={{ fontSize: "0.8rem", fontFamily: '"IBM Plex Mono", monospace', color: "#55504A", margin: 0 }}>{proofStatus}</p>
        </div>
      )}

      {proofReady && (
        <>
          {/* ── Invalid proof toggle ── */}
          <div style={{ marginBottom: "1.25rem", padding: "0.875rem 1rem", backgroundColor: useInvalidProof ? "#FDF3F1" : "#F5F2EA", border: `1px solid ${useInvalidProof ? "#C9856E" : "#D8D2C2"}`, borderRadius: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <input
                id="invalid-proof-toggle"
                type="checkbox"
                checked={useInvalidProof}
                onChange={(e) => {
                  console.log("Toggle changed to:", e.target.checked);
                  setUseInvalidProof(e.target.checked);
                }}
                style={{
                  width: "1rem",
                  height: "1rem",
                  accentColor: "#8C3B2E",
                  cursor: "pointer",
                  flexShrink: 0,
                  display: "block",
                }}
              />
              <label
                htmlFor="invalid-proof-toggle"
                style={{
                  fontSize: "0.8rem",
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontWeight: 600,
                  color: useInvalidProof ? "#8C3B2E" : "#55504A",
                  cursor: "pointer",
                  userSelect: "none",
                  margin: 0,
                }}
              >
                Test invalid proof rejection
              </label>
            </div>
            {useInvalidProof === true && (
              <p style={{ margin: "0.5rem 0 0 1.625rem", fontSize: "0.75rem", fontFamily: '"IBM Plex Sans", sans-serif', color: "#8C3B2E", lineHeight: 1.5 }}>
                Using a non-compliant proof (compliant&nbsp;=&nbsp;0). The contract should return <code>false</code>, demonstrating that invalid proofs cannot pass verification.
              </p>
            )}
          </div>

          <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
            <label style={labelStyle}>
              Proof (hex)
              <textarea
                style={{ ...inputStyle, fontFamily: '"IBM Plex Mono", monospace', resize: "vertical" }}
                value={proofData.hex}
                onChange={(e) => setProofData((p) => ({ ...p, hex: e.target.value }))}
                rows={6}
              />
            </label>
            <label style={labelStyle}>
              Public signals (hex)
              <textarea
                style={{ ...inputStyle, fontFamily: '"IBM Plex Mono", monospace', resize: "vertical" }}
                value={proofData.public}
                onChange={(e) => setProofData((p) => ({ ...p, public: e.target.value }))}
                rows={3}
              />
            </label>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#8C8579", margin: "0 0 1rem", fontStyle: "italic" }}>
            Proof generated by the VCARI compliance circuit. Edit to test invalid proof rejection.
          </p>
          <button style={btnPrimary} onClick={() => setCurrentStep(4)}>Submit to Stellar →</button>
        </>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div style={panelStyle}>
      <div style={{ marginBottom: "1.4rem" }}>
        <h2 className="font-serif" style={{ fontSize: "1.3rem", fontWeight: 600, color: "#1C1A17", margin: "0 0 0.3rem" }}>
          Soroban Smart Contract Verification
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#8C8579", margin: 0 }}>
          Submitting proof to the VCARI verifier contract on Stellar Testnet.
        </p>
      </div>

      <button
        style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem", fontFamily: '"IBM Plex Mono", monospace', color: "#55504A", cursor: "pointer", padding: "0.5rem 0", border: "none", background: "none", marginBottom: "1rem" }}
        onClick={() => setConfigOpen(!configOpen)}
      >
        {configOpen ? "▼" : "▶"} Contract Configuration
      </button>

      {configOpen && (
        <div style={{ display: "grid", gap: "1rem", padding: "1rem", marginBottom: "1rem", backgroundColor: "#F5F2EA", border: "1px solid #D8D2C2", borderRadius: "3px" }}>
          {[
            { label: "Contract ID",                  value: contractId,          setter: setContractId,          type: "text" },
            { label: "RPC URL",                      value: rpcUrl,              setter: setRpcUrl,              type: "text" },
            { label: "Network passphrase",           value: networkPassphrase,   setter: setNetworkPassphrase,   type: "text" },
            { label: "Source secret key (optional)", value: sourceSecret,        setter: setSourceSecret,        type: "password" },
            { label: "Source public key (optional)", value: sourcePublicKeyInput, setter: setSourcePublicKeyInput, type: "text" },
          ].map((f) => (
            <label key={f.label} style={labelStyle}>
              {f.label}
              <input style={inputStyle} type={f.type} value={f.value} onChange={(e) => f.setter(e.target.value)} />
            </label>
          ))}
        </div>
      )}

      {verifyError && (
        <div style={{ fontSize: "0.8rem", color: "#8C3B2E", margin: "0.5rem 0", padding: "0.5rem 0.75rem", backgroundColor: "#F4E9E6", borderRadius: "3px" }}>
          {verifyError}
        </div>
      )}

      <button
        style={{ ...btnPrimary, opacity: verifyBusy ? 0.5 : 1, cursor: verifyBusy ? "not-allowed" : "pointer" }}
        disabled={verifyBusy}
        onClick={handleVerify}
      >
        {verifyBusy ? (
          <><span className="spinner" /> Submitting to Stellar Testnet...</>
        ) : (
          "Verify On-Chain →"
        )}
      </button>
    </div>
  );

  const renderStep5 = () => {
    const isVerified = verifyResult === true;

    // ── Rejection screen (non-compliant proof returned false) ──
    if (!isVerified) {
      return (
        <div style={panelStyle}>
          <div style={{ marginBottom: "1.4rem" }}>
            <h2 className="font-serif" style={{ fontSize: "1.3rem", fontWeight: 600, color: "#8C3B2E", margin: "0 0 0.3rem" }}>
              Proof Rejected ✗
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#8C8579", margin: 0 }}>
              The contract correctly rejected the non-compliant proof
            </p>
          </div>

          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {[
              { label: "Network",         value: "Stellar Testnet",                                        red: false },
              { label: "Contract",        value: `${contractId.slice(0, 12)}...${contractId.slice(-8)}`,   red: false },
              { label: "On-chain result", value: "false",                                                  red: true  },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.625rem 0.75rem", backgroundColor: "#ECE7DA", borderRadius: "3px", fontSize: "0.8rem", fontFamily: '"IBM Plex Mono", monospace' }}>
                <span style={{ color: "#8C8579" }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: item.red ? "#8C3B2E" : "#1C1A17" }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", padding: "1.4rem", backgroundColor: "#F4E9E6", border: "2px solid #8C3B2E", color: "#8C3B2E", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', fontSize: "0.95rem", letterSpacing: "0.02em", marginBottom: "0.75rem" }}>
            Non-compliant proof rejected by Soroban verifier
          </div>

          <p style={{ fontSize: "0.75rem", color: "#8C8579", fontStyle: "italic", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
            This demonstrates that the ZK verifier cannot be fooled — only valid compliance proofs pass on-chain verification.
          </p>

          <button
            style={{ backgroundColor: "#FFFDF8", color: "#1C1A17", border: "1px solid #D8D2C2", borderRadius: "3px", fontWeight: 600, fontSize: "0.875rem", fontFamily: '"IBM Plex Sans", sans-serif', padding: "0.75rem 1.25rem", cursor: "pointer" }}
            onClick={resetDemo}
          >
            Verify Another Equipment
          </button>
        </div>
      );
    }

    // ── Success screen ──
    return (
      <div style={panelStyle}>
        <div style={{ marginBottom: "1.4rem" }}>
          <h2 className="font-serif" style={{ fontSize: "1.3rem", fontWeight: 600, color: "#1C1A17", margin: "0 0 0.3rem" }}>
            Compliance Verified ✓
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#8C8579", margin: 0 }}>without exposing private operational records</p>
        </div>

        <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Network",         value: "Stellar Testnet",                                        highlight: false },
            { label: "Contract",        value: `${contractId.slice(0, 12)}...${contractId.slice(-8)}`,   highlight: false },
            { label: "On-chain result", value: "true",                                                   highlight: true  },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.625rem 0.75rem", backgroundColor: "#ECE7DA", borderRadius: "3px", fontSize: "0.8rem", fontFamily: '"IBM Plex Mono", monospace' }}>
              <span style={{ color: "#8C8579" }}>{item.label}</span>
              <span style={{ fontWeight: 600, color: item.highlight ? "#2F6E4F" : "#1C1A17" }}>{item.value}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "1.4rem", backgroundColor: "#E8EFE9", border: "2px solid #2F6E4F", color: "#2F6E4F", fontWeight: 700, fontFamily: '"IBM Plex Mono", monospace', fontSize: "0.95rem", letterSpacing: "0.02em", marginBottom: "1.25rem" }}>
          Zero-Knowledge Proof verified on Stellar Soroban
        </div>

        <button
          style={{ backgroundColor: "#FFFDF8", color: "#1C1A17", border: "1px solid #D8D2C2", borderRadius: "3px", fontWeight: 600, fontSize: "0.875rem", fontFamily: '"IBM Plex Sans", sans-serif', padding: "0.75rem 1.25rem", cursor: "pointer" }}
          onClick={resetDemo}
        >
          Verify Another Equipment
        </button>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return !evaluated ? renderStep1() : renderStep2();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  // ── Progress tabs ─────────────────────────────────────────────────────────
  const renderProgress = () => (
    <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #D8D2C2", flexWrap: "wrap" }}>
      {STEP_LABELS.map((label, i) => {
        const stepNum     = i + 1;
        const isActive    = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <button
            key={i}
            onClick={() => goToStep(stepNum)}
            disabled={stepNum > currentStep}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.75rem",
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 500,
              color: isActive ? "#4A2545" : isCompleted ? "#2F6E4F" : "#8C8579",
              padding: "0.6rem 0.85rem",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${isActive ? "#4A2545" : "transparent"}`,
              marginBottom: "-1px",
              cursor: stepNum <= currentStep ? "pointer" : "default",
            }}
          >
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "1.2rem",
              height: "1.2rem",
              borderRadius: "2px",
              fontSize: "0.65rem",
              fontWeight: 700,
              backgroundColor: isActive ? "#4A2545" : isCompleted ? "#2F6E4F" : "#ECE7DA",
              color: isActive || isCompleted ? "#FFFDF8" : "#8C8579",
              flexShrink: 0,
            }}>
              {isCompleted ? "✓" : stepNum}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );

  // ── Footer ────────────────────────────────────────────────────────────────
  function Footer() {
    return (
      <footer style={{ backgroundColor: "#1C1A17", color: "#FFFDF8", padding: "2.5rem 0", borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "4rem" }}>
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <LogoMark className="w-6 h-6" style={{ filter: "brightness(0) invert(1)" }} />
            <span className="font-serif text-lg tracking-widest">VCARI</span>
          </div>
          <div className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            © {new Date().getFullYear()} VCARI Protocol. All rights reserved.
          </div>
          <div className="flex items-center gap-2 font-mono text-xs" style={{ color: "#2F6E4F" }}>
            <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ backgroundColor: "#2F6E4F" }} />
            SYSTEM STATUS: OPERATIONAL
          </div>
        </div>
      </footer>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F2EA", color: "#1C1A17" }}>
      <Navbar activeView={activeView} onNav={handleNav} />

      {activeView === "how-it-works" && (
        <HowItWorks onStartDemo={startDemo} />
      )}

      {activeView === "demo" && !demoStarted && (
        <Hero onStartDemo={startDemo} onHowItWorks={() => handleNav("how-it-works")} />
      )}

      {activeView === "demo" && demoStarted && (
        <div className="max-w-7xl mx-auto px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
            <div className="min-w-0">
              {renderProgress()}
              {renderStepContent()}
            </div>
            <div className="min-w-0">
              <Sidebar />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
