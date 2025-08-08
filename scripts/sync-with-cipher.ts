#!/usr/bin/env node

import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";

// 🤖 MAESTRO AI - CIPHER SYNC 🎸
console.log(
  chalk.bold.magenta("\n🤖 ======================================= 🎸")
);
console.log(chalk.bold.cyan("     MAESTRO AI - CIPHER SYNC"));
console.log(
  chalk.bold.magenta("⚡ ======================================= 🔥\n")
);

interface CipherSyncReport {
  timestamp: string;
  cipherFound: boolean;
  cipherVersion: string | null;
  inputsProcessed: number;
  outputsGenerated: number;
  communicationStatus: "connected" | "disconnected" | "error";
  lastCipherActivity: string | null;
  errors: string[];
}

async function syncWithCipher(): Promise<CipherSyncReport> {
  const syncReport: CipherSyncReport = {
    timestamp: new Date().toISOString(),
    cipherFound: false,
    cipherVersion: null,
    inputsProcessed: 0,
    outputsGenerated: 0,
    communicationStatus: "disconnected",
    lastCipherActivity: null,
    errors: [],
  };

  const spinner = ora(
    chalk.yellow("🔍 Searching for Cipher extension...")
  ).start();

  try {
    // 🎯 Locate Cipher Extension
    const cipherPaths = [
      "../cipher-autonomous-dev",
      "../../.vscode/extensions/cipher-autonomous-dev",
      "../.vscode-extension-cipher",
      "./cipher-autonomous-dev",
    ];

    let cipherBasePath: string | null = null;

    for (const cipherPath of cipherPaths) {
      if (await fs.pathExists(cipherPath)) {
        cipherBasePath = cipherPath;
        syncReport.cipherFound = true;
        spinner.text = chalk.green(`🤖 Found Cipher at: ${cipherPath}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        break;
      }
    }

    if (!cipherBasePath) {
      throw new Error("Cipher extension not found in expected locations");
    }

    // 🎯 Read Cipher Version
    spinner.text = chalk.yellow("📋 Reading Cipher configuration...");

    const packageJsonPath = path.join(cipherBasePath, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageData = await fs.readJSON(packageJsonPath);
        syncReport.cipherVersion = packageData.version || "unknown";
        spinner.text = chalk.green(
          `📦 Cipher version: ${syncReport.cipherVersion}`
        );
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch {
        syncReport.errors.push("Failed to read Cipher package.json");
      }
    }

    // 🎯 Check Cipher Activity
    spinner.text = chalk.yellow("⏰ Checking Cipher activity...");

    const activityFiles = [
      path.join(cipherBasePath, "logs"),
      path.join(cipherBasePath, ".last-activity"),
      path.join(cipherBasePath, "out"),
    ];

    for (const activityPath of activityFiles) {
      if (await fs.pathExists(activityPath)) {
        try {
          const stats = await fs.stat(activityPath);
          syncReport.lastCipherActivity = stats.mtime.toISOString();
          break;
        } catch {
          // Ignore stat errors
        }
      }
    }

    // 🎯 Process Maestro Inputs for Cipher
    spinner.text = chalk.yellow("📥 Processing inputs for Cipher...");

    if (await fs.pathExists("maestro-ai-input")) {
      const inputs = await fs.readdir("maestro-ai-input");
      const inputFiles = inputs.filter(
        (file) =>
          file.endsWith(".md") ||
          file.endsWith(".json") ||
          file.endsWith(".txt")
      );

      for (const inputFile of inputFiles) {
        const inputPath = path.join("maestro-ai-input", inputFile);
        const cipherInputPath = path.join(cipherBasePath, "inputs", inputFile);

        try {
          await fs.ensureDir(path.join(cipherBasePath, "inputs"));
          await fs.copy(inputPath, cipherInputPath);
          syncReport.inputsProcessed++;

          spinner.text = chalk.green(`📥 Processed: ${inputFile}`);
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch {
          syncReport.errors.push(`Failed to process input: ${inputFile}`);
        }
      }
    }

    // 🎯 Collect Cipher Outputs
    spinner.text = chalk.yellow("📤 Collecting Cipher outputs...");

    const cipherOutputPath = path.join(cipherBasePath, "outputs");
    if (await fs.pathExists(cipherOutputPath)) {
      const outputs = await fs.readdir(cipherOutputPath);
      const outputFiles = outputs.filter(
        (file) =>
          file.endsWith(".ts") ||
          file.endsWith(".tsx") ||
          file.endsWith(".js") ||
          file.endsWith(".md")
      );

      await fs.ensureDir("maestro-modules");

      for (const outputFile of outputFiles) {
        const outputPath = path.join(cipherOutputPath, outputFile);
        const maestroOutputPath = path.join("maestro-modules", outputFile);

        try {
          await fs.copy(outputPath, maestroOutputPath);
          syncReport.outputsGenerated++;

          spinner.text = chalk.green(`📤 Collected: ${outputFile}`);
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch {
          syncReport.errors.push(`Failed to collect output: ${outputFile}`);
        }
      }
    }

    // 🎯 Create Communication Bridge
    spinner.text = chalk.yellow("🌉 Establishing communication bridge...");

    const bridgeData = {
      maestroStatus: "active",
      lastSync: new Date().toISOString(),
      inputsAvailable: syncReport.inputsProcessed,
      cipherVersion: syncReport.cipherVersion,
      communicationChannel: "file-bridge",
    };

    const bridgePath = path.join(cipherBasePath, "maestro-bridge.json");
    await fs.writeFile(bridgePath, JSON.stringify(bridgeData, null, 2));

    // 🎯 Update Maestro Status
    const maestroStatus = {
      cipherConnected: true,
      lastCipherSync: new Date().toISOString(),
      cipherVersion: syncReport.cipherVersion,
      syncReport,
    };

    await fs.ensureDir("maestro-team-reports");
    await fs.writeFile(
      path.join("maestro-team-reports", "cipher-sync-status.json"),
      JSON.stringify(maestroStatus, null, 2)
    );

    syncReport.communicationStatus = "connected";
    spinner.succeed(chalk.green("✅ Cipher sync completed successfully"));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    syncReport.errors.push(errorMessage);
    syncReport.communicationStatus = "error";
    spinner.fail(chalk.red(`❌ Cipher sync failed: ${errorMessage}`));
  }

  // 🤖 CIPHER SYNC REPORT
  console.log(
    chalk.bold.magenta("\n🤖 ========= CIPHER SYNC REPORT ========= 🎸\n")
  );

  const statusColors = {
    connected: chalk.green,
    disconnected: chalk.yellow,
    error: chalk.red,
  };

  const statusEmojis = {
    connected: "🔗",
    disconnected: "⚠️",
    error: "❌",
  };

  const statusColor = statusColors[syncReport.communicationStatus];
  const statusEmoji = statusEmojis[syncReport.communicationStatus];

  console.log(
    statusColor.bold(
      `${statusEmoji} CIPHER STATUS: ${syncReport.communicationStatus.toUpperCase()}`
    )
  );
  console.log(
    chalk.cyan(
      `🤖 Cipher Found: ${syncReport.cipherFound ? "✅ Yes" : "❌ No"}`
    )
  );
  console.log(
    chalk.cyan(`📦 Version: ${syncReport.cipherVersion || "Unknown"}`)
  );
  console.log(chalk.cyan(`📥 Inputs Processed: ${syncReport.inputsProcessed}`));
  console.log(
    chalk.cyan(`📤 Outputs Generated: ${syncReport.outputsGenerated}`)
  );
  console.log(
    chalk.cyan(
      `⏰ Last Activity: ${
        syncReport.lastCipherActivity
          ? new Date(syncReport.lastCipherActivity).toLocaleString()
          : "Unknown"
      }`
    )
  );

  if (syncReport.errors.length > 0) {
    console.log(chalk.red("\n❌ Sync Errors:"));
    syncReport.errors.forEach((error) => {
      console.log(chalk.red(`   • ${error}`));
    });
  }

  // 🎯 Recommendations
  console.log(chalk.bold.yellow("\n🎯 CIPHER RECOMMENDATIONS:\n"));

  const recommendations = {
    connected: [
      "✅ Cipher communication established",
      "🤖 Ready for autonomous development",
      "🔄 Inputs and outputs syncing properly",
    ],
    disconnected: [
      "⚠️ Cipher not found:",
      "   • Install Cipher VS Code extension",
      "   • Check extension location",
      "   • Restart VS Code",
    ],
    error: [
      "❌ Critical communication errors:",
      "   • Review error messages above",
      "   • Check file permissions",
      "   • Verify Cipher installation",
    ],
  };

  const recColor = statusColors[syncReport.communicationStatus];
  recommendations[syncReport.communicationStatus].forEach((rec) => {
    console.log(recColor(rec));
  });

  console.log(
    chalk.bold.magenta("\n🤖 ======================================= 🎸\n")
  );

  return syncReport;
}

// Export for use in other scripts
export type { CipherSyncReport };
export { syncWithCipher };

// Run immediately if called directly
if (require.main === module) {
  syncWithCipher().catch((error) => {
    console.error(chalk.red("\n💥 Cipher sync failed:"), error.message);
    process.exit(1);
  });
}
