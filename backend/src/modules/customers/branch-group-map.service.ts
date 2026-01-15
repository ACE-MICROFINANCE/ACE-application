import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

type BranchGroupMapRecord = {
  Branch: string;
  GroupCode: string;
  GroupName: string;
};

type ResolveResult = {
  found: boolean;
  normalizedGroupName: string | null;
  groupCode?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  reason?: 'NOT_FOUND' | 'CONFLICT' | 'INVALID' | null; // CHANGED: diagnostics for debug sync
};

@Injectable()
export class BranchGroupMapService {
  private readonly logger = new Logger(BranchGroupMapService.name);
  private static mapIndex: Map<string, BranchGroupMapRecord[]> | null = null;
  private static sourcePath: string | null = null;

  resolveGroupName(
    rawGroupName: string,
    context?: { memberNo?: string },
  ): ResolveResult {
    const normalized = this.normalizeGroupName(rawGroupName);
    if (!normalized) {
      return { found: false, normalizedGroupName: null, reason: 'INVALID' }; // CHANGED: invalid input
    }

    const index = this.ensureLoaded();
    const matches = index.get(normalized) ?? [];
    if (!matches.length) {
      this.logger.warn(
        `[BRANCH-MAP] GroupName not found memberNo=${context?.memberNo ?? 'unknown'} groupName="${rawGroupName}" normalized="${normalized}"`,
      ); // CHANGED: log missing group mapping
      return { found: false, normalizedGroupName: normalized, reason: 'NOT_FOUND' };
    }

    const uniqueKeySet = new Set(matches.map((item) => `${item.GroupCode}::${item.Branch}`));
    if (uniqueKeySet.size > 1) {
      this.logger.error(
        `[BRANCH-MAP] GroupName conflict memberNo=${context?.memberNo ?? 'unknown'} groupName="${rawGroupName}" normalized="${normalized}"`,
      ); // CHANGED: log conflict mapping
      return { found: false, normalizedGroupName: normalized, reason: 'CONFLICT' };
    }

    const picked = matches[0];
    const { branchId, branchName } = this.parseBranch(picked.Branch);
    if (!picked.GroupCode || !branchId || !branchName) {
      this.logger.error(
        `[BRANCH-MAP] Invalid mapping memberNo=${context?.memberNo ?? 'unknown'} groupName="${rawGroupName}" normalized="${normalized}"`,
      ); // CHANGED: log invalid mapping
      return { found: false, normalizedGroupName: normalized, reason: 'INVALID' };
    }

    return {
      found: true,
      normalizedGroupName: normalized,
      groupCode: String(picked.GroupCode).trim(),
      branchId,
      branchName,
      reason: null, // CHANGED: resolved ok
    };
  }

  listGroupsByBranchCode(branchCode: string | null | undefined) {
    if (!branchCode) return []; // CHANGED: no branch to resolve
    const normalizedBranchCode = branchCode.trim();
    if (!normalizedBranchCode) return []; // CHANGED: guard empty branch code
    const branchIdInput = normalizedBranchCode.includes('-')
      ? normalizedBranchCode.split('-')[0].trim()
      : normalizedBranchCode; // CHANGED: accept "003" or "003-DIEN BIEN 3"

    const index = this.ensureLoaded();
    const uniqueGroups = new Map<
      string,
      { groupCode: string; groupName: string; branchId: string; branchName: string | null }
    >(); // CHANGED: de-dup by groupCode

    for (const records of index.values()) {
      for (const record of records) {
        const { branchId, branchName } = this.parseBranch(record.Branch);
        if (!branchId || branchId !== branchIdInput) continue;
        const groupCode = String(record.GroupCode ?? '').trim();
        const groupName = String(record.GroupName ?? '').trim();
        if (!groupCode || !groupName) continue;
        if (!uniqueGroups.has(groupCode)) {
          uniqueGroups.set(groupCode, {
            groupCode,
            groupName,
            branchId,
            branchName,
          });
        }
      }
    }

    return Array.from(uniqueGroups.values()).sort((a, b) =>
      a.groupName.localeCompare(b.groupName),
    ); // CHANGED: stable order by groupName
  }

  listBranches() {
    const index = this.ensureLoaded();
    const branches = new Map<string, { branchCode: string; branchName: string | null; displayName: string }>();

    for (const records of index.values()) {
      for (const record of records) {
        const { branchId, branchName } = this.parseBranch(record.Branch);
        if (!branchId) continue;
        if (!branches.has(branchId)) {
          const displayName = branchName ? `${branchId}-${branchName}` : branchId;
          branches.set(branchId, {
            branchCode: branchId,
            branchName,
            displayName,
          }); // CHANGED: build unique branch list for staff management
        }
      }
    }

    return Array.from(branches.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    ); // CHANGED: stable order by display name
  }

  resolveBranchByCode(branchCode?: string | null) {
    if (!branchCode) return null;
    const normalized = branchCode.trim();
    if (!normalized) return null;
    const branchId = normalized.includes('-') ? normalized.split('-')[0].trim() : normalized;
    const branches = this.listBranches();
    const match = branches.find((branch) => branch.branchCode === branchId);
    return match ?? null; // CHANGED: resolve branch info for staff responses
  }

  normalizeGroupName(value?: string | null): string | null {
    if (!value) return null;
    return value.trim().replace(/\s+/g, ' ');
  }

  private ensureLoaded(): Map<string, BranchGroupMapRecord[]> {
    if (BranchGroupMapService.mapIndex) {
      return BranchGroupMapService.mapIndex;
    }

    const filePath = this.resolveMapPath();
    BranchGroupMapService.sourcePath = filePath;

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw) as BranchGroupMapRecord[];
      const index = new Map<string, BranchGroupMapRecord[]>();

      for (const record of parsed) {
        const groupName = this.normalizeGroupName(String(record.GroupName ?? ''));
        const groupCode = String(record.GroupCode ?? '').trim();
        const branchRaw = String(record.Branch ?? '').trim();
        if (!groupName || !groupCode || !branchRaw) continue;

        const existing = index.get(groupName) ?? [];
        existing.push({ Branch: branchRaw, GroupCode: groupCode, GroupName: String(record.GroupName ?? '').trim() });
        index.set(groupName, existing);
      }

      BranchGroupMapService.mapIndex = index;
      this.logger.log(
        `[BRANCH-MAP] Loaded ${index.size} group names from ${filePath}`,
      ); // CHANGED: cache map at startup
      return index;
    } catch (error: any) {
      this.logger.error(
        `[BRANCH-MAP] Failed to load map from ${filePath}: ${error?.message ?? error}`,
      ); // CHANGED: log load errors
      BranchGroupMapService.mapIndex = new Map();
      return BranchGroupMapService.mapIndex;
    }
  }

  private resolveMapPath(): string {
    const candidates = [
      path.join(process.cwd(), 'src', 'branch-group-map.json'),
      path.join(process.cwd(), 'backend', 'src', 'branch-group-map.json'),
      path.join(process.cwd(), 'branch-group-map.json'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return path.join(process.cwd(), 'src', 'branch-group-map.json');
  }

  private parseBranch(branchRaw: string): { branchId: string | null; branchName: string | null } {
    if (!branchRaw) return { branchId: null, branchName: null };
    const parts = branchRaw.split('-');
    const branchId = parts[0]?.trim() ?? '';
    const branchNameRaw = parts.slice(1).join('-').trim();
    const branchName = branchNameRaw ? this.toTitleCase(branchNameRaw) : null;
    return {
      branchId: branchId || null,
      branchName,
    };
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(/\s+/)
      .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : ''))
      .join(' ')
      .trim();
  }
}
