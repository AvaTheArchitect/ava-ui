#!/usr/bin/env node

import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import ora, { Ora } from "ora";

// 🎸 MAESTRO AI REPORT GENERATOR 📊
console.log(
  chalk.bold.magenta("\n🎸 ======================================= 📊")
);
console.log(chalk.bold.cyan("     MAESTRO AI REPORT GENERATOR"));
console.log(
  chalk.bold.magenta("🔥 ======================================= ⚡\n")
);

interface SystemMetrics {
  totalFiles: number;
  codeFiles: number;
  reportFiles: number;
  lastActivity: string | null;
  folderSizes: Record<string, number>;
}

interface CipherMetrics {
  isActive: boolean;
  version: string | null;
  lastSync: string | null;
  communicationStatus: string;
}

interface MaestroReport {
  timestamp: string;
  reportType: "daily" | "weekly" | "monthly" | "full";
  system: SystemMetrics;
  cipher: CipherMetrics;
  productivity: {
    modulesGenerated: number;
    reportsCreated: number;
    syncOperations: number;
  };
  health: {
    status: "excellent" | "good" | "needs-attention" | "critical";
    score: number;
    issues: string[];
    recommendations: string[];
  };
  summary: string;
}

async function generateMaestroReport(
  reportType: "daily" | "weekly" | "monthly" | "full" = "daily"
): Promise<MaestroReport> {
  const report: MaestroReport = {
    timestamp: new Date().toISOString(),
    reportType,
    system: {
      totalFiles: 0,
      codeFiles: 0,
      reportFiles: 0,
      lastActivity: null,
      folderSizes: {},
    },
    cipher: {
      isActive: false,
      version: null,
      lastSync: null,
      communicationStatus: "unknown",
    },
    productivity: {
      modulesGenerated: 0,
      reportsCreated: 0,
      syncOperations: 0,
    },
    health: {
      status: "good",
      score: 85,
      issues: [],
      recommendations: [],
    },
    summary: "",
  };

  const spinner = ora(chalk.yellow("📊 Generating Maestro report...")).start();

  try {
    // 🎯 Analyze System Metrics
    spinner.text = chalk.yellow("📈 Analyzing system metrics...");
    await analyzeSystemMetrics(report, spinner);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 🎯 Check Cipher Integration
    spinner.text = chalk.yellow("🤖 Checking Cipher integration...");
    await analyzeCipherMetrics(report, spinner);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 🎯 Calculate Productivity Metrics
    spinner.text = chalk.yellow("⚡ Calculating productivity metrics...");
    await analyzeProductivityMetrics(report, reportType, spinner);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 🎯 Health Assessment
    spinner.text = chalk.yellow("🏥 Performing health assessment...");
    await performHealthAssessment(report, spinner);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 🎯 Generate Summary
    spinner.text = chalk.yellow("📝 Generating summary...");
    report.summary = generateReportSummary(report);

    // 🎯 Save Report
    spinner.text = chalk.yellow("💾 Saving report...");
    await saveReport(report);

    spinner.succeed(chalk.green("✅ Maestro report generated successfully"));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    report.health.issues.push(`Report generation error: ${errorMessage}`);
    report.health.status = "critical";
    spinner.fail(chalk.red(`❌ Report generation failed: ${errorMessage}`));
  }

  // 🎸 DISPLAY REPORT
  displayReport(report);

  return report;
}

