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
