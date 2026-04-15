import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { MobileFrame } from "@components/layout/MobileFrame";
import { Card } from "@components/ui/Card";
import { AppButton } from "@components/ui/AppButton";
import { PaginationBar } from "@components/ui/PaginationBar";
import { useProfileStore } from "@store/profileStore";
import { appApi } from "@services/appApi";

type GroupItem = {
  id: number;
  branchCode?: string | null;
  branchName?: string | null;
  groupCode?: string | null;
  groupName: string;
  customerCount: number;
  unmappedCustomerCount?: number;
  status?: "ACTIVE" | "PENDING" | "APPROVED" | "REJECTED";
  groupNameKey?: string;
};

type GroupRequestItem = {
  id: number;
  groupCode?: string | null;
  groupName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdByRole?: string;
  createdAt?: string;
  rejectedAt?: string | null;
};

const GROUPS_PAGE_LIMIT = 20;
const REQUESTS_PAGE_LIMIT = 20;

const buildStatusBadge = (status?: string | null) => {
  if (status === "ACTIVE" || status == null) return { text: "Đang hoạt động", className: "border-emerald-100 bg-emerald-50 text-emerald-700" };
  if (status === "PENDING") return { text: "Chờ duyệt", className: "border-amber-100 bg-amber-50 text-amber-700" };
  if (status === "APPROVED") return { text: "Đã duyệt", className: "border-emerald-100 bg-emerald-50 text-emerald-700" };
  return { text: "Đã từ chối", className: "border-rose-100 bg-rose-50 text-rose-700" };
};

const mapGroupItem = (group: any): GroupItem => ({
  id: Number(group.id),
  branchCode: group.branchCode ?? null,
  branchName: group.branchName ?? null,
  groupCode: group.groupCode ?? null,
  groupName: group.groupName ?? '',
  customerCount: Number(group.customerCount ?? 0),
  unmappedCustomerCount: Number(group.unmappedCustomerCount ?? 0),
  status: group.status ?? 'ACTIVE',
  groupNameKey: group.groupNameKey ?? undefined,
});

