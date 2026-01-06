'use client';

import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { AceButton } from '@/share/ui/AceButton';
import { AceInput } from '@/share/ui/AceInput';

type StaffGroupItem = {
  groupCode: string;
  groupName: string;
};

type StaffGroupMultiSelectSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  groups: StaffGroupItem[];
  selectedCodes: string[];
  onToggle: (code: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFocus?: (event: any) => void;
};

export const StaffGroupMultiSelectSheet = ({
  isOpen,
  onClose,
  groups,
  selectedCodes,
  onToggle,
  searchValue,
  onSearchChange,
  onFocus,
}: StaffGroupMultiSelectSheetProps) => {
  const filteredGroups = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return groups;
    return groups.filter((group) =>
      group.groupName.toLowerCase().includes(keyword),
    );
  }, [groups, searchValue]);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      placement="bottom"
      backdrop="blur"
      classNames={{ backdrop: 'bg-black/30 backdrop-blur-sm' }}
      hideCloseButton
    >
      <ModalContent className="w-full rounded-t-[28px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] max-h-[80dvh] overflow-hidden">
        <ModalHeader className="relative flex items-center justify-center px-6 py-5">
          <span className="text-[17px] font-semibold text-[#111]">Chọn nhóm</span>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5 text-[#333] transition active:scale-95 hover:bg-black/10"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </ModalHeader>

        <ModalBody className="px-4 pb-4 pt-0 overflow-y-auto">
          <AceInput
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm nhóm..."
            className="rounded-2xl border-black/5 px-4 py-3 text-base"
            onFocus={onFocus}
          />

          <div className="mt-4 max-h-[45vh] overflow-y-auto divide-y divide-black/5">
            {filteredGroups.length ? (
              filteredGroups.map((group) => {
                const isSelected = selectedCodes.includes(group.groupCode);
                return (
                  <button
                    key={group.groupCode}
                    type="button"
                    onClick={() => onToggle(group.groupCode)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-sm transition ${
                      isSelected
                        ? 'bg-[#0A84FF]/10 text-[#0A84FF] font-semibold'
                        : 'text-[#111] hover:bg-black/5'
                    }`}
                  >
                    <span>{group.groupName}</span>
                    {isSelected ? <Check className="h-4 w-4" /> : null}
                  </button>
                );
              })
            ) : (
              <p className="px-4 py-3 text-sm text-[#6C757D]">Không có nhóm phù hợp.</p>
            )}
          </div>
        </ModalBody>

        <ModalFooter className="sticky bottom-0 border-t border-black/5 bg-white px-4 pb-6 pt-3">
          <AceButton
            className="w-full rounded-full bg-[#007AFF] text-white h-12"
            onClick={onClose}
          >
            Xong
          </AceButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
