// ===== MAESTRO GUARD SYSTEM =====
// Location: /Users/brettbolzenthal/Desktop/maestro-ai/tools/MaestroGuard.ts
// Purpose: Protect Maestro.ai files from Cipher operations with intelligent backup

import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";

export interface BackupConfig {
  projectRoot: string;
  backupRoot: string;
  protectedFolders: string[];
  excludePatterns: string[];
  maxBackupVersions: number;
}

export interface FileOperation {
  type: "create" | "update" | "delete";
  sourcePath: string;
  targetPath: string;
  content?: string;
  requester: "cipher" | "maestro" | "system";
  timestamp?: string;
}

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  originalHash: string;
  timestamp: string;
  operation: FileOperation;
  error?: string;
}

export class MaestroGuard {
  private config: BackupConfig;
  private operationLog: FileOperation[] = [];

  constructor(config: BackupConfig) {
    this.config = config;
    this.ensureBackupStructure();
  }

  // ===== CORE PROTECTION METHODS =====

  /**
   * Main protection method - call before ANY file operation
   */
  async protectAndExecute(operation: FileOperation): Promise<BackupResult> {
    try {
      console.log(
        `🛡️ MaestroGuard: Protecting ${operation.type} operation on ${operation.targetPath}`
      );

      // 1. Check if file needs protection
      if (!this.needsProtection(operation.targetPath)) {
        return this.executeWithoutBackup(operation);
      }

      // 2. Create backup if file exists
      const backupResult = await this.createBackup(operation);

      // 3. Execute the operation safely
      this.executeOperation(operation);

      // 4. Log the operation
      this.logOperation(operation);

      return {
        ...backupResult,
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`🚨 MaestroGuard: Operation failed:`, errorMessage);
      return {
        success: false,
        originalHash: "",
        timestamp: new Date().toISOString(),
        operation,
        error: errorMessage,
      };
    }
  }

  /**
   * Scan for existing files before bulk operations
   */
  async scanAndPrepare(targetFolder: string): Promise<{
    existingFiles: string[];
    needsBackup: string[];
    needsIndexFile: string[];
  }> {
    console.log(`🔍 MaestroGuard: Scanning ${targetFolder}`);

    const result: {
      existingFiles: string[];
      needsBackup: string[];
      needsIndexFile: string[];
    } = {
      existingFiles: [] as string[],
      needsBackup: [] as string[],
      needsIndexFile: [] as string[],
    };

    if (!fs.existsSync(targetFolder)) {
      return result;
    }

    const files = this.getAllFiles(targetFolder);
    result.existingFiles = files;

    // Check which files need backup
    result.needsBackup = files.filter((file) => this.needsProtection(file));

    // Check which folders need index.ts
    const foldersNeedingIndex = this.findFoldersNeedingIndex(targetFolder);
    result.needsIndexFile = foldersNeedingIndex;

    console.log(`📊 Scan Results:`, {
      total: result.existingFiles.length,
      needBackup: result.needsBackup.length,
      needIndex: result.needsIndexFile.length,
    });

    return result;
  }

  /**
   * Auto-manage index.ts files (Step 2 requirement)
   */
  manageIndexFiles(folderPath: string): void {
    const foldersNeedingIndex = this.findFoldersNeedingIndex(folderPath);

    for (const folder of foldersNeedingIndex) {
      this.createOrUpdateIndexFile(folder);
    }
  }

  // ===== BACKUP MANAGEMENT =====

