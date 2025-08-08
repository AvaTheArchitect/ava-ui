#!/usr/bin/env node
// 🎵 Maestro 24/7 Auto-Watcher (Fixed - No Infinite Loops!)
import * as chokidar from "chokidar";
import * as fs from "fs";
import * as path from "path";

console.log("🎵 Starting Maestro 24/7 Auto-Watcher (v2.0 - Loop-Safe)...");

// Ensure directories exist
const dirs = [
  "maestro-ai-input",
  "maestro-modules",
  "maestro-team-reports",
  "logs",
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created: ${dir}`);
  }
});

// 🚨 CRITICAL: Enhanced ignore patterns to prevent infinite loops
const watcher = chokidar.watch(
  ["maestro-ai-input/**/*", "walkie-talkie/**/*"],
  {
    // 🛡️ COMPREHENSIVE EXCLUSIONS (prevents infinite loops)
    ignored: [
      /(^|[\/\\])\../, // Hidden files (original)
      "**/node_modules/**", // Node modules
      "**/.git/**", // Git files
      "**/logs/**", // Log directories
      "**/maestro-logs/**", // Maestro log directories
      "**/maestro-*.log", // Maestro log files
      "**/*.log", // All log files
      "**/health.json", // Health check files
      "**/.vscode/**", // VS Code files
      "**/out/**", // Compiled output
      "**/dist/**", // Distribution files
      "**/.DS_Store", // macOS system files
      "**/Thumbs.db", // Windows system files
      "**/*.tmp", // Temporary files
      "**/*.temp", // Temporary files
      "**/package-lock.json", // Lock files (change frequently)
      "**/yarn.lock", // Lock files
      "**/.next/**", // Next.js build files
      "**/coverage/**", // Test coverage files
    ],
    persistent: true,
    ignoreInitial: true,

    // 🎯 PERFORMANCE OPTIMIZATIONS
    usePolling: false, // Use native events (faster)
    interval: 3600000, // 1 hour polling interval (matching Cipher settings)
    binaryInterval: 3600000, // 1 hour for binary files
    awaitWriteFinish: {
      // Wait for writes to complete
      stabilityThreshold: 2000, // Wait 2 seconds after last change
      pollInterval: 100, // Check every 100ms
    },
  }
);

// 🎯 SAFE FILE PROCESSING with additional safety checks
watcher
  .on("add", (filePath: string) => {
    if (shouldProcessFile(filePath)) {
      console.log(`📁 New file detected: ${filePath}`);
      processFile(filePath);
    }
  })
  .on("change", (filePath: string) => {
    if (shouldProcessFile(filePath)) {
      console.log(`📝 File changed: ${filePath}`);
      processFile(filePath);
    }
  })
  .on("error", (err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`🚨 Watcher error: ${errorMessage}`);
  });

// 🛡️ SAFETY CHECK: Additional file filtering
function shouldProcessFile(filePath: string): boolean {
  const fileName = path.basename(filePath).toLowerCase();
  const fullPath = filePath.toLowerCase();

  // Skip if it's a log file or system file
  if (fileName.includes("maestro-") && fileName.endsWith(".log")) return false;
  if (fileName.endsWith(".log")) return false;
  if (fileName === "health.json") return false;
  if (fullPath.includes("/logs/")) return false;
  if (fullPath.includes("/node_modules/")) return false;
  if (fullPath.includes("/.git/")) return false;
  if (fullPath.includes("/.vscode/")) return false;
  if (fileName.startsWith(".")) return false;

  return true;
}

function processFile(filePath: string): void {
  try {
    const fileName = path.basename(filePath);
    console.log(`🎯 Processing: ${fileName}`);

    // Simple processing - you can enhance this later
    if (fileName.endsWith(".md")) {
      console.log("📝 Markdown spec detected - ready for Cipher processing");
    } else if (fileName.endsWith(".json")) {
      console.log("📊 JSON data detected - ready for analysis");
    } else if (fileName.endsWith(".js") || fileName.endsWith(".ts")) {
      console.log("⚡ Code file detected - ready for brain analysis");
    }

    // 🎵 Log to a SAFE location (outside watched directories)
    const logEntry = {
      timestamp: new Date().toISOString(),
      file: fileName,
      action: "processed",
      path: filePath,
    };

    // Write to safe log location (outside watched directories)
    const safeLogPath = path.join(process.cwd(), "..", "maestro-safe-logs");
    if (!fs.existsSync(safeLogPath)) {
      fs.mkdirSync(safeLogPath, { recursive: true });
    }

    const logFile = path.join(
      safeLogPath,
      `maestro-safe-${new Date().toISOString().split("T")[0]}.log`
    );
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
  } catch (error) {
    console.error(`🚨 Error processing file ${filePath}:`, error);
  }
}

// 🎯 GRACEFUL SHUTDOWN
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down Maestro Auto-Watcher...");
  watcher.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Terminating Maestro Auto-Watcher...");
  watcher.close();
  process.exit(0);
});

console.log("👀 Maestro Auto-Watcher is now monitoring (Loop-Safe v2.0)...");
console.log("🎸 Your AI road crew is ready to rock 24/7!");
console.log("🛡️ Protection: Infinite loop prevention ACTIVE");
console.log("⚙️ Settings: 1-hour interval, comprehensive exclusions");

// 🎯 STATUS REPORT
console.log("\n📊 Monitoring Configuration:");
console.log("   📁 Watching: maestro-ai-input/, walkie-talkie/");
console.log("   🚫 Ignoring: logs, node_modules, .git, .vscode, *.log files");
console.log("   ⏱️ Interval: 1 hour (matching Cipher settings)");
console.log("   💾 Safe logs: ../maestro-safe-logs/");
console.log("   🔒 Loop protection: ENABLED\n");

// Export for use in other scripts
export { shouldProcessFile, processFile };
