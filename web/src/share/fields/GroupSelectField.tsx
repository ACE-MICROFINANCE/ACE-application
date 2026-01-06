import type { FocusEvent } from 'react';
import { AceSelectIOS } from '@/share/ui/AceSelectIOS';

type GroupSelectFieldProps = {
  groupCode?: string | null;
  groupName?: string | null;
  value?: string;
  onChange: (value: string) => void;
  hidden?: boolean;
  disabled?: boolean;
  onFocus?: (event: FocusEvent<HTMLSelectElement>) => void; // CHANGED: hỗ trợ focus
};

export const GroupSelectField = ({
  groupCode,
  groupName,
  value,
  onChange,
  hidden,
  disabled,
  onFocus,
}: GroupSelectFieldProps) => {
  if (hidden || !groupCode || !groupName) return null;

  return (
    <AceSelectIOS
      label="Nhóm"
      value={value ?? groupCode}
      onChange={onChange}
      options={[{ label: groupName, value: groupCode }]}
      placeholder="Chọn nhóm"
      disabled={disabled}
      onFocus={onFocus} // CHANGED: hỗ trợ focus handler
    />
  );
};
