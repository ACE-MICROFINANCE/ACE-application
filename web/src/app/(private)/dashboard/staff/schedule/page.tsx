'use client';

import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, X } from 'lucide-react'; // CHANGED: thêm icon FAB
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';
import { AceCard } from '@/share/ui/AceCard';
import { AceButton } from '@/share/ui/AceButton';
import { AceInput } from '@/share/ui/AceInput';
import { AceSelectIOS } from '@/share/ui/AceSelectIOS'; // CHANGED: select kiểu iOS
import { AceReadOnlyRow } from '@/share/ui/AceReadOnlyRow'; // CHANGED: row readonly
import { getEventTypeLabel } from '@/share/utils/eventTypeLabel'; // CHANGED: map loại sự kiện
import { scrollIntoViewOnFocus } from '@/share/ui/keyboard/scrollIntoViewOnFocus'; // CHANGED: keyboard safe helper
import {
  AudienceTargetField,
  type AudienceMode,
} from '@/share/fields/AudienceTargetField'; // CHANGED: iOS audience field
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/lib/routes';
import {
  appApi,
  type ScheduleDetail,
  type ScheduleItem,
  type ScheduleUpdatePayload,
  type StaffGroupItem,
} from '@/services/appApi';
import { formatDate } from '@/lib/format';

const DEFAULT_AVATAR = '/img/caylua_info.jpg';
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}; // CHANGED: chi hien su kien tu hom nay tro di
const LOCATION_OPTIONS = ['Nhà anh Tòn', 'A Thía HomeStay', 'Nhà bà Lò']; // CHANGED: tiếng Việt chuẩn
const EVENT_TYPES = ['MEETING', 'FIELD_SCHOOL', 'FARMING_TASK', 'OTHER'];
const EVENT_TYPE_OPTIONS = EVENT_TYPES.map((type) => ({
  value: type,
  label: getEventTypeLabel(type),
})); // CHANGED: label tiếng Việt

// TODO: replaced by ACE Farmer implementation
// const notify = (message: string) => {
//   if (typeof window !== 'undefined') {
//     window.alert(message); // CHANGED: toast fallback
//   }
// };

const getLocationLabel = (id: number) => {
  const index = Math.abs(id) % LOCATION_OPTIONS.length;
  return LOCATION_OPTIONS[index];
};

const buildEventText = (event: ScheduleItem) => {
  if (event.eventType === 'MEETING') {
    return `Bạn có cuộc họp trong ${event.daysUntilEvent} ngày tới.`; // CHANGED: tiếng Việt chuẩn
  }
  if (event.eventType === 'FIELD_SCHOOL') {
    return `Trong ${event.daysUntilEvent} ngày nữa sẽ có buổi tập huấn tại địa phương.`; // CHANGED: tiếng Việt chuẩn
  }
  if (event.eventType === 'FARMING_TASK') {
    return `Trong ${event.daysUntilEvent} ngày nữa: ${event.title.toLowerCase()}.`; // CHANGED: tiếng Việt chuẩn
  }
  return `${event.title} - còn ${event.daysUntilEvent} ngày.`; // CHANGED: tiếng Việt chuẩn
};

const getAvatarUrl = (event: ScheduleItem) => {
  if (event.eventType === 'MEETING') return '/img/community-meeting.png';
  if (event.eventType === 'FIELD_SCHOOL') return '/img/farming-plant-rice.png';
  if (event.eventType === 'FARMING_TASK') return '/img/caylua_info.jpg';
  return DEFAULT_AVATAR;
};

