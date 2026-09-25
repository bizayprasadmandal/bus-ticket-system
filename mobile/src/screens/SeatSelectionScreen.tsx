import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tripAPI } from '../api';
import { Trip } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

interface Seat {
  id: string;
  number: string;
  isAvailable: boolean;
  isSelected: boolean;
}

export default function SeatSelectionScreen({ route, navigation }: any) {
  const { trip, passengers } = route.params as { trip: Trip; passengers: number };
  const [seatLayout, setSeatLayout] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeats();
  }, []);

  const loadSeats = async () => {
    try {
      const response = await tripAPI.getSeats(trip.id);
      const data = response.data.data || {};
      // Server shape: { seat_layout: { layout: string[][] }, booked_seats: string[], ... }
      const layoutRows: string[][] = data.seat_layout?.layout || [];
      const occupiedSet = new Set<string>(data.booked_seats || []);

      const seats: Seat[] = [];
      layoutRows.forEach((row) => {
        row.forEach((number) => {
          if (!number) return;
          seats.push({
            id: number,
            number,
            isAvailable: !occupiedSet.has(number),
            isSelected: false,
          });
        });
      });

      setSeatLayout(seats);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load seat layout');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = (seatId: string) => {
    const seat = seatLayout.find((s) => s.id === seatId);
    if (!seat || !seat.isAvailable) return;

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((id) => id !== seatId));
    } else {
      if (selectedSeats.length >= passengers) {
        Alert.alert('Limit Reached', `You can select maximum ${passengers} seats`);
        return;
      }
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const totalFare = selectedSeats.length * trip.current_fare;

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      Alert.alert('Error', 'Please select at least one seat');
      return;
    }

    navigation.navigate('BookingConfirm', {
      trip,
      selectedSeats,
      totalFare,
      passengers,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading seats...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.availableBox]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.selectedBox]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.unavailableBox]} />
          <Text style={styles.legendText}>Unavailable</Text>
        </View>
      </View>

      <View style={styles.seatGrid}>
        {seatLayout.map((seat) => (
          <TouchableOpacity
            key={seat.id}
            style={[
              styles.seat,
              !seat.isAvailable && styles.seatUnavailable,
              selectedSeats.includes(seat.id) && styles.seatSelected,
            ]}
            onPress={() => toggleSeat(seat.id)}
            disabled={!seat.isAvailable}
          >
            <Text
              style={[
                styles.seatNumber,
                !seat.isAvailable && styles.seatNumberUnavailable,
                selectedSeats.includes(seat.id) && styles.seatNumberSelected,
              ]}
            >
              {seat.number}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Selected Seats</Text>
          <Text style={styles.summaryValue}>
            {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Fare per seat</Text>
          <Text style={styles.summaryValue}>NPR {trip.current_fare}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Fare total</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.totalValue}>NPR {totalFare}</Text>
            <Text style={styles.totalNote}>Tax &amp; service fee added at payment</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.proceedButton, selectedSeats.length === 0 && styles.proceedButtonDisabled]}
        onPress={handleProceed}
        disabled={selectedSeats.length === 0}
      >
        <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.white} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
  },
  availableBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedBox: {
    backgroundColor: colors.primary,
  },
  unavailableBox: {
    backgroundColor: colors.muted,
  },
  legendText: {
    ...typography.caption,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  seat: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatUnavailable: {
    backgroundColor: colors.muted,
    borderColor: colors.muted,
  },
  seatSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  seatNumber: {
    ...typography.caption,
    fontWeight: '600',
  },
  seatNumberUnavailable: {
    color: colors.white,
  },
  seatNumberSelected: {
    color: colors.white,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.muted,
  },
  summaryValue: {
    ...typography.body,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalLabel: {
    ...typography.h3,
  },
  totalValue: {
    ...typography.h3,
    color: colors.primary,
  },
  totalNote: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  proceedButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proceedButtonDisabled: {
    opacity: 0.5,
  },
  proceedButtonText: {
    ...typography.button,
  },
});
