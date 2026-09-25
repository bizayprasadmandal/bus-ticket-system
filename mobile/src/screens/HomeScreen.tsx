import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
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
  const [refreshing, setRefreshing] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'origin' | 'destination' | null>(null);
  const [cityQuery, setCityQuery] = useState('');

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const response = await cityAPI.getAll();
      setCities(response.data.data?.cities ?? []);
    } catch (error: any) {
      if (!isRefresh) {
        Alert.alert(
          'Error',
          error.response?.data?.message || 'Failed to load cities',
          [
            { text: 'Retry', onPress: () => loadCities() },
            { text: 'OK' },
          ]
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  const popularCities = cities.filter((c) => c.is_major_city).slice(0, 6);

  const filteredCities = cities.filter((c) =>
    c.name.toLowerCase().includes(cityQuery.trim().toLowerCase())
  );

  const openPicker = (target: 'origin' | 'destination') => {
    setCityQuery('');
    setPickerTarget(target);
  };

  const selectCity = (name: string) => {
    if (pickerTarget === 'origin') setOriginCity(name);
    else if (pickerTarget === 'destination') setDestinationCity(name);
    setPickerTarget(null);
  };

  const handleSearch = () => {
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

    navigation.navigate('TripResults', {
      originCity,
      destinationCity,
      // Local calendar day (date-fns) — toISOString() would shift to UTC and
      // query yesterday's trips between 00:00–05:45 NPT.
      tripDate: format(tripDate, 'yyyy-MM-dd'),
      passengers,
    });
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadCities(true)} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Book Your Trip</Text>
        <Text style={styles.subtitle}>Find and book bus tickets easily</Text>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.inputRow}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={styles.inputLabel}>From</Text>
          <TouchableOpacity style={styles.inputValue} onPress={() => openPicker('origin')}>
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
          <TouchableOpacity style={styles.inputValue} onPress={() => openPicker('destination')}>
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

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={20} color={colors.white} />
          <Text style={styles.searchButtonText}>Search Trips</Text>
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

      <Modal
        visible={pickerTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerTarget(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {pickerTarget === 'origin' ? 'Select Origin' : 'Select Destination'}
            </Text>
            <TouchableOpacity onPress={() => setPickerTarget(null)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchInputRow}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city…"
              placeholderTextColor={colors.muted}
              value={cityQuery}
              onChangeText={setCityQuery}
              autoFocus
            />
            {cityQuery.length > 0 && (
              <TouchableOpacity onPress={() => setCityQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.emptyList}>No cities match "{cityQuery}"</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.cityRow} onPress={() => selectCity(item.name)}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <Text style={styles.cityName}>{item.name}</Text>
                {item.is_major_city ? (
                  <View style={styles.majorBadge}>
                    <Text style={styles.majorBadgeText}>Popular</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 46,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cityName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  majorBadge: {
    backgroundColor: colors.primaryLight || colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  majorBadgeText: {
    ...typography.caption,
    color: colors.primary,
  },
  emptyList: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
