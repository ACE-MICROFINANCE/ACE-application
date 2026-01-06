'use client';

import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { StaffGroupMultiSelectSheet } from '@/share/fields/StaffGroupMultiSelectSheet';

type GroupItem = {
  groupCode: string;
  groupName: string;
};

export type AudienceMode = 'BRANCH_ALL' | 'GROUPS';

type AudienceTargetFieldProps = {
  groups: GroupItem[];
  mode: AudienceMode;
  selectedGroupCodes: string[];
  onChange: (next: { mode: AudienceMode; selectedGroupCodes: string[] }) => void;
  disabled?: boolean;
  error?: string | null;
  onFocus?: (event: any) => void;
};

export const AudienceTargetField = ({
  groups,
  mode,
  selectedGroupCodes,
  onChange,
  disabled,
  error,
  onFocus,
}: AudienceTargetFieldProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const groupNameMap = useMemo(() => {
    return new Map(groups.map((group) => [group.groupCode, group.groupName]));
  }, [groups]);

  const selectedLabels = useMemo(() => {
    return selectedGroupCodes.map((code) => ({
      code,
      label: groupNameMap.get(code) ?? code,
    }));
  }, [selectedGroupCodes, groupNameMap]);

  const isGroupDisabled = Boolean(disabled || mode === 'BRANCH_ALL');

  const handleSwitchMode = (nextMode: AudienceMode) => {
    if (disabled) return;
    if (nextMode === 'BRANCH_ALL') {
      onChange({ mode: 'BRANCH_ALL', selectedGroupCodes: [] });
      return;
    }
    onChange({ mode: 'GROUPS', selectedGroupCodes });
  };

  const handleOpenSheet = () => {
    if (isGroupDisabled) return;
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSearchValue('');
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isGroupDisabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsSheetOpen(true);
    }
  };

  const handleToggleGroup = (groupCode: string) => {
    const isSelected = selectedGroupCodes.includes(groupCode);
    const nextCodes = isSelected
      ? selectedGroupCodes.filter((code) => code !== groupCode)
      : [...selectedGroupCodes, groupCode];
    onChange({
      mode: !isSelected && mode === 'BRANCH_ALL' ? 'GROUPS' : mode,
      selectedGroupCodes: nextCodes,
    });
  };

  const handleRemoveGroup = (groupCode: string) => {
    onChange({
      mode,
      selectedGroupCodes: selectedGroupCodes.filter((code) => code !== groupCode),
    });
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-[#6C757D]">Đối tượng nhận lịch</label>

      <div className="flex w-full rounded-2xl bg-black/5 p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleSwitchMode('BRANCH_ALL')}
          className={clsx(
            'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-95',
            mode === 'BRANCH_ALL'
              ? 'bg-white text-[#007AFF] shadow-sm'
              : 'text-[#555]',
          )}
        >
          Toàn chi nhánh
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleSwitchMode('GROUPS')}
          className={clsx(
            'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-95',
            mode === 'GROUPS' ? 'bg-white text-[#007AFF] shadow-sm' : 'text-[#555]',
          )}
        >
          Theo nhóm
        </button>
      </div>

      <div
        role="button"
        tabIndex={isGroupDisabled ? -1 : 0}
        aria-disabled={isGroupDisabled}
        onClick={handleOpenSheet}
        onKeyDown={handleKeyDown}
        className={clsx(
          'rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm',
          isGroupDisabled ? 'opacity-60' : 'cursor-pointer',
        )}
      >
        {/* TODO: replaced by AceMultiSelectIOS */}
        {/* <AceMultiSelectIOS ... /> */} 
        {selectedLabels.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Tìm và thêm nhóm...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedLabels.map((item) => (
              <span
                key={item.code}
                className="flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-sm text-[#333]"
              >
                <span className="truncate">{item.label}</span>
                <button
                  type="button"
                  aria-label="Xóa nhóm"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemoveGroup(item.code);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-base text-[#555] hover:bg-black/10"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {isGroupDisabled ? (
        <p className="text-xs text-[#6C757D]">Đang áp dụng toàn chi nhánh</p>
      ) : null}

      {mode === 'GROUPS' && selectedGroupCodes.length === 0 ? (
        <p className="text-xs text-[#6C757D]">Chưa chọn nhóm nào.</p>
      ) : null}

      {error ? <p className="text-xs text-red-500">{error}</p> : null}

      <StaffGroupMultiSelectSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        groups={groups}
        selectedCodes={selectedGroupCodes}
        onToggle={handleToggleGroup}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onFocus={onFocus}
      />
    </div>
  );
};
