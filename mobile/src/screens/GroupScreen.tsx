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
import { useProfileStore } from "@store/profileStore";
import { appApi } from "@services/appApi";

type GroupItem = {
  id: number;
  branchCode: string;
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

const buildStatusBadge = (status?: string | null) => {
  if (status === "ACTIVE" || status == null) return { text: "Đang hoạt động", className: "border-emerald-100 bg-emerald-50 text-emerald-700" };
  if (status === "PENDING") return { text: "Chờ duyệt", className: "border-amber-100 bg-amber-50 text-amber-700" };
  if (status === "APPROVED") return { text: "Đã duyệt", className: "border-emerald-100 bg-emerald-50 text-emerald-700" };
  return { text: "Đã từ chối", className: "border-rose-100 bg-rose-50 text-rose-700" };
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [modalMode, setModalMode] = useState<"create" | "review" | "editRequest" | null>(null);
  const [formGroupName, setFormGroupName] = useState("");
  const [formGroupCode, setFormGroupCode] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<GroupRequestItem | null>(null);
  const [editTargetGroup, setEditTargetGroup] = useState<GroupItem | null>(null);

  const fetchData = async () => {
    if (!isStaff) return;
    setLoading(true);
    setError(null);
    try {
      const [groupRes, reqRes] = await Promise.all([
        appApi.getStaffGroups(),
        isBM
          ? appApi.getStaffGroupRequests({ branchCode: profile?.branchCode ?? null })
          : isBA
          ? appApi.getMyGroupRequests()
          : Promise.resolve([]),
      ]);
      setGroups(Array.isArray(groupRes) ? groupRes : []);
      const sortedReqs = (Array.isArray(reqRes) ? reqRes : []).slice().sort((a, b) => {
        const rank = (s?: string | null) =>
          s === 'PENDING' ? 0 : s === 'APPROVED' ? 1 : 2; // REJECTED last
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return (a.id ?? 0) - (b.id ?? 0);
      });
      setRequests(sortedReqs);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Không tải được dữ liệu nhóm.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused && isStaff) {
      fetchData();
    }
  }, [isFocused, isStaff]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    setFormGroupName("");
    setFormGroupCode("");
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
    setSaveError(null);
    setModalMode("editRequest");
  };

  const openReviewModal = (req: GroupRequestItem) => {
    setSelectedRequest(req);
    setModalMode("review");
    setSaveError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedRequest(null);
    setEditTargetGroup(null);
    setSaveError(null);
    setSaveLoading(false);
  };

  const handleSubmitCreate = async () => {
    if (!formGroupName.trim()) {
      setSaveError("Vui lòng nhập tên nhóm.");
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.createGroupRequest({ groupName: formGroupName.trim(), groupCode: formGroupCode.trim() || undefined });
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
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.updateGroupRequest({
        targetGroupId: editTargetGroup.id,
        groupName: formGroupName.trim(),
        groupCode: formGroupCode.trim() || undefined,
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
            <View className="rounded-3xl border border-black/5 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden">
              <View className="px-4 py-3 border-b border-black/5">
                <Text className="text-sm font-semibold text-[#111]">Trạng thái</Text>
              </View>
              {requests.map(renderRequestCard)}
            </View>
          ) : null}

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
                {saveError ? <Text style={{ color: "#e53935", fontSize: 14 }}>{saveError}</Text> : null}
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
                <Text style={{ fontSize: 17, fontWeight: "700", color: "#111", textAlign: "center" }}>Duyệt yêu cầu</Text>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: insets.bottom + 20, gap: 12 }}
                style={{ maxHeight: MODAL_H - 120 }}
              >
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Tên nhóm</Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111" }}>{selectedRequest?.groupName}</Text>
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Mã nhóm</Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111" }}>{selectedRequest?.groupCode || "—"}</Text>
                </View>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6C757D" }}>Trạng thái</Text>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: "#111" }}>{buildStatusBadge(selectedRequest?.status).text}</Text>
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
    </MobileFrame>
  );
};

export default GroupScreen;
