import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { paymentAPI, bookingAPI } from '../api';

const PAYMENT_METHODS = [
  { id: 'ESEWA', name: 'eSewa', icon: 'wallet' as const, color: '#10B981' },
  { id: 'KHALTI', name: 'Khalti', icon: 'wallet' as const, color: '#8B5CF6' },
  { id: 'WALLET', name: 'Gadi Wallet', icon: 'card' as const, color: colors.primary },
];

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 40; // ~2 minutes

export default function PaymentScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { bookingId, amount, pnr } = route.params;
  const [selectedMethod, setSelectedMethod] = useState('ESEWA');
  const [loading, setLoading] = useState(false);
  const [awaitingGateway, setAwaitingGateway] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    attemptsRef.current = 0;
    setAwaitingGateway(false);
  };

  useEffect(() => () => stopPolling(), []);

  const pollBookingPayment = () => {
    stopPolling();
    setAwaitingGateway(true);
    attemptsRef.current = 0;
    pollRef.current = setInterval(async () => {
      attemptsRef.current += 1;
      try {
        const res = await bookingAPI.getById(bookingId);
        const booking = res.data.data?.booking;
        if (booking?.payment_status === 'COMPLETED') {
          stopPolling();
          Alert.alert('Success', 'Payment received!', [
            { text: 'OK', onPress: () => navigation.navigate('Bookings') },
          ]);
        } else if (booking?.payment_status === 'FAILED') {
          stopPolling();
          Alert.alert('Error', 'Payment failed. Please try again.');
        } else if (attemptsRef.current >= POLL_MAX_ATTEMPTS) {
          stopPolling();
          Alert.alert(
            'Payment pending',
            'We could not confirm your payment yet. Check My Bookings shortly.'
          );
        }
      } catch {
        if (attemptsRef.current >= POLL_MAX_ATTEMPTS) stopPolling();
      }
    }, POLL_INTERVAL_MS);
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await paymentAPI.initiate({
        booking_id: bookingId,
        payment_method: selectedMethod,
        amount,
      });

      const { payment_id, payment_url } = response.data.data;

      if (payment_url) {
        await Linking.openURL(payment_url);
        pollBookingPayment();
        return;
      }

      if (selectedMethod === 'WALLET') {
        const verifyResponse = await paymentAPI.verify(payment_id);
        if (verifyResponse.data.success) {
          Alert.alert('Success', 'Payment successful!', [
            { text: 'OK', onPress: () => navigation.navigate('Bookings') },
          ]);
        } else {
          Alert.alert('Error', 'Payment failed. Please try again.');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        <Text style={styles.title}>Complete Payment</Text>
        <Text style={styles.subtitle}>PNR: {pnr}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Amount</Text>
        <Text style={styles.summaryAmount}>NPR {amount}</Text>
      </View>

      <Text style={styles.sectionTitle}>Select Payment Method</Text>

      {PAYMENT_METHODS.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.methodCard,
            selectedMethod === method.id && styles.methodCardSelected,
          ]}
          onPress={() => setSelectedMethod(method.id)}
        >
          <Ionicons name={method.icon} size={24} color={method.color} />
          <Text style={styles.methodName}>{method.name}</Text>
          {selectedMethod === method.id && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      ))}

      {awaitingGateway && (
        <View style={styles.awaitingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.awaitingText}>
            Complete the payment in the gateway — we are checking for confirmation…
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.payButton, (loading || awaitingGateway) && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={loading || awaitingGateway}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.payButtonText}>Pay NPR {amount}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  title: { ...typography.h2, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  summaryLabel: { ...typography.body, color: 'rgba(255,255,255,0.8)' },
  summaryAmount: { ...typography.h1, color: colors.white, marginTop: spacing.xs },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  methodName: { ...typography.body, flex: 1, marginLeft: spacing.md },
  payButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { ...typography.button },
  awaitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  awaitingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
});
