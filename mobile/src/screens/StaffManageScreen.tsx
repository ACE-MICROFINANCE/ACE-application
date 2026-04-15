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
import { PaginationBar } from "@components/ui/PaginationBar";
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
const PAGE_LIMIT = 20;

type StatusBadge = { text: string; className: string };
type RoleChip = { text: string; className: string };

const buildStatusBadge = (isActive?: boolean | null): StatusBadge => {
  return isActive
    ? { text: "Active", className: "border-emerald-100 bg-emerald-50 text-emerald-700" }
    : { text: "Locked", className: "border-rose-100 bg-rose-50 text-rose-700" };
};

const buildRoleChip = (role?: string | null): RoleChip | null => {
  switch (role) {
    case "BA":
      return { text: "BA", className: "border-indigo-100 bg-indigo-50 text-indigo-700" };
    case "BM":
      return { text: "BM", className: "border-amber-100 bg-amber-50 text-amber-700" };
    case "SSO":
      return { text: "CCO", className: "border-sky-100 bg-sky-50 text-sky-700" };
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
  const TAB_FALLBACK = 110; // fallback when tabBarHeight is unavailable
  const tabH = Math.max(tabBarHeight || 0, TAB_FALLBACK);
  const BUTTON_H = 56;
  const floatingBottom = tabH + 12; // spacing above tab bar

  const [staffUsers, setStaffUsers] = useState<StaffUserItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalStaffUsers, setTotalStaffUsers] = useState(0);
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
    phoneNumber: "",
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
        label: b.displayName || `${b.branchCode}${b.branchName ? ` - ${b.branchName}` : ""}`,
      })),
    [branches],
  );

  const filteredBranches = useMemo(() => branchOptions, [branchOptions]);
  const roleOptions = [
    { value: "BA", label: "Branch Assistant" },
    { value: "BM", label: "Branch Manager" },
    { value: "SSO", label: "CCO" },
    { value: "ADMIN", label: "Admin" },
  ];
  const availableRoleOptions = useMemo(
    () => {
      const base =
        profile?.role === "SUPER_ADMIN" ? roleOptions : roleOptions.filter((r) => r.value !== "ADMIN");
      // Edit mode: do not allow selecting SSO role.
      return modalMode === "edit" ? base.filter((r) => r.value !== "SSO") : base;
    },
    [profile?.role, modalMode],
  );

  const fetchBranches = async () => {
    try {
      const data = await appApi.getStaffBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      setBranches([]);
    }
  };

  const fetchStaffUsers = async (options?: { q?: string; page?: number }) => {
    const q = options?.q?.trim() || undefined;
    const page = options?.page ?? 1;
    setLoading(true);
    setError(null);
    try {
      const data = await appApi.getStaffUsers({ q, page, limit: PAGE_LIMIT });
      setStaffUsers(data?.items ?? []);
      setCurrentPage(data?.page ?? page);
      setHasMore(Boolean(data?.hasMore));
      setTotalStaffUsers(data?.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Unable to load staff list.");
      setStaffUsers([]);
      setCurrentPage(1);
      setHasMore(false);
      setTotalStaffUsers(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchBranches();
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
    fetchStaffUsers({ q: query, page: 1 });
  }, [query, isAdmin]);

  const handlePageChange = async (page: number) => {
    if (loading || page === currentPage) return;
    await fetchStaffUsers({ q: query, page });
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedStaff(null);
    setSaveError(null);
    setShowResetPassword(false);
    setResetPassword("");
    setFormState({
      fullName: "",
      email: "",
      phoneNumber: "",
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
      phoneNumber: staff.phoneNumber ?? "",
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
    const phoneNumber = formState.phoneNumber.trim();
    if (!fullName) return setSaveError("Please enter full name.");
    if (!email) return setSaveError("Please enter email.");
    const roleNeedsBranch = ["BM", "BA", "SSO"].includes(formState.role);
    if (roleNeedsBranch && !formState.branchCode) {
      return setSaveError("Please select a branch for this role.");
    }
    if (formState.role === "ADMIN" && formState.branchCode) {
      return setSaveError("Admin cannot be assigned to a branch.");
    }
    if (formState.role !== "SSO" && !password) {
      return setSaveError("Please enter an initial password.");
    }
    if (formState.role === "SSO" && !phoneNumber) {
      return setSaveError("CCO must have a phone number.");
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: CreateStaffUserPayload = {
        fullName,
        email,
        password: formState.role === "SSO" && !password ? undefined : password,
        role: formState.role,
        branchCode: roleNeedsBranch ? formState.branchCode : undefined,
        phoneNumber: formState.role === "SSO" ? phoneNumber : undefined,
      };
      await appApi.createStaffUser(payload);
      setModalMode(null);
      await fetchStaffUsers({ q: query, page: 1 });
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Unable to create staff user.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedStaff) return;
    const isEditingSso = selectedStaff.role === "SSO";
    const fullName = formState.fullName.trim();
    const email = formState.email.trim();
    if (!fullName) return setSaveError("Please enter full name.");
    if (!email) return setSaveError("Please enter email.");
    const phoneNumber = formState.phoneNumber.trim();
    const roleForUpdate = isEditingSso ? undefined : formState.role === "SSO" ? undefined : formState.role;
    const effectiveRole = roleForUpdate ?? (selectedStaff.role ?? "");
    const roleNeedsBranch = ["BM", "BA", "SSO"].includes(effectiveRole);
    if (roleNeedsBranch && !formState.branchCode) {
      return setSaveError("Please select a branch for this role.");
    }
    if (effectiveRole === "ADMIN" && formState.branchCode) {
      return setSaveError("Admin cannot be assigned to a branch.");
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      const payload: UpdateStaffUserPayload = {
        fullName,
        email,
        role: roleForUpdate,
        branchCode: roleNeedsBranch ? formState.branchCode : undefined,
        phoneNumber: effectiveRole === "SSO" ? phoneNumber || null : undefined,
      };
      await appApi.updateStaffUser(selectedStaff.id, payload);
      setModalMode(null);
      await fetchStaffUsers({ q: query, page: 1 });
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Unable to update staff user.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleActive = async (nextActive: boolean) => {
    if (!selectedStaff) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(nextActive ? "Unlock account?" : "Lock account?", "", [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Confirm", onPress: () => resolve(true) },
      ]);
    });
    if (!confirmed) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.lockStaffUser(selectedStaff.id, !nextActive);
      setSelectedStaff((prev) => (prev ? { ...prev, isActive: nextActive } : prev));
      await fetchStaffUsers({ q: query, page: 1 });
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Unable to update account status.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedStaff) return;
    const newPassword = resetPassword.trim();
    if (!newPassword) return setSaveError("Please enter a new password.");
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.resetStaffPassword(selectedStaff.id, newPassword);
      setResetPassword("");
      setShowResetPassword(false);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Unable to reset password.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert("Delete staff user?", "This action cannot be undone.", [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Delete", style: "destructive", onPress: () => resolve(true) },
      ]);
    });
    if (!confirmed) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.deleteStaffUser(selectedStaff.id);
      setModalMode(null);
      await fetchStaffUsers({ q: query, page: 1 });
    } catch (err: any) {
      setSaveError(err?.response?.data?.message ?? "Unable to delete staff user.");
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <MobileFrame withBottomPadding>
        <View className="flex-1 items-center justify-center px-4">
          <Card className="w-full rounded-2xl">
            <Text className="text-center text-sm text-[#666]">You do not have access to this screen.</Text>
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
          paddingBottom: floatingBottom + BUTTON_H + 24, // leave room for button + tab bar
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
            <Text className="text-lg font-semibold text-slate-900">Staff Management</Text>
          </Card>

          <View className="flex-row items-center gap-2">
            <View className="flex-1 rounded-2xl border border-black/5 bg-white px-3 py-2 shadow-sm">
              <TextInput
                ref={searchRef}
                value={searchValue}
                onChangeText={setSearchValue}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search by name or email..."
                className="text-sm text-[#111] py-1"
              />
            </View>
            {(isSearchFocused || searchValue.length > 0) && (
              <Pressable onPress={handleCancelSearch}>
                <Text className="text-sm font-medium text-[#007AFF]">Cancel</Text>
              </Pressable>
            )}
          </View>

          <View className="rounded-3xl border border-black/5 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden">
            {loading ? (
              <View className="px-4 py-6 items-center">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Loading...</Text>
              </View>
            ) : error ? (
              <Text className="px-4 py-6 text-center text-sm text-red-500">{error}</Text>
            ) : staffUsers.length === 0 ? (
              <Text className="px-4 py-6 text-center text-sm text-[#666]">No staff users found.</Text>
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
                            {staff.fullName ?? staff.email ?? "Staff user"}
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
                          Branch: {staff.branchCode ? `${staff.branchCode}-${staff.branchName ?? ''}` : '-'}
                        </Text>
                        <Text className="text-xs text-[#666]">Email: {staff.email ?? '-'}</Text>
                      </View>
                    </Pressable>
                  );
                })
            )}
          </View>

          {!loading && staffUsers.length > 0 ? (
            <PaginationBar
              currentPage={currentPage}
              totalItems={totalStaffUsers}
              pageSize={PAGE_LIMIT}
              onPageChange={(page) => void handlePageChange(page)}
              disabled={loading}
            />
          ) : null}
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
          <AppButton title="Add New Staff User" onPress={openCreateModal} />
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
                {modalMode === "create" ? "Add Staff User" : "Edit Staff User"}
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
                  <Text className="text-xs font-medium text-[#6C757D]">Full Name</Text>
                  <TextInput
                    value={formState.fullName}
                    onChangeText={(v) => setFormState((prev) => ({ ...prev, fullName: v }))}
                    placeholder="Enter full name"
                    className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                  />
                </View>

                <View className="space-y-2">
                  <Text className="text-xs font-medium text-[#6C757D]">Email</Text>
                  <TextInput
                    value={formState.email}
                    onChangeText={(v) => setFormState((prev) => ({ ...prev, email: v }))}
                    placeholder="Enter email"
                    className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                  />
                </View>

                {(modalMode === "create" && formState.role === "SSO") || (modalMode === "edit" && selectedStaff?.role === "SSO") ? (
                  <View className="space-y-2">
                    <Text className="text-xs font-medium text-[#6C757D]">Phone Number</Text>
                    <TextInput
                      value={formState.phoneNumber}
                      onChangeText={(v) => setFormState((prev) => ({ ...prev, phoneNumber: v }))}
                      placeholder="Enter phone number"
                      keyboardType="phone-pad"
                      className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                    />
                    {modalMode === "create" ? (
                      <Text className="text-[12px] text-[#DC2626]">
                        CCO bắt buộc phải nhập số điện thoại để khách hàng có thể liên lạc ngay trên app.
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {!(modalMode === "edit" && selectedStaff?.role === "SSO") ? (
                  <View className="space-y-2">
                    <Text className="text-xs font-medium text-[#6C757D]">Role</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {availableRoleOptions.map((opt) => {
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
                ) : null}

                <View className="space-y-2">
                  <Text className="text-xs font-medium text-[#6C757D]">Branch</Text>
                  <Pressable
                    onPress={() => setBranchPickerOpen(true)}
                    className="rounded-2xl border border-black/5 px-4 py-3 bg-white flex-row items-center justify-between"
                  >
                    <Text className="text-base text-[#111]">
                      {branchOptions.find((b) => b.value === formState.branchCode)?.label || "Select a branch"}
                    </Text>
                    <Text className="text-lg text-[#0A84FF]">⌄</Text>
                  </Pressable>
                </View>

                {modalMode === "create" && formState.role !== "SSO" ? (
                  <View className="space-y-2">
                    <Text className="text-xs font-medium text-[#6C757D]">Initial Password</Text>
                    <TextInput
                      secureTextEntry
                      value={formState.password}
                      onChangeText={(v) => setFormState((prev) => ({ ...prev, password: v }))}
                      placeholder="Enter password"
                      className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                    />
                  </View>
                ) : null}

                {modalMode === "edit" && selectedStaff ? (
                  <View className="space-y-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                    <View className="flex-row items-center justify-between">
                      <View className="space-y-1">
                        <Text className="text-sm font-semibold text-[#111]">Lock Account</Text>
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

                {modalMode === "edit" && selectedStaff?.role !== "SSO" ? (
                  <View className="space-y-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-[#111]">Security</Text>
                      <Pressable onPress={() => setShowResetPassword((prev) => !prev)}>
                        <Text className="text-sm font-medium text-[#007AFF]">
                          {showResetPassword ? "Hide" : "Reset password"}
                        </Text>
                      </Pressable>
                    </View>
                    {showResetPassword ? (
                      <View className="space-y-2">
                        <TextInput
                          secureTextEntry
                          value={resetPassword}
                          onChangeText={setResetPassword}
                          placeholder="New password"
                          className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                        />
                        <AppButton title="Confirm" onPress={handleResetPassword} loading={saveLoading} />
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
                      <AppButton title="Create staff user" onPress={handleCreate} loading={saveLoading} />
                    ) : (
                      <AppButton title="Save changes" onPress={handleUpdate} loading={saveLoading} />
                    )}
                    {modalMode === "edit" ? (
                      <Pressable
                        onPress={handleDelete}
                        className="w-full rounded-full bg-[#DC3545] px-4 py-3"
                        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                      >
                        <Text className="text-center text-sm font-semibold text-white">Delete staff user</Text>
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
                <Text className="px-4 py-3 text-sm text-[#666]">No matching branch.</Text>
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
              <Text className="text-sm font-semibold text-[#111]">Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </MobileFrame>
  );
};

export default StaffManageScreen;