  private async createBackup(operation: FileOperation): Promise<BackupResult> {
    const targetPath = operation.targetPath;

    if (!fs.existsSync(targetPath)) {
      return {
        success: true,
        originalHash: "",
        timestamp: new Date().toISOString(),
        operation,
      };
    }

    const content = fs.readFileSync(targetPath, "utf8");
    const hash = this.generateHash(content);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const relativePath = path.relative(this.config.projectRoot, targetPath);
    const backupDir = path.join(
      this.config.backupRoot,
      path.dirname(relativePath)
    );
    const backupFileName = `${path.basename(targetPath)}.backup-${timestamp}`;
    const backupPath = path.join(backupDir, backupFileName);

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create backup
    fs.writeFileSync(backupPath, content);

    // Create metadata
    const metadata = {
      originalPath: targetPath,
      hash,
      timestamp,
      operation: operation.type,
      requester: operation.requester,
    };

    fs.writeFileSync(
      `${backupPath}.meta.json`,
      JSON.stringify(metadata, null, 2)
    );

    console.log(`💾 Backup created: ${backupPath}`);

    // Cleanup old backups
    this.cleanupOldBackups(backupDir, path.basename(targetPath));

    return {
      success: true,
      backupPath,
      originalHash: hash,
      timestamp,
      operation,
    };
  }

  // ===== PROTECTION LOGIC =====

  private needsProtection(filePath: string): boolean {
    const relativePath = path.relative(this.config.projectRoot, filePath);

    // Check if in protected folders
    const isInProtectedFolder = this.config.protectedFolders.some((folder) =>
      relativePath.startsWith(folder)
    );

    if (!isInProtectedFolder) {
      return false;
    }

    // Check exclude patterns
    const isExcluded = this.config.excludePatterns.some((pattern) =>
      relativePath.includes(pattern)
    );

    return !isExcluded;
  }

  private findFoldersNeedingIndex(rootPath: string): string[] {
    const foldersNeedingIndex: string[] = [];

    const scanFolder = (folderPath: string) => {
      if (
        !fs.existsSync(folderPath) ||
        !fs.statSync(folderPath).isDirectory()
      ) {
        return;
      }

      const items = fs.readdirSync(folderPath);
      const files = items.filter((item) => {
        const fullPath = path.join(folderPath, item);
        return (
          fs.statSync(fullPath).isFile() &&
          (item.endsWith(".ts") || item.endsWith(".tsx")) &&
          item !== "index.ts"
        );
      });

      // Check if folder needs index.ts
      if (files.length >= 2 && !this.shouldSkipIndexFile(folderPath)) {
        const indexPath = path.join(folderPath, "index.ts");
        if (!fs.existsSync(indexPath)) {
          foldersNeedingIndex.push(folderPath);
        }
      }

      // Recursively scan subfolders
      const subfolders = items.filter((item) => {
        const fullPath = path.join(folderPath, item);
        return fs.statSync(fullPath).isDirectory() && !item.startsWith(".");
      });

      subfolders.forEach((subfolder) => {
        scanFolder(path.join(folderPath, subfolder));
      });
    };

    scanFolder(rootPath);
    return foldersNeedingIndex;
  }

  private shouldSkipIndexFile(folderPath: string): boolean {
    const skipPatterns = [
      "test",
      "tests",
      "__tests__",
      "spec",
      "__spec__",
      "shared",
      "utils",
      "utilities",
      "scripts",
      "tools",
      ".vscode",
      ".git",
      "node_modules",
    ];

    const folderName = path.basename(folderPath).toLowerCase();
    return skipPatterns.some((pattern) => folderName.includes(pattern));
  }

  private createOrUpdateIndexFile(folderPath: string): void {
    const indexPath = path.join(folderPath, "index.ts");
    const files = fs
      .readdirSync(folderPath)
      .filter(
        (file) =>
          (file.endsWith(".ts") || file.endsWith(".tsx")) && file !== "index.ts"
      );

    const exports = files
      .map((file) => {
        const baseName = path.basename(file, path.extname(file));
        return `export * from './${baseName}';`;
      })
      .join("\n");

    const indexContent = `// Auto-generated index file\n// Generated by MaestroGuard on ${new Date().toISOString()}\n\n${exports}\n`;

    if (fs.existsSync(indexPath)) {
      // Simple backup for existing index
      const backupPath = `${indexPath}.backup`;
      let counter = 1;
      let finalBackupPath = backupPath;
      while (fs.existsSync(finalBackupPath)) {
        finalBackupPath = `${indexPath}.backup${counter}`;
        counter++;
      }
      fs.copyFileSync(indexPath, finalBackupPath);
      console.log(`💾 Backed up index.ts: ${path.basename(finalBackupPath)}`);
    }

    fs.writeFileSync(indexPath, indexContent);
    console.log(
      `📄 ${
        fs.existsSync(indexPath) ? "Updated" : "Created"
      } index.ts: ${indexPath}`
    );
  }

