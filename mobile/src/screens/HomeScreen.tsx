import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { cityAPI } from '../api';
import { City } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

export default function HomeScreen({ navigation }: any) {
  const [cities, setCities] = useState<City[]>([]);
  const [originCity, setOriginCity] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [tripDate, setTripDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const response = await cityAPI.getAll();
      setCities(response.data.cities);
    } catch (error) {
      console.error('Failed to load cities');
    }
  };

  const popularCities = cities.filter((c) => c.is_major_city).slice(0, 6);

  const handleSearch = async () => {
    if (!originCity) {
      Alert.alert('Error', 'Please select an origin city');
      return;
    }
    if (!destinationCity) {
      Alert.alert('Error', 'Please select a destination city');
      return;
    }
    if (originCity === destinationCity) {
      Alert.alert('Error', 'Origin and destination cannot be the same');
      return;
    }

    try {
      setLoading(true);
      navigation.navigate('TripResults', {
        originCity,
        destinationCity,
        tripDate: tripDate.toISOString().split('T')[0],
        passengers,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Book Your Trip</Text>
        <Text style={styles.subtitle}>Find and book bus tickets easily</Text>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.inputRow}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={styles.inputLabel}>From</Text>
          <TouchableOpacity
            style={styles.inputValue}
            onPress={() => {
              Alert.alert(
                'Select Origin City',
                '',
                cities.map((c) => ({
                  text: c.name,
                  onPress: () => setOriginCity(c.name),
                }))
              );
            }}
          >
            <Text style={originCity ? styles.inputText : styles.placeholder}>
              {originCity || 'Select city'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.swapButton}
          onPress={() => {
            setOriginCity(destinationCity);
            setDestinationCity(originCity);
          }}
        >
          <Ionicons name="swap-vertical" size={20} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.inputRow}>
          <Ionicons name="location" size={20} color={colors.secondary} />
          <Text style={styles.inputLabel}>To</Text>
          <TouchableOpacity
            style={styles.inputValue}
            onPress={() => {
              Alert.alert(
                'Select Destination City',
                '',
                cities.map((c) => ({
                  text: c.name,
                  onPress: () => setDestinationCity(c.name),
                }))
              );
            }}
          >
            <Text style={destinationCity ? styles.inputText : styles.placeholder}>
              {destinationCity || 'Select city'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputRow, { flex: 1 }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={styles.inputValue}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.inputText}>{formatDate(tripDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputRow, { flex: 1, marginLeft: spacing.md }]}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={styles.inputLabel}>Passengers</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setPassengers(Math.max(1, passengers - 1))}
              >
                <Ionicons name="remove" size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.counterText}>{passengers}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setPassengers(Math.min(6, passengers + 1))}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="search" size={20} color={colors.white} />
              <Text style={styles.searchButtonText}>Search Trips</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {popularCities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Cities</Text>
          <View style={styles.chipsContainer}>
            {popularCities.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={styles.chip}
                onPress={() => {
                  if (!originCity) setOriginCity(city.name);
                  else if (!destinationCity) setDestinationCity(city.name);
                  else {
                    setOriginCity(city.name);
                    setDestinationCity('');
                  }
                }}
              >
                <Text style={styles.chipText}>{city.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={tripDate}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setTripDate(date);
          }}
        />
      )}
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
  header: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputLabel: {
    width: 45,
    ...typography.bodySmall,
    marginLeft: spacing.sm,
  },
  inputValue: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    ...typography.body,
    color: colors.text,
  },
  placeholder: {
    ...typography.body,
    color: colors.muted,
  },
  swapButton: {
    position: 'absolute',
    right: spacing.lg,
    top: 52,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  counterRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    ...typography.body,
    fontWeight: '600',
    marginHorizontal: spacing.md,
    minWidth: 20,
    textAlign: 'center',
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    ...typography.button,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.text,
  },
});