const GroupScreen = () => {
  const { profile } = useProfileStore();
  const isStaff = profile?.actorKind === "STAFF";
  const isBA = profile?.role === "BA";
  const isBM = profile?.role === "BM";
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const tabBarHeight = useBottomTabBarHeight();
  const CONTAINER_MAX_W = 480;
  const [contentWidth, setContentWidth] = useState<number>(0);
  const TAB_FALLBACK = 110;
  const tabH = Math.max(tabBarHeight || 0, TAB_FALLBACK);
  const BUTTON_H = 56;
  const floatingBottom = tabH + 12;

  const { height: WIN_H } = Dimensions.get("window");
  const MODAL_H = Math.min(WIN_H * 0.9, 720);

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [requests, setRequests] = useState<GroupRequestItem[]>([]);
  const [groupPage, setGroupPage] = useState(1);
  const [groupHasMore, setGroupHasMore] = useState(false);
  const [groupTotal, setGroupTotal] = useState(0);
  const [requestPage, setRequestPage] = useState(1);
  const [requestHasMore, setRequestHasMore] = useState(false);
  const [requestTotal, setRequestTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [modalMode, setModalMode] = useState<"create" | "review" | "editRequest" | null>(null);
  const [formGroupName, setFormGroupName] = useState("");
  const [formGroupCode, setFormGroupCode] = useState("");
  const [formSsoId, setFormSsoId] = useState<number | null>(null);
  const [ssoOptions, setSsoOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [ssoPickerOpen, setSsoPickerOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<GroupRequestItem | null>(null);
  const [editTargetGroup, setEditTargetGroup] = useState<GroupItem | null>(null);

  const fetchData = async (options?: { groupPage?: number; requestPage?: number }) => {
    if (!isStaff) return;
    const nextGroupPage = options?.groupPage ?? 1;
    const nextRequestPage = options?.requestPage ?? 1;
    setLoading(true);
    setError(null);
    try {
      const [groupRes, reqRes] = await Promise.all([
        appApi.getStaffGroups({ page: nextGroupPage, limit: GROUPS_PAGE_LIMIT }),
        isBM
          ? appApi.getStaffGroupRequests({
              branchCode: profile?.branchCode ?? null,
              page: nextRequestPage,
              limit: REQUESTS_PAGE_LIMIT,
            })
          : isBA
          ? appApi.getMyGroupRequests({ page: nextRequestPage, limit: REQUESTS_PAGE_LIMIT })
          : Promise.resolve({ items: [], total: 0, page: nextRequestPage, limit: REQUESTS_PAGE_LIMIT, hasMore: false }),
      ]);
      setGroups((groupRes?.items ?? []).map(mapGroupItem));
      setGroupPage(groupRes?.page ?? nextGroupPage);
      setGroupHasMore(Boolean(groupRes?.hasMore));
      setGroupTotal(groupRes?.total ?? 0);

      const sortedReqs = (reqRes?.items ?? []).slice().sort((a, b) => {
        const rank = (s?: string | null) =>
          s === 'PENDING' ? 0 : s === 'APPROVED' ? 1 : 2; // REJECTED last
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return (a.id ?? 0) - (b.id ?? 0);
      });
      setRequests(sortedReqs);
      setRequestPage(reqRes?.page ?? nextRequestPage);
      setRequestHasMore(Boolean(reqRes?.hasMore));
      setRequestTotal(reqRes?.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Không tải được dữ liệu nhóm.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSso = async () => {
    if (!profile?.branchCode) {
      setSsoOptions([]);
      return;
    }
    try {
      const data = await appApi.getSsoByBranch(profile.branchCode);
      setSsoOptions(
        (data || []).map((u) => ({
          value: u.id,
          label: u.fullName || u.email || `SSO ${u.id}`,
        })),
      );
    } catch {
      setSsoOptions([]);
    }
  };

  useEffect(() => {
    if (!formSsoId && ssoOptions.length > 0) {
      setFormSsoId(ssoOptions[0].value);
    }
  }, [ssoOptions, formSsoId]);

  useEffect(() => {
    if (isFocused && isStaff) {
      fetchData();
      fetchSso();
    }
  }, [isFocused, isStaff]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData({ groupPage, requestPage });
    setRefreshing(false);
  };

  const handleGroupPageChange = async (page: number) => {
    if (loading || page === groupPage) return;
    await fetchData({ groupPage: page, requestPage });
  };

  const handleRequestPageChange = async (page: number) => {
    if (loading || page === requestPage) return;
    await fetchData({ groupPage, requestPage: page });
  };

  const openCreateModal = () => {
    setFormGroupName("");
    setFormGroupCode("");
    setFormSsoId(ssoOptions[0]?.value ?? null);
    setSaveError(null);
    setModalMode("create");
  };

  const openEditModal = (group: GroupItem) => {
    setEditTargetGroup(group);
    // Nếu đang có request PENDING cho group này, prefill theo đề xuất đó để BA bổ sung tiếp
    const pendingForGroup = requests.find(
      (r) => r.status === "PENDING" && (r as any).targetGroupId === group.id,
    );
    setFormGroupName(pendingForGroup?.groupName || group.groupName);
    setFormGroupCode(pendingForGroup?.groupCode || group.groupCode || "");
    setFormSsoId((pendingForGroup as any)?.proposedSsoId ?? null);
    setSaveError(null);
    setModalMode("editRequest");
  };

  const openReviewModal = (req: GroupRequestItem) => {
    setSelectedRequest(req);
    setFormSsoId((req as any).proposedSsoId ?? null);
    setModalMode("review");
    setSaveError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedRequest(null);
    setEditTargetGroup(null);
    setFormSsoId(null);
    setSaveError(null);
    setSaveLoading(false);
  };

  const handleSubmitCreate = async () => {
    if (!formGroupName.trim()) {
      setSaveError("Vui lòng nhập tên nhóm.");
      return;
    }
    if (!formSsoId) {
      setSaveError("Vui lòng chọn CCO phụ trách.");
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.createGroupRequest({
        groupName: formGroupName.trim(),
        groupCode: formGroupCode.trim() || undefined,
        ssoId: formSsoId,
      });
      closeModal();
      await fetchData();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setSaveError(e?.response?.data?.message || "Tên nhóm bị trùng sau chuẩn hóa.");
      } else {
        setSaveError(e?.response?.data?.message ?? "Gửi yêu cầu thất bại.");
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.approveGroupRequest(selectedRequest.id);
      closeModal();
      await fetchData();
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? "Duyệt thất bại.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.rejectGroupRequest(selectedRequest.id);
      closeModal();
      await fetchData();
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? "Từ chối thất bại.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!editTargetGroup) return;
    if (!formGroupName.trim()) {
      setSaveError("Vui lòng nhập tên nhóm.");
      return;
    }
    if (!formSsoId) {
      setSaveError("Vui lòng chọn CCO phụ trách.");
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.updateGroupRequest({
        targetGroupId: editTargetGroup.id,
        groupName: formGroupName.trim(),
        groupCode: formGroupCode.trim() || undefined,
        ssoId: formSsoId,
      });
      closeModal();
      await fetchData();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setSaveError(e?.response?.data?.message || "Tên nhóm bị trùng sau chuẩn hóa.");
      } else {
        setSaveError(e?.response?.data?.message ?? "Gửi yêu cầu thất bại.");
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const renderGroupCard = (group: GroupItem, index: number, arr: GroupItem[]) => {
    const badge = buildStatusBadge(group.status || "ACTIVE");
    const isLast = index === arr.length - 1;
    return (
      <Pressable
        key={group.id}
        onPress={() => (isBA ? openEditModal(group) : undefined)}
        className="w-full px-4 py-4"
        android_ripple={{ color: "rgba(0,0,0,0.03)" }}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "rgba(0,0,0,0.03)" : "transparent",
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: "rgba(0,0,0,0.05)",
        })}
      >
        <View className="space-y-1">
          <View className="flex-row items-start justify-between gap-2">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text className="text-sm font-semibold text-[#111]">{group.groupCode || "—"}</Text>
              <Text className="text-base text-[#111]" style={{ marginTop: 2 }}>
                {group.groupName}
              </Text>
              <Text className="text-xs text-[#666]" style={{ marginTop: 2 }}>
                Số thành viên: {group.customerCount ?? 0}
              </Text>
            </View>
            <Text
              className={`self-start rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
              style={{ flexShrink: 0 }}
            >
              {badge.text}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderRequestCard = (req: GroupRequestItem, index: number, arr: GroupRequestItem[]) => {
    const badge = buildStatusBadge(req.status);
    const isLast = index === arr.length - 1;
    return (
      <Pressable
        key={req.id}
        onPress={() => (isBM ? openReviewModal(req) : undefined)}
        className="w-full px-4 py-4"
        android_ripple={{ color: "rgba(0,0,0,0.03)" }}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "rgba(0,0,0,0.03)" : "transparent",
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: "rgba(0,0,0,0.05)",
          opacity: req.status === "REJECTED" ? 0.7 : 1,
        })}
      >
        <View className="space-y-1">
          <View className="flex-row items-start justify-between gap-2">
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text className="text-sm font-semibold text-[#111]">{req.groupCode || "—"}</Text>
              <Text className="text-base text-[#111]" style={{ marginTop: 2 }}>
                {req.groupName}
              </Text>
              <Text className="text-xs text-[#666]" style={{ marginTop: 2 }}>
                Trạng thái: {badge.text}
              </Text>
            </View>
            <Text
              className={`self-start rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
              style={{ flexShrink: 0 }}
            >
              {badge.text}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

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
          paddingBottom: floatingBottom + BUTTON_H + 24,
          paddingHorizontal: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
          style={{ alignSelf: "center", width: "100%", maxWidth: CONTAINER_MAX_W, gap: 16 }}
        >
          <Card className="items-center rounded-2xl bg-[#E6F4EA] px-6 py-4 shadow-md">
            <Text className="text-lg font-semibold text-[#1f2933] text-center">Quản lý nhóm</Text>
          </Card>

          {(isBA || isBM) && requests.length > 0 ? (
            <View style={{ gap: 12 }}>
            <View className="rounded-3xl border border-black/5 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden">
              <View className="px-4 py-3 border-b border-black/5">
                <Text className="text-sm font-semibold text-[#111]">Trạng thái</Text>
              </View>
              {requests.map(renderRequestCard)}
            </View>
            <PaginationBar
              currentPage={requestPage}
              totalItems={requestTotal}
              pageSize={REQUESTS_PAGE_LIMIT}
              onPageChange={(page) => void handleRequestPageChange(page)}
              disabled={loading}
            />
            </View>
          ) : null}

          <View style={{ gap: 12 }}>
          <View className="rounded-3xl border border-black/5 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden">
            {loading ? (
              <View className="px-4 py-6 items-center">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Đang tải...</Text>
              </View>
            ) : error ? (
              <Text className="px-4 py-6 text-center text-sm text-red-500">{error}</Text>
            ) : groups.length === 0 ? (
              <Text className="px-4 py-6 text-center text-sm text-[#666]">Chưa có nhóm.</Text>
            ) : (
              groups.map(renderGroupCard)
            )}
          </View>
          {!loading && groups.length > 0 ? (
            <PaginationBar
              currentPage={groupPage}
              totalItems={groupTotal}
              pageSize={GROUPS_PAGE_LIMIT}
              onPageChange={(page) => void handleGroupPageChange(page)}
              disabled={loading}
            />
          ) : null}
          </View>
        </View>
      </ScrollView>

      {isBA ? (
        <View
          pointerEvents="box-none"
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
        >
          <View
            pointerEvents="box-none"
            style={{ width: contentWidth || "100%", maxWidth: CONTAINER_MAX_W, position: "relative", height: BUTTON_H }}
          >
            <AppButton title="Tạo nhóm mới" onPress={openCreateModal} />
          </View>
        </View>
      ) : null}

      {/* Modal Create */}
      <Modal transparent visible={modalMode === "create"} animationType="fade" onRequestClose={closeModal}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.30)", justifyContent: "center", paddingHorizontal: 20 }}>
          <Pressable
            pointerEvents="box-only"
            style={StyleSheet.absoluteFillObject}
            onPress={closeModal}
          />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ alignItems: "center" }}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 520, maxHeight: MODAL_H, backgroundColor: "#fff", borderRadius: 28, overflow: "hidden" }}
            >
              <View style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#111", textAlign: "center" }}>Tạo nhóm mới</Text>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: insets.bottom + 20, gap: 12 }}
                style={{ maxHeight: MODAL_H - 120 }}
              >
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Tên nhóm</Text>
                  <TextInput
                    value={formGroupName}
                    onChangeText={setFormGroupName}
                    placeholder="Nhập tên nhóm"
                    placeholderTextColor="#9ca3af"
                    style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#111" }}
                  />
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Mã nhóm (có thể chính sửa lại sau)</Text>
                  <TextInput
                    value={formGroupCode}
                    onChangeText={setFormGroupCode}
                    placeholder="Nhập mã nhóm"
                    placeholderTextColor="#9ca3af"
                    style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#111" }}
                  />
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>CCO phụ trách (SSO)</Text>
                  <Pressable
                    onPress={() => setSsoPickerOpen(true)}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-base text-[#111]" numberOfLines={1}>
                      {ssoOptions.find((o) => o.value === formSsoId)?.label || "Chọn CCO"}
                    </Text>
                    <Text className="text-lg text-[#0A84FF]">⌄</Text>
                  </Pressable>
                  {ssoOptions.length === 0 ? (
                    <Text className="text-xs text-red-500">Chưa có CCO trong chi nhánh này.</Text>
                  ) : null}
                {saveError ? <Text style={{ color: "#e53935", fontSize: 14 }}>{saveError}</Text> : null}
                 </View>
              </ScrollView>
             
              <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", gap: 10 }}>
                <AppButton title="Hủy" onPress={closeModal} bgColor="#E5E7EB" textClassName="text-slate-700" fullWidth={false} />
                <AppButton title="Gửi yêu cầu" onPress={handleSubmitCreate} loading={saveLoading} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal Edit (BA đề xuất chỉnh sửa) */}
      <Modal transparent visible={modalMode === "editRequest"} animationType="fade" onRequestClose={closeModal}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.30)", justifyContent: "center", paddingHorizontal: 20 }}>
          <Pressable pointerEvents="box-only" style={StyleSheet.absoluteFillObject} onPress={closeModal} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ alignItems: "center" }}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 520, maxHeight: MODAL_H, backgroundColor: "#fff", borderRadius: 28, overflow: "hidden" }}
            >
              <View style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#111", textAlign: "center" }}>Đề xuất chỉnh sửa nhóm</Text>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: insets.bottom + 20, gap: 12 }}
                style={{ maxHeight: MODAL_H - 120 }}
              >
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Tên nhóm</Text>
                  <TextInput
                    value={formGroupName}
                    onChangeText={setFormGroupName}
                    placeholder="Nhập tên nhóm"
                    placeholderTextColor="#9ca3af"
                    style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#111" }}
                  />
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Mã nhóm</Text>
                  <TextInput
                    value={formGroupCode}
                    onChangeText={setFormGroupCode}
                    placeholder="Nhập mã nhóm"
                    placeholderTextColor="#9ca3af"
                    style={{ borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: "#111" }}
                  />
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>CCO phụ trách (SSO)</Text>
                  <Pressable
                    onPress={() => setSsoPickerOpen(true)}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-base text-[#111]" numberOfLines={1}>
                      {ssoOptions.find((o) => o.value === formSsoId)?.label || "Chọn CCO"}
                    </Text>
                    <Text className="text-lg text-[#0A84FF]">⌄</Text>
                  </Pressable>
                  {ssoOptions.length === 0 ? (
                    <Text className="text-xs text-red-500">Chưa có CCO trong chi nhánh này.</Text>
                  ) : null}
                </View>
                {saveError ? <Text style={{ color: "#e53935", fontSize: 14 }}>{saveError}</Text> : null}
              </ScrollView>
              <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", gap: 10 }}>
                <AppButton title="Hủy" onPress={closeModal} bgColor="#E5E7EB" textClassName="text-slate-700" fullWidth={false} />
                <AppButton title="Gửi duyệt" onPress={handleSubmitEdit} loading={saveLoading} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal Review */}
      <Modal transparent visible={modalMode === "review"} animationType="fade" onRequestClose={closeModal}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.30)", justifyContent: "center", paddingHorizontal: 20 }}>
          <Pressable
            pointerEvents="box-only"
            style={StyleSheet.absoluteFillObject}
            onPress={closeModal}
          />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ alignItems: "center" }}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 520, maxHeight: MODAL_H, backgroundColor: "#fff", borderRadius: 28, overflow: "hidden" }}
            >
              <View style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" }}>
                <Text style={{ fontSize: 17, fontWeight: "600", color: "#111", textAlign: "center" }}>Duyệt yêu cầu</Text>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: insets.bottom + 20, gap: 12 }}
                style={{ maxHeight: MODAL_H - 120 }}
              >
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: "#6C757D" }}>Tên nhóm</Text>
                  <Text style={{ fontSize: 15, fontWeight: "500", color: "#111" }}>{selectedRequest?.groupName}</Text>
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: "#6C757D" }}>Mã nhóm</Text>
                  <Text style={{ fontSize: 15, fontWeight: "500", color: "#111" }}>{selectedRequest?.groupCode || "—"}</Text>
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: "#6C757D" }}>Trạng thái</Text>
                  <Text style={{ fontSize: 14, fontWeight: "400", color: "#111" }}>{buildStatusBadge(selectedRequest?.status).text}</Text>
                </View>
                {saveError ? <Text style={{ color: "#e53935", fontSize: 14 }}>{saveError}</Text> : null}
              </ScrollView>
              <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", gap: 10 }}>
                <AppButton title="Duyệt" onPress={handleApprove} loading={saveLoading} />
                <AppButton title="Từ chối" onPress={handleReject} bgColor="#e53935" loading={saveLoading} />
                <AppButton title="Đóng" onPress={closeModal} bgColor="#E5E7EB" textClassName="text-slate-700" fullWidth={false} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* SSO picker modal */}
      <Modal transparent visible={ssoPickerOpen} animationType="fade" onRequestClose={() => setSsoPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.30)", justifyContent: "center", paddingHorizontal: 20 }}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSsoPickerOpen(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ alignItems: "center" }}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 420, maxHeight: MODAL_H, backgroundColor: "#fff", borderRadius: 20, overflow: "hidden" }}
            >
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#111", textAlign: "center" }}>Chọn CCO</Text>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: MODAL_H - 160 }}>
                {ssoOptions.length === 0 ? (
                  <Text style={{ padding: 16, color: "#666", textAlign: "center" }}>Chưa có CCO trong chi nhánh.</Text>
                ) : (
                  ssoOptions.map((opt) => {
                    const active = opt.value === formSsoId;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setFormSsoId(opt.value)}
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
                        <Text style={{ fontSize: 14, fontWeight: active ? "700" : "500", color: active ? "#0A84FF" : "#111" }}>
                          {opt.label}
                        </Text>
                        <View
                          style={{
                            height: 18,
                            width: 18,
                            borderRadius: 9,
                            borderWidth: 1,
                            borderColor: active ? "#0A84FF" : "rgba(0,0,0,0.25)",
                            backgroundColor: active ? "#0A84FF" : "transparent",
                          }}
                        />
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)" }}>
                <AppButton title="Xong" onPress={() => setSsoPickerOpen(false)} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </MobileFrame>
  );
};

export default GroupScreen;
