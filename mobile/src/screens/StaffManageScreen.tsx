import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Switch,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MobileFrame } from "@components/layout/MobileFrame";
import { Card } from "@components/ui/Card";
import { AppButton } from "@components/ui/AppButton";
import { useProfileStore } from "@store/profileStore";
import {
  appApi,
  type CreateStaffUserPayload,
  type StaffBranchItem,
  type StaffUserItem,
  type UpdateStaffUserPayload,
} from "@services/appApi";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

type ModalMode = "create" | "edit" | null;

type StatusBadge = { text: string; className: string };
type RoleChip = { text: string; className: string };

const buildStatusBadge = (isActive?: boolean | null): StatusBadge => {
  return isActive
    ? { text: "Đang hoạt động", className: "border-emerald-100 bg-emerald-50 text-emerald-700" }
    : { text: "Bị khóa", className: "border-rose-100 bg-rose-50 text-rose-700" };
};

const buildRoleChip = (role?: string | null): RoleChip | null => {
  switch (role) {
    case "BA":
      return { text: "BA", className: "border-indigo-100 bg-indigo-50 text-indigo-700" };
    case "BM":
      return { text: "BM", className: "border-amber-100 bg-amber-50 text-amber-700" };
    case "ADMIN":
      return { text: "ADMIN", className: "border-slate-200 bg-slate-100 text-slate-700" };
    default:
      return null;
  }
};

