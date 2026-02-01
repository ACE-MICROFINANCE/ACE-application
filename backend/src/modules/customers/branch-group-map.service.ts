import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../database/prisma.service';
import { normalizeGroupName, normalizeGroupNameKey } from '../../common/utils/normalize-group-name.util';

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
  reason?: 'NOT_FOUND' | 'AMBIGUOUS' | 'INVALID' | null; // diagnostics for debug sync
  candidateCount?: number;
};

@Injectable()
export class BranchGroupMapService {
  private readonly logger = new Logger(BranchGroupMapService.name);
  private cacheIndex: Map<string, BranchGroupMapRecord[]> | null = null;
  private cacheTimestamp: number | null = null;
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private sourcePath: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async resolveGroupName(
    rawGroupName: string,
    context?: { memberNo?: string },
  ): Promise<ResolveResult> {
    const normalized = normalizeGroupName(rawGroupName);
    if (!normalized) {
      return { found: false, normalizedGroupName: null, reason: 'INVALID' };
    }

    const index = await this.ensureLoaded();
    const key = normalizeGroupNameKey(normalized);
    if (!key) return { found: false, normalizedGroupName: null, reason: 'INVALID' };
    const matches = index.get(key) ?? [];
    if (!matches.length) {
      this.logger.warn(
        `[BRANCH-MAP] GroupName not found memberNo=${context?.memberNo ?? 'unknown'} groupName="${rawGroupName}" normalized="${normalized}"`,
      );
      return { found: false, normalizedGroupName: key, reason: 'NOT_FOUND' };
    }

    const uniqueKeySet = new Set(matches.map((item) => `${item.GroupCode}::${item.Branch}`));
    if (uniqueKeySet.size > 1) {
      this.logger.warn(
        `[BRANCH-MAP] GroupName ambiguous memberNo=${context?.memberNo ?? 'unknown'} groupName="${rawGroupName}" normalized="${normalized}"`,
      );
      return { found: false, normalizedGroupName: key, reason: 'AMBIGUOUS', candidateCount: matches.length };
    }

    const picked = matches[0];
    const { branchId, branchName } = this.parseBranch(picked.Branch);
    if (!picked.GroupCode || !branchId) {
      this.logger.error(
        `[BRANCH-MAP] Invalid mapping memberNo=${context?.memberNo ?? 'unknown'} groupName="${rawGroupName}" normalized="${normalized}"`,
      );
      return { found: false, normalizedGroupName: key, reason: 'INVALID' };
    }

    return {
      found: true,
      normalizedGroupName: key,
      groupCode: String(picked.GroupCode).trim(),
      branchId,
      branchName,
      reason: null,
    };
  }

  async listGroupsByBranchCode(branchCode: string | null | undefined) {
    if (!branchCode) return [];
    const normalizedBranchCode = branchCode.trim();
    if (!normalizedBranchCode) return [];
    const branchIdInput = normalizedBranchCode.includes('-')
      ? normalizedBranchCode.split('-')[0].trim()
      : normalizedBranchCode;

    const index = await this.ensureLoaded();
    const uniqueGroups = new Map<
      string,
      { groupCode: string; groupName: string; branchId: string; branchName: string | null }
    >();

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
    );
  }

  async listBranches() {
    const index = await this.ensureLoaded();
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
          });
        }
      }
    }

    return Array.from(branches.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );
  }

  async resolveBranchByCode(branchCode?: string | null) {
    if (!branchCode) return null;
    const normalized = branchCode.trim();
    if (!normalized) return null;
    const branchId = normalized.includes('-') ? normalized.split('-')[0].trim() : normalized;
    const branches = await this.listBranches();
    const match = branches.find((branch) => branch.branchCode === branchId);
    return match ?? null;
  }

  async ensureLoaded(): Promise<Map<string, BranchGroupMapRecord[]>> {
    const now = Date.now();
    if (this.cacheIndex && this.cacheTimestamp && now - this.cacheTimestamp < BranchGroupMapService.CACHE_TTL_MS) {
      return this.cacheIndex;
    }

    const fromDb = await this.loadFromDb();
    if (fromDb) return fromDb;

    return this.loadFromJson();
  }

  invalidateCache() {
    this.cacheIndex = null;
    this.cacheTimestamp = null;
  }

  private async loadFromDb(): Promise<Map<string, BranchGroupMapRecord[]> | null> {
    if (process.env.BRANCH_MAP_SOURCE === 'JSON') {
      this.logger.log('[BRANCH-MAP] Skip DB source (BRANCH_MAP_SOURCE=JSON)');
      return null;
    }
    try {
      const count = await this.prisma.group.count();
      if (count === 0) return null;
      const rows = await this.prisma.group.findMany();
      const index = new Map<string, BranchGroupMapRecord[]>();
      for (const row of rows) {
        const key = row.groupNameKey;
        const branchRaw = row.branchCode;
        const groupCode = row.groupCode;
        if (!key || !branchRaw || !groupCode) continue;
        const existing = index.get(key) ?? [];
        existing.push({ Branch: branchRaw, GroupCode: groupCode, GroupName: row.groupName });
        index.set(key, existing);
      }
      this.cacheIndex = index;
      this.cacheTimestamp = Date.now();
      this.sourcePath = 'database';
      this.logger.log(`[BRANCH-MAP] Loaded ${index.size} group names from DB`);
      return index;
    } catch (err) {
      this.logger.error(`[BRANCH-MAP] Failed to load groups from DB: ${err}`);
      return null;
    }
  }

  private loadFromJson(): Map<string, BranchGroupMapRecord[]> {
    const filePath = this.resolveMapPath();
    this.sourcePath = filePath;

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw) as BranchGroupMapRecord[];
      const index = new Map<string, BranchGroupMapRecord[]>();

      for (const record of parsed) {
        const key = normalizeGroupNameKey(String(record.GroupName ?? ''));
        const groupCode = String(record.GroupCode ?? '').trim();
        const branchRaw = String(record.Branch ?? '').trim();
        if (!key || !groupCode || !branchRaw) continue;

        const existing = index.get(key) ?? [];
        existing.push({ Branch: branchRaw, GroupCode: groupCode, GroupName: String(record.GroupName ?? '').trim() });
        index.set(key, existing);
      }

      this.cacheIndex = index;
      this.cacheTimestamp = Date.now();
      this.logger.log(`[BRANCH-MAP] Loaded ${index.size} group names from ${filePath}`);
      return index;
    } catch (error: any) {
      this.logger.error(`[BRANCH-MAP] Failed to load map from ${filePath}: ${error?.message ?? error}`);
      this.cacheIndex = new Map();
      this.cacheTimestamp = Date.now();
      return this.cacheIndex;
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
