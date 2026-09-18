import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { bookingAPI } from '../api';
import { Booking } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

export default function MyBookingsScreen({ navigation }: any) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  const loadBookings = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await bookingAPI.getMyBookings();
      setBookings(response.data.data?.bookings || response.data.bookings || []);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'cancelled':
        return colors.error;
      default:
        return colors.muted;
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity style={styles.bookingCard} onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id, pnr: item.pnr })}>
      <View style={styles.bookingHeader}>
        <View style={styles.pnrContainer}>
          <Text style={styles.pnrLabel}>PNR</Text>
          <Text style={styles.pnrValue}>{item.pnr}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.booking_status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.booking_status) }]}>
            {item.booking_status}
          </Text>
        </View>
      </View>

      {item.trip && (
        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <Ionicons name="circle" size={8} color={colors.primary} />
            <Text style={styles.cityText}>{item.trip.route.origin_city}</Text>
          </View>
          <View style={styles.routeLine}>
            <View style={styles.dashLine} />
            <Ionicons name="bus" size={14} color={colors.primary} />
            <View style={styles.dashLine} />
          </View>
          <View style={styles.routePoint}>
            <Ionicons name="location" size={8} color={colors.secondary} />
            <Text style={styles.cityText}>{item.trip.route.destination_city}</Text>
          </View>
        </View>
      )}

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.muted} />
          <Text style={styles.detailText}>{item.trip?.trip_date || 'N/A'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="people-outline" size={14} color={colors.muted} />
          <Text style={styles.detailText}>{item.total_passengers} passengers</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.amountText}>NPR {item.total_amount}</Text>
        <View style={styles.paymentBadge}>
          <Text style={styles.paymentText}>{item.payment_status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBooking}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadBookings(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={64} color={colors.muted} />
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubtext}>Your booked trips will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pnrContainer: {},
  pnrLabel: {
    ...typography.caption,
  },
  pnrValue: {
    ...typography.h3,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cityText: {
    ...typography.body,
    fontWeight: '500',
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.md,
  },
  dashLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    borderStyle: 'dashed',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    ...typography.bodySmall,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountText: {
    ...typography.h3,
    color: colors.primary,
  },
  paymentBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  paymentText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.success,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 3,
  },
  emptyText: {
    ...typography.h3,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.sm,
  },
});
