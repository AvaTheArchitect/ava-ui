#!/usr/bin/env node

import * as fs from "fs-extra";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";

// 🎸 MAESTRO AI FOLDER SETUP 🎤
console.log(
  chalk.bold.magenta("\n🎸 ======================================= 🎤")
);
console.log(chalk.bold.cyan("     MAESTRO AI FOLDER SETUP"));
console.log(
  chalk.bold.magenta("🔥 ======================================= ⚡\n")
);

interface FolderSetupReport {
  timestamp: string;
  foldersCreated: string[];
  foldersExisted: string[];
  filesCreated: string[];
  errors: string[];
  status: "success" | "partial" | "error";
}

interface FolderConfig {
  name: string;
  description: string;
  createGitkeep: boolean;
  createReadme: boolean;
  subdirectories?: string[];
}

const MAESTRO_FOLDERS: FolderConfig[] = [
  {
    name: "maestro-ai-input",
    description: "Input files for AI processing",
    createGitkeep: true,
    createReadme: true,
    subdirectories: ["specs", "requests", "commands"],
  },
  {
    name: "maestro-modules",
    description: "Generated code modules and components",
    createGitkeep: true,
    createReadme: true,
    subdirectories: ["components", "hooks", "utils", "types"],
  },
  {
    name: "maestro-team-reports",
    description: "Team reports and analytics",
    createGitkeep: true,
    createReadme: true,
    subdirectories: ["daily", "weekly", "monthly", "sync-logs"],
  },
  {
    name: "maestro-ai-Ava-Cipher",
    description: "Ava and Cipher integration files",
    createGitkeep: true,
    createReadme: true,
    subdirectories: ["communications", "logs", "configs"],
  },
  {
    name: "walkie-talkie",
    description: "Communication bridge between AI systems",
    createGitkeep: true,
    createReadme: true,
    subdirectories: ["incoming", "outgoing", "processed"],
  },
  {
    name: "logs",
    description: "System logs and monitoring",
    createGitkeep: true,
    createReadme: false,
    subdirectories: ["daily", "errors", "sync"],
  },
  {
    name: "scripts",
    description: "Automation and utility scripts",
    createGitkeep: false,
    createReadme: true,
  },
];

async function setupMaestroFolders(): Promise<FolderSetupReport> {
  const setupReport: FolderSetupReport = {
    timestamp: new Date().toISOString(),
    foldersCreated: [],
    foldersExisted: [],
    filesCreated: [],
    errors: [],
    status: "success",
  };

  const spinner = ora(
    chalk.yellow("🗂️ Setting up Maestro folder structure...")
  ).start();

  try {
    for (const folderConfig of MAESTRO_FOLDERS) {
      const { name, description, createGitkeep, createReadme, subdirectories } =
        folderConfig;

      spinner.text = chalk.yellow(`📁 Processing: ${name}`);

      // Create main folder
      if (await fs.pathExists(name)) {
        setupReport.foldersExisted.push(name);
        spinner.text = chalk.blue(`📁 Exists: ${name}`);
      } else {
        await fs.ensureDir(name);
        setupReport.foldersCreated.push(name);
        spinner.text = chalk.green(`📁 Created: ${name}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Create subdirectories if specified
      if (subdirectories) {
        for (const subdir of subdirectories) {
          const subdirPath = path.join(name, subdir);

          if (!(await fs.pathExists(subdirPath))) {
            await fs.ensureDir(subdirPath);
            setupReport.foldersCreated.push(subdirPath);

            spinner.text = chalk.green(`📂 Created subdir: ${subdirPath}`);
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      }

      // Create .gitkeep files if needed
      if (createGitkeep) {
        const gitkeepPath = path.join(name, ".gitkeep");
        if (!(await fs.pathExists(gitkeepPath))) {
          await fs.writeFile(
            gitkeepPath,
            `# ${description}\n# This file keeps the directory in git\n`
          );
          setupReport.filesCreated.push(gitkeepPath);
        }

        // Add .gitkeep to subdirectories too
        if (subdirectories) {
          for (const subdir of subdirectories) {
            const subdirGitkeep = path.join(name, subdir, ".gitkeep");
            if (!(await fs.pathExists(subdirGitkeep))) {
              await fs.writeFile(subdirGitkeep, `# ${subdir} directory\n`);
              setupReport.filesCreated.push(subdirGitkeep);
            }
          }
        }
      }

      // Create README files if needed
      if (createReadme) {
        const readmePath = path.join(name, "README.md");
        if (!(await fs.pathExists(readmePath))) {
          const readmeContent = generateReadmeContent(
            name,
            description,
            subdirectories
          );
          await fs.writeFile(readmePath, readmeContent);
          setupReport.filesCreated.push(readmePath);
        }
      }
    }

    // Create main project configuration files
    spinner.text = chalk.yellow("⚙️ Creating configuration files...");

    await createProjectConfigFiles(setupReport);

    // Create package.json scripts if needed
    await updatePackageJsonScripts(setupReport);

    spinner.succeed(chalk.green("✅ Maestro folder setup completed"));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setupReport.errors.push(errorMessage);
    setupReport.status = "error";
    spinner.fail(chalk.red(`❌ Setup failed: ${errorMessage}`));
  }

  // Determine final status
  if (setupReport.errors.length > 0) {
    setupReport.status =
      setupReport.foldersCreated.length > 0 ? "partial" : "error";
  }

  // 🎸 SETUP REPORT
  console.log(
    chalk.bold.magenta("\n🎸 ========= FOLDER SETUP REPORT ========= 🎤\n")
  );

  const statusColor =
    setupReport.status === "success"
      ? chalk.green
      : setupReport.status === "partial"
      ? chalk.yellow
      : chalk.red;
  const statusEmoji =
    setupReport.status === "success"
      ? "✅"
      : setupReport.status === "partial"
      ? "⚠️"
      : "❌";

  console.log(
    statusColor.bold(
      `${statusEmoji} SETUP STATUS: ${setupReport.status.toUpperCase()}`
    )
  );
  console.log(
    chalk.cyan(`📁 Folders Created: ${setupReport.foldersCreated.length}`)
  );
  console.log(
    chalk.cyan(`📂 Folders Existed: ${setupReport.foldersExisted.length}`)
  );
  console.log(
    chalk.cyan(`📄 Files Created: ${setupReport.filesCreated.length}`)
  );

  if (setupReport.foldersCreated.length > 0) {
    console.log(chalk.green("\n✅ New Folders:"));
    setupReport.foldersCreated.forEach((folder) => {
      console.log(chalk.green(`   • ${folder}`));
    });
  }

  if (setupReport.filesCreated.length > 0) {
    console.log(chalk.green("\n📄 New Files:"));
    setupReport.filesCreated.forEach((file) => {
      console.log(chalk.green(`   • ${file}`));
    });
  }

  if (setupReport.errors.length > 0) {
    console.log(chalk.red("\n❌ Errors:"));
    setupReport.errors.forEach((error) => {
      console.log(chalk.red(`   • ${error}`));
    });
  }

  console.log(
    chalk.bold.magenta("\n🎸 ======================================= 🎤\n")
  );

  return setupReport;
}

