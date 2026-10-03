import express from "express";
import http from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// ---------------------------------------------------------------------------
// Seed Data: Test User & Initial Workspaces & CKB Files
// ---------------------------------------------------------------------------

const TEST_USER = {
  id: "user-1",
  name: "Ada",
  email: "developer@corven.dev",
  walletAddress: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqwgx292hnvmn68xf779vmzrshpmm6epn4c0cgwga",
  role: "USER",
  authProvider: "CKB_WALLET",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function generateAccessToken(userId: string = TEST_USER.id): string {
  const encode = (val: object) => Buffer.from(JSON.stringify(val)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600; // 7 days
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, exp })}.corven_token`;
}

const TEMPLATES = [
  {
    id: "hello-world",
    name: "Hello World Contract",
    description: "A minimal Nervos CKB smart contract in Rust that validates cell data.",
    contracts: ["hello-world"],
  },
  {
    id: "xudt",
    name: "Token (xUDT)",
    description: "Extensible User Defined Token implementation for Nervos CKB.",
    contracts: ["xudt"],
  },
  {
    id: "spore",
    name: "Spore Digital Object",
    description: "On-chain digital objects and NFT standard for Nervos CKB.",
    contracts: ["spore"],
  },
];

interface WorkspaceFileRecord {
  path: string;
  name: string;
  type: "file" | "directory";
  content?: string;
  size?: number;
}

const DEFAULT_WORKSPACE_FILES: Record<string, WorkspaceFileRecord[]> = {
  "ws-default": [
    {
      path: "contracts",
      name: "contracts",
      type: "directory",
    },
    {
      path: "contracts/hello-world",
      name: "hello-world",
      type: "directory",
    },
    {
      path: "contracts/hello-world/Cargo.toml",
      name: "Cargo.toml",
      type: "file",
      content: `[package]
name = "hello-world"
version = "0.1.0"
edition = "2021"

[dependencies]
ckb-std = "0.15.2"

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
panic = "abort"
`,
    },
    {
      path: "contracts/hello-world/src",
      name: "src",
      type: "directory",
    },
    {
      path: "contracts/hello-world/src/main.rs",
      name: "main.rs",
      type: "file",
      content: `//! Hello World smart contract for Nervos CKB
#![no_std]
#![no_main]

use ckb_std::{
    default_alloc,
    entry,
    error::SysError,
    high_level::{load_script, load_tx_hash},
    ckb_constants::Source,
};

default_alloc!();

#[entry]
fn main() -> Result<(), SysError> {
    // Read the script that is executing
    let script = load_script()?;
    let _args: &[u8] = script.args().as_slice();

    // Verify cell conditions
    let tx_hash = load_tx_hash()?;
    ckb_std::debug!("Executing hello-world contract in Tx: {:?}", tx_hash);

    Ok(())
}
`,
    },
    {
      path: "schemas",
      name: "schemas",
      type: "directory",
    },
    {
      path: "schemas/blockchain.mol",
      name: "blockchain.mol",
      type: "file",
      content: `// Molecule serialization schema for CKB contract data
vector Byte <byte>;
vector Bytes <Byte>;

table HelloRecord {
    version: byte,
    author: Bytes,
    message: Bytes,
    created_at: Uint64,
}
`,
    },
    {
      path: "tests",
      name: "tests",
      type: "directory",
    },
    {
      path: "tests/Cargo.toml",
      name: "Cargo.toml",
      type: "file",
      content: `[package]
name = "tests"
version = "0.1.0"
edition = "2021"

[dev-dependencies]
ckb-testtool = "0.6.0"
ckb-types = "0.118.0"
`,
    },
    {
      path: "tests/src",
      name: "src",
      type: "directory",
    },
    {
      path: "tests/src/tests.rs",
      name: "tests.rs",
      type: "file",
      content: `use ckb_testtool::context::Context;
use ckb_types::{
    bytes::Bytes,
    core::TransactionBuilder,
    packed::*,
    prelude::*,
};

#[test]
fn test_hello_world_success() {
    let mut context = Context::default();
    let contract_bin: Bytes = Loader::default().load_binary("hello-world");
    let out_point = context.deploy_cell(contract_bin);

    let lock_script = context
        .build_script(&out_point, Default::default())
        .expect("script");

    let input_out_point = context.create_cell(
        CellOutput::new_builder()
            .capacity(1000u64.pack())
            .lock(lock_script.clone())
            .build(),
        Bytes::new(),
    );

    let tx = TransactionBuilder::default()
        .input(CellInput::new_builder().previous_output(input_out_point).build())
        .build();

    let cycles = context.verify_tx(&tx, 10_000_000).expect("pass verification");
    println!("Consumed cycles: {}", cycles);
}
`,
    },
    {
      path: "capsule.toml",
      name: "capsule.toml",
      type: "file",
      content: `[rust]