async function analyzeSystemMetrics(
  report: MaestroReport,
  spinner: Ora
): Promise<void> {
  const folders = [
    "maestro-ai-input",
    "maestro-modules",
    "maestro-team-reports",
    "maestro-ai-Ava-Cipher",
    "walkie-talkie",
    "logs",
  ];

  for (const folder of folders) {
    if (await fs.pathExists(folder)) {
      const files = await fs.readdir(folder);
      const folderSize = files.length;
      report.system.folderSizes[folder] = folderSize;
      report.system.totalFiles += folderSize;

      // Count specific file types
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
          report.system.codeFiles++;
        } else if ([".md", ".html", ".json"].includes(ext)) {
          report.system.reportFiles++;
        }

        // Check for recent activity
        try {
          const filePath = path.join(folder, file);
          const stats = await fs.stat(filePath);
          if (
            !report.system.lastActivity ||
            stats.mtime > new Date(report.system.lastActivity)
          ) {
            report.system.lastActivity = stats.mtime.toISOString();
          }
        } catch {
          // Ignore stat errors
        }
      }

      spinner.text = chalk.green(
        `📁 Analyzed: ${folder} (${folderSize} files)`
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
    } else {
      report.health.issues.push(`Missing folder: ${folder}`);
    }
  }
}

async function analyzeCipherMetrics(
  report: MaestroReport,
  spinner: Ora
): Promise<void> {
  const cipherPaths = [
    "../cipher-autonomous-dev",
    "../../.vscode/extensions/cipher-autonomous-dev",
    "../.vscode-extension-cipher",
  ];

  for (const cipherPath of cipherPaths) {
    if (await fs.pathExists(cipherPath)) {
      report.cipher.isActive = true;
      report.cipher.communicationStatus = "connected";

      // Get version
      const packageJsonPath = path.join(cipherPath, "package.json");
      if (await fs.pathExists(packageJsonPath)) {
        try {
          const packageData = await fs.readJSON(packageJsonPath);
          report.cipher.version = packageData.version;
        } catch {
          // Ignore errors
        }
      }

      // Check last sync
      const syncPaths = [
        path.join("maestro-team-reports", "cipher-sync-status.json"),
        path.join(cipherPath, "maestro-bridge.json"),
      ];

      for (const syncPath of syncPaths) {
        if (await fs.pathExists(syncPath)) {
          try {
            const stats = await fs.stat(syncPath);
            report.cipher.lastSync = stats.mtime.toISOString();
            break;
          } catch {
            // Ignore errors
          }
        }
      }

      spinner.text = chalk.green(
        `🤖 Cipher found: v${report.cipher.version || "unknown"}`
      );
      break;
    }
  }

  if (!report.cipher.isActive) {
    report.cipher.communicationStatus = "disconnected";
    report.health.issues.push("Cipher extension not found");
    spinner.text = chalk.yellow("🤖 Cipher not detected");
  }
}

