#!/usr/bin/env node

import * as fs from "fs-extra";
import chalk from "chalk";
import ora from "ora";

// 🎸 BRETT ROBERTS MAESTRO AI SYSTEM HEALTH CHECK 🎤
console.log(
  chalk.bold.magenta("\n🎸 ============================================= 🎤")
);
console.log(chalk.bold.cyan("     BRETT ROBERTS MAESTRO AI SYSTEM CHECK"));
console.log(
  chalk.bold.magenta("🔥 ============================================= ⚡\n")
);

interface HealthResults {
  folders: { checked: number; found: number; missing: string[] };
  files: { checked: number; found: number; missing: string[] };
  cipher: { active: boolean; version: string | null };
  lastSync: string | null;
  modules: number;
  reports: number;
  status: string;
}

async function maestroHealthCheck(): Promise<HealthResults> {
  const results: HealthResults = {
    folders: { checked: 0, found: 0, missing: [] },
    files: { checked: 0, found: 0, missing: [] },
    cipher: { active: false, version: null },
    lastSync: null,
    modules: 0,
    reports: 0,
    status: "unknown",
  };

  // 🎯 Check Maestro AI Folders
  const spinner1 = ora(
    chalk.yellow("🔍 Scanning Maestro AI folder structure...")
  ).start();

  const requiredFolders = [
    "maestro-ai-input",
    "maestro-modules",
    "maestro-team-reports",
    "maestro-ai-Ava-Cipher",
  ];

  for (const folder of requiredFolders) {
    results.folders.checked++;

    if (await fs.pathExists(folder)) {
      results.folders.found++;
      spinner1.text = chalk.green(`✅ Found: ${folder}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    } else {
      results.folders.missing.push(folder);
      spinner1.text = chalk.red(`❌ Missing: ${folder}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  spinner1.succeed(
    chalk.green(
      `📁 Folder Check: ${results.folders.found}/${results.folders.checked} found`
    )
  );

  // 🎯 Check Essential Files
  const spinner2 = ora(chalk.yellow("🔍 Checking essential files...")).start();

  const requiredFiles = [
    "package.json",
    "tsconfig.json",
    "next.config.js",
    "tailwind.config.js",
  ];

  for (const file of requiredFiles) {
    results.files.checked++;

    if (await fs.pathExists(file)) {
      results.files.found++;
      spinner2.text = chalk.green(`✅ Found: ${file}`);
      await new Promise((resolve) => setTimeout(resolve, 150));
    } else {
      results.files.missing.push(file);
      spinner2.text = chalk.red(`❌ Missing: ${file}`);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  spinner2.succeed(
    chalk.green(
      `📄 Files Check: ${results.files.found}/${results.files.checked} found`
    )
  );

  // 🎯 Check Cipher Extension Integration
  const spinner3 = ora(
    chalk.yellow("🤖 Checking Cipher AI integration...")
  ).start();

  try {
    // Check if VS Code Cipher extension files exist
    const extensionPaths = [
      "../cipher-autonomous-dev/package.json",
      "../cipher-autonomous-dev/extension.ts",
      "../../.vscode/extensions/cipher-autonomous-dev",
    ];

    let cipherFound = false;
    for (const extPath of extensionPaths) {
      if (await fs.pathExists(extPath)) {
        cipherFound = true;
        if (extPath.includes("package.json")) {
          try {
            const packageData = await fs.readJSON(extPath);
            results.cipher.version = packageData.version;
          } catch {
            // Ignore JSON read errors
          }
        }
        break;
      }
    }

    results.cipher.active = cipherFound;
    spinner3.succeed(
      cipherFound
        ? chalk.green(
            `🤖 Cipher Extension: ✅ Active (v${
              results.cipher.version || "unknown"
            })`
          )
        : chalk.yellow(
            "🤖 Cipher Extension: ⚠️ Not detected (may be installed separately)"
          )
    );
  } catch {
    spinner3.fail(chalk.red("🤖 Cipher Extension: ❌ Error checking"));
  }

  // 🎯 Count Generated Modules
  const spinner4 = ora(
    chalk.yellow("📊 Counting generated modules...")
  ).start();

  try {
    if (await fs.pathExists("maestro-modules")) {
      const modules = await fs.readdir("maestro-modules");
      results.modules = modules.filter(
        (file) =>
          file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".jsx")
      ).length;
    }

    if (await fs.pathExists("maestro-team-reports")) {
      const reports = await fs.readdir("maestro-team-reports");
      results.reports = reports.filter(
        (file) => file.endsWith(".md") || file.endsWith(".html")
      ).length;
    }

    spinner4.succeed(
      chalk.green(
        `📊 Generated Content: ${results.modules} modules, ${results.reports} reports`
      )
    );
  } catch {
    spinner4.fail(chalk.red("📊 Error counting generated content"));
  }

  // 🎯 Check Last Sync Time
  const spinner5 = ora(chalk.yellow("⏰ Checking last sync time...")).start();

  try {
    const syncFiles = [
      "maestro-team-reports/last-sync.json",
      "maestro-ai-input/.last-sync",
      ".maestro-sync",
    ];

    let lastSyncTime: Date | null = null;
    for (const syncFile of syncFiles) {
      if (await fs.pathExists(syncFile)) {
        const stats = await fs.stat(syncFile);
        lastSyncTime = stats.mtime;
        break;
      }
    }

    results.lastSync = lastSyncTime ? lastSyncTime.toISOString() : null;

    if (lastSyncTime) {
      const timeAgo = Math.round(
        (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60)
      );
      spinner5.succeed(
        chalk.green(
          `⏰ Last Sync: ${timeAgo} hours ago (${lastSyncTime.toLocaleString()})`
        )
      );
    } else {
      spinner5.succeed(chalk.yellow("⏰ Last Sync: No sync history found"));
    }
  } catch {
    spinner5.fail(chalk.red("⏰ Error checking sync time"));
  }

  // 🎯 Overall System Status
  let overallStatus = "excellent";
  let statusColor = chalk.green;
  let statusEmoji = "🔥";

  if (results.folders.missing.length > 0 || results.files.missing.length > 0) {
    overallStatus = "needs-setup";
    statusColor = chalk.yellow;
    statusEmoji = "⚠️";
  }

  if (results.folders.missing.length > 2 || results.files.missing.length > 2) {
    overallStatus = "critical";
    statusColor = chalk.red;
    statusEmoji = "❌";
  }

  results.status = overallStatus;

  // 🎸 FINAL REPORT
  console.log(
    chalk.bold.magenta("\n🎸 ========= MAESTRO SYSTEM REPORT ========= 🎤\n")
  );

  console.log(
    statusColor.bold(
      `${statusEmoji} OVERALL STATUS: ${overallStatus.toUpperCase()}`
    )
  );
  console.log(
    chalk.cyan(
      `📁 Folders: ${results.folders.found}/${results.folders.checked} ready`
    )
  );
  console.log(
    chalk.cyan(
      `📄 Files: ${results.files.found}/${results.files.checked} present`
    )
  );
  console.log(
    chalk.cyan(
      `🤖 Cipher: ${results.cipher.active ? "✅ Active" : "⚠️ Not detected"}`
    )
  );
  console.log(
    chalk.cyan(
      `📊 Content: ${results.modules} modules, ${results.reports} reports`
    )
  );
  console.log(chalk.cyan(`⏰ Sync: ${results.lastSync ? "Recent" : "Never"}`));

  if (results.folders.missing.length > 0) {
    console.log(chalk.red("\n❌ Missing Folders:"));
    results.folders.missing.forEach((folder) => {
      console.log(chalk.red(`   • ${folder}`));
    });
  }

  if (results.files.missing.length > 0) {
    console.log(chalk.red("\n❌ Missing Files:"));
    results.files.missing.forEach((file) => {
      console.log(chalk.red(`   • ${file}`));
    });
  }

  // 🎸 Recommendations
  console.log(chalk.bold.yellow("\n🎯 RECOMMENDATIONS:\n"));

  if (overallStatus === "excellent") {
    console.log(
      chalk.green("✅ System is ready to rock! All components operational.")
    );
    console.log(chalk.green("🎸 Ready for autonomous development sessions."));
    console.log(chalk.green("🔥 Time to generate some modules, Brett!"));
  } else if (overallStatus === "needs-setup") {
    console.log(chalk.yellow("⚠️ Some setup needed:"));
    if (results.folders.missing.length > 0) {
      console.log(chalk.yellow("   • Run: npm run maestro:setup"));
    }
    if (!results.cipher.active) {
      console.log(chalk.yellow("   • Install Cipher VS Code extension"));
    }
    console.log(chalk.yellow("   • Run: npm run maestro:cipher"));
  } else {
    console.log(chalk.red("❌ Critical setup required:"));
    console.log(chalk.red("   • Run: npm run maestro:setup"));
    console.log(chalk.red("   • Install Cipher VS Code extension"));
    console.log(chalk.red("   • Verify project structure"));
  }

  // 🎸 Brett Roberts Special Footer
  console.log(
    chalk.bold.magenta("\n🎸 ============================================= 🎤")
  );
  console.log(chalk.bold.cyan("           BRETT ROBERTS MAESTRO AI"));
  console.log(chalk.bold.green('        "NOTHIN\' BUT A GOOD TIME!"'));
  console.log(
    chalk.bold.magenta("🔥 ============================================= ⚡\n")
  );

  return results;
}

// Export for use in other scripts
export type { HealthResults };
export { maestroHealthCheck };

// Run the health check
if (require.main === module) {
  maestroHealthCheck().catch((error) => {
    console.error(chalk.red("\n💥 Health check failed:"), error.message);
    process.exit(1);
  });
}