workspace_dir = "."
contracts = ["contracts/hello-world"]
`,
    },
    {
      path: "frontend",
      name: "frontend",
      type: "directory",
    },
    {
      path: "frontend/index.html",
      name: "index.html",
      type: "file",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Corven DApp Frontend</title>
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">LIVE FRONTEND</div>
      <h1>CKB Contract Web Client</h1>
      <p>Interactive frontend application connected to your local CKB Devnet node & Fiber services.</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="label">Devnet Status</span>
        <span class="value online">Online (24ms)</span>
      </div>
      <div class="stat-card">
        <span class="label">Local Balance</span>
        <span class="value" id="wallet-balance">2,500.00 CKB</span>
      </div>
    </div>

    <div class="action-box">
      <button id="btn-interact" class="btn primary">Call hello-world Contract</button>
      <button id="btn-faucet" class="btn secondary">Claim 500 CKB Faucet</button>
    </div>

    <div class="terminal-log" id="console-output">
      [00:00:00] Frontend loaded. Ready to interact with CKB contracts.
    </div>
  </div>

  <script src="./app.js"></script>
</body>
</html>`,
    },
    {
      path: "frontend/style.css",
      name: "style.css",
      type: "file",
      content: `body {
  margin: 0;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #101419;
  color: #e0e2ea;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  box-sizing: border-box;
}

.card {
  max-width: 580px;
  width: 100%;
  background: #1c2025;
  border: 1px solid #3c4a42;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  background: rgba(78, 222, 163, 0.1);
  border: 1px solid rgba(78, 222, 163, 0.3);
  color: #4edea3;
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

h1 {
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
  color: #e0e2ea;
}

p {
  margin: 0 0 1.5rem;
  font-size: 0.85rem;
  color: #bbcabf;
  line-height: 1.5;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: #181c21;
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid #31353b;
}

.stat-card .label {
  display: block;
  font-size: 0.75rem;
  color: #86948a;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  font-family: monospace;
}

.stat-card .value {
  font-size: 1.1rem;
  font-weight: bold;
  font-family: monospace;
  color: #4cd7f6;
}

.stat-card .value.online {
  color: #4edea3;
}

.action-box {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.9;
}

.btn.primary {
  background: #4edea3;
  color: #003824;
}

.btn.secondary {
  background: #262a30;
  color: #e0e2ea;
  border: 1px solid #3c4a42;
}

.terminal-log {
  background: #0a0e13;
  border: 1px solid #31353b;
  border-radius: 8px;
  padding: 0.85rem;
  font-family: monospace;
  font-size: 0.75rem;
  color: #bbcabf;
  line-height: 1.6;
  max-height: 120px;
  overflow-y: auto;
}`,
    },
    {
      path: "frontend/app.js",
      name: "app.js",
      type: "file",
      content: `// Corven Frontend Client
let currentBalance = 2500;

function logMessage(msg) {
  const time = new Date().toLocaleTimeString();
  const output = document.getElementById("console-output");
  if (output) {
    output.innerText += \`\\n[\${time}] \${msg}\`;
    output.scrollTop = output.scrollHeight;
  }
  console.log(msg);
}

document.getElementById("btn-interact")?.addEventListener("click", () => {
  logMessage("Calling smart contract via CKB RPC...");
  setTimeout(() => {
    logMessage("Tx verification passed! Cycles consumed: 8,420.");
  }, 400);
});

document.getElementById("btn-faucet")?.addEventListener("click", () => {
  currentBalance += 500;
  const balanceEl = document.getElementById("wallet-balance");
  if (balanceEl) balanceEl.innerText = \`\${currentBalance.toLocaleString()}.00 CKB\`;
  logMessage("Claimed 500 CKB from local Devnet faucet.");
});
`,
    },
    {
      path: "README.md",
      name: "README.md",
      type: "file",
      content: `# CKB Smart Contract Workspace

Welcome to your Corven CKB RISC-V workspace!

## Features
- **Contract Source:** \`contracts/hello-world/src/main.rs\`
- **Molecule Schema:** \`schemas/blockchain.mol\`
- **Integration Tests:** \`tests/src/tests.rs\`

Click **Build** to compile your contract, **Test** to run tests, and **Deploy** to publish to your private devnet.
`,
    },
  ],
};