  // ===== UTILITY METHODS =====

  private executeOperation(operation: FileOperation): void {
    switch (operation.type) {
      case "create":
      case "update":
        if (operation.content !== undefined) {
          const dir = path.dirname(operation.targetPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(operation.targetPath, operation.content);
        }
        break;
      case "delete":
        if (fs.existsSync(operation.targetPath)) {
          fs.unlinkSync(operation.targetPath);
        }
        break;
    }
  }

  private executeWithoutBackup(operation: FileOperation): BackupResult {
    this.executeOperation(operation);
    return {
      success: true,
      originalHash: "",
      timestamp: new Date().toISOString(),
      operation,
    };
  }

  private getAllFiles(dir: string): string[] {
    const files: string[] = [];

    const scanDir = (currentDir: string) => {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith(".")) {
          scanDir(fullPath);
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      }
    };

    scanDir(dir);
    return files;
  }

  private generateHash(content: string): string {
    return createHash("md5").update(content).digest("hex");
  }

  private ensureBackupStructure(): void {
    if (!fs.existsSync(this.config.backupRoot)) {
      fs.mkdirSync(this.config.backupRoot, { recursive: true });
    }
  }

  private cleanupOldBackups(backupDir: string, fileName: string): void {
    const backupFiles = fs
      .readdirSync(backupDir)
      .filter((file) => file.startsWith(fileName + ".backup-"))
      .map((file) => ({
        name: file,
        path: path.join(backupDir, file),
        mtime: fs.statSync(path.join(backupDir, file)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Keep only the latest versions
    const toDelete = backupFiles.slice(this.config.maxBackupVersions);

    for (const backup of toDelete) {
      fs.unlinkSync(backup.path);
      // Also delete metadata file
      const metaPath = `${backup.path}.meta.json`;
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
      }
    }
  }

  private logOperation(operation: FileOperation): void {
    const operationWithTimestamp = {
      ...operation,
      timestamp: new Date().toISOString(),
    };

    this.operationLog.push(operationWithTimestamp);

    // Keep log manageable
    if (this.operationLog.length > 1000) {
      this.operationLog = this.operationLog.slice(-500);
    }
  }

  // ===== PUBLIC API =====

  getOperationHistory(): FileOperation[] {
    return [...this.operationLog];
  }

  async restoreFile(backupPath: string): Promise<boolean> {
    try {
      const metaPath = `${backupPath}.meta.json`;
      if (!fs.existsSync(metaPath)) {
        throw new Error("Backup metadata not found");
      }

      const metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      const backupContent = fs.readFileSync(backupPath, "utf8");

      fs.writeFileSync(metadata.originalPath, backupContent);
      console.log(`🔄 Restored: ${metadata.originalPath}`);

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Restore failed:", errorMessage);
      return false;
    }
  }
}

// ===== DEFAULT CONFIGURATION =====
export const createMaestroGuardConfig = (
  projectRoot: string
): BackupConfig => ({
  projectRoot,
  backupRoot: path.join(projectRoot, ".maestro-backups"),
  protectedFolders: [
    "src/components",
    "src/modules",
    "src/app",
    "src/hooks",
    "src/lib",
    "src/utils",
    "src/types",
    "src/pages",
  ],
  excludePatterns: [
    "node_modules",
    ".git",
    ".vscode",
    "dist",
    "build",
    ".next",
    "coverage",
    "__tests__",
    ".test.",
    ".spec.",
  ],
  maxBackupVersions: 5,
});
