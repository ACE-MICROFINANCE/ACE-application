import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Switch,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from "react-native";

import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { MobileFrame } from "@components/layout/MobileFrame";
import { Card } from "@components/ui/Card";
import { AppButton } from "@components/ui/AppButton";
import { PaginationBar } from "@components/ui/PaginationBar";
import { useProfileStore } from "@store/profileStore";
import {
  appApi,
  type ScheduleItem,
  type ScheduleDetail,
  type ScheduleCreatePayload,
  type StaffGroupItem,
} from "@services/appApi";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";

const PAGE_LIMIT = 20;

const EVENT_TYPES: Array<{ value: string; label: string }> = [
  { value: "MEETING", label: "Họp nhóm" },
  { value: "FIELD_SCHOOL", label: "Tập huấn xã hội" },
  { value: "FARMING_TASK", label: "Tập huấn nông nghiệp" },
  { value: "NOTICE", label: "Thông báo" },
  // { value: "OTHER", label: "Khác" },
];

const isNoticeType = (t?: string | null) => t === "NOTICE" || t === "Thông báo";
const getRawStatus = (event: ScheduleItem) => event.displayStatus || event.status || "PENDING_APPROVAL";
const normalizeStatusForRole = (event: ScheduleItem, isBA: boolean, isBM: boolean) => {
  const raw = getRawStatus(event);
  if (isBA && raw === "UPDATED") return "PENDING_APPROVAL";
  return raw;
};
const shouldHideFromBA = (event: ScheduleItem) => {
  const raw = normalizeStatusForRole(event, true, false);
  if (event.hidden === true) return true;
  if (raw === "HIDDEN") return true;
  if (raw === "EXPIRED") return true;
  if (raw === "REJECTED") {
    if (event.rejectedAt) {
      const diffMs = Date.now() - new Date(event.rejectedAt).getTime();
      if (diffMs > 24 * 60 * 60 * 1000) return true;
    }
  }
  return false;
};

