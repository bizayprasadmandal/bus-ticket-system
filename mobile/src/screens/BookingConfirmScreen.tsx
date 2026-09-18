import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bookingAPI } from '../api';
import { Trip } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

interface PassengerForm {
  passenger_name: string;
  age: string;
  gender: string;
  id_type: string;
  id_number: string;
  phone_number: string;
}

export default function BookingConfirmScreen({ route, navigation }: any) {
  const { trip, selectedSeats, totalFare } = route.params as {
    trip: Trip;
    selectedSeats: string[];
    totalFare: number;
  };

  const [passengers, setPassengers] = useState<PassengerForm[]>(
    selectedSeats.map((seat: string) => ({
      passenger_name: '',
      age: '',
      gender: 'male',
      id_type: 'citizenship',
      id_number: '',
      phone_number: '',
    }))
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pnr, setPnr] = useState('');

  const updatePassenger = (index: number, field: keyof PassengerForm, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const validateForm = (): boolean => {
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.passenger_name.trim()) {
        Alert.alert('Error', `Please enter name for passenger ${i + 1}`);
        return false;
      }
      if (!p.age.trim() || parseInt(p.age) < 1 || parseInt(p.age) > 120) {
        Alert.alert('Error', `Please enter valid age for passenger ${i + 1}`);
        return false;
      }
      if (!p.id_number.trim()) {
        Alert.alert('Error', `Please enter ID number for passenger ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await bookingAPI.create({
        trip_id: trip.id,
        passengers: passengers.map((p, i) => ({
          passenger_name: p.passenger_name.trim(),
          age: parseInt(p.age),
          gender: p.gender,
          seat_number: selectedSeats[i],
          id_type: p.id_type,
          id_number: p.id_number.trim(),
          phone_number: p.phone_number.trim() || undefined,
        })),
      });
      setPnr(response.data.booking.pnr);
      setSuccess(true);
    } catch (error: any) {
      Alert.alert('Booking Failed', error.response?.data?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successSubtitle}>Your PNR number is</Text>
        <Text style={styles.pnrText}>{pnr}</Text>
        <Text style={styles.successNote}>
          Please save this PNR for future reference
        </Text>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.navigate('HomeMain')}
        >
          <Text style={styles.doneButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${ampm}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.tripSummary}>
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <View style={styles.tripRow}>
          <Ionicons name="bus" size={20} color={colors.primary} />
          <Text style={styles.tripText}>
            {trip.route.origin_city} → {trip.route.destination_city}
          </Text>
        </View>
        <View style={styles.tripRow}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.tripText}>{trip.trip_date}</Text>
        </View>
        <View style={styles.tripRow}>
          <Ionicons name="time" size={20} color={colors.primary} />
          <Text style={styles.tripText}>
            {formatTime(trip.departure_time)} - {formatTime(trip.arrival_time)}
          </Text>
        </View>
        <View style={styles.tripRow}>
          <Ionicons name="bus" size={20} color={colors.primary} />
          <Text style={styles.tripText}>{trip.bus.bus_number} ({trip.bus.bus_type})</Text>
        </View>
      </View>

      <View style={styles.seatsSummary}>
        <Text style={styles.sectionTitle}>Selected Seats</Text>
        <View style={styles.seatsRow}>
          {selectedSeats.map((seat: string) => (
            <View key={seat} style={styles.seatBadge}>
              <Text style={styles.seatBadgeText}>{seat}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.passengersSection}>
        <Text style={styles.sectionTitle}>Passenger Details</Text>
        {passengers.map((passenger, index) => (
          <View key={index} style={styles.passengerCard}>
            <Text style={styles.passengerTitle}>
              Passenger {index + 1} - Seat {selectedSeats[index]}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.muted}
              value={passenger.passenger_name}
              onChangeText={(v) => updatePassenger(index, 'passenger_name', v)}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: spacing.sm }]}
                placeholder="Age"
                placeholderTextColor={colors.muted}
                value={passenger.age}
                onChangeText={(v) => updatePassenger(index, 'age', v)}
                keyboardType="number-pad"
              />
              <View style={[styles.input, { flex: 1 }]}>
                <View style={styles.genderRow}>
                  {['male', 'female'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderButton,
                        passenger.gender === g && styles.genderActive,
                      ]}
                      onPress={() => updatePassenger(index, 'gender', g)}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          passenger.gender === g && styles.genderTextActive,
                        ]}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="ID Number (Citizenship/Passport)"
              placeholderTextColor={colors.muted}
              value={passenger.id_number}
              onChangeText={(v) => updatePassenger(index, 'id_number', v)}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number (Optional)"
              placeholderTextColor={colors.muted}
              value={passenger.phone_number}
              onChangeText={(v) => updatePassenger(index, 'phone_number', v)}
              keyboardType="phone-pad"
            />
          </View>
        ))}
      </View>

      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>NPR {totalFare}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color={colors.white} />
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          </>
        )}
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
  tripSummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tripText: {
    ...typography.body,
  },
  seatsSummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  seatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  seatBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  seatBadgeText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  passengersSection: {
    marginBottom: spacing.md,
  },
  passengerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  passengerTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  genderActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  genderTextActive: {
    color: colors.white,
  },
  totalSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.h3,
  },
  totalValue: {
    ...typography.h2,
    color: colors.primary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    ...typography.button,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h1,
    textAlign: 'center',
  },
  successSubtitle: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  pnrText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.md,
    letterSpacing: 2,
  },
  successNote: {
    ...typography.bodySmall,
    color: colors.muted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  doneButtonText: {
    ...typography.button,
  },
});