const toLocalInputValue = (iso: string) => {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const computeDurationMinutes = (startDate: string, endDate?: string | null) => {
  if (!endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return '';
  return String(Math.round(diffMs / 60000));
};

type ScheduleItemRowProps = {
  item: ScheduleItem;
  onClick: () => void;
};

const ScheduleItemRow = ({ item, onClick }: ScheduleItemRowProps) => {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-4 px-4 py-4 transition active:scale-[0.99] active:bg-black/[0.03]"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-black/5">
        <Image
          src={getAvatarUrl(item)}
          alt={item.title}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>

      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-[#0A84FF] tabular-nums">
          {formatDate(item.startDate)}
        </p>
        <p className="text-sm text-[#1C1C1E] line-clamp-2">{buildEventText(item)}</p>
      </div>

      {/* <div className="shrink-0 text-[#C7C7CC]" aria-hidden="true">
        <ChevronRight className="h-5 w-5" />
      </div> */}
    </div>
  );
};

export default function StaffSchedulePage() {
  // const { isAuthenticated, isInitializing, mustChangePassword, profile } = useAuth(); // TODO: replaced by staff groups API // CHANGED
  const { isAuthenticated, isInitializing, mustChangePassword } = useAuth(); // CHANGED: bỏ profile để tránh unused
  const router = useRouter();

  const [events, setEvents] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffGroups, setStaffGroups] = useState<StaffGroupItem[]>([]); // CHANGED: danh sách nhóm theo chi nhánh

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null); // CHANGED: phân biệt create/edit
  const [selectedEvent, setSelectedEvent] = useState<ScheduleItem | null>(null);
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    title: '',
    eventType: 'MEETING',
    startDate: '',
    durationMinutes: '',
    locationName: '',
    description: '',
  });
  // const [isBranchAllSelected, setIsBranchAllSelected] = useState(true); // TODO: replaced by audienceMode // CHANGED
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('BRANCH_ALL'); // CHANGED: mode đối tượng
  const [selectedGroupCodes, setSelectedGroupCodes] = useState<string[]>([]); // CHANGED: nhóm được chọn
  const isEditMode = modalMode === 'edit'; // CHANGED: phân biệt edit/create
  const eventTypeLabel = getEventTypeLabel(detail?.eventType ?? formState.eventType); // CHANGED: label tiếng Việt
  const isModalOpen = modalMode !== null; // CHANGED: mở modal theo mode

  const modalTitle = useMemo(() => {
    if (modalMode === 'edit') return 'Chỉnh sửa lịch';
    if (modalMode === 'create') {
      if (formState.eventType === 'MEETING') return 'Thêm lịch họp';
      if (formState.eventType === 'FIELD_SCHOOL') return 'Thêm lịch tập huấn';
      if (formState.eventType === 'FARMING_TASK') return 'Thêm lịch nông vụ';
      return 'Thêm lịch';
    }
    return 'Chỉnh sửa lịch';
  }, [modalMode, formState.eventType]); // CHANGED: title theo mode + loại sự kiện

  const groupNameMap = useMemo(() => {
    return new Map(
      staffGroups.map((group) => [group.groupCode, group.groupName]),
    );
  }, [staffGroups]); // CHANGED: map groupCode -> groupName

  // const handleToggleBranchAll = (nextValue: boolean) => {
  //   if (nextValue && selectedGroupCodes.length > 0) {
  //     notify('Không thể chọn “Toàn chi nhánh” khi đã chọn nhóm.'); // CHANGED
  //     return;
  //   }
  //   setIsBranchAllSelected(nextValue); // CHANGED
  // };

  // const handleToggleGroup = (groupCode: string) => {
  //   if (isBranchAllSelected) {
  //     notify('Không thể chọn nhóm khi đang chọn “Toàn chi nhánh”.'); // CHANGED
  //     return;
  //   }
  //   setSelectedGroupCodes((prev) =>
  //     prev.includes(groupCode)
  //       ? prev.filter((code) => code !== groupCode)
  //       : [...prev, groupCode],
  //   ); // CHANGED: toggle multi group
  // };

  // const handleFieldFocus = (event: FocusEvent<HTMLElement>) => {
  //   // TODO: replaced by scrollIntoViewOnFocus helper // CHANGED
  //   const element = event.currentTarget;
  //   setTimeout(() => {
  //     element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  //   }, 250);
  // };

  const fetchSchedule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getSchedule();
      setEvents(data);
    } catch {
      setError('Không tải được lịch sự kiện. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaffGroups = async () => {
    try {
      const data = await appApi.getStaffGroups(); // CHANGED: lấy nhóm theo branch staff
      setStaffGroups(Array.isArray(data) ? data : []);
    } catch {
      setStaffGroups([]);
    }
  };

  const openEditModal = async (event: ScheduleItem) => {
    setSelectedEvent(event);
    // setIsEditOpen(true); // TODO: replaced by modalMode (create/edit) // CHANGED
    setModalMode('edit'); // CHANGED: mở modal edit
    setSaveError(null);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await appApi.getScheduleDetail(event.id);
      const nextAudienceType = (data.audienceType ?? 'BRANCH_ALL').toUpperCase(); // CHANGED: ưu tiên audience từ detail
      if (nextAudienceType === 'BRANCH_ALL') {
        setAudienceMode('BRANCH_ALL'); // CHANGED: chọn toàn chi nhánh
        setSelectedGroupCodes([]);
      } else if (nextAudienceType === 'GROUPS') {
        setAudienceMode('GROUPS'); // CHANGED: chọn theo nhóm
        setSelectedGroupCodes(
          (data.targetGroups ?? []).map((group) => group.groupCode),
        );
      } else {
        setAudienceMode('BRANCH_ALL'); // CHANGED: fallback về toàn chi nhánh
        setSelectedGroupCodes([]);
      }
      setDetail(data);
      setFormState({
        title: data.title ?? event.title,
        eventType: data.eventType ?? event.eventType,
        startDate: toLocalInputValue(data.startDate ?? event.startDate),
        durationMinutes: computeDurationMinutes(data.startDate ?? event.startDate, data.endDate),
        // locationName: getLocationLabel(event.id), // TODO: replaced by API locationName // CHANGED
        locationName: data.locationName ?? getLocationLabel(event.id), // CHANGED: ?u ti?n locationName t? API
        description: data.description ?? '',
      });
    } catch {
      setAudienceMode('BRANCH_ALL'); // CHANGED: fallback toàn chi nhánh
      setSelectedGroupCodes([]);
      setFormState({
        title: event.title,
        eventType: event.eventType,
        startDate: toLocalInputValue(event.startDate),
        durationMinutes: '',
        // locationName: getLocationLabel(event.id), // TODO: gi? fallback khi kh?ng c? detail // CHANGED
        locationName: getLocationLabel(event.id), // CHANGED: fallback khi kh?ng c? detail
        description: '',
      });
      setSaveError('Không tải được chi tiết lịch.');
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreateModal = () => {
    setSelectedEvent(null); // CHANGED: reset selectedEvent khi tạo mới
    setDetail(null);
    setDetailLoading(false);
    setSaveError(null);
    setFormState({
      title: '',
      eventType: 'MEETING',
      startDate: '',
      durationMinutes: '',
      locationName: '',
      description: '',
    });
    setAudienceMode('BRANCH_ALL'); // CHANGED: mặc định toàn chi nhánh
    setSelectedGroupCodes([]); // CHANGED: reset nhóm được chọn
    // setIsEditOpen(true); // TODO: replaced by modalMode (create/edit) // CHANGED
    setModalMode('create'); // CHANGED: mở modal create
  };

  const handleSave = async () => {
    if (!selectedEvent) return;
    // const title = formState.title.trim(); // TODO: giữ logic edit cũ, không chặn validate // CHANGED
    // if (!title) return; // TODO: giữ logic edit cũ // CHANGED
    // if (!formState.startDate) return; // TODO: giữ logic edit cũ // CHANGED
    // const durationValue = Number(formState.durationMinutes); // TODO: giữ logic edit cũ // CHANGED
    // if (!Number.isFinite(durationValue) || durationValue <= 0) return; // TODO: giữ logic edit cũ // CHANGED
    if (audienceMode === 'GROUPS' && selectedGroupCodes.length === 0) {
      setSaveError('Vui lòng chọn ít nhất 1 nhóm.'); // CHANGED
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      // const targetGroups = formState.groupCode
      //   ? [
      //       {
      //         groupCode: formState.groupCode,
      //         groupName: profile?.groupName ?? undefined,
      //       },
      //     ]
      //   : undefined; // TODO: replaced by multi-group selection // CHANGED
      // const audienceType = targetGroups ? 'GROUPS' : undefined; // TODO: replaced by audience selection // CHANGED
      const targetGroups =
        audienceMode === 'GROUPS'
          ? selectedGroupCodes.map((groupCode) => ({
              groupCode,
              groupName: groupNameMap.get(groupCode) ?? undefined,
            }))
          : undefined; // CHANGED: map multi group selection
      const audienceType = audienceMode; // CHANGED: audience mapping
      const payload: ScheduleUpdatePayload = {
        title: formState.title.trim() || undefined,
        description: formState.description.trim() || undefined,
        // eventType: formState.eventType, // CHANGED: không gửi eventType khi chỉnh sửa
        startDate: formState.startDate
          ? new Date(formState.startDate).toISOString()
          : undefined,
        durationMinutes: formState.durationMinutes
          ? Number(formState.durationMinutes)
          : undefined, // CHANGED: giữ logic edit cũ
        locationName: formState.locationName.trim() || undefined,
        audienceType, // CHANGED: patch audienceType
        targetGroups, // CHANGED: patch targetGroups
      };
      await appApi.updateSchedule(selectedEvent.id, payload);
      // setIsEditOpen(false); // TODO: replaced by modalMode (create/edit) // CHANGED
      setModalMode(null); // CHANGED: đóng modal sau khi lưu
      await fetchSchedule();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Lưu lịch thất bại.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreate = async () => {
    const title = formState.title.trim(); // CHANGED: validate tiêu đề khi tạo mới
    if (!title) {
      setSaveError('Vui lòng nhập tiêu đề.'); // CHANGED
      return;
    }
    if (!formState.startDate) {
      setSaveError('Vui lòng chọn thời gian bắt đầu.'); // CHANGED
      return;
    }
    const durationValue = Number(formState.durationMinutes);
    if (!Number.isFinite(durationValue) || durationValue <= 0) {
      setSaveError('Vui lòng nhập thời lượng hợp lệ.'); // CHANGED
      return;
    }
    if (!formState.eventType) {
      setSaveError('Vui lòng chọn loại sự kiện.'); // CHANGED
      return;
    }
    if (audienceMode === 'GROUPS' && selectedGroupCodes.length === 0) {
      setSaveError('Vui lòng chọn ít nhất 1 nhóm.'); // CHANGED
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const audienceType = audienceMode; // CHANGED: phân loại audience
      const payload = {
        title,
        description: formState.description.trim() || undefined,
        eventType: formState.eventType,
        startDate: new Date(formState.startDate).toISOString(),
        durationMinutes: durationValue,
        locationName: formState.locationName.trim() || undefined,
        audienceType, // CHANGED: bắt buộc theo BE
        targetGroups:
          audienceType === 'GROUPS'
            ? selectedGroupCodes.map((groupCode) => ({
                groupCode,
                groupName: groupNameMap.get(groupCode) ?? undefined,
              }))
            : undefined, // CHANGED: gửi nhóm nếu chọn
      };
      // await appApi.createSchedule(payload); // TODO: replaced by createEvent // CHANGED
      await appApi.createEvent(payload); // CHANGED: tạo lịch mới
      // setIsEditOpen(false); // TODO: replaced by modalMode (create/edit) // CHANGED
      setModalMode(null); // CHANGED: đóng modal sau khi tạo
      await fetchSchedule();
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? 'Tạo lịch thất bại.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    const confirmed =
      typeof window !== 'undefined'
        ? window.confirm('Bạn có chắc muốn xóa lịch này không?')
        : true; // CHANGED: xác nhận xóa
    if (!confirmed) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.deleteEvent(selectedEvent.id); // CHANGED: gọi API xóa lịch
      setModalMode(null); // CHANGED: đóng modal sau khi xóa
      await fetchSchedule();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setSaveError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
      } else if (status === 403) {
        setSaveError('Bạn không có quyền xóa lịch này.');
      } else if (status === 404) {
        setSaveError('Lịch không tồn tại hoặc đã bị xóa.');
      } else {
        setSaveError('Xóa lịch thất bại.');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      router.replace(routes.login);
    } else if (mustChangePassword) {
      router.replace(`${routes.changePassword}?mode=force`);
    } else {
      fetchSchedule();
      fetchStaffGroups(); // CHANGED: load groups for audience selection
    }
  }, [isAuthenticated, isInitializing, mustChangePassword, router]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="px-4 py-6">
          <p className="text-center text-sm text-[#666]">Đang tải lịch...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="space-y-2 px-4 py-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <AceButton onClick={fetchSchedule}>Thử lại</AceButton>
        </div>
      );
    }

    const safeEvents = Array.isArray(events) ? events : [];
    const today = startOfToday(); // CHANGED: loc su kien trong tuong lai
    const upcomingEvents = safeEvents.filter((event) => {
      const date = new Date(event.startDate);
      return Number.isFinite(date.getTime()) && date >= today;
    }); // CHANGED: an su kien da qua
    if (!upcomingEvents.length) {
      return (
        <div className="px-4 py-6">
          <p className="text-center text-sm text-[#666]">Chưa có sự kiện sắp tới.</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-black/5">
        {upcomingEvents.map((event) => (
          <div key={event.id} className="overflow-hidden">
            <ScheduleItemRow item={event} onClick={() => openEditModal(event)} />
          </div>
        ))}
      </div>
    );
  }, [events, isLoading, error]);

  return (
    <div className="min-h-screen bg-[#F2F2F7] px-4 pb-[calc(72px+24px+env(safe-area-inset-bottom))] pt-8">
      <div className="mx-auto flex w-full max-w-md flex-col space-y-4">
        <AceCard className="bg-[#DFF5D1] shadow-md px-6 py-4 rounded-2xl text-center">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
            Công Tác và Tập Huấn
          </h1>
        </AceCard>

        <div className="bg-white rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.10)] border border-black/5 overflow-hidden">
          {content}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        // onOpenChange={setIsEditOpen} // TODO: replaced by modalMode (create/edit) // CHANGED
        onOpenChange={(open) => setModalMode(open ? modalMode ?? 'edit' : null)} // CHANGED: đồng bộ modal mode
        placement="center"
        backdrop="blur"
        classNames={{ backdrop: 'bg-black/30 backdrop-blur-sm' }}
        scrollBehavior="inside"
        hideCloseButton
      >
        <ModalContent className="mx-4 w-[92vw] max-w-md max-h-[calc(100dvh-2rem)] flex flex-col min-h-0 overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
          <ModalHeader className="relative flex items-center justify-center border-b border-black/5 px-6 py-5">
            <span className="text-[17px] font-semibold text-[#111]">{modalTitle}</span>
            <button
              type="button"
              aria-label="Đóng"
              // onClick={() => setIsEditOpen(false)} // TODO: replaced by modalMode // CHANGED
              onClick={() => setModalMode(null)} // CHANGED: đóng modal
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5 text-[#333] transition active:scale-95 hover:bg-black/10"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </ModalHeader>
          <ModalBody className="space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5">
            {detailLoading ? (
              <p className="text-sm text-[#666] text-center">Đang tải chi tiết...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6C757D]">Tiêu đề</label>
                  <AceInput
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Nhập tiêu đề"
                    className="rounded-2xl border-black/5 px-4 py-3 text-base" // CHANGED: form cell iOS
                    onFocus={scrollIntoViewOnFocus} // CHANGED: scroll vào giữa
                  />
                </div>

                {/* TODO: replaced by AceSelectIOS + AceReadOnlyRow for event type */}
                {isEditMode ? ( // CHANGED: ẩn select khi edit
                  <AceReadOnlyRow label="Loại sự kiện" value={eventTypeLabel} /> // CHANGED: hiển thị read-only
                ) : (
                  <AceSelectIOS
                    label="Loại sự kiện"
                    value={formState.eventType}
                    onChange={(value) => setFormState((prev) => ({ ...prev, eventType: value }))}
                    options={EVENT_TYPE_OPTIONS}
                    placeholder="Chọn loại sự kiện"
                    onFocus={scrollIntoViewOnFocus} // CHANGED: scroll vào giữa
                  />
                )}

                {/* <GroupSelectField
                  groupCode={profile?.groupCode ?? null} // CHANGED: chỉ dùng nhóm của customer
                  groupName={profile?.groupName ?? null} // CHANGED: chỉ dùng nhóm của customer
                  value={formState.groupCode}
                  onChange={(value) => setFormState((prev) => ({ ...prev, groupCode: value }))} // CHANGED: lưu nhóm
                  hidden={!shouldShowGroupSelect} // CHANGED: ẩn khi GLOBAL hoặc không có nhóm
                  onFocus={handleFieldFocus} // CHANGED: scroll vào giữa
                /> */}

                {/* TODO: replaced by AudienceTargetField (segmented + autocomplete) */} 
                <AudienceTargetField
                  groups={staffGroups}
                  mode={audienceMode}
                  selectedGroupCodes={selectedGroupCodes}
                  onChange={(next) => {
                    setAudienceMode(next.mode); // CHANGED: đồng bộ mode
                    setSelectedGroupCodes(next.selectedGroupCodes); // CHANGED: đồng bộ nhóm
                  }}
                  onFocus={scrollIntoViewOnFocus}
                  error={
                    audienceMode === 'GROUPS' && selectedGroupCodes.length === 0 && saveError
                      ? saveError
                      : null
                  }
                />

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6C757D]">Bắt đầu</label>
                  <AceInput
                    type="datetime-local"
                    value={formState.startDate}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                    className="rounded-2xl border-black/5 px-4 py-3 text-base" // CHANGED: form cell iOS
                    onFocus={scrollIntoViewOnFocus} // CHANGED: scroll vào giữa
                  />
                  {(detail?.eventType ?? formState.eventType) === 'MEETING' ? (
                    <p className="text-sm text-[#6C757D] leading-relaxed">
                  Lịch họp thường lặp lại mỗi 28 ngày kể từ ngày đã chọn. Nếu trùng Tết hoặc ngày bận, bạn có thể chỉnh lại thủ công.                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6C757D]">Thời lượng (phút)</label>
                  <AceInput
                    type="number"
                    min={1}
                    value={formState.durationMinutes}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, durationMinutes: event.target.value }))
                    }
                    placeholder="Nhập thời lượng"
                    className="rounded-2xl border-black/5 px-4 py-3 text-base" // CHANGED: form cell iOS
                    onFocus={scrollIntoViewOnFocus} // CHANGED: scroll vào giữa
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6C757D]">Địa điểm</label>
                  <AceInput
                    value={formState.locationName}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, locationName: event.target.value }))
                    }
                    placeholder="Nhập địa điểm"
                    className="rounded-2xl border-black/5 px-4 py-3 text-base" // CHANGED: form cell iOS
                    onFocus={scrollIntoViewOnFocus} // CHANGED: scroll vào giữa
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6C757D]">Mô tả</label>
                  <textarea
                    className="w-full rounded-2xl border border-black/5 bg-white p-3 text-base text-[#333] outline-none"
                    rows={4}
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Nhập mô tả"
                    onFocus={scrollIntoViewOnFocus} // CHANGED: scroll vào giữa
                  />
                </div>
              </>
            )}

            {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}
          </ModalBody>
          <ModalFooter className="sticky bottom-0 flex items-center justify-center gap-3 border-t border-black/5 bg-white px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            {isEditMode ? (
              <>
                <AceButton
                  className="bg-red-500 text-white hover:bg-red-600"
                  onClick={handleDeleteEvent} // CHANGED: xóa lịch
                  isDisabled={saveLoading}
                >
                  Xóa lịch
                </AceButton>
                <AceButton onClick={handleSave} isLoading={saveLoading}>
                  Lưu
                </AceButton>
              </>
            ) : (
              <>
                <AceButton
                  className="bg-slate-200 text-slate-700 hover:bg-slate-300"
                  // onClick={() => setIsEditOpen(false)} // TODO: replaced by modalMode // CHANGED
                  onClick={() => setModalMode(null)} // CHANGED: đóng modal
                >
                  Hủy
                </AceButton>
                <AceButton onClick={handleCreate} isLoading={saveLoading}>
                  Tạo lịch
                </AceButton>
              </>
            )} {/* CHANGED: phân nhánh create/edit */}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-50">
        <div className="mx-auto w-full max-w-md relative pointer-events-auto">
          <button
            type="button"
            aria-label="Thêm lịch"
            onClick={openCreateModal}
            className="absolute right-4 bottom-[calc(var(--ace-bottom-nav-h,98px)+24px+env(safe-area-inset-bottom))] flex h-14 w-14 items-center justify-center rounded-full bg-[#007AFF] text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition active:scale-95"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}