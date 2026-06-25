import * as StellarSdk from "@stellar/stellar-sdk";
import { hexToBytes } from "./snarkHex.js";

function readOnlyResultToBool(retval) {
  if (!retval) {
    throw new Error("No return value from simulation");
  }

  const scVal =
    typeof retval === "string" ? StellarSdk.xdr.ScVal.fromXDR(retval, "base64") : retval;

  if (typeof StellarSdk.scValToNative === "function") {
    return Boolean(StellarSdk.scValToNative(scVal));
  }

  if (scVal.switch().name === "scvBool") {
    return scVal.b();
  }

  throw new Error("Unexpected return type from contract");
}

export async function verifyProofOnSoroban({
  rpcUrl,
  networkPassphrase,
  contractId,
  sourceSecret,
  sourcePublicKey,
  proofHex,
  publicHex,
}) {
  const rpcNamespace = StellarSdk.SorobanRpc || StellarSdk.rpc;
  if (!rpcNamespace?.Server) {
    throw new Error("Soroban RPC SDK is unavailable in this build");
  }

  const server = new rpcNamespace.Server(rpcUrl, {
    allowHttp: rpcUrl.startsWith("http://"),
  });

  const trimmedSecret = (sourceSecret || "").trim();
  const trimmedPublic = (sourcePublicKey || "").trim();
  const looksLikePlaceholder = trimmedSecret.includes("REPLACE_WITH");

  let resolvedPublicKey = "";
  if (trimmedSecret && !looksLikePlaceholder) {
    try {
      resolvedPublicKey = StellarSdk.Keypair.fromSecret(trimmedSecret).publicKey();
    } catch {
      if (!trimmedPublic) {
        throw new Error(
          "Source secret key is invalid. Provide a valid testnet secret (SB...) or leave secret blank and set source public key (GD...)."
        );
      }
    }
  }

  if (!resolvedPublicKey) {
    if (!trimmedPublic) {
      throw new Error("Provide a source secret key (SB...) or source public key (GD...).");
    }
    try {
      StellarSdk.Keypair.fromPublicKey(trimmedPublic);
    } catch {
      throw new Error("Source public key is invalid. Use a valid GD... key.");
    }
    resolvedPublicKey = trimmedPublic;
  }

  const account = await server.getAccount(resolvedPublicKey);

  const op = StellarSdk.Operation.invokeContractFunction({
    contract: contractId.trim(),
    function: "verify",
    args: [
      StellarSdk.xdr.ScVal.scvBytes(hexToBytes(proofHex)),
      StellarSdk.xdr.ScVal.scvBytes(hexToBytes(publicHex)),
    ],
  });

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);

  if (rpcNamespace.Api?.isSimulationError?.(simulation) || simulation.error) {
    const err = simulation.error || simulation;
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }

  const result = simulation.result?.retval;
  const verified = readOnlyResultToBool(result);

  return {
    verified,
    sourcePublicKey: resolvedPublicKey,
  };
}
