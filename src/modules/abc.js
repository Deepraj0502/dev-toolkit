const express = require("express");
const { execFile } = require("child_process");
const cors = require("cors");
const fs   = require("fs");

const app  = express();
const PORT = 4417;

app.use(cors());

// ── SFTP target config (10.177.44.25) ─────────────────────────
const SFTP_HOST  = "10.177.44.25";
const SFTP_USER  = "eisuser";
const SSH_KEY    = "/home/eisuser/.ssh/id_rsa"; // private key on THIS box (10.177.44.29)
const REMOTE_DIR = "/tmp/";

// ── Local staging dir on 10.177.44.29 ─────────────────────────
const LOCAL_SAVE_DIR = "/tmp/sftp_uploads";
if (!fs.existsSync(LOCAL_SAVE_DIR)) fs.mkdirSync(LOCAL_SAVE_DIR, { recursive: true });

// ══════════════════════════════════════════════════════════════
// SFTP upload (existing)
// ══════════════════════════════════════════════════════════════

// ── Binary-safe multipart parsing helpers ─────────────────────
function extractFilePart(buffer, boundary) {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(buffer, boundaryBuf);

  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;
    const header = part.slice(0, headerEnd).toString();
    if (!header.includes("filename=")) continue;

    const fileNameMatch = header.match(/filename="([^"]+)"/);
    if (!fileNameMatch) continue;

    let content = part.slice(headerEnd + 4);
    if (content.slice(-2).toString() === "\r\n") {
      content = content.slice(0, -2);
    }
    return { fileName: fileNameMatch[1], fileBuffer: content };
  }
  return null;
}

function extractField(bodyStr, fieldName) {
  const re = new RegExp(`name="${fieldName}"\\r\\n\\r\\n([^\\r\\n]+)`);
  const match = bodyStr.match(re);
  return match ? match[1].trim() : null;
}

function splitBuffer(buffer, delimiter) {
  const parts = [];
  let start = 0;
  let idx;
  while ((idx = buffer.indexOf(delimiter, start)) !== -1) {
    if (idx > start) parts.push(buffer.slice(start, idx));
    start = idx + delimiter.length;
  }
  return parts;
}

// ── POST /sftp-upload ──────────────────────────────────────────
app.post("/sftp-upload", (req, res) => {
  const contentType = req.headers["content-type"] || "";
  const boundary = contentType.split("boundary=")[1];
  if (!boundary) return res.status(400).json({ error: "No boundary found in content-type" });

  const chunks = [];
  req.on("data", chunk => chunks.push(chunk));
  req.on("end", () => {
    let localPath, batchFile;
    try {
      const body = Buffer.concat(chunks);
      const bodyStr = body.toString("binary");

      const filePart = extractFilePart(body, boundary);
      if (!filePart) return res.status(400).json({ error: "No file found in upload" });
      const { fileName, fileBuffer } = filePart;

      const targetDir = (extractField(bodyStr, "targetDir") || REMOTE_DIR).replace(/\/$/, "");

      localPath = `${LOCAL_SAVE_DIR}/${fileName}`;
      fs.writeFileSync(localPath, fileBuffer);
      console.log(`[sftp-upload] Staged: ${localPath} (${fileBuffer.length} bytes)`);

      // sftp batch file: one command per line
      batchFile = `${LOCAL_SAVE_DIR}/${fileName}.batch`;
      fs.writeFileSync(batchFile, `put "${localPath}" "${targetDir}/${fileName}"\n`);

      execFile("sftp", [
        "-i", SSH_KEY,
        "-o", "StrictHostKeyChecking=no",
        "-b", batchFile,
        `${SFTP_USER}@${SFTP_HOST}`
      ], (err, stdout, stderr) => {
        fs.unlink(localPath, () => {});
        fs.unlink(batchFile, () => {});

        if (err) {
          console.error("[sftp-upload] SFTP failed:", stderr || err.message);
          return res.status(500).json({ error: stderr || err.message });
        }

        console.log(`[sftp-upload] Sent to ${SFTP_HOST}:${targetDir}/${fileName}`);
        res.json({
          success: true,
          message: `${fileName} sent to ${SFTP_HOST}:${targetDir}/`,
          size: fileBuffer.length,
        });
      });
    } catch (err) {
      if (localPath) fs.unlink(localPath, () => {});
      if (batchFile) fs.unlink(batchFile, () => {});
      res.status(500).json({ error: "Parse error: " + err.message });
    }
  });
});

