#!/usr/bin/env node

import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";

// 🎸 MAESTRO AI DAILY TEAM SYNC 🎤
console.log(
  chalk.bold.magenta("\n🎸 ======================================= 🎤")
);
console.log(chalk.bold.cyan("     MAESTRO AI DAILY TEAM SYNC"));
console.log(
  chalk.bold.magenta("🔥 ======================================= ⚡\n")
);

interface SyncReport {
  timestamp: string;
  modules: {
    total: number;
    new: number;
    updated: number;
  };
  reports: {
    total: number;
    generated: number;
  };
  cipher: {
    active: boolean;
    lastActivity: string | null;
  };
  status: "success" | "warning" | "error";
  errors: string[];
}

async function dailyTeamSync(): Promise<SyncReport> {
  const syncReport: SyncReport = {
    timestamp: new Date().toISOString(),
    modules: { total: 0, new: 0, updated: 0 },
    reports: { total: 0, generated: 0 },
    cipher: { active: false, lastActivity: null },
    status: "success",
    errors: [],
  };

  const spinner = ora(chalk.yellow("🔄 Starting daily team sync...")).start();

  try {
    // 🎯 Sync Maestro Modules
    spinner.text = chalk.yellow("📊 Synchronizing Maestro modules...");

    if (await fs.pathExists("maestro-modules")) {
      const modules = await fs.readdir("maestro-modules");
      const codeFiles = modules.filter(
        (file) =>
          file.endsWith(".tsx") || file.endsWith(".ts") || file.endsWith(".jsx")
      );

      syncReport.modules.total = codeFiles.length;

      // Check for recent modules (last 24 hours)
      for (const moduleFile of codeFiles) {
        const modulePath = path.join("maestro-modules", moduleFile);
        try {
          const stats = await fs.stat(modulePath);
          const hoursSinceModified =
            (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

          if (hoursSinceModified <= 24) {
            syncReport.modules.new++;
          }
        } catch {
          // Ignore stat errors for individual files
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 🎯 Sync Team Reports
    spinner.text = chalk.yellow("📈 Synchronizing team reports...");

    if (await fs.pathExists("maestro-team-reports")) {
      const reports = await fs.readdir("maestro-team-reports");
      const reportFiles = reports.filter(
        (file) =>
          file.endsWith(".md") ||
          file.endsWith(".html") ||
          file.endsWith(".json")
      );

      syncReport.reports.total = reportFiles.length;

      // Generate daily report if needed
      const todayReport = `daily-sync-${
        new Date().toISOString().split("T")[0]
      }.md`;
      const reportPath = path.join("maestro-team-reports", todayReport);

      if (!(await fs.pathExists(reportPath))) {
        const reportContent = generateDailySyncReport(syncReport);
        await fs.writeFile(reportPath, reportContent);
        syncReport.reports.generated++;
        spinner.text = chalk.green(`📝 Generated: ${todayReport}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // 🎯 Check Cipher Status
    spinner.text = chalk.yellow("🤖 Checking Cipher integration...");

    const cipherPaths = [
      "../cipher-autonomous-dev",
      "../../.vscode/extensions/cipher-autonomous-dev",
    ];

    for (const cipherPath of cipherPaths) {
      if (await fs.pathExists(cipherPath)) {
        syncReport.cipher.active = true;
        try {
          const stats = await fs.stat(cipherPath);
          syncReport.cipher.lastActivity = stats.mtime.toISOString();
        } catch {
          // Ignore stat errors for cipher path
        }
        break;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 🎯 Update Sync Timestamp
    spinner.text = chalk.yellow("⏰ Updating sync timestamp...");

    const syncData = {
      lastSync: new Date().toISOString(),
      report: syncReport,
    };

    await fs.ensureDir("maestro-team-reports");
    await fs.writeFile(
      path.join("maestro-team-reports", "last-sync.json"),
      JSON.stringify(syncData, null, 2)
    );

    spinner.succeed(chalk.green("✅ Daily team sync completed successfully"));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    syncReport.errors.push(errorMessage);
    syncReport.status = "error";
    spinner.fail(chalk.red(`❌ Sync failed: ${errorMessage}`));
  }

  // 🎸 SYNC REPORT
  console.log(
    chalk.bold.magenta("\n🎸 ========= DAILY SYNC REPORT ========= 🎤\n")
  );

  const statusColors = {
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
  };

  const statusEmojis = {
    success: "✅",
    warning: "⚠️",
    error: "❌",
  };

  const statusColor = statusColors[syncReport.status];
  const statusEmoji = statusEmojis[syncReport.status];

  console.log(
    statusColor.bold(
      `${statusEmoji} SYNC STATUS: ${syncReport.status.toUpperCase()}`
    )
  );
  console.log(
    chalk.cyan(
      `📊 Modules: ${syncReport.modules.total} total, ${syncReport.modules.new} new today`
    )
  );
  console.log(
    chalk.cyan(
      `📈 Reports: ${syncReport.reports.total} total, ${syncReport.reports.generated} generated`
    )
  );
  console.log(
    chalk.cyan(
      `🤖 Cipher: ${syncReport.cipher.active ? "✅ Active" : "⚠️ Not detected"}`
    )
  );
  console.log(chalk.cyan(`⏰ Sync Time: ${new Date().toLocaleString()}`));

  if (syncReport.errors.length > 0) {
    console.log(chalk.red("\n❌ Errors:"));
    syncReport.errors.forEach((error) => {
      console.log(chalk.red(`   • ${error}`));
    });
  }

  console.log(
    chalk.bold.magenta("\n🎸 ======================================= 🎤\n")
  );

  return syncReport;
}

function generateDailySyncReport(syncReport: SyncReport): string {
  return `# Daily Maestro Sync Report - ${new Date().toDateString()}

## 🎸 System Status
- **Sync Status**: ${syncReport.status.toUpperCase()}
- **Timestamp**: ${syncReport.timestamp}

## 📊 Module Statistics
- **Total Modules**: ${syncReport.modules.total}
- **New Today**: ${syncReport.modules.new}
- **Updated**: ${syncReport.modules.updated}

## 📈 Report Statistics  
- **Total Reports**: ${syncReport.reports.total}
- **Generated Today**: ${syncReport.reports.generated}

## 🤖 Cipher Integration
- **Status**: ${syncReport.cipher.active ? "Active" : "Not Detected"}
- **Last Activity**: ${syncReport.cipher.lastActivity || "Unknown"}

## 🎯 Next Actions
${
  syncReport.status === "success"
    ? "- ✅ All systems operational\n- 🎸 Ready for autonomous development\n- 🔥 Continue generating modules"
    : "- ⚠️ Review errors above\n- 🔧 Check system configuration\n- 🤖 Verify Cipher integration"
}

---
*Generated by Maestro AI Daily Sync - "Nothin' but a good time!" 🎸*
`;
}

// Export for use in other scripts
export type { SyncReport };
export { dailyTeamSync };

// Run immediately if called directly
if (require.main === module) {
  dailyTeamSync().catch((error) => {
    console.error(chalk.red("\n💥 Daily sync failed:"), error.message);
    process.exit(1);
  });
}
