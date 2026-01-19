import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { MobileFrame } from "@components/layout/MobileFrame";
import { Card } from "@components/ui/Card";
import { AppButton } from "@components/ui/AppButton";
import { useProfileStore } from "@store/profileStore";
import {
  appApi,
  type ScheduleItem,
  type ScheduleDetail,
  type ScheduleCreatePayload,
  type StaffGroupItem,
} from "@services/appApi";

const EVENT_TYPES: Array<{ value: string; label: string }> = [
  { value: "MEETING", label: "Họp nhóm" },
  { value: "FIELD_SCHOOL", label: "Tập huấn" },
  { value: "FARMING_TASK", label: "Nông vụ" },
  { value: "OTHER", label: "Khác" },
];

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

const getAvatarUrl = (event: ScheduleItem) => {
  if (event.eventType === "MEETING") return require("../../assets/img/community-meeting.png");
  if (event.eventType === "FIELD_SCHOOL") return require("../../assets/img/farming-plant-rice.png");
  if (event.eventType === "FARMING_TASK") return require("../../assets/img/farming-plant-rice.png");
  return require("../../assets/img/farming-plant-rice.png");
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
  const isStaff = profile?.actorKind === "STAFF";
  const isWeb = Platform.OS === "web";

  const [events, setEvents] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [staffGroups, setStaffGroups] = useState<StaffGroupItem[]>([]);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleItem | null>(null);
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [eventTypePickerOpen, setEventTypePickerOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [groupPickerSelection, setGroupPickerSelection] = useState<string[]>([]);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time" | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);

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

  const openCreateModal = () => {
    setSelectedEvent(null);
    setDetail(null);
    setDetailLoading(false);
    setSaveError(null);
    setGroupSearch("");
    setGroupPickerSelection([]);
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
    setModalMode("create");
  };

  const fetchSchedule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appApi.getSchedule();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Không tải được lịch sự kiện. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaffGroups = async () => {
    try {
      const data = await appApi.getStaffGroups();
      setStaffGroups(Array.isArray(data) ? data : []);
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
      setGroupPickerSelection((data.targetGroups ?? []).map((g) => g.groupCode));
      setFormState((prev) => ({
        ...prev,
        title: data.title ?? item.title,
        eventType: data.eventType ?? item.eventType,
        startDate: data.startDate ?? item.startDate,
        durationMinutes: data.durationMinutes ? String(data.durationMinutes) : "",
        locationName: data.locationName ?? "",
        description: data.description ?? "",
        audienceMode: (data.audienceType as "BRANCH_ALL" | "GROUPS") || "BRANCH_ALL",
        selectedGroupCodes: (data.targetGroups ?? []).map((g) => g.groupCode),
      }));
    } catch {
      setSaveError("Không tải được chi tiết lịch.");
      setFormState((prev) => ({
        ...prev,
        title: item.title,
        eventType: item.eventType as string,
        startDate: item.startDate,
      }));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) {
      fetchSchedule();
      fetchStaffGroups();
    }
  }, [isStaff]);

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

  const upcomingEvents = useMemo(() => {
    const today = startOfToday().getTime();
    return (events || []).filter((evt) => {
      const d = new Date(evt.startDate).getTime();
      return Number.isFinite(d) && d >= today;
    });
  }, [events]);

  const modalTitle =
    modalMode === "edit"
      ? "Chỉnh sửa lịch"
      : formState.eventType === "MEETING"
      ? "Thêm lịch họp"
      : formState.eventType === "FIELD_SCHOOL"
      ? "Thêm lịch tập huấn"
      : formState.eventType === "FARMING_TASK"
      ? "Thêm lịch nông vụ"
      : "Thêm lịch";

  const handleSaveEdit = async () => {
    if (!selectedEvent) return;
    if (formState.audienceMode === "GROUPS" && formState.selectedGroupCodes.length === 0) {
      setSaveError("Vui lòng chọn ít nhất 1 nhóm.");
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload = {
        title: formState.title.trim() || undefined,
        description: formState.description.trim() || undefined,
        startDate: formState.startDate ? new Date(formState.startDate).toISOString() : undefined,
        durationMinutes: formState.durationMinutes ? Number(formState.durationMinutes) : undefined,
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
      await appApi.updateSchedule(selectedEvent.id as number, payload);
      setModalMode(null);
      await fetchSchedule();
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
    if (!formState.durationMinutes || Number(formState.durationMinutes) <= 0) {
      setSaveError("Vui lòng nhập thời lượng hợp lệ.");
      return;
    }
    if (formState.audienceMode === "GROUPS" && formState.selectedGroupCodes.length === 0) {
      setSaveError("Vui lòng chọn ít nhất 1 nhóm.");
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: ScheduleCreatePayload = {
        title: formState.title.trim(),
        description: formState.description.trim() || undefined,
        eventType: formState.eventType,
        startDate: new Date(formState.startDate).toISOString(),
        durationMinutes: Number(formState.durationMinutes),
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
      await fetchSchedule();
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? "Tạo lịch thất bại.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert("Xóa lịch?", "Bạn có chắc muốn xóa lịch này không?", [
        { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
        { text: "Xóa", style: "destructive", onPress: () => resolve(true) },
      ]);
    });
    if (!confirmed) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.deleteEvent(selectedEvent.id as number);
      setModalMode(null);
      await fetchSchedule();
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? "Xóa lịch thất bại.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOpenDatePicker = () => {
    const base = formState.startDate ? new Date(formState.startDate) : new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: base,
        mode: "date",
        onChange: (event, selectedDate) => {
          if (!selectedDate || event.type === "dismissed") return;
          const pickedDate = selectedDate;
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
        },
      });
      return;
    }
    setTempDate(base);
    setDatePickerMode("date");
  };

  const handleDateChange = (_event: any, selected?: Date) => {
    if (datePickerMode !== "date") return;
    if (!_event || _event.type === "dismissed") {
      setDatePickerMode(null);
      return;
    }
    const dateVal = selected || tempDate || new Date();
    setTempDate(dateVal);
    setDatePickerMode("time");
  };

  const handleTimeChange = (_event: any, selected?: Date) => {
    if (datePickerMode !== "time") return;
    if (!_event || _event.type === "dismissed") {
      setDatePickerMode(null);
      return;
    }
    const base = tempDate || new Date();
    const timeVal = selected || new Date();
    const finalDate = new Date(base);
    finalDate.setHours(timeVal.getHours(), timeVal.getMinutes(), 0, 0);
    setFormState((prev) => ({ ...prev, startDate: finalDate.toISOString() }));
    setDatePickerMode(null);
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
            onPress={() =>
              setFormState((prev) => ({
                ...prev,
                audienceMode: opt.value,
                selectedGroupCodes: opt.value === "GROUPS" ? prev.selectedGroupCodes : [],
              }))
            }
            className={`rounded-full border px-4 py-2 ${
              formState.audienceMode === opt.value
                ? "border-[#0A84FF] bg-[#E7F2FF]"
                : "border-black/10 bg-white"
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
      {formState.audienceMode === "GROUPS" && formState.selectedGroupCodes.length === 0 && saveError ? (
        <Text className="text-xs text-red-500">{saveError}</Text>
      ) : null}
    </View>
  );

  if (!isStaff) {
    return (
      <MobileFrame withBottomPadding>
        <View className="flex-1 items-center justify-center px-4">
          <Card className="w-full rounded-2xl">
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
          paddingBottom: 72,
          paddingHorizontal: 16,
          gap: 16,
          backgroundColor: "#F2F2F7",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignSelf: "center", width: "100%", maxWidth: 480, gap: 16 }}>
          <Card className="rounded-2xl bg-[#DFF5D1] px-6 py-4 text-center shadow-md items-center">
            <Text className="text-xl font-semibold text-slate-900">Công tác và Tập huấn</Text>
          </Card>

          <View className="rounded-3xl border border-black/5 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden">
            {isLoading ? (
              <View className="px-4 py-6 items-center">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Đang tải lịch...</Text>
              </View>
            ) : error ? (
              <View className="space-y-2 px-4 py-6 text-center">
                <Text className="text-sm text-red-500">{error}</Text>
                <AppButton title="Thử lại" onPress={fetchSchedule} />
              </View>
            ) : !upcomingEvents.length ? (
              <View className="px-4 py-6">
                <Text className="text-center text-sm text-[#666]">Chưa có sự kiện sắp tới.</Text>
              </View>
            ) : (
              upcomingEvents.map((event, index) => (
                <Pressable
                  key={event.id}
                  onPress={() => openEditModal(event)}
                  className="flex-row items-center gap-4 px-4 py-4"
                  android_ripple={{ color: "rgba(0,0,0,0.03)" }}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? "rgba(0,0,0,0.03)" : "transparent",
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                    borderBottomWidth: index === upcomingEvents.length - 1 ? 0 : 1,
                    borderBottomColor: "rgba(0,0,0,0.05)",
                  })}
                >
                  <View className="relative h-12 w-12 overflow-hidden rounded-full bg-black/5">
                    <Image source={getAvatarUrl(event)} style={{ width: 48, height: 48 }} resizeMode="cover" />
                  </View>
                  <View className="flex-1 space-y-1">
                    <Text className="text-sm font-semibold text-[#0A84FF]">{formatDate(event.startDate)}</Text>
                    <Text className="text-sm text-[#1C1C1E]" numberOfLines={2}>
                      {buildEventText(event)}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <View pointerEvents="box-none" style={{ position: "absolute", inset: 0 }}>
        <View className="pointer-events-none absolute inset-x-0 bottom-0 z-50">
          <View className="mx-auto w-full max-w-md relative pointer-events-auto">
            <Pressable
              onPress={openCreateModal}
              className="absolute right-4 h-14 w-14 items-center justify-center rounded-full bg-[#007AFF] shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
              style={{
                bottom: insets.bottom + 122,
              }}
            >
              <Feather name="plus" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      <Modal transparent visible={modalMode !== null} animationType="fade" onRequestClose={() => setModalMode(null)}>
        <Pressable className="flex-1 bg-black/30 px-4" onPress={() => setModalMode(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Pressable
              className="w-full max-w-md overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-2xl"
              onPress={(e) => e.stopPropagation()}
              style={{ maxHeight: isWeb ? "90vh" : "90%", width: "100%" }}
            >
              <View className="relative flex-row items-center justify-center border-b border-black/5 px-6 py-4">
                <Text className="text-[17px] font-semibold text-[#111]">{modalTitle}</Text>
                <Pressable
                  onPress={() => setModalMode(null)}
                  className="absolute right-4 top-3 h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5"
              >
                <Text className="text-base text-[#333]">×</Text>
              </Pressable>
            </View>

            <View style={{ flexGrow: 1, minHeight: 0 }}>
              <ScrollView
                style={{ flex: 1, maxHeight: isWeb ? "70vh" : undefined }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12, flexGrow: 1 }}
              >
                <View className="space-y-2">
                  <Text className="text-xs font-medium text-[#6C757D]">Tiêu đề</Text>
                  <TextInput
                    value={formState.title}
                    onChangeText={(value) => setFormState((prev) => ({ ...prev, title: value }))}
                  placeholder="Nhập tiêu đề"
                  className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                />
              </View>

              {modalMode === "edit" ? (
                <View className="space-y-1 rounded-2xl border border-black/5 bg-white px-4 py-3">
                  <Text className="text-xs font-medium text-[#6C757D]">Loại sự kiện</Text>
                  <Text className="text-sm font-semibold text-[#111]">
                    {EVENT_TYPES.find((opt) => opt.value === formState.eventType)?.label || formState.eventType}
                  </Text>
                </View>
              ) : (
                <View className="space-y-2">
                  <Text className="text-xs font-medium text-[#6C757D]">Loại sự kiện</Text>
                  <Pressable
                    onPress={() => setEventTypePickerOpen(true)}
                    className="flex-row items-center justify-between rounded-2xl border border-black/5 bg-white px-4 py-3"
                  >
                    <Text className="text-base font-semibold text-[#111]">
                      {EVENT_TYPES.find((opt) => opt.value === formState.eventType)?.label || "Chọn loại sự kiện"}
                    </Text>
                    <Feather name="chevron-down" size={18} color="#0A84FF" />
                  </Pressable>
                </View>
              )}

              {renderAudience()}

              <View className="space-y-2">
                <Text className="text-xs font-medium text-[#6C757D]">Bắt đầu</Text>
                <Pressable
                  onPress={handleOpenDatePicker}
                  className="rounded-2xl border border-black/5 px-4 py-3 bg-white flex-row items-center justify-between"
                >
                  <Text className="text-base font-semibold text-[#111]">{formatDateTimeDisplay(formState.startDate)}</Text>
                  <Feather name="chevron-down" size={18} color="#0A84FF" />
                </Pressable>
                {formState.eventType === "MEETING" ? (
                  <Text className="text-sm text-[#6C757D] leading-relaxed">
                    Lịch họp thường lặp lại mỗi 28 ngày kể từ ngày đã chọn. Nếu trùng Tết hoặc ngày bận, bạn có thể chỉnh lại thủ công.
                  </Text>
                ) : null}
              </View>

              <View className="space-y-2">
                <Text className="text-xs font-medium text-[#6C757D]">Thời lượng (phút)</Text>
                <TextInput
                  keyboardType="numeric"
                  value={formState.durationMinutes}
                  onChangeText={(value) => setFormState((prev) => ({ ...prev, durationMinutes: value.replace(/[^0-9]/g, "") }))}
                  placeholder="Nhập thời lượng"
                  className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                />
              </View>

              <View className="space-y-2">
                <Text className="text-xs font-medium text-[#6C757D]">Địa điểm</Text>
                <TextInput
                  value={formState.locationName}
                  onChangeText={(value) => setFormState((prev) => ({ ...prev, locationName: value }))}
                  placeholder="Nhập địa điểm"
                  className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                />
              </View>

              <View className="space-y-2">
                <Text className="text-xs font-medium text-[#6C757D]">Mô tả</Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  value={formState.description}
                  onChangeText={(value) => setFormState((prev) => ({ ...prev, description: value }))}
                  placeholder="Nhập mô tả"
                  className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                  textAlignVertical="top"
                />
              </View>

              {saveError && <Text className="text-sm text-red-500">{saveError}</Text>}
              </ScrollView>
            </View>

            <View className="flex-col items-stretch gap-2 border-t border-black/5 bg-white px-6 pb-5 pt-4">
              {modalMode === "edit" ? (
                <>
                  <AppButton
                    title="Xóa lịch"
                    onPress={handleDelete}
                    loading={saveLoading}
                    bgColor="#e53935"
                  />
                  <AppButton title="Lưu" onPress={handleSaveEdit} loading={saveLoading} />
                </>
              ) : (
                <>
                  <AppButton
                    title="Hủy"
                    onPress={() => setModalMode(null)}
                    bgColor="#e53935"
                  />
                  <AppButton title="Tạo lịch" onPress={handleCreate} loading={saveLoading} />
                </>
              )}
            </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal transparent visible={eventTypePickerOpen} animationType="fade" onRequestClose={() => setEventTypePickerOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/30 px-4" onPress={() => setEventTypePickerOpen(false)}>
          <Pressable
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
            onPress={(e) => e.stopPropagation()}
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
                  className={`px-4 py-3 border-b border-black/5 ${active ? "bg-[#E7F2FF]" : "bg-white"}`}
                >
                  <Text className={`text-base ${active ? "font-semibold text-[#0A84FF]" : "text-[#111]"}`}>{opt.label}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setEventTypePickerOpen(false)}
              className="px-4 py-3 items-center justify-center bg-slate-100"
            >
              <Text className="text-sm font-semibold text-[#111]">Đóng</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={groupPickerOpen} animationType="fade" onRequestClose={() => setGroupPickerOpen(false)}>
        <Pressable className="flex-1 bg-black/30 px-4" onPress={() => setGroupPickerOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Pressable
              className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
              onPress={(e) => e.stopPropagation()}
              style={{ maxHeight: "85%", width: "100%" }}
            >
              <View className="border-b border-black/10 bg-white px-4 py-3">
                <Text className="text-base font-semibold text-[#111]">Chọn nhóm</Text>
                <View className="mt-2 rounded-xl border border-black/10 bg-white px-3 py-2">
                  <TextInput
                    value={groupSearch}
                  onChangeText={setGroupSearch}
                  placeholder="Tìm nhóm..."
                  className="text-sm text-[#111] py-1"
                />
              </View>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              contentContainerStyle={{ flexGrow: 1 }}
            >
              {filteredGroups.length === 0 ? (
                <Text className="px-4 py-3 text-sm text-[#666]">Chưa có nhóm phù hợp.</Text>
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
                      className="flex-row items-center justify-between border-b border-black/5 px-4 py-3"
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-semibold text-[#111]">{group.groupName || group.groupCode}</Text>
                        <Text className="text-xs text-[#666]">
                          {group.branchName ? `Chi nhánh: ${group.branchName}` : "Nhóm"}
                        </Text>
                      </View>
                      <View
                        className={`h-5 w-5 rounded-full border ${
                          checked ? "border-[#0A84FF] bg-[#0A84FF]" : "border-black/25"
                        }`}
                      />
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <View className="flex-row items-center gap-2 border-t border-black/10 bg-white px-4 py-3">
              <View className="flex-1">
                <AppButton
                  title="Hủy"
                  onPress={() => setGroupPickerOpen(false)}
                  className="bg-slate-200"
                  textClassName="text-slate-700"
                  fullWidth={false}
                />
              </View>
              <View className="flex-1">
                <AppButton
                  title="Xong"
                  onPress={() => {
                    setFormState((prev) => ({
                      ...prev,
                      selectedGroupCodes: groupPickerSelection,
                    }));
                    setGroupPickerOpen(false);
                  }}
                  fullWidth={false}
                />
              </View>
            </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {datePickerMode ? (
        <DateTimePicker
          value={tempDate || (formState.startDate ? new Date(formState.startDate) : new Date())}
          mode={datePickerMode}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={datePickerMode === "date" ? handleDateChange : handleTimeChange}
        />
      ) : null}
    </MobileFrame>
  );
};

export default StaffScheduleScreen;
