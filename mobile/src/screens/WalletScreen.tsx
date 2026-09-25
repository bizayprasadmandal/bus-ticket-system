import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { walletAPI } from '../api';
import { WalletBalance, WalletTransaction } from '../types';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { formatDateNPT } from '../utils/date';

export default function WalletScreen() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topping, setTopping] = useState(false);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const appState = useRef(AppState.currentState);

  const loadData = useCallback(async () => {
    try {
      // Sequential: balance first, then transactions — a failed balance fetch
      // must not wipe out an already-known balance (Promise.all race).
      const balanceRes = await walletAPI.getBalance();
      setBalance(balanceRes.data.data);
    } catch {
      // Wallet may not exist yet
    }

    try {
      const first = await walletAPI.getTransactions({ page: 1, limit: 100 });
      let rows: WalletTransaction[] = first.data.data?.transactions || [];
      const total: number = first.data.data?.pagination?.total_items ?? rows.length;
      let page = 2;
      while (rows.length < total && page <= 3) {
        const res = await walletAPI.getTransactions({ page, limit: 100 });
        const chunk: WalletTransaction[] = res.data.data?.transactions || [];
        if (chunk.length === 0) break;
        rows = rows.concat(chunk);
        page += 1;
      }
      setTransactions(rows);
    } catch {
      // leave whatever we have
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active' && gatewayOpen) {
        setGatewayOpen(false);
        loadData();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [gatewayOpen, loadData]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setTopping(true);
    try {
      const res = await walletAPI.topUp(amount, 'ESEWA');
      const paymentUrl = res.data.data?.payment_url;
      if (paymentUrl) {
        // Server created a PENDING TOPUP payment — complete it in the gateway
        await Linking.openURL(paymentUrl);
        setGatewayOpen(true);
        setTopUpAmount('');
        Alert.alert(
          'Complete payment',
          'Finish the payment in the gateway, then return here — your balance will refresh automatically.'
        );
      } else {
        Alert.alert('Success', `NPR ${amount} added to wallet`);
        setTopUpAmount('');
        loadData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Top-up failed');
    } finally {
      setTopping(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>NPR {balance?.balance?.toLocaleString() || '0'}</Text>
        <View style={styles.balanceStats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Earned</Text>
            <Text style={styles.statValue}>NPR {balance?.total_earned?.toLocaleString() || '0'}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={styles.statValue}>NPR {balance?.total_spent?.toLocaleString() || '0'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.topUpCard}>
        <Text style={styles.cardTitle}>Top Up Wallet</Text>
        <View style={styles.topUpRow}>
          <TextInput
            style={styles.topUpInput}
            placeholder="Enter amount"
            placeholderTextColor={colors.muted}
            value={topUpAmount}
            onChangeText={setTopUpAmount}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[styles.topUpButton, topping && styles.topUpButtonDisabled]}
            onPress={handleTopUp}
            disabled={topping}
          >
            {topping ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.topUpButtonText}>Top Up</Text>
            )}
          </TouchableOpacity>
        </View>
        {gatewayOpen && (
          <Text style={styles.gatewayHint}>
            Waiting for the gateway — open the payment page again if you were interrupted. Balance
            refreshes when you return.
          </Text>
        )}
      </View>

      <View style={styles.transactionsCard}>
        <Text style={styles.cardTitle}>Recent Transactions</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet</Text>
        ) : (
          transactions.map((t) => (
            <View key={t.id} style={styles.transactionRow}>
              <View style={styles.transactionInfo}>
                <Ionicons
                  name={t.transaction_type === 'CREDIT' ? 'add-circle' : 'remove-circle'}
                  size={24}
                  color={t.transaction_type === 'CREDIT' ? colors.success : colors.error}
                />
                <View style={{ marginLeft: spacing.md }}>
                  <Text style={styles.transactionDesc}>{t.description}</Text>
                  <Text style={styles.transactionDate}>{formatDateNPT(t.created_at)}</Text>
                </View>
              </View>
              <Text style={[styles.transactionAmount, { color: t.transaction_type === 'CREDIT' ? colors.success : colors.error }]}>
                {t.transaction_type === 'CREDIT' ? '+' : '-'}NPR {t.amount}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  balanceLabel: { ...typography.body, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontSize: 36, fontWeight: '700', color: colors.white, marginTop: spacing.xs },
  balanceStats: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.xxl },
  stat: { alignItems: 'center' },
  statLabel: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
  statValue: { ...typography.body, color: colors.white, fontWeight: '600', marginTop: 2 },
  topUpCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
  transactionsCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg },
  cardTitle: { ...typography.h3, marginBottom: spacing.md },
  topUpRow: { flexDirection: 'row', gap: spacing.sm },
  topUpInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  topUpButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  topUpButtonDisabled: { opacity: 0.6 },
  topUpButtonText: { ...typography.button },
  emptyText: { ...typography.body, color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  gatewayHint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transactionDesc: { ...typography.body, fontWeight: '500' },
  transactionDate: { ...typography.caption, marginTop: 2 },
  transactionAmount: { ...typography.body, fontWeight: '700' },
});
