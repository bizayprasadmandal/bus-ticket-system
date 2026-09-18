import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tripAPI } from '../api';
import { Trip } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

export default function TripResultsScreen({ route, navigation }: any) {
  const { originCity, destinationCity, tripDate, passengers } = route.params;
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    searchTrips();
  }, []);

  const searchTrips = async () => {
    try {
      setLoading(true);
      const response = await tripAPI.search({
        origin_city: originCity,
        destination_city: destinationCity,
        trip_date: tripDate,
        passengers,
      });
      setTrips(response.data.trips);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to search trips');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${ampm}`;
  };

  const renderTrip = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => navigation.navigate('SeatSelection', { trip: item, passengers })}
    >
      <View style={styles.tripHeader}>
        <Text style={styles.busNumber}>{item.bus.bus_number}</Text>
        <View style={[styles.badge, item.bus.bus_type === 'AC' && styles.badgeAc]}>
          <Text style={styles.badgeText}>{item.bus.bus_type}</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.time}>{formatTime(item.departure_time)}</Text>
          <Text style={styles.city}>{item.route.origin_city}</Text>
        </View>

        <View style={styles.routeLine}>
          <View style={styles.dot} />
          <View style={styles.line} />
          <Ionicons name="bus" size={16} color={colors.primary} />
          <View style={styles.line} />
          <View style={styles.dot} />
        </View>

        <View style={styles.timeBlock}>
          <Text style={styles.time}>{formatTime(item.arrival_time)}</Text>
          <Text style={styles.city}>{item.route.destination_city}</Text>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <View style={styles.fareBlock}>
          <Text style={styles.fareLabel}>Fare</Text>
          <Text style={styles.fareAmount}>NPR {item.current_fare}</Text>
        </View>
        <View style={styles.seatsBlock}>
          <Ionicons name="seat" size={14} color={colors.muted} />
          <Text style={styles.seatsText}>{item.available_seats} seats left</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => navigation.navigate('SeatSelection', { trip: item, passengers })}
      >
        <Text style={styles.selectButtonText}>Select</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.white} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Searching trips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>
          {originCity} → {destinationCity}
        </Text>
        <Text style={styles.headerSubtitle}>{tripDate}</Text>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTrip}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bus-outline" size={64} color={colors.muted} />
            <Text style={styles.emptyText}>No trips found</Text>
            <Text style={styles.emptySubtext}>Try different dates or routes</Text>
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
  loadingText: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.md,
  },
  headerBar: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  busNumber: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeAc: {
    backgroundColor: colors.primaryLight,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  timeBlock: {
    alignItems: 'center',
  },
  time: {
    ...typography.h3,
    fontSize: 18,
  },
  city: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fareBlock: {},
  fareLabel: {
    ...typography.caption,
  },
  fareAmount: {
    ...typography.h3,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  seatsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seatsText: {
    ...typography.bodySmall,
  },
  selectButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  selectButtonText: {
    ...typography.button,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
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