function generateReadmeContent(
  folderName: string,
  description: string,
  subdirectories?: string[]
): string {
  let content = `# ${folderName}

${description}

## Purpose
This directory is part of the Maestro AI system for autonomous development.

`;

  if (subdirectories && subdirectories.length > 0) {
    content += `## Structure
`;
    subdirectories.forEach((subdir) => {
      content += `- \`${subdir}/\` - ${subdir} related files\n`;
    });
    content += `\n`;
  }

  content += `## Usage
This folder is automatically managed by Maestro AI scripts. Files placed here will be processed according to the AI workflow.

---
*Part of Brett Roberts Maestro AI System 🎸*
`;

  return content;
}

async function createProjectConfigFiles(
  setupReport: FolderSetupReport
): Promise<void> {
  // Create .maestrorc.json if it doesn't exist
  const maestroConfig = {
    version: "1.0.0",
    folders: MAESTRO_FOLDERS.map((f) => f.name),
    syncInterval: 3600000, // 1 hour
    features: {
      autoSync: true,
      cipherIntegration: true,
      reporting: true,
    },
    lastSetup: new Date().toISOString(),
  };

  const configPath = ".maestrorc.json";
  if (!(await fs.pathExists(configPath))) {
    await fs.writeFile(configPath, JSON.stringify(maestroConfig, null, 2));
    setupReport.filesCreated.push(configPath);
  }

  // Create .gitignore additions for Maestro
  const gitignorePath = ".gitignore";
  const maestroGitignore = `
# Maestro AI generated files
maestro-team-reports/*.log
logs/*.log
maestro-ai-input/.temp/
*.maestro-temp
.maestro-cache/
`;

  if (await fs.pathExists(gitignorePath)) {
    const existingGitignore = await fs.readFile(gitignorePath, "utf8");
    if (!existingGitignore.includes("# Maestro AI generated files")) {
      await fs.appendFile(gitignorePath, maestroGitignore);
      setupReport.filesCreated.push(`${gitignorePath} (updated)`);
    }
  } else {
    await fs.writeFile(gitignorePath, maestroGitignore);
    setupReport.filesCreated.push(gitignorePath);
  }
}

async function updatePackageJsonScripts(
  setupReport: FolderSetupReport
): Promise<void> {
  const packageJsonPath = "package.json";

  if (await fs.pathExists(packageJsonPath)) {
    try {
      const packageJson = await fs.readJSON(packageJsonPath);

      const maestroScripts = {
        "maestro:health": "node scripts/maestro-health-check.js",
        "maestro:sync": "node scripts/daily-team-sync.js",
        "maestro:cipher": "node scripts/sync-with-cipher.js",
        "maestro:setup": "node scripts/setup-maestro-folders.js",
        "maestro:report": "node scripts/generate-maestro-report.js",
        "maestro:watch": "node scripts/maestro-watcher.js",
      };

      packageJson.scripts = packageJson.scripts || {};

      let scriptsAdded = false;
      for (const [scriptName, scriptCommand] of Object.entries(
        maestroScripts
      )) {
        if (!packageJson.scripts[scriptName]) {
          packageJson.scripts[scriptName] = scriptCommand;
          scriptsAdded = true;
        }
      }

      if (scriptsAdded) {
        await fs.writeFile(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2)
        );
        setupReport.filesCreated.push(`${packageJsonPath} (scripts updated)`);
      }
    } catch {
      setupReport.errors.push("Failed to update package.json scripts");
    }
  }
}

// Export for use in other scripts
export type { FolderSetupReport };
export { setupMaestroFolders };

// Run immediately if called directly
if (require.main === module) {
  setupMaestroFolders().catch((error) => {
    console.error(chalk.red("\n💥 Folder setup failed:"), error.message);
    process.exit(1);
  });
}