const StaffManageScreen = () => {
  const { profile } = useProfileStore();
  const isAdmin = profile?.actorKind === "STAFF" && profile?.role === "ADMIN";
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const CONTAINER_MAX_W = 480;
  const [contentWidth, setContentWidth] = useState<number>(0);
  const TAB_FALLBACK = 110; // fallback nếu tabBarHeight không trả về
  const tabH = Math.max(tabBarHeight || 0, TAB_FALLBACK);
  const BUTTON_H = 56;
  const floatingBottom = tabH + 12; // khoảng cách đẹp phía trên tabbar

  const [staffUsers, setStaffUsers] = useState<StaffUserItem[]>([]);
  const [branches, setBranches] = useState<StaffBranchItem[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [query, setQuery] = useState("");
  // const [branchSearch, setBranchSearch] = useState("");
  const searchRef = useRef<TextInput | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffUserItem | null>(null);
  const [formState, setFormState] = useState({
    fullName: "",
    email: "",
    role: "BM",
    branchCode: "",
    password: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const { height: SCREEN_H } = Dimensions.get("window");

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        value: b.branchCode,
        label: b.displayName,
      })),
    [branches],
  );

  const filteredBranches = useMemo(() => branchOptions, [branchOptions]);
  const roleOptions = [
    { value: "BA", label: "Trợ lý chi nhánh" },
    { value: "BM", label: "Quản lý chi nhánh" },
    { value: "ADMIN", label: "Admin" },
  ];

  const fetchBranches = async () => {
    try {
      const data = await appApi.getStaffBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      setBranches([]);
    }
  };

  const fetchStaffUsers = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await appApi.getStaffUsers(q?.trim() || undefined);
      setStaffUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Không tải được danh sách nhân viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchBranches();
    fetchStaffUsers();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(searchValue.trim());
    }, 280);
  }, [searchValue, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStaffUsers(query);
  }, [query, isAdmin]);

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedStaff(null);
    setSaveError(null);
    setShowResetPassword(false);
    setResetPassword("");
    setFormState({
      fullName: "",
      email: "",
      role: "BM",
      branchCode: "",
      password: "",
    });
  };

  const openEditModal = (staff: StaffUserItem) => {
    setModalMode("edit");
    setSelectedStaff(staff);
    setSaveError(null);
    setShowResetPassword(false);
    setResetPassword("");

    setFormState({
      fullName: staff.fullName ?? "",
      email: staff.email ?? "",
      role: staff.role ?? "BM",
      branchCode: staff.branchCode ?? "",
      password: "",
    });
  };

  const handleCancelSearch = () => {
    setSearchValue("");
    setQuery("");
    setIsSearchFocused(false);
    searchRef.current?.blur();
  };

  const handleCreate = async () => {
    const fullName = formState.fullName.trim();
    const email = formState.email.trim();
    const password = formState.password.trim();
    if (!fullName) return setSaveError("Vui lòng nhập họ và tên.");
    if (!email) return setSaveError("Vui lòng nhập email.");
    if (!password) return setSaveError("Vui lòng nhập mật khẩu ban đầu.");
    const roleNeedsBranch = ["BM", "BA"].includes(formState.role);
    if (roleNeedsBranch && !formState.branchCode) {
      return setSaveError("Vui lòng chọn chi nhánh cho nhân sự chi nhánh.");
    }
    if (formState.role === "ADMIN" && formState.branchCode) {
      return setSaveError("Admin không gán chi nhánh.");
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: CreateStaffUserPayload = {
        fullName,
        email,
        password,
        role: formState.role,
        branchCode: roleNeedsBranch ? formState.branchCode : undefined,
      };
      await appApi.createStaffUser(payload);
      setModalMode(null);
      await fetchStaffUsers(query);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Không thể tạo nhân viên.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedStaff) return;
    const fullName = formState.fullName.trim();
    const email = formState.email.trim();
    if (!fullName) return setSaveError("Vui lòng nhập họ và tên.");
    if (!email) return setSaveError("Vui lòng nhập email.");
    const roleNeedsBranch = ["BM", "BA"].includes(formState.role);
    if (roleNeedsBranch && !formState.branchCode) {
      return setSaveError("Vui lòng chọn chi nhánh cho nhân sự chi nhánh.");
    }
    if (formState.role === "ADMIN" && formState.branchCode) {
      return setSaveError("Admin không gán chi nhánh.");
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: UpdateStaffUserPayload = {
        fullName,
        email,
        role: formState.role,
        branchCode: roleNeedsBranch ? formState.branchCode : undefined,
      };
      await appApi.updateStaffUser(selectedStaff.id, payload);
      setModalMode(null);
      await fetchStaffUsers(query);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Không thể cập nhật nhân viên.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleActive = async (nextActive: boolean) => {
    if (!selectedStaff) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(nextActive ? "Mở khóa tài khoản?" : "Khóa tài khoản?", "", [
        { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
        { text: "Xác nhận", onPress: () => resolve(true) },
      ]);
    });
    if (!confirmed) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.lockStaffUser(selectedStaff.id, !nextActive);
      setSelectedStaff((prev) => (prev ? { ...prev, isActive: nextActive } : prev));
      await fetchStaffUsers(query);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Không thể cập nhật trạng thái.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStaff) return;
    const newPassword = resetPassword.trim();
    if (!newPassword) return setSaveError("Vui lòng nhập mật khẩu mới.");
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.resetStaffPassword(selectedStaff.id, newPassword);
      setResetPassword("");
      setShowResetPassword(false);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Không thể đặt lại mật khẩu.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert("Xóa nhân viên?", "Hành động không thể hoàn tác.", [
        { text: "Hủy", style: "cancel", onPress: () => resolve(false) },
        { text: "Xóa", style: "destructive", onPress: () => resolve(true) },
      ]);
    });
    if (!confirmed) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.deleteStaffUser(selectedStaff.id);
      setModalMode(null);
      await fetchStaffUsers(query);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Không thể xóa nhân viên.");
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isAdmin) {
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
      <View className="absolute inset-0 bg-[#F2F2F7]" pointerEvents="none" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 32,
          paddingBottom: floatingBottom + BUTTON_H + 24, // chừa chỗ cho button + tabbar
          paddingHorizontal: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
          style={{ alignSelf: "center", width: "100%", maxWidth: CONTAINER_MAX_W, gap: 16 }}
        >
          <Card className="items-center rounded-2xl bg-[#DDEBFF] px-6 py-4 shadow-md">
            <Text className="text-lg font-semibold text-slate-900">Quản lý nhân viên</Text>
          </Card>

          <View className="flex-row items-center gap-2">
            <View className="flex-1 rounded-2xl border border-black/5 bg-white px-3 py-2 shadow-sm">
              <TextInput
                ref={searchRef}
                value={searchValue}
                onChangeText={setSearchValue}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Tìm theo tên hoặc email..."
                className="text-sm text-[#111] py-1"
              />
            </View>
            {(isSearchFocused || searchValue.length > 0) && (
              <Pressable onPress={handleCancelSearch}>
                <Text className="text-sm font-medium text-[#007AFF]">Hủy</Text>
              </Pressable>
            )}
          </View>

          <View className="rounded-3xl border border-black/5 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden">
            {loading ? (
              <View className="px-4 py-6 items-center">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Đang tải...</Text>
              </View>
            ) : error ? (
              <Text className="px-4 py-6 text-center text-sm text-red-500">{error}</Text>
            ) : staffUsers.length === 0 ? (
              <Text className="px-4 py-6 text-center text-sm text-[#666]">Chưa có nhân viên.</Text>
            ) : (
              staffUsers
                .filter(
                  (staff) =>
                    staff.role !== "ADMIN" &&
                    staff.role !== "SUPER_ADMIN" &&
                    staff.email !== "admin@ace.vn",
                )
                .map((staff, idx, arr) => {
                  const badge = buildStatusBadge(staff.isActive ?? false);
                  const roleChip = buildRoleChip(staff.role);
                  return (
                    <Pressable
                      key={staff.id}
                      onPress={() => openEditModal(staff)}
                      className="w-full px-4 py-4"
                      android_ripple={{ color: "rgba(0,0,0,0.03)" }}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? "rgba(0,0,0,0.03)" : "transparent",
                        borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                        borderBottomColor: "rgba(0,0,0,0.05)",
                      })}
                    >
                      <View className="space-y-1">
                        <View className="flex-row items-start justify-between gap-2">
                          <Text className="text-sm font-semibold text-[#111]">
                            {staff.fullName ?? staff.email ?? "Nhân viên"}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <Text className={`rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
                              {badge.text}
                            </Text>
                            {roleChip ? (
                              <Text
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleChip.className}`}
                                style={{ lineHeight: 14 }}
                              >
                                {roleChip.text}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <Text className="text-xs text-[#666]">
                          Chi nhánh: {staff.branchCode ? `${staff.branchCode}-${staff.branchName ?? ''}` : '-'}
                        </Text>
                        <Text className="text-xs text-[#666]">Email: {staff.email ?? '-'}</Text>
                      </View>
                    </Pressable>
                  );
                })
            )}
          </View>
        </View>
      </ScrollView>

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
          <AppButton title="Thêm nhân viên mới" onPress={openCreateModal} />
        </View>
      </View>

      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={() => setModalMode(null)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/30 px-4"
          onPress={() => setModalMode(null)}
        >
          <Pressable
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="relative flex-row items-center justify-center border-b border-black/5 px-6 py-4">
              <Text className="text-[17px] font-semibold text-[#111]">
                {modalMode === "create" ? "Thêm nhân viên" : "Chỉnh sửa nhân viên"}
              </Text>
              <Pressable
                onPress={() => setModalMode(null)}
                className="absolute right-4 top-3 h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5"
              >
                <Text className="text-base text-[#333]">×</Text>
              </Pressable>
            </View>

            {/** Body + Footer */}
            {(() => {
              const MODAL_BODY_MAX_H = Math.min(SCREEN_H * 0.78, 640);
              return (
                <>
                  <ScrollView
                    style={{ maxHeight: MODAL_BODY_MAX_H }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, gap: 12 }}
                  >
                <View className="space-y-2">
                  <Text className="text-xs font-medium text-[#6C757D]">Họ và tên</Text>
                  <TextInput
                    value={formState.fullName}
                    onChangeText={(v) => setFormState((prev) => ({ ...prev, fullName: v }))}
                    placeholder="Nhập họ và tên"
                    className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                  />
                </View>

                <View className="space-y-2">
                  <Text className="text-xs font-medium text-[#6C757D]">Email</Text>
                  <TextInput
                    value={formState.email}
                    onChangeText={(v) => setFormState((prev) => ({ ...prev, email: v }))}
                    placeholder="Nhập email"
                    className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                  />
                </View>

                <View className="space-y-2">
                  <Text className="text-xs font-medium text-[#6C757D]">Vai trò</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(modalMode === "edit" ? roleOptions.filter((r) => r.value !== "ADMIN") : roleOptions).map((opt) => {
                      const active = formState.role === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() =>
                            setFormState((prev) => ({
                              ...prev,
                              role: opt.value,
                              branchCode: opt.value === "ADMIN" ? "" : prev.branchCode,
                            }))
                          }
                          className={`rounded-full border px-4 py-2 ${
                            active ? "border-[#0A84FF] bg-[#E7F2FF]" : "border-black/10 bg-white"
                          }`}
                        >
                          <Text className={`text-sm font-semibold ${active ? "text-[#0A84FF]" : "text-[#111]"}`}>{opt.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="space-y-2">
                  <Text className="text-xs font-medium text-[#6C757D]">Chi nhánh</Text>
                  <Pressable
                    onPress={() => setBranchPickerOpen(true)}
                    className="rounded-2xl border border-black/5 px-4 py-3 bg-white flex-row items-center justify-between"
                  >
                    <Text className="text-base text-[#111]">
                      {branchOptions.find((b) => b.value === formState.branchCode)?.label || "Chọn chi nhánh"}
                    </Text>
                    <Text className="text-lg text-[#0A84FF]">⌄</Text>
                  </Pressable>
                </View>

                {modalMode === "create" ? (
                  <View className="space-y-2">
                    <Text className="text-xs font-medium text-[#6C757D]">Mật khẩu ban đầu</Text>
                    <TextInput
                      secureTextEntry
                      value={formState.password}
                      onChangeText={(v) => setFormState((prev) => ({ ...prev, password: v }))}
                      placeholder="Nhập mật khẩu"
                      className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                    />
                  </View>
                ) : null}

                {modalMode === "edit" && selectedStaff ? (
                  <View className="space-y-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                    <View className="flex-row items-center justify-between">
                      <View className="space-y-1">
                        <Text className="text-sm font-semibold text-[#111]">Khóa tài khoản</Text>
                      </View>
                      <Switch
                        value={!(selectedStaff.isActive ?? true)}
                        onValueChange={(next) => handleToggleActive(!next)}
                        disabled={saveLoading}
                        trackColor={{ false: "#E5E5EA", true: "#34C759" }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                ) : null}

                {modalMode === "edit" ? (
                  <View className="space-y-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-[#111]">Bảo mật</Text>
                      <Pressable onPress={() => setShowResetPassword((prev) => !prev)}>
                        <Text className="text-sm font-medium text-[#007AFF]">
                          {showResetPassword ? "Ẩn" : "Đặt lại mật khẩu"}
                        </Text>
                      </Pressable>
                    </View>
                    {showResetPassword ? (
                      <View className="space-y-2">
                        <TextInput
                          secureTextEntry
                          value={resetPassword}
                          onChangeText={setResetPassword}
                          placeholder="Mật khẩu mới"
                          className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                        />
                        <AppButton title="Xác nhận" onPress={handleResetPassword} loading={saveLoading} />
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {saveError ? <Text className="text-sm text-red-500">{saveError}</Text> : null}
                  </ScrollView>
                  <View
                    style={{
                      paddingHorizontal: 24,
                      paddingTop: 10,
                      paddingBottom: insets.bottom + 16,
                      gap: 10,
                      borderTopWidth: 1,
                      borderTopColor: "rgba(0,0,0,0.05)",
                      backgroundColor: "white",
                    }}
                  >
                    {modalMode === "create" ? (
                      <AppButton title="Tạo nhân viên" onPress={handleCreate} loading={saveLoading} />
                    ) : (
                      <AppButton title="Lưu thay đổi" onPress={handleUpdate} loading={saveLoading} />
                    )}
                    {modalMode === "edit" ? (
                      <Pressable
                        onPress={handleDelete}
                        className="w-full rounded-full bg-[#DC3545] px-4 py-3"
                        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                      >
                        <Text className="text-center text-sm font-semibold text-white">Xóa nhân viên</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={branchPickerOpen} transparent animationType="fade" onRequestClose={() => setBranchPickerOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/30 px-4" onPress={() => setBranchPickerOpen(false)}>
          <Pressable
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            {/*  */}
            <ScrollView style={{ maxHeight: 320 }}>
              {filteredBranches.length === 0 ? (
                <Text className="px-4 py-3 text-sm text-[#666]">Không có chi nhánh phù hợp.</Text>
              ) : (
                filteredBranches.map((b) => {
                  const active = formState.branchCode === b.value;
                  return (
                    <Pressable
                      key={b.value}
                      onPress={() => {
                        setFormState((prev) => ({ ...prev, branchCode: b.value }));
                        setBranchPickerOpen(false);
                      }}
                      className={`px-4 py-3 border-b border-black/5 ${active ? "bg-[#E7F2FF]" : "bg-white"}`}
                    >
                      <Text className={`text-base ${active ? "font-semibold text-[#0A84FF]" : "text-[#111]"}`}>
                        {b.label}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable onPress={() => setBranchPickerOpen(false)} className="items-center justify-center bg-slate-100 px-4 py-3">
              <Text className="text-sm font-semibold text-[#111]">Đóng</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </MobileFrame>
  );
};

export default StaffManageScreen;
