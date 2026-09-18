import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bookingAPI } from '../api';
import { Booking } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

const statusColors: Record<string, string> = {
  CONFIRMED: colors.success,
  PENDING: colors.warning,
  CANCELLED: colors.error,
  COMPLETED: colors.primary,
};

export default function BookingDetailScreen({ route, navigation }: any) {
  const { bookingId, pnr } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooking();
  }, []);

  const loadBooking = async () => {
    try {
      const response = pnr
        ? await bookingAPI.getByPNR(pnr)
        : await bookingAPI.getById(bookingId);
      setBooking(response.data.data?.booking || response.data.booking);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load booking details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await bookingAPI.cancel(booking!.id, 'Cancelled by user');
            Alert.alert('Success', 'Booking cancelled');
            loadBooking();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) return null;

  const canCancel = ['CONFIRMED', 'PENDING'].includes(booking.booking_status || '');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pnrCard}>
        <Text style={styles.pnrLabel}>PNR Number</Text>
        <Text style={styles.pnrText}>{booking.pnr}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[booking.booking_status] || colors.muted }]}>
          <Text style={styles.statusText}>{booking.booking_status}</Text>
        </View>
      </View>

      {booking.trip && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Details</Text>
          <View style={styles.row}>
            <Ionicons name="bus" size={18} color={colors.primary} />
            <Text style={styles.rowText}>{booking.trip.route?.origin_city} → {booking.trip.route?.destination_city}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <Text style={styles.rowText}>{booking.trip.trip_date}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="time" size={18} color={colors.primary} />
            <Text style={styles.rowText}>{booking.trip.departure_time}</Text>
          </View>
          {booking.trip.bus && (
            <View style={styles.row}>
              <Ionicons name="bus" size={18} color={colors.primary} />
              <Text style={styles.rowText}>{booking.trip.bus.bus_number} ({booking.trip.bus.bus_type})</Text>
            </View>
          )}
        </View>
      )}

      {booking.passengers && booking.passengers.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Passengers ({booking.passengers.length})</Text>
          {booking.passengers.map((p, i) => (
            <View key={p.id || i} style={styles.passengerRow}>
              <View style={styles.passengerInfo}>
                <Text style={styles.passengerName}>{p.passenger_name}</Text>
                <Text style={styles.passengerMeta}>Seat {p.seat_number} | {p.gender} | Age {p.age}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Base Fare</Text>
          <Text style={styles.summaryValue}>NPR {booking.base_fare}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax (13%)</Text>
          <Text style={styles.summaryValue}>NPR {booking.tax_amount}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service Fee</Text>
          <Text style={styles.summaryValue}>NPR {booking.service_fee}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>NPR {booking.total_amount}</Text>
        </View>
      </View>

      {canCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Ionicons name="close-circle" size={20} color={colors.white} />
          <Text style={styles.cancelButtonText}>Cancel Booking</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pnrCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pnrLabel: { ...typography.body, color: 'rgba(255,255,255,0.8)' },
  pnrText: { fontSize: 28, fontWeight: '700', color: colors.white, letterSpacing: 2, marginTop: spacing.xs },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginTop: spacing.md },
  statusText: { ...typography.caption, color: colors.white, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { ...typography.h3, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  rowText: { ...typography.body },
  passengerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  passengerInfo: { flex: 1 },
  passengerName: { ...typography.body, fontWeight: '600' },
  passengerMeta: { ...typography.caption, marginTop: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  summaryLabel: { ...typography.body, color: colors.textSecondary },
  summaryValue: { ...typography.body },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.md },
  totalLabel: { ...typography.h3 },
  totalValue: { ...typography.h3, color: colors.primary },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  cancelButtonText: { ...typography.button },
});