let workspaces: any[] = [
  {
    id: "ws-default",
    name: "My First CKB Contract",
    status: "RUNNING",
    userId: TEST_USER.id,
    templateId: "hello-world",
    runtimeNetwork: "corven-net-default",
    runtimeVolume: "corven-vol-default",
    lastStartedAt: new Date().toISOString(),
    lastStoppedAt: null,
    lastActivityAt: new Date().toISOString(),
    provisionStage: null,
    provisionError: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let workspaceFiles: Record<string, WorkspaceFileRecord[]> = {
  ...DEFAULT_WORKSPACE_FILES,
};

// ---------------------------------------------------------------------------
// Devnet & Community & Debugger State
// ---------------------------------------------------------------------------

let devnetBlocks: any[] = [
  {
    number: 14892,
    hash: "0x8fa12c9034b120efcd432a901832049182309481203948120938410293840192",
    transactions: 3,
    timestamp: Date.now() - 4000,
    miner: TEST_USER.walletAddress,
  },
  {
    number: 14891,
    hash: "0x3918401928340192834019283401928340192834019283401928340192834019",
    transactions: 1,
    timestamp: Date.now() - 19000,
    miner: TEST_USER.walletAddress,
  },
  {
    number: 14890,
    hash: "0x7721094812039481203948120394812039481203948120394812039481203948",
    transactions: 2,
    timestamp: Date.now() - 38000,
    miner: TEST_USER.walletAddress,
  },
];

let communityPosts: any[] = [
  {
    id: "post-1",
    kind: "NEWS",
    title: "Corven IDE v1.2 Released with RISC-V CKB Compiler & Devnet Debugger",
    body: "We are thrilled to announce Corven IDE v1.2! This release introduces integrated in-browser CKB terminal sessions, Molecule schema code generation, and single-click devnet contract verification.",
    status: "DONE",
    pinned: true,
    voteCount: 42,
    votedByMe: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    author: { id: "user-admin", name: "Corven Core Team", walletAddress: null, isAdmin: true },
    comments: [
      {
        id: "c-1",
        body: "The devnet transaction replay feature saves so much debugging time. Amazing work!",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        author: { id: "user-2", name: "SatoshiCKB", walletAddress: "ckt1q...839f", isAdmin: false },
      },
    ],
  },
  {
    id: "post-2",
    kind: "PROPOSAL",
    title: "Support for custom RISC-V compiler target optimization flags",
    body: "Proposal to allow developers to configure `-C opt-level=s` or `-C target-feature=+a` directly in the Workspace Build Settings panel.",
    status: "PLANNED",
    pinned: false,
    voteCount: 19,
    votedByMe: false,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    author: { id: TEST_USER.id, name: TEST_USER.name, walletAddress: TEST_USER.walletAddress, isAdmin: false },
    comments: [],
  },
];

let recentDebugTransactions = [
  {
    txHash: "0x89fc3218de902bf8912cdfa1098234ea01923847bcda89127394812903847120",
    recordedAt: new Date(Date.now() - 120000).toISOString(),
    status: "committed",
  },
  {
    txHash: "0x3312984abce91028374981729384719283749182374981273948172938471928",
    recordedAt: new Date(Date.now() - 600000).toISOString(),
    status: "committed",
  },
];

let workspaceDeployments: any[] = [
  {
    id: "dep-1",
    workspaceId: "ws-default",
    network: "DEVNET",
    contractName: "hello-world",
    txHash: "0x89fc3218de902bf8912cdfa1098234ea01923847bcda89127394812903847120",
    outputIndex: 0,
    codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    hashType: "type",
    typeId: null,
    typeArgs: null,
    dataHash: "0x321f8a892bce901...321",
    sizeBytes: 32768,
    capacity: "10000000000",
    deployerAddress: TEST_USER.walletAddress,
    upgradeOfId: null,
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Node Simulator State
// ---------------------------------------------------------------------------

let nodeStatus: "Operational" | "Restarting" | "Resetting" | "Synchronizing" = "Operational";
let blockHeight = 14892;
let peers: any[] = [];

let nodeLogs = [
  `[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] INFO: CKB Node service initialized (v0.118.0)`,
  `[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] INFO: RPC endpoint listening on port 8114`,
  `[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] INFO: P2P network stack online. Awaiting peer connections.`,
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function formatRuntimeStatus(workspace: any) {
  return {
    workspaceId: workspace.id,
    name: workspace.name,
    status: workspace.status,
    provisionStage: workspace.provisionStage,
    provisionError: workspace.provisionError,
    lastStartedAt: workspace.lastStartedAt,
    lastStoppedAt: workspace.lastStoppedAt,
    lastActivityAt: workspace.lastActivityAt,
    filesAvailable: true,
    idleTimeoutMinutes: 60,
    devnetMode: "lazy",
    hostId: "corven-local-runner",
    hostOnline: true,
    containers: [
      {
        id: `c-ide-${workspace.id}`,
        containerId: `docker-${workspace.id}-ide`,
        name: `${workspace.name}-ide`,
        image: "corvenide/rust-riscv-ckb:latest",
        type: "IDE",
        status: workspace.status === "RUNNING" ? "RUNNING" : "STOPPED",
        dockerState: workspace.status === "RUNNING" ? "running" : "exited",
        dockerStatus: workspace.status === "RUNNING" ? "Up 2 hours" : "Exited (0)",
        internalPort: 8000,
        hostPort: 8000,
      },
      {
        id: `c-node-${workspace.id}`,
        containerId: `docker-${workspace.id}-ckb`,
        name: `${workspace.name}-ckb`,
        image: "nervos/ckb:v0.118.0",
        type: "CKB_NODE",
        status: workspace.status === "RUNNING" ? "RUNNING" : "STOPPED",
        dockerState: workspace.status === "RUNNING" ? "running" : "exited",
        dockerStatus: workspace.status === "RUNNING" ? "Up 2 hours" : "Exited (0)",
        internalPort: 8114,
        hostPort: 8114,
      },
    ],
  };
}

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// ---------------------------------------------------------------------------
// Server Initialization
// ---------------------------------------------------------------------------

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  app.use(express.json({ limit: "25mb" }));

  // CORS headers - Fully compliant with AI Studio Preview and browser credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      // Must return the specific origin when credentials are included
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    } else {
      res.header("Access-Control-Allow-Origin", "*");
    }

    res.header(
      "Access-Control-Allow-Headers",
      (req.headers["access-control-request-headers"] as string) ||
      "Authorization, Content-Type, Accept, X-Requested-With, Origin, Range, Cache-Control, Pragma, X-Client-Version, baggage, sentry-trace, x-api-key, x-workspace-id"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
    res.header("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Type, Authorization, X-Total-Count");
    res.header("Access-Control-Max-Age", "86400");
    res.header("Access-Control-Allow-Private-Network", "true");
    res.header("Vary", "Origin, Access-Control-Request-Headers");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  });

  app.options("*", (_req, res) => {
    res.status(204).end();
  });

  // Diagnostic endpoint to test CORS connectivity from Gemini Studio Preview
  app.get("/api/cors-check", (req, res) => {
    const origin = (req.headers.origin as string) || null;
    res.json({
      success: true,
      origin,
      host: req.headers.host || null,
      isAiStudioPreview:
        origin?.includes("run.app") ||
        origin?.includes("googleusercontent.com") ||
        origin?.includes("aistudio") ||
        false,
      credentialsAllowed: true,
      allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
      serverTime: new Date().toISOString(),
    });
  });

  // Background tick for node uptime
  // No fake mock blocks: blocks are only recorded when transactions or devnet operations occur

  // -------------------------------------------------------------------------
  // Auth Endpoints
  // -------------------------------------------------------------------------

  app.post("/api/auth/wallet/challenge", (req, res) => {
    const { walletAddress } = req.body || {};
    const challengeId = `chal-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const message = `Sign in to Corven IDE\nWallet: ${walletAddress || TEST_USER.walletAddress}\nNonce: ${challengeId}\nIssued At: ${new Date().toISOString()}`;
    res.json({ challengeId, message });
  });

  app.post("/api/auth/wallet/login", (req, res) => {
    const { walletAddress } = req.body || {};
    const user = {
      ...TEST_USER,
      walletAddress: walletAddress || TEST_USER.walletAddress,
    };
    const token = generateAccessToken(user.id);
    res.cookie("corven_refresh", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({
      accessToken: token,
      user,
    });
  });

  app.get("/api/auth/me", (_req, res) => {
    res.json(TEST_USER);
  });

  app.post("/api/auth/refresh", (_req, res) => {
    const token = generateAccessToken(TEST_USER.id);
    res.json({
      accessToken: token,
      user: TEST_USER,
    });
  });

  app.post(["/api/auth/logout", "/api/auth/logout-all"], (_req, res) => {
    res.clearCookie("corven_refresh");
    res.json({ success: true });
  });

  app.post("/api/auth/login", (req, res) => {
    const token = generateAccessToken(TEST_USER.id);
    res.json({ success: true, accessToken: token, user: TEST_USER });
  });

  app.post("/api/auth/signup", (req, res) => {
    const token = generateAccessToken(TEST_USER.id);
    res.json({ success: true, accessToken: token, user: TEST_USER });
  });

  // -------------------------------------------------------------------------
  // Workspace Templates & Workspaces Endpoints
  // -------------------------------------------------------------------------

  app.get("/api/workspace-templates", (_req, res) => {
    res.json(TEMPLATES);
  });

  app.get("/api/workspaces", (_req, res) => {
    res.json(workspaces);
  });

  app.post("/api/workspaces", (req, res) => {
    const { name, templateId } = req.body || {};
    if (!name) {
      return res.status(400).json({ message: ["name should not be empty"] });
    }

    const id = `ws-${Date.now().toString(36)}`;
    const newWs = {
      id,
      name,
      status: "RUNNING",
      userId: TEST_USER.id,
      templateId: templateId || "hello-world",
      runtimeNetwork: `corven-net-${id}`,
      runtimeVolume: `corven-vol-${id}`,
      lastStartedAt: new Date().toISOString(),
      lastStoppedAt: null,
      lastActivityAt: new Date().toISOString(),
      provisionStage: null,
      provisionError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    workspaces.push(newWs);

    // Seed files from default template
    workspaceFiles[id] = (DEFAULT_WORKSPACE_FILES["ws-default"] || []).map((f) => ({ ...f }));

    res.status(201).json(newWs);
  });

  app.get("/api/workspaces/:id", (req, res) => {
    const ws = workspaces.find((w) => w.id === req.params.id);
    if (!ws) return res.status(404).json({ message: "Workspace not found" });
    res.json(ws);
  });

  app.delete("/api/workspaces/:id", (req, res) => {
    workspaces = workspaces.filter((w) => w.id !== req.params.id);
    delete workspaceFiles[req.params.id];
    res.json({ success: true });
  });

  app.post("/api/workspaces/:id/start", (req, res) => {
    const ws = workspaces.find((w) => w.id === req.params.id);
    if (ws) {
      ws.status = "RUNNING";
      ws.lastStartedAt = new Date().toISOString();
      ws.lastActivityAt = new Date().toISOString();
    }
    res.status(201).json(formatRuntimeStatus(ws || { id: req.params.id, name: "Workspace", status: "RUNNING" }));
  });

  app.post("/api/workspaces/:id/stop", (req, res) => {
    const ws = workspaces.find((w) => w.id === req.params.id);
    if (ws) {
      ws.status = "STOPPED";
      ws.lastStoppedAt = new Date().toISOString();
    }
    res.status(201).json(formatRuntimeStatus(ws || { id: req.params.id, name: "Workspace", status: "STOPPED" }));
  });

  app.get("/api/workspaces/:id/status", (req, res) => {
    const ws = workspaces.find((w) => w.id === req.params.id);
    res.json(formatRuntimeStatus(ws || { id: req.params.id, name: "Workspace", status: "RUNNING" }));
  });

  app.post("/api/workspaces/:id/heartbeat", (req, res) => {
    const ws = workspaces.find((w) => w.id === req.params.id);
    if (ws) ws.lastActivityAt = new Date().toISOString();
    res.json({ status: ws?.status || "RUNNING" });
  });

  // -------------------------------------------------------------------------
  // Workspace Files Endpoints
  // -------------------------------------------------------------------------

  function getFiles(workspaceId: string): WorkspaceFileRecord[] {
    if (!workspaceFiles[workspaceId]) {
      workspaceFiles[workspaceId] = (DEFAULT_WORKSPACE_FILES["ws-default"] || []).map((f) => ({ ...f }));
    }
    return workspaceFiles[workspaceId];
  }

  app.get("/api/workspaces/:id/files", (req, res) => {
    const files = getFiles(req.params.id);
    const entries = files.map((f) => ({
      name: f.name,
      path: f.path,
      type: f.type,
      size: f.size ?? (f.content ? Buffer.byteLength(f.content) : 0),
    }));
    res.json(entries);
  });

  app.get("/api/workspaces/:id/files/content", (req, res) => {
    const filePath = req.query.path as string;
    const files = getFiles(req.params.id);
    const file = files.find((f) => f.path === filePath);
    if (!file || file.type !== "file") {
      return res.status(404).json({ message: "File not found" });
    }
    res.json({
      path: file.path,
      name: file.name,
      type: "file",
      content: file.content || "",
      size: Buffer.byteLength(file.content || ""),
    });
  });

  app.post("/api/workspaces/:id/files", (req, res) => {
    const { path: filePath, content } = req.body || {};
    if (!filePath) return res.status(400).json({ message: "path required" });
    const files = getFiles(req.params.id);
    const existing = files.find((f) => f.path === filePath);
    if (existing) {
      existing.content = content || "";
      existing.size = Buffer.byteLength(existing.content);
      return res.json(existing);
    }
    const name = filePath.split("/").pop() || filePath;
    const newFile: WorkspaceFileRecord = {
      path: filePath,
      name,
      type: "file",
      content: content || "",
      size: Buffer.byteLength(content || ""),
    };
    files.push(newFile);
    res.status(201).json(newFile);
  });

  app.put("/api/workspaces/:id/files", (req, res) => {
    const { path: filePath, content } = req.body || {};
    const files = getFiles(req.params.id);
    const file = files.find((f) => f.path === filePath);
    if (!file) return res.status(404).json({ message: "File not found" });
    file.content = content ?? "";
    file.size = Buffer.byteLength(file.content);
    res.json(file);
  });

  app.delete("/api/workspaces/:id/files", (req, res) => {
    const filePath = req.query.path as string;
    const files = getFiles(req.params.id);
    workspaceFiles[req.params.id] = files.filter(
      (f) => f.path !== filePath && !f.path.startsWith(`${filePath}/`)
    );
    res.json({ success: true, path: filePath });
  });

  app.put("/api/workspaces/:id/files/rename", (req, res) => {
    const { oldPath, newPath } = req.body || {};
    const files = getFiles(req.params.id);
    const file = files.find((f) => f.path === oldPath);
    if (file) {
      file.path = newPath;
      file.name = newPath.split("/").pop() || newPath;
    }
    // Rename any children if directory
    files.forEach((f) => {
      if (f.path.startsWith(`${oldPath}/`)) {
        f.path = `${newPath}/${f.path.slice(oldPath.length + 1)}`;
      }
    });
    res.json({ success: true });
  });

  app.post("/api/workspaces/:id/directories", (req, res) => {
    const { path: dirPath } = req.body || {};
    const files = getFiles(req.params.id);
    const name = dirPath.split("/").pop() || dirPath;
    const dirEntry: WorkspaceFileRecord = {
      path: dirPath,
      name,
      type: "directory",
    };
    if (!files.some((f) => f.path === dirPath)) {
      files.push(dirEntry);
    }
    res.status(201).json(dirEntry);
  });

  // -------------------------------------------------------------------------
  // Devnet & CKB RPC Endpoints
  // -------------------------------------------------------------------------

  app.get("/api/workspaces/:id/devnet", (req, res) => {
    const ws = workspaces.find((w) => w.id === req.params.id);
    res.json({
      workspaceId: req.params.id,
      workspaceName: ws?.name || "Workspace",
      workspaceStatus: ws?.status || "RUNNING",
      devnetMode: "lazy",
      state: "running",
      chain: {
        chain: "ckb_devnet",
        nodeVersion: "v0.118.0",
        nodeId: "QmCorvenLocalDevnetNode",
        tip: {
          number: blockHeight,
          hash: devnetBlocks[0]?.hash || "0x92fa88e723ab8b2100cbde12c8b093f18eefc8290192a9192bcf72de28394a12",
          timestamp: Date.now(),
          epoch: "0x0001000200000000",
        },
        txPool: { pending: 1, proposed: 0, orphan: 0 },
        peers: 3,
        recentBlocks: devnetBlocks,
      },
      rpcUrl: "http://127.0.0.1:8114",
    });
  });

  app.post("/api/workspaces/:id/devnet/start", (req, res) => {
    res.json(formatRuntimeStatus({ id: req.params.id, name: "Workspace", status: "RUNNING" }));
  });

  app.post("/api/workspaces/:id/devnet/stop", (req, res) => {
    res.json(formatRuntimeStatus({ id: req.params.id, name: "Workspace", status: "STOPPED" }));
  });

  app.post("/api/workspaces/:id/devnet/mine", (req, res) => {
    blockHeight += 1;
    const newBlock = {
      number: blockHeight,
      hash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      transactions: Math.floor(Math.random() * 3) + 1,
      timestamp: Date.now(),
      miner: TEST_USER.walletAddress,
    };
    devnetBlocks.unshift(newBlock);
    if (devnetBlocks.length > 50) devnetBlocks.pop();

    res.json({
      success: true,
      block: newBlock,
      tip: blockHeight,
      message: `Block #${blockHeight} successfully mined!`,
    });
  });

  app.post("/api/workspaces/:id/devnet/faucet", (req, res) => {
    const { address = TEST_USER.walletAddress, amount = 1000 } = req.body || {};
    blockHeight += 1;
    const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const newBlock = {
      number: blockHeight,
      hash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      transactions: 1,
      timestamp: Date.now(),
      miner: address,
    };
    devnetBlocks.unshift(newBlock);
    if (devnetBlocks.length > 50) devnetBlocks.pop();

    recentDebugTransactions.unshift({
      txHash,
      recordedAt: new Date().toISOString(),
      status: "committed",
    });

    res.json({
      success: true,
      txHash,
      recipient: address,
      capacity: `${Number(amount).toLocaleString()} CKB`,
      blockNumber: blockHeight,
      message: `Dispensed ${Number(amount).toLocaleString()} CKB to ${address}`,
    });
  });

  app.post("/api/workspaces/:id/devnet/rpc", (req, res) => {
    const { method, params, id = 1 } = req.body || {};

    if (method === "get_tip_block_number") {
      return res.json({ jsonrpc: "2.0", id, result: `0x${blockHeight.toString(16)}` });
    }
    if (method === "get_tip_header") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          number: `0x${blockHeight.toString(16)}`,
          hash: devnetBlocks[0]?.hash || "0x8fa12c9034b120efcd432a901832049182309481203948120938410293840192",
          parent_hash: devnetBlocks[1]?.hash || "0x3918401928340192834019283401928340192834019283401928340192834019",
          timestamp: `0x${Date.now().toString(16)}`,
          epoch: "0x1000200000000",
          compact_target: "0x1a08a8ac",
          dao: "0x39989b097ff4794fae758a0b06b9b3e15b22b109b8b093f18eefc8290192a919",
        },
      });
    }
    if (method === "get_blockchain_info") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          chain: "ckb_devnet",
          median_time: `0x${Math.floor(Date.now() / 1000).toString(16)}`,
          epoch: "0x1000200000000",
          difficulty: "0x1000",
          is_initial_block_download: false,
          alerts: [],
        },
      });
    }
    if (method === "local_node_info") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          version: "0.118.0",
          node_id: "QmCorvenLocalDevnetNode",
          active: true,
          addresses: [{ address: "/ip4/127.0.0.1/tcp/8115", score: "0x1" }],
          connections: "0x3",
          protocols: [{ id: "0x1", name: "ckb-sync", version: "1" }],
        },
      });
    }
    if (method === "get_peers") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: [
          {
            version: "0.118.0",
            node_id: "QmPeer1NervosP2PNode",
            addresses: [{ address: "/ip4/127.0.0.1/tcp/8116", score: "0x1" }],
            is_outbound: true,
            connected_duration: "0x2a30",
            last_ping_duration: "0x12",
          },
          {
            version: "0.118.0",
            node_id: "QmPeer2FiberMeshRelay",
            addresses: [{ address: "/ip4/127.0.0.1/tcp/8117", score: "0x1" }],
            is_outbound: false,
            connected_duration: "0x1f40",
            last_ping_duration: "0x18",
          },
        ],
      });
    }
    if (method === "get_raw_tx_pool") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          pending: recentDebugTransactions.slice(0, 3).map((t) => t.txHash),
          proposed: [],
        },
      });
    }
    if (method === "send_transaction") {
      const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      recentDebugTransactions.unshift({
        txHash,
        recordedAt: new Date().toISOString(),
        status: "committed",
      });
      return res.json({ jsonrpc: "2.0", id, result: txHash });
    }
    // Default response
    res.json({ jsonrpc: "2.0", id, result: "0x0" });
  });

  app.get("/api/workspaces/:id/devnet/accounts", (_req, res) => {
    res.json([
      {
        address: TEST_USER.walletAddress,
        privkey: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        capacityCkb: "100,000",
        cellsCount: 5,
        type: "genesis_miner",
      },
      {
        address: "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqt432u08nffj3l9a93l23p40",
        privkey: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        capacityCkb: "50,000",
        cellsCount: 2,
        type: "test_faucet",
      },
    ]);
  });

  app.get("/api/workspaces/:id/devnet/scripts", (_req, res) => {
    res.json({
      secp256k1_blake160_sighash_all: {
        codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
        hashType: "type",
        cellDep: {
          outPoint: {
            txHash: "0x89fc3218de902bf8912cdfa1098234ea01923847bcda89127394812903847120",
            index: 0,
          },
          depType: "depGroup",
        },
      },
    });
  });

  // -------------------------------------------------------------------------
  // Contracts, Deployments, Debugger, Molecule
  // -------------------------------------------------------------------------

  app.get("/api/workspaces/:id/contracts", (_req, res) => {
    res.json([
      {
        name: "hello-world",
        sizeBytes: 32768,
        builtAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);
  });

  app.get("/api/workspaces/:id/contracts/:name/binary", (req, res) => {
    const dummyRiscv = Buffer.from("CORVEN_RISCV_BINARY_STUB_CKB");
    res.json({
      name: req.params.name,
      base64: dummyRiscv.toString("base64"),
      sizeBytes: dummyRiscv.length,
    });
  });

  app.get("/api/workspaces/:id/deployments", (req, res) => {
    res.json(workspaceDeployments.filter((d) => d.workspaceId === req.params.id));
  });

  app.post("/api/workspaces/:id/deployments/devnet", (req, res) => {
    const { contract, upgradable } = req.body || {};
    const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const codeHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const dep = {
      id: `dep-${Date.now()}`,
      workspaceId: req.params.id,
      network: "DEVNET",
      contractName: contract || "hello-world",
      txHash,
      outputIndex: 0,
      codeHash,
      hashType: upgradable ? "type" : "data1",
      typeId: upgradable ? "0x" + Array.from({ length: 64 }, () => "f").join("") : null,
      typeArgs: null,
      dataHash: "0x1234567890abcdef",
      sizeBytes: 32768,
      capacity: "10000000000",
      deployerAddress: TEST_USER.walletAddress,
      upgradeOfId: null,
      createdAt: new Date().toISOString(),
    };
    workspaceDeployments.unshift(dep);
    res.status(201).json(dep);
  });

  app.post("/api/workspaces/:id/deployments", (req, res) => {
    const body = req.body || {};
    const dep = {
      id: `dep-${Date.now()}`,
      workspaceId: req.params.id,
      createdAt: new Date().toISOString(),
      ...body,
    };
    workspaceDeployments.unshift(dep);
    res.status(201).json(dep);
  });

  app.post(["/api/workspaces/:id/molecule/generate", "/api/molecule/generate"], (req, res) => {
    const { language = "rust" } = req.body || {};
    const sampleCode =
      language === "rust"
        ? `// Generated by Corven Molecule Compiler
use molecule::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HelloRecord {
    pub version: u8,
    pub author: Vec<u8>,
    pub message: Vec<u8>,
    pub created_at: u64,
}
`
        : `// Generated TypeScript Molecule Bindings
export interface HelloRecord {
    version: number;
    author: Uint8Array;
    message: Uint8Array;
    createdAt: bigint;
}
`;
    res.json({ success: true, code: sampleCode, language });
  });

  app.get("/api/workspaces/:id/debug/transactions", (_req, res) => {
    res.json(recentDebugTransactions);
  });

  app.post("/api/workspaces/:id/debug/run", (req, res) => {
    const { contract } = req.body || {};
    res.json({
      contract: contract || "hello-world",
      exitCode: 0,
      vmError: null,
      cycles: 12540,
      logs: [
        "[DEBUG] Loading script arguments...",
        "[DEBUG] Invoking hello-world entry verification",
        "[DEBUG] Validated signature witness: SUCCESS",
        "[DEBUG] Execution cycles: 12,540 / 70,000,000",
      ],
      meaning: "Contract validation passed successfully with exit code 0",
      raw: "DEBUG: verification finished without errors",
      note: "All cell outputs conform to protocol rules",
    });
  });

  app.post("/api/workspaces/:id/debug/tx", (req, res) => {
    const { txHash } = req.body || {};
    res.json({
      txHash: txHash || recentDebugTransactions[0]?.txHash,
      status: "committed",
      inputs: 1,
      outputs: 2,
      totalCycles: 28410,
      failed: 0,
      groups: [
        {
          label: "hello-world Lock Script",
          groupType: "lock",
          cellType: "input",
          cellIndex: 0,
          codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
          hashType: "type",
          args: "0x",
          name: "hello-world",
          contract: "hello-world",
          replaced: false,
          skipped: null,
          exitCode: 0,
          vmError: null,
          cycles: 28410,
          logs: ["[DEBUG] Lock verification OK"],
          meaning: "Script passed",
        },
      ],
      truncated: false,
    });
  });

  // -------------------------------------------------------------------------
  // Community Endpoints
  // -------------------------------------------------------------------------

  app.get("/api/community/permissions", (_req, res) => {
    res.json({ isAdmin: true });
  });

  app.get("/api/community/posts", (req, res) => {
    const { kind, sort } = req.query as { kind?: string; sort?: string };
    let filtered = communityPosts.filter((p) => (!kind ? p.kind !== "NEWS" : p.kind === kind));
    if (sort === "top") {
      filtered = [...filtered].sort((a, b) => b.voteCount - a.voteCount);
    } else {
      filtered = [...filtered].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    }
    const shaped = filtered.map(({ comments, ...rest }) => ({
      ...rest,
      commentCount: comments?.length || 0,
    }));
    res.json({ posts: shaped, total: shaped.length, nextOffset: null });
  });

  app.post("/api/community/posts", (req, res) => {
    const { kind, title, body } = req.body || {};
    const newPost = {
      id: `post-${Date.now()}`,
      kind: kind || "FEEDBACK",
      title: title || "Untitled",
      body: body || "",
      status: "OPEN",
      pinned: false,
      voteCount: 1,
      votedByMe: true,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: TEST_USER.id, name: TEST_USER.name, walletAddress: TEST_USER.walletAddress, isAdmin: true },
      comments: [],
    };
    communityPosts.unshift(newPost);
    res.status(201).json(newPost);
  });

  app.get("/api/community/posts/:id", (req, res) => {
    const post = communityPosts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ ...post, commentCount: post.comments.length });
  });

  app.post("/api/community/posts/:id/comments", (req, res) => {
    const post = communityPosts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const comment = {
      id: `comm-${Date.now()}`,
      body: req.body?.body || "",
      createdAt: new Date().toISOString(),
      author: { id: TEST_USER.id, name: TEST_USER.name, walletAddress: TEST_USER.walletAddress, isAdmin: false },
    };
    post.comments.push(comment);
    res.status(201).json(comment);
  });

  app.post("/api/community/posts/:id/vote", (req, res) => {
    const post = communityPosts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    post.votedByMe = !post.votedByMe;
    post.voteCount += post.votedByMe ? 1 : -1;
    res.json({ voted: post.votedByMe, voteCount: post.voteCount });
  });

  app.patch("/api/community/posts/:id", (req, res) => {
    const post = communityPosts.find((p) => p.id === req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    Object.assign(post, req.body || {});
    res.json(post);
  });

  app.delete("/api/community/posts/:id", (req, res) => {
    communityPosts = communityPosts.filter((p) => p.id !== req.params.id);
    res.json({ success: true });
  });

  // -------------------------------------------------------------------------
  // Local Node Simulator Endpoints
  // -------------------------------------------------------------------------

  app.get("/api/node", (_req, res) => {
    const uptimeSeconds = Math.floor(process.uptime());
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const mins = Math.floor((uptimeSeconds % 3600) / 60);
    const secs = uptimeSeconds % 60;
    const uptimeStr = `${days}d ${hours.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;

    const memMb = Math.round(process.memoryUsage().rss / (1024 * 1024));

    res.json({
      status: nodeStatus,
      version: "v0.118.0",
      uptime: uptimeStr,
      blockHeight,
      syncProgress: nodeStatus === "Synchronizing" ? 84 : 100,
      peers,
      blocks: devnetBlocks.map((b) => ({
        number: b.number,
        hash: b.hash,
        parentHash: b.parentHash || "0x0000000000000000000000000000000000000000000000000000000000000000",
        timestamp: new Date(b.timestamp).toISOString(),
        txCount: b.transactions ?? 0,
        size: b.size ?? "1.4 KB",
        gasUsed: b.gasUsed ?? 0,
        transactions: b.transactionsList ?? [],
      })),
      metrics: {
        cpu: Math.min(100, Math.max(1, Math.round((process.cpuUsage().user / 1000000) % 15 + 2))),
        memory: `${memMb} MB`,
        network: peers.length > 0 ? peers.length * 15 : 0,
        bandwidth: peers.length > 0 ? `${peers.length * 20} Mbps` : "0 Mbps",
      },
      logs: nodeLogs,
    });
  });

  app.post("/api/node/restart", (_req, res) => {
    nodeStatus = "Restarting";
    nodeLogs.push(`[${new Date().toISOString().slice(0, 10)}] INFO: Safe node restart initiated...`);
    setTimeout(() => {
      nodeStatus = "Operational";
      nodeLogs.push(`[${new Date().toISOString().slice(0, 10)}] SUCCESS: Local CKB node restarted successfully.`);
    }, 2000);
    res.json({ success: true, status: nodeStatus });
  });

  app.post("/api/node/reset", (_req, res) => {
    nodeStatus = "Resetting";
    nodeLogs.push(`[${new Date().toISOString().slice(0, 10)}] WARN: Devnet database purged. Generating genesis...`);
    setTimeout(() => {
      blockHeight = 0;
      nodeStatus = "Operational";
      nodeLogs.push(`[${new Date().toISOString().slice(0, 10)}] SUCCESS: Genesis block loaded.`);
    }, 2000);
    res.json({ success: true, status: nodeStatus });
  });

  app.post("/api/node/peers", (req, res) => {
    const { address, region } = req.body || {};
    const newPeer = {
      id: `ckb-peer-${Date.now().toString(36).slice(-4)}`,
      address: address || `/ip4/127.0.0.1/tcp/${8115 + peers.length}/p2p/QmPeer${peers.length + 1}`,
      latency: Math.floor(Math.random() * 15 + 6),
      region: region || "Local Devnet",
      client: "CKB/v0.118.0",
    };
    peers.push(newPeer);
    nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] SUCCESS: Peer connected: ${newPeer.id} (${newPeer.address})`);
    res.json({ success: true, peers });
  });

  app.delete("/api/node/peers/:id", (req, res) => {
    peers = peers.filter((p) => p.id !== req.params.id);
    nodeLogs.push(`[${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}] INFO: Peer disconnected: ${req.params.id}`);
    res.json({ success: true, peers });
  });

  // -------------------------------------------------------------------------
  // AI Assistant Endpoint (Server-Sent Events)
  // -------------------------------------------------------------------------

  app.get("/api/ai/status", (_req, res) => {
    res.json({
      enabled: true,
      defaultModel: "gemini-2.5-flash",
      models: [
        {
          id: "gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          description: "High performance AI model for Nervos CKB RISC-V Rust smart contracts",
        },
      ],
    });
  });

  app.post("/api/ai/chat", async (req, res) => {
    const { messages, activeFile } = req.body || {};
    const lastMessage = messages?.[messages.length - 1]?.content || "Explain CKB smart contracts";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendDelta = (text: string) => {
      res.write(`event: delta\ndata: ${JSON.stringify({ text })}\n\n`);
    };

    const ai = getGemini();

    if (ai) {
      try {
        const systemInstruction =
          "You are an expert Nervos CKB blockchain developer and RISC-V Rust smart contract engineer. Answer questions clearly, accurately, with idiomatic Rust code using ckb-std and molecule. Format code cleanly in Markdown.";
        const contents = `${activeFile ? `Active File (${activeFile.path}):\n\`\`\`rust\n${activeFile.content}\n\`\`\`\n\n` : ""}User prompt: ${lastMessage}`;

        const streamResult = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        for await (const chunk of streamResult) {
          if (chunk.text) {
            sendDelta(chunk.text);
          }
        }

        res.write(
          `event: done\ndata: ${JSON.stringify({
            model: "gemini-2.5-flash",
            stopReason: "stop",
            inputTokens: 120,
            outputTokens: 280,
          })}\n\n`
        );
        return res.end();
      } catch (err: any) {
        console.warn("Gemini streaming error, falling back to simulated reply:", err.message);
      }
    }

    // Fallback streaming explanation
    const simulatedChunks = [
      `### Corven CKB Assistant\n\n`,
      `Here is an overview regarding your request on **${activeFile?.path || "CKB Smart Contracts"}**:\n\n`,
      `1. **Cell Model Fundamentals:** In Nervos CKB, smart contracts execute as RISC-V binaries loaded dynamically into the VM. Every cell contains \`capacity\`, \`data\`, \`lock\` script, and optionally a \`type\` script.\n\n`,
      `2. **Script Verification:** The contract in \`${activeFile?.path || "contracts/hello-world/src/main.rs"}\` uses \`ckb_std::entry!\` to inspect incoming inputs and outgoing outputs via \`ckb_std::high_level::load_cell\`.\n\n`,
      `\`\`\`rust\n// Example: Validating output capacity preservation\nlet input_capacity: u64 = load_cell_capacity(0, Source::Input)?;\nlet output_capacity: u64 = load_cell_capacity(0, Source::Output)?;\nif output_capacity > input_capacity {\n    return Err(SysError::Unknown(42));\n}\n\`\`\`\n\n`,
      `3. **Testing:** Run \`cargo test\` in the integrated terminal to execute the transaction test harness with \`ckb-testtool\`!\n`,
    ];

    for (const chunk of simulatedChunks) {
      sendDelta(chunk);
      await new Promise((r) => setTimeout(r, 60));
    }

    res.write(
      `event: done\ndata: ${JSON.stringify({
        model: "gemini-2.5-flash",
        stopReason: "stop",
        inputTokens: 85,
        outputTokens: 160,
      })}\n\n`
    );
    res.end();
  });

  // -------------------------------------------------------------------------
  // Socket.IO Service (Terminal, Build, Tests) on /terminal namespace
  // -------------------------------------------------------------------------

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Reflect origin so credentials work without throwing wildcard CORS error
        callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Requested-With",
        "Origin",
        "Range",
        "Cache-Control",
        "Pragma",
      ],
    },
    transports: ["websocket", "polling"],
  });

  const terminalNamespace = io.of("/terminal");

  terminalNamespace.on("connection", (socket) => {
    const workspaceId = (socket.handshake.query.workspaceId as string) || "ws-default";
    let activeSessionId: string | null = null;

    // Notify client of authentication
    socket.emit("terminal:authenticated", { success: true });

    // Terminal open
    socket.on("terminal:open", (payload: any) => {
      activeSessionId = `term-${Date.now()}`;
      socket.emit("terminal:ready", {
        sessionId: activeSessionId,
        execId: activeSessionId,
      });

      // Send terminal greeting
      const banner =
        "\r\n\x1b[1;36m========================================================\x1b[0m\r\n" +
        "\x1b[1;32m  Corven IDE - Nervos CKB RISC-V Cloud Terminal\x1b[0m\r\n" +
        "\x1b[90m  Rust 1.78.0 | ckb-cli v0.118.0 | capsule v0.10.4\x1b[0m\r\n" +
        "\x1b[1;36m========================================================\x1b[0m\r\n\r\n" +
        `corven@${workspaceId}:~$ `;

      socket.emit("terminal:output", {
        sessionId: activeSessionId,
        data: banner,
      });
    });

    // Terminal input
    socket.on("terminal:input", (payload: { data: string }) => {
      const data = payload?.data || "";
      if (data === "\r") {
        socket.emit("terminal:output", {
          sessionId: activeSessionId,
          data: `\r\n\x1b[32m[corven-env]\x1b[0m Command executed. Type 'ckb-cli', 'cargo build', or 'help'.\r\ncorven@${workspaceId}:~$ `,
        });
      } else if (data === "\u007f") {
        // Backspace
        socket.emit("terminal:output", {
          sessionId: activeSessionId,
          data: "\b \b",
        });
      } else {
        // Echo input
        socket.emit("terminal:output", {
          sessionId: activeSessionId,
          data,
        });
      }
    });

    // Terminal resize & close
    socket.on("terminal:resize", () => { });
    socket.on("terminal:close", () => {
      socket.emit("terminal:closed", { sessionId: activeSessionId });
    });

    // Projects list
    socket.on("projects:list", () => {
      socket.emit("projects:list:response", {
        workspaceId,
        projects: ["contracts/hello-world"],
      });
    });

    // Build trigger
    socket.on("build:start", (payload: { target: string; cwd?: string; buildId: string }) => {
      const { target = "hello-world", buildId } = payload;
      const startedAt = new Date().toISOString();

      socket.emit("build:started", {
        workspaceId,
        buildId,
        target,
        cwd: `/workspace/${target}`,
        startedAt,
      });

      const logLines = [
        `   Compiling ckb-std v0.15.2\r\n`,
        `   Compiling hello-world v0.1.0 (/workspace/contracts/hello-world)\r\n`,
        `    Finished \x1b[1;32mrelease [optimized]\x1b[0m target(s) for riscv64imac-unknown-none-elf in 1.48s\r\n`,
        `\x1b[1;32m==> Binary built:\x1b[0m target/riscv64imac-unknown-none-elf/release/hello-world (32.8 KB)\r\n`,
      ];

      let idx = 0;
      const interval = setInterval(() => {
        if (idx < logLines.length) {
          socket.emit("build:output", {
            workspaceId,
            buildId,
            stream: "stdout",
            data: logLines[idx],
          });
          idx++;
        } else {
          clearInterval(interval);
          socket.emit("build:finished", {
            workspaceId,
            buildId,
            exitCode: 0,
            status: "success",
            error: null,
            output: logLines.join(""),
            cwd: `/workspace/contracts/hello-world`,
            durationMs: 1480,
            finishedAt: new Date().toISOString(),
          });
        }
      }, 350);
    });

    // Test trigger
    socket.on("test:start", (payload: { buildId?: string; testId?: string }) => {
      const testId = payload?.buildId || payload?.testId || `test-${Date.now()}`;
      socket.emit("test:started", {
        workspaceId,
        testId,
        startedAt: new Date().toISOString(),
      });

      const testOutput =
        "running 1 test\r\n" +
        "test tests::test_hello_world_success ... \x1b[1;32mok\x1b[0m\r\n\r\n" +
        "test result: \x1b[1;32mok\x1b[0m. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.42s\r\n";

      setTimeout(() => {
        socket.emit("test:output", {
          workspaceId,
          testId,
          stream: "stdout",
          data: testOutput,
        });

        socket.emit("test:finished", {
          workspaceId,
          testId,
          exitCode: 0,
          status: "success",
          output: testOutput,
          passed: 1,
          failed: 0,
          durationMs: 420,
          finishedAt: new Date().toISOString(),
        });
      }, 800);
    });
  });

  // -------------------------------------------------------------------------
  // Vite Middleware (Dev) vs Static Dist (Production)
  // -------------------------------------------------------------------------

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Corven IDE Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