// ══════════════════════════════════════════════════════════════
// Curl execution (SSH relay) — new
// ══════════════════════════════════════════════════════════════

app.use(express.json({ limit: "5mb" }));

// Reuses SSH_KEY / SFTP_USER above as the SSH identity for curl execution too.
const ALLOWED_CURL_HOSTS = new Set([
  "10.177.44.21",
  "10.177.44.22",
  "10.177.44.23",
  "10.177.44.25",
  "10.177.44.26",
  "10.177.44.27",
]);

// Flags that read/write the filesystem on the target box — never allow these.
const BLOCKED_CURL_FLAGS = new Set([
  "-o", "--output",
  "-O", "--remote-name", "--remote-name-all",
  "-T", "--upload-file",
  "-K", "--config",
  "--cookie-jar",
  "--dump-header", "-D",
  "--trace", "--trace-ascii",
]);

// ── Tokenizer: splits a curl command string into argv, respecting quotes ──
function parseCurlArgs(raw) {
  const str = raw.trim().replace(/\\\r?\n/g, " ");
  const args = [];
  let current = "";
  let quote = null;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (quote) {
      if (c === quote) {
        quote = null;
      } else if (c === "\\" && quote === '"') {
        current += str[++i];
      } else {
        current += c;
      }
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (/\s/.test(c)) {
      if (current) {
        args.push(current);
        current = "";
      }
    } else if (c === "\\") {
      current += str[++i];
    } else {
      current += c;
    }
  }
  if (current) args.push(current);

  if (args[0] === "curl") args.shift();
  return args;
}

function validateCurlArgs(args) {
  for (const a of args) {
    if (BLOCKED_CURL_FLAGS.has(a)) {
      return `Flag "${a}" is not allowed (filesystem access).`;
    }
    if (a.startsWith("@")) {
      return `Argument "${a}" references a local file, which is not allowed.`;
    }
  }
  const hasUrl = args.some((a) => /^https?:\/\//i.test(a));
  if (!hasUrl) {
    return "No http(s) URL found in the command.";
  }
  return null;
}

// POSIX-safe single-quote wrapping so the reconstructed remote command
// can't be broken out of by anything inside an argument.
function shellQuote(arg) {
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

// ── POST /run-curl ──────────────────────────────────────────────
// body: { command: string, targetHost: string, verbose?: boolean, prettyJson?: boolean }
app.post("/run-curl", (req, res) => {
  const { command, targetHost, verbose, prettyJson } = req.body || {};

  if (!command || typeof command !== "string") {
    return res.status(400).json({ error: "Missing 'command' string in request body" });
  }
  if (!targetHost || !ALLOWED_CURL_HOSTS.has(targetHost)) {
    return res.status(400).json({ error: `'targetHost' must be one of: ${[...ALLOWED_CURL_HOSTS].join(", ")}` });
  }

  let args;
  try {
    args = parseCurlArgs(command);
  } catch (err) {
    return res.status(400).json({ error: "Failed to parse command: " + err.message });
  }

  const validationError = validateCurlArgs(args);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (verbose && !args.includes("-v") && !args.includes("--verbose")) {
    args.push("-v");
  }

  const remoteCommand = "curl --max-time 20 " + args.map(shellQuote).join(" ");

  execFile(
    "ssh",
    [
      "-i", SSH_KEY,
      "-o", "StrictHostKeyChecking=no",
      "-o", "ConnectTimeout=10",
      `${SFTP_USER}@${targetHost}`,
      remoteCommand,
    ],
    { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
    (err, stdout, stderr) => {
      let prettyOutput = null;
      if (prettyJson && stdout) {
        try {
          prettyOutput = JSON.stringify(JSON.parse(stdout), null, 2);
        } catch {
          prettyOutput = null;
        }
      }

      res.json({
        success: !err,
        exitCode: err ? err.code ?? null : 0,
        stdout,
        stderr,
        prettyOutput,
        targetHost,
        error: err ? err.message : undefined,
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Combined backend running on port ${PORT}`);
  console.log(`  → SFTP upload:  POST /sftp-upload  (forwards to ${SFTP_HOST})`);
  console.log(`  → Curl exec:    POST /run-curl     (SSH relay to whitelisted hosts)`);
});
