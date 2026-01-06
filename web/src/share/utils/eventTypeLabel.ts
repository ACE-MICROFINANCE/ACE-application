export const EVENT_TYPE_LABEL: Record<string, string> = {
  MEETING: 'Lịch Họp',
  FIELD_SCHOOL: 'Lịch Tập Huấn',
  FARMING_TASK: 'Lịch Nông vụ',
  OTHER: 'Không xác định',
};

export const getEventTypeLabel = (type?: string | null) => {
  if (!type) return EVENT_TYPE_LABEL.OTHER;
  const key = type.toUpperCase();
  return EVENT_TYPE_LABEL[key] ?? EVENT_TYPE_LABEL.OTHER;
};