async function analyzeProductivityMetrics(
  report: MaestroReport,
  reportType: string,
  spinner: Ora
): Promise<void> {
  const timeRanges = {
    daily: 24,
    weekly: 168,
    monthly: 720,
    full: Infinity,
  };

  const hoursBack = timeRanges[reportType as keyof typeof timeRanges] || 24;
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  // Count modules generated
  if (await fs.pathExists("maestro-modules")) {
    const modules = await fs.readdir("maestro-modules");
    for (const moduleFile of modules) {
      if ([".ts", ".tsx", ".js", ".jsx"].includes(path.extname(moduleFile))) {
        try {
          const modulePath = path.join("maestro-modules", moduleFile);
          const stats = await fs.stat(modulePath);
          if (stats.mtime > cutoffTime) {
            report.productivity.modulesGenerated++;
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }

  // Count reports created
  if (await fs.pathExists("maestro-team-reports")) {
    const reports = await fs.readdir("maestro-team-reports");
    for (const reportFile of reports) {
      if ([".md", ".html", ".json"].includes(path.extname(reportFile))) {
        try {
          const reportPath = path.join("maestro-team-reports", reportFile);
          const stats = await fs.stat(reportPath);
          if (stats.mtime > cutoffTime) {
            report.productivity.reportsCreated++;
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }

  // Count sync operations (estimate from logs)
  if (await fs.pathExists("logs")) {
    const logs = await fs.readdir("logs");
    report.productivity.syncOperations = logs.filter(
      (log) => log.includes("sync") && path.extname(log) === ".log"
    ).length;
  }

  spinner.text = chalk.green(
    `⚡ Productivity: ${report.productivity.modulesGenerated} modules, ${report.productivity.reportsCreated} reports`
  );
}

async function performHealthAssessment(
  report: MaestroReport,
  spinner: Ora
): Promise<void> {
  let healthScore = 100;

  // Check folder structure
  const requiredFolders = [
    "maestro-ai-input",
    "maestro-modules",
    "maestro-team-reports",
  ];
  const missingFolders = requiredFolders.filter(
    (folder) => report.system.folderSizes[folder] === undefined
  );

  healthScore -= missingFolders.length * 15;
  missingFolders.forEach((folder) => {
    report.health.issues.push(`Missing required folder: ${folder}`);
  });

  // Check Cipher integration
  if (!report.cipher.isActive) {
    healthScore -= 20;
    report.health.recommendations.push(
      "Install and configure Cipher extension"
    );
  }

  // Check recent activity
  if (report.system.lastActivity) {
    const hoursSinceActivity =
      (Date.now() - new Date(report.system.lastActivity).getTime()) /
      (1000 * 60 * 60);
    if (hoursSinceActivity > 48) {
      healthScore -= 10;
      report.health.issues.push("No recent system activity (48+ hours)");
    }
  } else {
    healthScore -= 15;
    report.health.issues.push("No system activity detected");
  }

  // Check productivity
  if (
    report.productivity.modulesGenerated === 0 &&
    report.reportType === "daily"
  ) {
    healthScore -= 5;
    report.health.recommendations.push(
      "Generate some modules to increase productivity"
    );
  }

  // Set health status
  report.health.score = Math.max(0, healthScore);

  if (healthScore >= 90) {
    report.health.status = "excellent";
  } else if (healthScore >= 75) {
    report.health.status = "good";
  } else if (healthScore >= 50) {
    report.health.status = "needs-attention";
  } else {
    report.health.status = "critical";
  }

  // Add general recommendations
  if (report.health.status !== "excellent") {
    report.health.recommendations.push(
      "Run maestro health check for detailed diagnostics"
    );
    report.health.recommendations.push(
      "Ensure all required folders are present"
    );
  }

  spinner.text = chalk.green(
    `🏥 Health score: ${report.health.score}/100 (${report.health.status})`
  );
}

function generateReportSummary(report: MaestroReport): string {
  const statusEmoji = {
    excellent: "🔥",
    good: "✅",
    "needs-attention": "⚠️",
    critical: "❌",
  };

  return `${statusEmoji[report.health.status]} Maestro AI ${
    report.reportType
  } report shows ${report.health.status} system health (${
    report.health.score
  }/100). Generated ${report.productivity.modulesGenerated} modules and ${
    report.productivity.reportsCreated
  } reports. Cipher integration: ${
    report.cipher.isActive ? "active" : "inactive"
  }. ${report.health.issues.length} issues detected.`;
}

async function saveReport(report: MaestroReport): Promise<void> {
  await fs.ensureDir("maestro-team-reports");

  const timestamp = new Date().toISOString().split("T")[0];
  const reportFilename = `maestro-${report.reportType}-report-${timestamp}.json`;
  const reportPath = path.join("maestro-team-reports", reportFilename);

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  // Also save as markdown
  const markdownContent = generateMarkdownReport(report);
  const markdownPath = path.join(
    "maestro-team-reports",
    `maestro-${report.reportType}-report-${timestamp}.md`
  );
  await fs.writeFile(markdownPath, markdownContent);
}

function generateMarkdownReport(report: MaestroReport): string {
  const statusEmoji = {
    excellent: "🔥",
    good: "✅",
    "needs-attention": "⚠️",
    critical: "❌",
  };

  return `# Maestro AI ${
    report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)
  } Report

**Generated**: ${new Date(report.timestamp).toLocaleString()}

## ${
    statusEmoji[report.health.status]
  } System Health: ${report.health.status.toUpperCase()} (${
    report.health.score
  }/100)

## 📊 System Metrics
- **Total Files**: ${report.system.totalFiles}
- **Code Files**: ${report.system.codeFiles}
- **Report Files**: ${report.system.reportFiles}
- **Last Activity**: ${
    report.system.lastActivity
      ? new Date(report.system.lastActivity).toLocaleString()
      : "Unknown"
  }

### 📁 Folder Breakdown
${Object.entries(report.system.folderSizes)
  .map(([folder, size]) => `- **${folder}**: ${size} files`)
  .join("\n")}

## 🤖 Cipher Integration
- **Status**: ${report.cipher.isActive ? "✅ Active" : "❌ Inactive"}
- **Version**: ${report.cipher.version || "Unknown"}
- **Last Sync**: ${
    report.cipher.lastSync
      ? new Date(report.cipher.lastSync).toLocaleString()
      : "Never"
  }
- **Communication**: ${report.cipher.communicationStatus}

## ⚡ Productivity Metrics
- **Modules Generated**: ${report.productivity.modulesGenerated}
- **Reports Created**: ${report.productivity.reportsCreated}
- **Sync Operations**: ${report.productivity.syncOperations}

${
  report.health.issues.length > 0
    ? `## ❌ Issues Detected
${report.health.issues.map((issue) => `- ${issue}`).join("\n")}`
    : ""
}

${
  report.health.recommendations.length > 0
    ? `## 🎯 Recommendations
${report.health.recommendations.map((rec) => `- ${rec}`).join("\n")}`
    : ""
}

## 📝 Summary
${report.summary}

---
*Generated by Maestro AI Report Generator 🎸*
`;
}

function displayReport(report: MaestroReport): void {
  console.log(
    chalk.bold.magenta("\n🎸 ========= MAESTRO REPORT ========= 📊\n")
  );

  const statusColor =
    report.health.status === "excellent"
      ? chalk.green
      : report.health.status === "good"
      ? chalk.green
      : report.health.status === "needs-attention"
      ? chalk.yellow
      : chalk.red;

  const statusEmoji =
    report.health.status === "excellent"
      ? "🔥"
      : report.health.status === "good"
      ? "✅"
      : report.health.status === "needs-attention"
      ? "⚠️"
      : "❌";

  console.log(
    statusColor.bold(
      `${statusEmoji} HEALTH: ${report.health.status.toUpperCase()} (${
        report.health.score
      }/100)`
    )
  );
  console.log(
    chalk.cyan(
      `📊 Files: ${report.system.totalFiles} total (${report.system.codeFiles} code, ${report.system.reportFiles} reports)`
    )
  );
  console.log(
    chalk.cyan(
      `🤖 Cipher: ${report.cipher.isActive ? "✅ Active" : "❌ Inactive"} (${
        report.cipher.communicationStatus
      })`
    )
  );
  console.log(
    chalk.cyan(
      `⚡ Productivity: ${report.productivity.modulesGenerated} modules, ${report.productivity.reportsCreated} reports`
    )
  );

  if (report.health.issues.length > 0) {
    console.log(chalk.red(`\n❌ Issues (${report.health.issues.length}):`));
    report.health.issues.slice(0, 3).forEach((issue) => {
      console.log(chalk.red(`   • ${issue}`));
    });
    if (report.health.issues.length > 3) {
      console.log(
        chalk.red(`   • ... and ${report.health.issues.length - 3} more`)
      );
    }
  }

  console.log(
    chalk.bold.magenta("\n🎸 ====================================== 📊\n")
  );
}

// Export for use in other scripts
export type { MaestroReport };
export { generateMaestroReport };

// Run immediately if called directly
if (require.main === module) {
  const reportType =
    (process.argv[2] as "daily" | "weekly" | "monthly" | "full") || "daily";
  generateMaestroReport(reportType).catch((error) => {
    console.error(chalk.red("\n💥 Report generation failed:"), error.message);
    process.exit(1);
  });
}
