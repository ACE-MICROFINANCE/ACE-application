import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/ui/Card';
import { useAuth } from '@contexts/AuthContext';

const DashboardScreen = () => {
  const { customer } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-4 py-6" style={{ paddingTop: 60 }}>
        <Text className="text-2xl font-semibold text-slate-900">
        👋 Welcome {customer?.fullName || 'farmer'}
        </Text>
        <Text className="mb-4 text-slate-600">Today&apos;s updates for you:</Text>

        <View className="space-y-4">
          <Card>
            <Text className="text-lg font-semibold text-slate-900">Weather</Text>
            <Text className="mt-2 text-slate-600">
              Partly cloudy with light rain in the afternoon. Temp around 28C.
            </Text>
          </Card>
          <Card>
            <Text className="text-lg font-semibold text-slate-900">Agriculture tip</Text>
            <Text className="mt-2 text-slate-600">
              Rotate rice fields with legumes this season to enrich soil nitrogen naturally.
            </Text>
          </Card>
          <Card>
            <Text className="text-lg font-semibold text-slate-900">Loan & Saving reminder</Text>
            <Text className="mt-2 text-slate-600">
              Your micro-loan installment is due next Tuesday. Early payments earn fee discounts.
            </Text>
          </Card>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DashboardScreen;
