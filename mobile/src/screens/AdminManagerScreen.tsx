import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MobileFrame } from '@components/layout/MobileFrame';
import { Card } from '@components/ui/Card';
import { AppButton } from '@components/ui/AppButton';
import { useProfileStore } from '@store/profileStore';
import { appApi, type StaffUserItem } from '@services/appApi';

const AdminManagerScreen = () => {
  const { profile } = useProfileStore();
  const isSuperAdmin = profile?.actorKind === 'STAFF' && profile?.role === 'SUPER_ADMIN';
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const CONTAINER_MAX_W = 480;
  const [contentWidth, setContentWidth] = useState<number>(0);
  const TAB_FALLBACK = 110;
  const tabH = Math.max(tabBarHeight || 0, TAB_FALLBACK);
  const floatingBottom = tabH + 12;

  const [admins, setAdmins] = useState<StaffUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [formState, setFormState] = useState({ fullName: '', email: '', password: '' });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const swipeRefs = useRef<Map<number, Swipeable>>(new Map());
  const [openId, setOpenId] = useState<number | null>(null);

  const loadAdmins = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appApi.getAdmins();
      setAdmins(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load admin list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadAdmins();
  }, [isSuperAdmin]);

  const handleDelete = async (item: StaffUserItem) => {
    swipeRefs.current.get(item.id)?.close?.();
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert('Delete admin?', 'This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (!confirmed) return;
    try {
      await appApi.deleteAdmin(item.id);
      await loadAdmins();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Unable to delete admin.');
    }
  };

  const renderRightActions = (item: StaffUserItem) => (
    <RectButton onPress={() => handleDelete(item)} style={styles.trashAction}>
      <Ionicons name="trash" size={24} color="#fff" />
    </RectButton>
  );

  const handleCreate = async () => {
    const fullName = formState.fullName.trim();
    const email = formState.email.trim();
    const password = formState.password.trim();
    if (!email) return setSaveError('Please enter email.');
    if (!password) return setSaveError('Please enter password.');
    setSaveLoading(true);
    setSaveError(null);
    try {
      await appApi.createAdmin({ fullName: fullName || undefined, email, password });
      setCreateOpen(false);
      setFormState({ fullName: '', email: '', password: '' });
      await loadAdmins();
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? 'Unable to create admin.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isSuperAdmin) {
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
          paddingBottom: floatingBottom + 70,
          paddingHorizontal: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
          style={{ alignSelf: 'center', width: '100%', maxWidth: CONTAINER_MAX_W, gap: 16 }}
        >
          <Card className="items-center rounded-2xl bg-[#DDEBFF] px-6 py-4 shadow-md">
            <Text className="text-lg font-semibold text-slate-900">Admin Manager</Text>
          </Card>

          <View className="rounded-3xl border border-black/5 bg-white shadow-[0_12px_32px_rgba(0,0,0,0.10)] overflow-hidden">
            {loading ? (
              <View className="px-4 py-6 items-center">
                <ActivityIndicator />
                <Text className="mt-2 text-sm text-[#666]">Loading...</Text>
              </View>
            ) : error ? (
              <Text className="px-4 py-6 text-center text-sm text-red-500">{error}</Text>
            ) : admins.length === 0 ? (
              <Text className="px-4 py-6 text-center text-sm text-[#666]">No admins yet.</Text>
            ) : (
              admins.map((admin, idx) => (
                <Swipeable
                  ref={(ref) => {
                    if (ref) {
                      swipeRefs.current.set(admin.id, ref);
                    } else {
                      swipeRefs.current.delete(admin.id);
                    }
                  }}
                  key={admin.id}
                  renderRightActions={() => renderRightActions(admin)}
                  overshootRight={false}
                  onSwipeableWillOpen={() => {
                    if (openId && openId !== admin.id) {
                      swipeRefs.current.get(openId)?.close?.();
                    }
                    setOpenId(admin.id);
                  }}
                  onSwipeableClose={() => {
                    if (openId === admin.id) setOpenId(null);
                  }}
                >
                  <View
                    className="w-full px-4 py-4"
                    style={{
                      borderBottomWidth: idx === admins.length - 1 ? 0 : 1,
                      borderBottomColor: 'rgba(0,0,0,0.05)',
                    }}
                  >
                    <Text className="text-sm font-semibold text-[#111]">{admin.fullName || 'Admin'}</Text>
                    <Text className="text-xs text-[#666]">{admin.email}</Text>
                  </View>
                </Swipeable>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: floatingBottom,
          zIndex: 9999,
          elevation: 50,
          paddingHorizontal: 16,
        }}
        pointerEvents="box-none"
      >
        <View
          style={{
            alignSelf: 'center',
            width: contentWidth || '100%',
            maxWidth: CONTAINER_MAX_W,
          }}
        >
          <AppButton title="Add Admin" onPress={() => setCreateOpen(true)} />
        </View>
      </View>

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-black/30 px-4" onPress={() => setCreateOpen(false)}>
          <Pressable
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="relative flex-row items-center justify-center border-b border-black/5 px-6 py-4">
              <Text className="text-[17px] font-semibold text-[#111]">Add Admin</Text>
              <Pressable
                onPress={() => setCreateOpen(false)}
                className="absolute right-4 top-3 h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-black/5"
              >
                <Text className="text-base text-[#333]">×</Text>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: insets.bottom + 16, gap: 12 }}
            >
              <View className="space-y-2">
                    <Text className="text-xs font-medium text-[#6C757D]">Full name</Text>
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
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                />
              </View>
              <View className="space-y-2">
                    <Text className="text-xs font-medium text-[#6C757D]">Password</Text>
                <TextInput
                  secureTextEntry
                  value={formState.password}
                  onChangeText={(v) => setFormState((prev) => ({ ...prev, password: v }))}
                  placeholder="Enter password"
                  className="rounded-2xl border border-black/5 px-4 py-3 text-base"
                />
              </View>
              {saveError ? <Text className="text-sm text-red-500">{saveError}</Text> : null}
              <AppButton title="Create Admin" onPress={handleCreate} loading={saveLoading} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </MobileFrame>
  );
};

const styles = StyleSheet.create({
  trashAction: {
    backgroundColor: '#dc2626',
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
});

export default AdminManagerScreen;