const formatDate = (val?: string | null) => {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const formatDateTimeDisplay = (iso?: string | null) => {
  if (!iso) return "Chưa chọn";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "Chưa chọn";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hh}:${mm}, ${dd}/${mo}/${yyyy}`;
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const formatDateWithTime = (iso?: string | null, includeTime = true) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  if (!includeTime) return `${dd}/${mo}/${yyyy}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}, ${dd}/${mo}/${yyyy}`;
};

const getAvatarUrl = (event: ScheduleItem) => {
  if (event.eventType === "MEETING") return require("../../assets/img/community-meeting.png");
  if (event.eventType === "FIELD_SCHOOL") return require("../../assets/img/training.png");
  if (event.eventType === "FARMING_TASK") return require("../../assets/img/farming-plant-rice.jpg");
  if (event.eventType === "NOTICE" || event.eventType === "Thông báo") return require("../../assets/img/notification_icon.png");
  return require("../../assets/img/farming-plant-rice.jpg");
};

const buildEventText = (event: ScheduleItem) => {
  if (event.daysUntilEvent != null) {
    const days = event.daysUntilEvent;
    if (event.eventType === "MEETING") return `Bạn có cuộc họp trong ${days} ngày tới.`;
    if (event.eventType === "FIELD_SCHOOL") return `Trong ${days} ngày nữa sẽ có buổi tập huấn tại địa phương.`;
    if (event.eventType === "FARMING_TASK") return `Trong ${days} ngày nữa: ${event.title.toLowerCase()}.`;
    return `${event.title} - còn ${days} ngày.`;
  }
  return event.title;
};

const StaffScheduleScreen = () => {
  const { profile } = useProfileStore();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const isStaff = profile?.actorKind === "STAFF";
  const isBA = profile?.role === "BA";
  const isBM = profile?.role === "BM";

  // ✅ giống StaffManageScreen: lấy chiều cao tabbar để đặt nút floating không bị chìm
  const tabBarHeight = useBottomTabBarHeight();
  const CONTAINER_MAX_W = 480;
  const [contentWidth, setContentWidth] = useState<number>(0);

  const TAB_FALLBACK = 110; // fallback nếu tabBarHeight bị 0 (một số máy / web)
  const tabH = Math.max(tabBarHeight || 0, TAB_FALLBACK);
  const BUTTON_H = 56;
  const floatingBottom = tabH + 12;

  const { height: WIN_H } = Dimensions.get("window");
  const MODAL_H = Math.min(WIN_H * 0.9, 720);

  const [events, setEvents] = useState<ScheduleItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalEvents, setTotalEvents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [staffGroups, setStaffGroups] = useState<StaffGroupItem[]>([]);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleItem | null>(null);
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [eventTypePickerOpen, setEventTypePickerOpen] = useState(false);

  const [groupSearch, setGroupSearch] = useState("");
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [groupPickerSelection, setGroupPickerSelection] = useState<string[]>([]);
  const [groupModal, setGroupModal] = useState<{ open: boolean; groups: Array<{ groupName?: string | null; groupCode?: string }> }>({
    open: false,
    groups: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [webDatePickerOpen, setWebDatePickerOpen] = useState(false);
  const [webDateValue, setWebDateValue] = useState("");
  const [webTimeValue, setWebTimeValue] = useState("");
  const [webPickerError, setWebPickerError] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    title: "",
    eventType: "MEETING",
    startDate: "",
    durationMinutes: "",
    locationName: "",
    description: "",
    audienceMode: "BRANCH_ALL" as "BRANCH_ALL" | "GROUPS",
    selectedGroupCodes: [] as string[],
  });

  const resetForm = () => {
    setSelectedEvent(null);
    setDetail(null);
    setDetailLoading(false);
    setSaveError(null);
    setGroupSearch("");
    setGroupPickerSelection([]);
    setPickerMode("date");
    setPickerVisible(false);
    setTempDate(new Date());
    setWebDatePickerOpen(false);
    setWebDateValue("");
    setWebTimeValue("");
    setWebPickerError(null);
    setFormState({
      title: "",
      eventType: "MEETING",
      startDate: "",
      durationMinutes: "",
      locationName: "",
      description: "",
      audienceMode: "BRANCH_ALL",
      selectedGroupCodes: [],
    });
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
  };

  const closeAllModals = () => {
    setEventTypePickerOpen(false);
    setGroupPickerOpen(false);
    setModalMode(null);
    setPickerVisible(false);
    setWebDatePickerOpen(false);
    setWebPickerError(null);
    setPickerMode("date");
    setTempDate(new Date());
  };

  const fetchSchedule = async (options?: { page?: number }) => {
    const page = options?.page ?? 1;
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getStaffEvents({ page, limit: PAGE_LIMIT });
      setEvents(data?.items ?? []);
      setCurrentPage(data?.page ?? page);
      setHasMore(Boolean(data?.hasMore));
      setTotalEvents(data?.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Không tải được lịch sự kiện. Vui lòng thử lại.");
      setEvents([]);
      setCurrentPage(1);
      setHasMore(false);
      setTotalEvents(0);
    } finally {
      setIsLoading(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSchedule({ page: 1 });
    setRefreshing(false);
  };

  const fetchStaffGroups = async () => {
    try {
      const data = await appApi.getStaffGroups({ page: 1, limit: 100 });
      setStaffGroups(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setStaffGroups([]);
    }
  };

  const openEditModal = async (item: ScheduleItem) => {
    setSelectedEvent(item);
    setModalMode("edit");
    setDetail(null);
    setSaveError(null);
    setGroupSearch("");
    setGroupPickerSelection([]);
    setDetailLoading(true);

    try {
      const data = await appApi.getScheduleDetail(item.id as number);
      setDetail(data);

      const selectedCodes = (data.targetGroups ?? []).map((g) => g.groupCode);
      setGroupPickerSelection(selectedCodes);

      setFormState({
        title: (data.title ?? item.title ?? "").toString(),
        eventType: (data.eventType ?? item.eventType ?? "MEETING") as string,
        startDate: (data.startDate ?? item.startDate ?? "").toString(),
        durationMinutes: data.durationMinutes ? String(data.durationMinutes) : "",
        locationName: (data.locationName ?? "").toString(),
        description: (data.description ?? "").toString(),
        audienceMode: ((data.audienceType as "BRANCH_ALL" | "GROUPS") || "BRANCH_ALL") as "BRANCH_ALL" | "GROUPS",
        selectedGroupCodes: selectedCodes,
      });
    } catch {
      setSaveError("Không tải được chi tiết lịch.");
      setFormState((prev) => ({
        ...prev,
        title: item.title ?? "",
        eventType: (item.eventType ?? "MEETING") as string,
        startDate: item.startDate ?? "",
      }));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) {
      fetchStaffGroups();
    }
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff) return;
    if (isFocused) {
      fetchSchedule({ page: 1 });
    }
  }, [isFocused, isStaff]);

  const handlePageChange = async (page: number) => {
    if (isLoading || page === currentPage) return;
    await fetchSchedule({ page });
  };

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return staffGroups;
    return staffGroups.filter(
      (g) =>
        g.groupCode.toLowerCase().includes(q) ||
        (g.groupName ?? "").toLowerCase().includes(q) ||
        (g.branchName ?? "").toLowerCase().includes(q),
    );
  }, [groupSearch, staffGroups]);

  // Backend đã sort; chỉ lọc theo role
const displayedEvents = (events || []).filter((e) => {
  if (isBA) return !shouldHideFromBA(e);
  return true;
});

// NEW: section grouping
type SectionKey = "PENDING" | "APPROVED" | "UPDATED" | "HIDDEN" | "EXPIRED" | "REJECTED";
const SECTION_ORDER: SectionKey[] = ["PENDING", "APPROVED", "UPDATED", "HIDDEN", "EXPIRED", "REJECTED"];
const SECTION_META: Record<SectionKey, { title: string }> = {
  PENDING: { title: "Chờ duyệt" },
  APPROVED: { title: "Đã duyệt" },
  UPDATED: { title: "Đã chỉnh sửa" },
  HIDDEN: { title: "Ẩn" },
  EXPIRED: { title: "Hết hạn" },
  REJECTED: { title: "Đã từ chối" },
};

const statusToSectionKey = (ev: ScheduleItem): SectionKey => {
  let status = normalizeStatusForRole(ev, isBA, isBM);
  if (isBM && ev.hidden) status = "HIDDEN";
  if (status === "PENDING_APPROVAL" || status === "PENDING") return "PENDING";
  if (status === "APPROVED") return "APPROVED";
  if (status === "UPDATED") return "UPDATED";
  if (status === "HIDDEN") return "HIDDEN";
  if (status === "EXPIRED") return "EXPIRED";
  if (status === "REJECTED") return "REJECTED";
  return "PENDING";
};

const sectionedEvents = useMemo(
  () => {
    const buckets: Record<SectionKey, ScheduleItem[]> = {
      PENDING: [],
      APPROVED: [],
      UPDATED: [],
      HIDDEN: [],
      EXPIRED: [],
      REJECTED: [],
    };
    displayedEvents.forEach((ev) => {
      buckets[statusToSectionKey(ev)].push(ev);
    });
    SECTION_ORDER.forEach((key) => {
      buckets[key].sort((a, b) => {
        const da = new Date(a.startDate).getTime();
        const db = new Date(b.startDate).getTime();
        if (da !== db) return da - db;
        return Number(a.id ?? 0) - Number(b.id ?? 0);
      });
    });
    return SECTION_ORDER.map((key) => ({ key, items: buckets[key] }));
  },
  [displayedEvents, isBA, isBM],
);

const modalStatusRaw = selectedEvent ? normalizeStatusForRole(selectedEvent, isBA, isBM) : "PENDING_APPROVAL";
const modalStatus = isBM && selectedEvent?.hidden ? "HIDDEN" : modalStatusRaw;

  const modalTitle =
    modalMode === "edit"
      ? "Chỉnh sửa lịch"
      : formState.eventType === "MEETING"
      ? "Thêm lịch họp"
      : formState.eventType === "FIELD_SCHOOL"
      ? "Thêm lịch tập huấn xã hội"
      : formState.eventType === "FARMING_TASK"
      ? "Thêm lịch tập huấn nông nghiệp"
      : "Thêm lịch";

  const validateAudience = () => {
    if (formState.audienceMode === "GROUPS" && formState.selectedGroupCodes.length === 0) {
      setSaveError("Vui lòng chọn ít nhất 1 nhóm.");
      return false;
    }
    return true;
  };

  const buildUpdatePayload = () => {
    return {
      title: formState.title.trim() || undefined,
      description: formState.description.trim() || undefined,
      startDate: formState.startDate ? new Date(formState.startDate).toISOString() : undefined,
      durationMinutes: isNoticeType(formState.eventType)
        ? undefined
        : formState.durationMinutes
        ? Number(formState.durationMinutes)
        : undefined,
      locationName: formState.locationName.trim() || undefined,
      audienceType: formState.audienceMode,
      targetGroups:
        formState.audienceMode === "GROUPS"
          ? formState.selectedGroupCodes.map((groupCode) => {
              const group = staffGroups.find((g) => g.groupCode === groupCode);
              return { groupCode, groupName: group?.groupName };
            })
          : undefined,
    };
  };

  const handleSaveEdit = async () => {
    if (!selectedEvent) return;
    if (!validateAudience()) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      const payload = buildUpdatePayload();
      await appApi.updateSchedule(selectedEvent.id as number, payload);
      setModalMode(null);
      await fetchSchedule({ page: 1 });
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? "Lưu lịch thất bại.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formState.title.trim()) {
      setSaveError("Vui lòng nhập tiêu đề.");
      return;
    }
    if (!formState.startDate) {
      setSaveError("Vui lòng chọn thời gian bắt đầu.");
      return;
    }
    if (formState.eventType !== "NOTICE") {
      if (!formState.durationMinutes || Number(formState.durationMinutes) <= 0) {
        setSaveError("Vui lòng nhập thời lượng hợp lệ.");
        return;
      }
    }
    if (!validateAudience()) return;

    setSaveLoading(true);
    setSaveError(null);

    try {
      const payload: ScheduleCreatePayload = {
        title: formState.title.trim(),
        description: formState.description.trim() || undefined,
        eventType: formState.eventType,
        startDate: new Date(formState.startDate).toISOString(),
        durationMinutes:
          formState.eventType === "NOTICE"
            ? undefined
            : formState.durationMinutes
            ? Number(formState.durationMinutes)
            : undefined,
        locationName: formState.locationName.trim() || undefined,
        audienceType: formState.audienceMode,
        targetGroups:
          formState.audienceMode === "GROUPS"
            ? formState.selectedGroupCodes.map((groupCode) => {
                const group = staffGroups.find((g) => g.groupCode === groupCode);
                return { groupCode, groupName: group?.groupName };
              })
            : undefined,
      };

      await appApi.createEvent(payload);
      setModalMode(null);
      await fetchSchedule({ page: 1 });
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? "Tạo lịch thất bại.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOpenDatePicker = () => {
    const base = formState.startDate ? new Date(formState.startDate) : new Date();
    const isNotice = formState.eventType === "NOTICE" || formState.eventType === "Thông báo";
    if (Platform.OS === "web") {
      const yyyy = base.getFullYear();
      const mm = String(base.getMonth() + 1).padStart(2, "0");
      const dd = String(base.getDate()).padStart(2, "0");
      const hh = String(base.getHours()).padStart(2, "0");
      const min = String(base.getMinutes()).padStart(2, "0");
      setWebDateValue(`${yyyy}-${mm}-${dd}`);
      setWebTimeValue(`${hh}:${min}`);
      setWebPickerError(null);
      setWebDatePickerOpen(true);
      return;
    }
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: base,
        mode: "date",
        onChange: (event, selectedDate) => {
          if (!selectedDate || event.type === "dismissed") return;
          const pickedDate = new Date(selectedDate);
          if (isNotice) {
            pickedDate.setHours(0, 0, 0, 0);
            setFormState((prev) => ({ ...prev, startDate: pickedDate.toISOString() }));
          } else {
            DateTimePickerAndroid.open({
              value: pickedDate,
              mode: "time",
              onChange: (evt, selectedTime) => {
                if (!selectedTime || evt.type === "dismissed") return;
                const finalDate = new Date(pickedDate);
                finalDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                setFormState((prev) => ({ ...prev, startDate: finalDate.toISOString() }));
              },
            });
          }
        },
      });
      return;
    }
    setTempDate(base);
    setPickerMode("date");
    setPickerVisible(true);
  };

  const handleApplyWebDatePicker = () => {
    const isNotice = formState.eventType === "NOTICE" || formState.eventType === "Thông báo";
    const dateInput = webDateValue.trim();
    if (!dateInput) {
      setWebPickerError("Vui lòng nhập ngày theo định dạng YYYY-MM-DD.");
      return;
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(dateInput)) {
      setWebPickerError("Ngày không hợp lệ. Ví dụ: 2026-02-28");
      return;
    }
    if (isNotice) {
      const finalDate = new Date(`${dateInput}T00:00:00`);
      if (!Number.isFinite(finalDate.getTime())) {
        setWebPickerError("Ngày không hợp lệ.");
        return;
      }
      finalDate.setHours(0, 0, 0, 0);
      setFormState((prev) => ({ ...prev, startDate: finalDate.toISOString() }));
      setWebDatePickerOpen(false);
      return;
    }

    const timeInput = webTimeValue.trim();
    if (!timeInput) {
      setWebPickerError("Vui lòng nhập giờ theo định dạng HH:mm.");
      return;
    }
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timePattern.test(timeInput)) {
      setWebPickerError("Giờ không hợp lệ. Ví dụ: 09:30");
      return;
    }
    const finalDate = new Date(`${dateInput}T${timeInput}:00`);
    if (!Number.isFinite(finalDate.getTime())) {
      setWebPickerError("Ngày giờ không hợp lệ.");
      return;
    }
    setFormState((prev) => ({ ...prev, startDate: finalDate.toISOString() }));
    setWebDatePickerOpen(false);
  };

  const handlePickerConfirm = (selected: Date) => {
    const isNotice = formState.eventType === "NOTICE" || formState.eventType === "Thông báo";
    if (pickerMode === "date") {
      const pickedDate = new Date(selected);
      if (isNotice) {
        pickedDate.setHours(0, 0, 0, 0);
        setFormState((prev) => ({ ...prev, startDate: pickedDate.toISOString() }));
        setPickerVisible(false);
        return;
      }
      setTempDate(pickedDate);
      setPickerMode("time");
      setPickerVisible(true);
      return;
    }
    // time mode
    const finalDate = new Date(tempDate);
    finalDate.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    setFormState((prev) => ({ ...prev, startDate: finalDate.toISOString() }));
    setPickerVisible(false);
  };

  const renderAudience = () => (
    <View className="space-y-2">
      <Text className="text-xs font-medium text-[#6C757D]">Đối tượng</Text>

      <View className="flex-row gap-2">
        {[
          { value: "BRANCH_ALL" as const, label: "Toàn chi nhánh" },
          { value: "GROUPS" as const, label: "Theo nhóm" },
        ].map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => {
              setSaveError(null);
              setFormState((prev) => ({
                ...prev,
                audienceMode: opt.value,
                selectedGroupCodes: opt.value === "GROUPS" ? prev.selectedGroupCodes : [],
              }));
            }}
            className={`rounded-full border px-4 py-2 ${
              formState.audienceMode === opt.value ? "border-[#0A84FF] bg-[#E7F2FF]" : "border-black/10 bg-white"
            }`}
          >
            <Text className="text-sm font-semibold text-[#111]">{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      {formState.audienceMode === "GROUPS" ? (
        <Pressable
          onPress={() => {
            setGroupPickerSelection(formState.selectedGroupCodes);
            setGroupPickerOpen(true);
          }}
          className="rounded-2xl border border-black/5 bg-white px-4 py-3"
        >
          <Text className="text-base font-semibold text-[#111]">
            {formState.selectedGroupCodes.length > 0
              ? `Đã chọn: ${formState.selectedGroupCodes.length} nhóm`
              : "Chọn nhóm..."}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (!isStaff) {
    return (
      <MobileFrame withBottomPadding>
        <View className="flex-1 items-center justify-center px-4">
          <Card className="w-full rounded-2xl bg-white">
            <Text className="text-center text-sm text-[#666]">Bạn không có quyền truy cập trang này.</Text>
          </Card>
        </View>
      </MobileFrame>
    );
  }

  return (
    <MobileFrame withBottomPadding>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 32,
          // ✅ giống StaffManageScreen: chừa đúng chỗ cho floating button + tabbar
          paddingBottom: floatingBottom + BUTTON_H + 24,
          paddingHorizontal: 16,
          gap: 16,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View
          // ✅ giống StaffManageScreen: đo width thật của khung content
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
          style={{ alignSelf: "center", width: "100%", maxWidth: CONTAINER_MAX_W, gap: 16 }}
        >
          <Card className="rounded-2xl bg-[#DFF5D1] px-6 py-4 items-center">
            <Text className="text-xl font-semibold text-slate-900">Công tác và Tập huấn</Text>
          </Card>

          {isLoading ? (
            <View className="rounded-3xl border border-black/5 bg-white overflow-hidden px-4 py-6 items-center">
              <ActivityIndicator />
              <Text className="mt-2 text-sm text-[#666]">Đang tải lịch...</Text>
            </View>
          ) : error ? (
            <View className="rounded-3xl border border-black/5 bg-white overflow-hidden px-4 py-6 items-center" style={{ gap: 8 }}>
              <Text className="text-sm text-red-500">{error}</Text>
              <AppButton title="Thử lại" onPress={() => void fetchSchedule({ page: 1 })} />
            </View>
          ) : !displayedEvents.length ? (
            <View className="rounded-3xl border border-black/5 bg-white overflow-hidden px-4 py-6">
              <Text className="text-center text-sm text-[#666]">Chưa có sự kiện sắp tới.</Text>
            </View>
          ) : (
            sectionedEvents.map(({ key, items }) => (
              <View key={key} className="rounded-3xl border border-black/5 bg-white overflow-hidden">
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-black/5">
                  <Text className="text-sm font-semibold text-[#111]">{SECTION_META[key].title}</Text>
                  <Text className="text-xs font-semibold text-[#666]">{items.length}</Text>
                </View>
                {items.length === 0 ? (
                  <Text className="px-4 py-4 text-xs text-[#666]">Không có sự kiện.</Text>
                ) : (
                  items.map((event, index) => {
                    const targetText =
                      event.targetText ||
                      (event.targetType === "BRANCH_ALL"
                        ? `Toàn chi nhánh`
                        : event.targetGroups && event.targetGroups.length
                        ? `Nhóm: ${event.targetGroups
                            .slice(0, 2)
                            .map((g) => g.groupName || g.groupCode)
                            .join(", ")}${event.targetGroups.length > 2 ? ` +${event.targetGroups.length - 2}` : ""}`
                        : "Toàn chi nhánh");
                    let status = normalizeStatusForRole(event, isBA, isBM);
                    if (isBM && event.hidden) status = "HIDDEN";
                    const badge = isBA
                      ? status === "APPROVED"
                        ? { text: "Đã duyệt", bg: "#DCFCE7", color: "#166534" }
                        : status === "REJECTED"
                        ? { text: "Đã từ chối", bg: "#FEE2E2", color: "#B91C1C" }
                        : { text: "Chờ duyệt", bg: "#FEF3C7", color: "#92400E" }
                      : status === "APPROVED"
                      ? { text: "Đã duyệt", bg: "#DCFCE7", color: "#166534" }
                      : status === "UPDATED"
                      ? { text: "Chờ duyệt", bg: "#FEF3C7", color: "#92400E" }
                      : status === "REJECTED"
                      ? { text: "Đã từ chối", bg: "#FEE2E2", color: "#B91C1C" }
                      : status === "EXPIRED"
                      ? { text: "Đã qua", bg: "#E5E7EB", color: "#374151" }
                      : status === "HIDDEN"
                      ? { text: "Ẩn", bg: "#F3F4F6", color: "#6B7280" }
                      : { text: "Chờ duyệt", bg: "#FEF3C7", color: "#92400E" };

                    const handlePress = () => {
                      openEditModal(event);
                    };

                    return (
                      <Pressable
                        key={String(event.id)}
                        onPress={handlePress}
                        className="flex-row items-center gap-4 px-4 py-4"
                        android_ripple={{ color: "rgba(0,0,0,0.03)" }}
                        style={({ pressed }) => ({
                          backgroundColor: pressed ? "rgba(0,0,0,0.03)" : "transparent",
                          borderBottomWidth: index === items.length - 1 ? 0 : 1,
                          borderBottomColor: "rgba(0,0,0,0.05)",
                        })}
                      >
                        <View className="relative h-12 w-12 overflow-hidden rounded-full bg-black/5">
                          <Image source={getAvatarUrl(event)} style={{ width: 48, height: 48 }} resizeMode="cover" />
                        </View>
                        <View className="flex-1" style={{ gap: 4 }}>
                          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                            <Text
                              className="text-sm font-semibold text-[#111]"
                              numberOfLines={2}
                              ellipsizeMode="tail"
                              style={{ flex: 1, flexShrink: 1, marginRight: 10, lineHeight: 18 }}
                            >
                              {event.title || event.eventType || "Sự kiện"}
                            </Text>
                            <View
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                backgroundColor: badge.bg,
                                borderRadius: 999,
                                flexShrink: 0,
                                alignSelf: "flex-start",
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: "700", color: badge.color }}>{badge.text}</Text>
                            </View>
                          </View>

                          <Text className="text-xs text-[#555]" numberOfLines={2}>
                            {isNoticeType(event.eventType)
                              ? formatDateWithTime(event.startDate, false)
                              : `${formatDateWithTime(event.startDate, true)}${
                                  event.durationMinutes != null && event.durationMinutes > 0
                                    ? ` • ${event.durationMinutes} phút`
                                    : ""
                                }`}
                          </Text>

                          <Pressable
                            onPress={() =>
                              event.targetType === "GROUPS" && event.targetGroups?.length
                                ? setGroupModal({ open: true, groups: event.targetGroups })
                                : undefined
                            }
                            hitSlop={4}
                          >
                            <Text className="text-xs text-[#0A84FF]" numberOfLines={2}>
                              {targetText}
                            </Text>
                          </Pressable>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            ))
          )}

          {!isLoading && displayedEvents.length > 0 ? (
            <PaginationBar
              currentPage={currentPage}
              totalItems={totalEvents}
              pageSize={PAGE_LIMIT}
              onPageChange={(page) => void handlePageChange(page)}
              disabled={isLoading}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* ✅ Floating add button (giống StaffManageScreen) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: floatingBottom,
          zIndex: 9999,
          elevation: 50,
          paddingHorizontal: 16,
          alignItems: "center",
        }}
        pointerEvents="box-none"
      >
        <View style={{ width: contentWidth || "100%", maxWidth: CONTAINER_MAX_W }}>
          <AppButton title="Thêm lịch" onPress={openCreateModal} />
        </View>
      </View>

      {/* Create/Edit modal */}
      <Modal transparent visible={Boolean(modalMode)} animationType="fade" onRequestClose={closeAllModals}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.30)" }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeAllModals} />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 520,
                height: MODAL_H,
                backgroundColor: "#fff",
                borderRadius: 28,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.06)",
              }}
            >
              {/* Header */}
              <View
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(0,0,0,0.06)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: "600", color: "#111" }}>{modalTitle}</Text>

                <Pressable
                  onPress={closeAllModals}
                  style={{
                    position: "absolute",
                    right: 16,
                    top: 12,
                    height: 32,
                    width: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.10)",
                  }}
                >
                  <Text style={{ fontSize: 18, color: "#333" }}>×</Text>
                </Pressable>
              </View>
              {/* {modalMode === "edit" && isBM ? (
                <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 24, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" }}>
                  <AppButton
                    title="Duyệt"
                    onPress={async () => {
                      if (!selectedEvent) return;
                      setActionLoading(true);
                      try {
                        await appApi.approveSchedule(selectedEvent.id as number);
                        await fetchSchedule();
                        closeAllModals();
                      } catch (e: any) {
                        setSaveError(e?.response?.data?.message ?? "Không thể duyệt lịch.");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    fullWidth={false}
                    disabled={actionLoading || saveLoading}
                  />
                  <AppButton
                    title="Từ chối"
                    onPress={async () => {
                      if (!selectedEvent) return;
                      setActionLoading(true);
                      try {
                        await appApi.rejectSchedule(selectedEvent.id as number);
                        await fetchSchedule();
                        closeAllModals();
                      } catch (e: any) {
                        setSaveError(e?.response?.data?.message ?? "Không thể từ chối lịch.");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    bgColor="#FEE2E2"
                    textClassName="text-red-600"
                    fullWidth={false}
                    disabled={actionLoading || saveLoading}
                  />
                </View>
              ) : null} */}

      {/* Body */}
      <View style={{ flex: 1, minHeight: 0 }}>
        <ScrollView
                  style={{ flex: 1 }}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  contentContainerStyle={{
                    paddingHorizontal: 24,
                    paddingTop: 16,
                    paddingBottom: 24,
                    gap: 12,
                  }}
                >
                  {detailLoading ? (
                    <View style={{ paddingVertical: 8, alignItems: "center", gap: 8 }}>
                      <ActivityIndicator />
                      <Text style={{ fontSize: 13, color: "#666" }}>Đang tải chi tiết...</Text>
                    </View>
                  ) : null}

                  {/* Title */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Tiêu đề</Text>
                    <TextInput
                      value={formState.title}
                      onChangeText={(value) => setFormState((prev) => ({ ...prev, title: value }))}
                      placeholder="Nhập tiêu đề"
                      style={{
                        borderWidth: 1,
                        borderColor: "rgba(0,0,0,0.06)",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        color: "#111",
                        fontSize: 16,
                        backgroundColor: "#fff",
                      }}
                      placeholderTextColor="#9ca3af"
                      selectionColor="#111"
                    />
                  </View>

                  {/* Event type */}
                  {modalMode === "edit" ? (
                    <View
                      style={{
                        gap: 6,
                        borderWidth: 1,
                        borderColor: "rgba(0,0,0,0.06)",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Loại sự kiện</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#111" }}>
                        {EVENT_TYPES.find((opt) => opt.value === formState.eventType)?.label || formState.eventType}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Loại sự kiện</Text>
                      <Pressable
                        onPress={() => setEventTypePickerOpen(true)}
                        style={{
                          borderWidth: 1,
                          borderColor: "rgba(0,0,0,0.06)",
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          backgroundColor: "#fff",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>
                          {EVENT_TYPES.find((opt) => opt.value === formState.eventType)?.label || "Chọn loại sự kiện"}
                        </Text>
                        <Feather name="chevron-down" size={18} color="#0A84FF" />
                      </Pressable>
                    </View>
                  )}

                  {/* Audience */}
                  {renderAudience()}

                  {/* Start */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Bắt đầu</Text>
                    <Pressable
                      onPress={handleOpenDatePicker}
                      style={{
                        borderWidth: 1,
                        borderColor: "rgba(0,0,0,0.06)",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor: "#fff",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>
                        {isNoticeType(formState.eventType)
                          ? formatDateWithTime(formState.startDate, false)
                          : formatDateTimeDisplay(formState.startDate)}
                      </Text>
                      <Feather name="chevron-down" size={18} color="#0A84FF" />
                    </Pressable>

                    {formState.eventType === "MEETING" ? (
                      <Text style={{ fontSize: 13, color: "#6C757D", lineHeight: 18 }}>
                        Lịch họp thường lặp lại mỗi 28 ngày kể từ ngày đã chọn. Nếu trùng Tết hoặc ngày bận, bạn có thể
                        chỉnh lại thủ công.
                      </Text>
                    ) : null}
                  </View>

                  {/* Duration */}
                  {formState.eventType !== "NOTICE" && formState.eventType !== "Thông báo" ? (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Thời lượng (phút)</Text>
                      <TextInput
                        keyboardType="numeric"
                        value={formState.durationMinutes}
                        onChangeText={(value) =>
                          setFormState((prev) => ({ ...prev, durationMinutes: value.replace(/[^0-9]/g, "") }))
                        }
                        placeholder="Nhập thời lượng"
                        style={{
                          borderWidth: 1,
                          borderColor: "rgba(0,0,0,0.06)",
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          color: "#111",
                          fontSize: 16,
                          backgroundColor: "#fff",
                        }}
                        placeholderTextColor="#9ca3af"
                        selectionColor="#111"
                      />
                    </View>
                  ) : null}

                  {/* Location */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Địa điểm</Text>
                    <TextInput
                      value={formState.locationName}
                      onChangeText={(value) => setFormState((prev) => ({ ...prev, locationName: value }))}
                      placeholder="Nhập địa điểm"
                      style={{
                        borderWidth: 1,
                        borderColor: "rgba(0,0,0,0.06)",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        color: "#111",
                        fontSize: 16,
                        backgroundColor: "#fff",
                      }}
                      placeholderTextColor="#9ca3af"
                      selectionColor="#111"
                    />
                  </View>

                  {/* Description */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Mô tả</Text>
                    <TextInput
                      multiline
                      numberOfLines={4}
                      value={formState.description}
                      onChangeText={(value) => setFormState((prev) => ({ ...prev, description: value }))}
                      placeholder="Nhập mô tả"
                      textAlignVertical="top"
                      style={{
                        borderWidth: 1,
                        borderColor: "rgba(0,0,0,0.06)",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        color: "#111",
                        fontSize: 16,
                        backgroundColor: "#fff",
                        minHeight: 110,
                      }}
                      placeholderTextColor="#9ca3af"
                      selectionColor="#111"
                    />
                  </View>

                  {modalMode === "edit" && isBM ? (
                    <View className="space-y-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                      <View className="flex-row items-center justify-between">
                        <View className="space-y-1">
                          <Text className="text-sm font-semibold text-[#111]">Ẩn sự kiện</Text>
                          <Text className="text-xs text-[#6C757D]">Ẩn khỏi danh sách của khách hảng</Text>
                        </View>
                        <Switch
                          value={Boolean(detail?.hidden ?? selectedEvent?.hidden)}
                          onValueChange={async (next) => {
                            if (!selectedEvent) return;
                            setActionLoading(true);
                            try {
                              await appApi.hideSchedule(selectedEvent.id as number, next);
                              setEvents((prev) =>
                                (prev || []).map((ev) =>
                                  String(ev.id) === String(selectedEvent.id)
                                    ? { ...ev, hidden: next, displayStatus: next ? "HIDDEN" : ev.displayStatus }
                                    : ev,
                                ),
                              );
                              setDetail((prev) => (prev ? { ...prev, hidden: next } : prev));
                              if (next && isBA) {
                                // BA sẽ không thấy event ẩn; đóng modal để tránh bối rối
                                closeAllModals();
                              }
                              await fetchSchedule({ page: 1 });
                            } catch {
                              setSaveError("Không thể cập nhật trạng thái ẩn.");
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          disabled={actionLoading || saveLoading}
                          trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                          thumbColor="#fff"
                        />
                      </View>
                    </View>
                  ) : null}

                  {saveError ? <Text style={{ fontSize: 14, color: "#e53935" }}>{saveError}</Text> : null}
                </ScrollView>
              </View>

              {/* Footer */}
              <View
                style={{
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  paddingBottom: 20,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(0,0,0,0.06)",
                  gap: 10,
                }}
              >
                {modalMode === "create" ? (
                  <View style={{ gap: 10 }}>
                    <AppButton title="Hủy" onPress={closeAllModals} bgColor="#e53935" />
                    <AppButton title="Tạo lịch" onPress={handleCreate} loading={saveLoading} />
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {isBM ? (
                      (() => {
                        const isPendingForApprove =
                          modalStatus === "PENDING_APPROVAL" ||
                          modalStatus === "PENDING" ||
                          modalStatus === "UPDATED";
                        if (isPendingForApprove) {
                          return (
                            <View style={{ flexDirection: "row", gap: 10 }}>
                              <View style={{ flex: 1 }}>
                                <AppButton
                                  title="Duyệt"
                                  onPress={async () => {
                                    if (!selectedEvent) return;
                                    if (!validateAudience()) return;
                                    setActionLoading(true);
                                    setSaveError(null);
                                    try {
                                      const payload = buildUpdatePayload();
                                      await appApi.updateSchedule(selectedEvent.id as number, payload);
                                      await appApi.approveSchedule(selectedEvent.id as number);
                                      await fetchSchedule({ page: 1 });
                                      closeAllModals();
                                    } catch (e: any) {
                                      setSaveError(e?.response?.data?.message ?? "Không thể duyệt lịch.");
                                    } finally {
                                      setActionLoading(false);
                                    }
                                  }}
                                  bgColor="#34C759"
                                  textClassName="text-white"
                                  fullWidth
                                  disabled={actionLoading || saveLoading}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <AppButton
                                  title="Từ chối"
                                  onPress={async () => {
                                    if (!selectedEvent) return;
                                    setActionLoading(true);
                                    setSaveError(null);
                                    try {
                                      await appApi.rejectSchedule(selectedEvent.id as number);
                                      await fetchSchedule({ page: 1 });
                                      closeAllModals();
                                    } catch (e: any) {
                                      setSaveError(e?.response?.data?.message ?? "Không thể từ chối lịch.");
                                    } finally {
                                      setActionLoading(false);
                                    }
                                  }}
                                  bgColor="#FEE2E2"
                                  textClassName="text-red-600"
                                  fullWidth
                                  disabled={actionLoading || saveLoading}
                                />
                              </View>
                            </View>
                          );
                        }
                        return (
                          <AppButton
                            title="Lưu"
                            onPress={handleSaveEdit}
                            loading={saveLoading || actionLoading}
                            disabled={actionLoading}
                          />
                        );
                      })()
                    ) : (
                      <AppButton title="Lưu" onPress={handleSaveEdit} loading={saveLoading} />
                    )}
                  </View>
                )}
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Event type picker */}
      <Modal
        transparent
        visible={eventTypePickerOpen}
        animationType="fade"
        presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
        onRequestClose={() => setEventTypePickerOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.30)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setEventTypePickerOpen(false)} />
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              backgroundColor: "#fff",
              borderRadius: 20,
              overflow: "hidden",
              alignSelf: "center",
            }}
          >
            {EVENT_TYPES.map((opt) => {
              const active = formState.eventType === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setFormState((prev) => ({ ...prev, eventType: opt.value }));
                    setEventTypePickerOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(0,0,0,0.06)",
                    backgroundColor: active ? "#E7F2FF" : "#fff",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: active ? "600" : "400", color: active ? "#0A84FF" : "#111" }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setEventTypePickerOpen(false)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.04)",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#111" }}>Đóng</Text>
            </Pressable>
          </Pressable>
        </View>
      </Modal>

      {/* Group picker */}
      <Modal
        transparent
        visible={groupPickerOpen}
        animationType="fade"
        presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
        onRequestClose={() => setGroupPickerOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.30)" }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setGroupPickerOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 420,
                backgroundColor: "#fff",
                borderRadius: 16,
                overflow: "hidden",
                maxHeight: "85%",
              }}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(0,0,0,0.10)",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>Chọn nhóm</Text>

                <View
                  style={{
                    marginTop: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.10)",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <TextInput
                    value={groupSearch}
                    onChangeText={setGroupSearch}
                    placeholder="Tìm nhóm..."
                    placeholderTextColor="#9ca3af"
                    selectionColor="#111"
                    style={{ fontSize: 14, color: "#111", paddingVertical: 2 }}
                  />
                </View>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={{ flexGrow: 1 }}>
                {filteredGroups.length === 0 ? (
                  <Text style={{ paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: "#666" }}>
                    Chưa có nhóm phù hợp.
                  </Text>
                ) : (
                  filteredGroups.map((group) => {
                    const checked = groupPickerSelection.includes(group.groupCode);
                    return (
                      <Pressable
                        key={group.groupCode}
                        onPress={() => {
                          setGroupPickerSelection((prev) =>
                            checked ? prev.filter((code) => code !== group.groupCode) : [...prev, group.groupCode],
                          );
                        }}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: "rgba(0,0,0,0.06)",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: "#111" }}>
                            {group.groupName || group.groupCode}
                          </Text>
                          <Text style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                            {group.branchName ? `Chi nhánh: ${group.branchName}` : "Nhóm"}
                          </Text>
                        </View>

                        <View
                          style={{
                            height: 20,
                            width: 20,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: checked ? "#0A84FF" : "rgba(0,0,0,0.25)",
                            backgroundColor: checked ? "#0A84FF" : "transparent",
                          }}
                        />
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(0,0,0,0.10)",
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppButton
                    title="Hủy"
                    onPress={() => setGroupPickerOpen(false)}
                    bgColor="#E5E7EB"
                    textClassName="text-slate-700"
                    fullWidth={false}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title="Xong"
                    onPress={() => {
                      setFormState((prev) => ({ ...prev, selectedGroupCodes: groupPickerSelection }));
                      setGroupPickerOpen(false);
                    }}
                    fullWidth={false}
                  />
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* DateTime picker (iOS) */}
      {Platform.OS !== "web" && (
        <DateTimePickerModal
          isVisible={pickerVisible}
          mode={pickerMode}
          date={tempDate || (formState.startDate ? new Date(formState.startDate) : new Date())}
          onConfirm={handlePickerConfirm}
          onCancel={() => setPickerVisible(false)}
          display={Platform.OS === "ios" ? "spinner" : undefined}
        />
      )}

      {Platform.OS === "web" && (
        <Modal transparent visible={webDatePickerOpen} animationType="fade" onRequestClose={() => setWebDatePickerOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", paddingHorizontal: 20 }}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setWebDatePickerOpen(false)} />
            <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 12, maxWidth: 460, alignSelf: "center", width: "100%" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111" }}>Chọn thời gian bắt đầu</Text>
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, color: "#6C757D", fontWeight: "600" }}>Ngày (YYYY-MM-DD)</Text>
                <TextInput
                  value={webDateValue}
                  onChangeText={(value) => {
                    setWebDateValue(value);
                    if (webPickerError) setWebPickerError(null);
                  }}
                  placeholder="2026-02-28"
                  autoCapitalize="none"
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.08)",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                    color: "#111",
                    backgroundColor: "#fff",
                  }}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {!isNoticeType(formState.eventType) ? (
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, color: "#6C757D", fontWeight: "600" }}>Giờ (HH:mm)</Text>
                  <TextInput
                    value={webTimeValue}
                    onChangeText={(value) => {
                      setWebTimeValue(value);
                      if (webPickerError) setWebPickerError(null);
                    }}
                    placeholder="09:30"
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.08)",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 15,
                      color: "#111",
                      backgroundColor: "#fff",
                    }}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              ) : null}

              {webPickerError ? <Text style={{ color: "#dc2626", fontSize: 13 }}>{webPickerError}</Text> : null}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title="Hủy"
                    onPress={() => setWebDatePickerOpen(false)}
                    bgColor="#E5E7EB"
                    textClassName="text-slate-700"
                    fullWidth={false}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton title="Áp dụng" onPress={handleApplyWebDatePicker} fullWidth={false} />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal xem toàn bộ nhóm */}
      <Modal
        transparent
        visible={groupModal.open}
        animationType="fade"
        onRequestClose={() => setGroupModal({ open: false, groups: [] })}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.30)", justifyContent: "center", paddingHorizontal: 20 }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setGroupModal({ open: false, groups: [] })} />
          <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 16, maxHeight: "70%" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 12 }}>Nhóm mục tiêu</Text>
            <ScrollView>
              {groupModal.groups.length === 0 ? (
                <Text style={{ color: "#666" }}>Không có nhóm.</Text>
              ) : (
                groupModal.groups.map((g, idx) => (
                  <View
                    key={`${g.groupCode}-${idx}`}
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: idx === groupModal.groups.length - 1 ? 0 : 1,
                      borderBottomColor: "rgba(0,0,0,0.06)",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#111" }}>
                      {g.groupName || g.groupCode}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#666" }}>{g.groupCode}</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <AppButton title="Đóng" onPress={() => setGroupModal({ open: false, groups: [] })} />
          </View>
        </View>
      </Modal>
    </MobileFrame>
  );
};

export default StaffScheduleScreen;
