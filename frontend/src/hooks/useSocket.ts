import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

interface SeatStatus {
  seat_number: string;
  user_id?: number;
  expires_at?: string;
}

interface UseSocketReturn {
  subscribeToTrip: (tripId: number) => void;
  unsubscribeFromTrip: (tripId: number) => void;
  onSeatStatusChanged: (callback: (data: { trip_id: number; locked_seats: SeatStatus[]; booked_seats: SeatStatus[] }) => void) => void;
  onSeatSelectionChanged: (callback: (data: { user_id: number; trip_id: number; seat_numbers: string[]; action: string }) => void) => void;
  emitSeatSelection: (tripId: number, seatNumbers: string[], action: 'select' | 'deselect') => void;
  isConnected: boolean;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const subscribeToTrip = useCallback((tripId: number) => {
    socketRef.current?.emit('subscribe_trip', { trip_id: tripId });
  }, []);

  const unsubscribeFromTrip = useCallback((tripId: number) => {
    socketRef.current?.emit('unsubscribe_trip', { trip_id: tripId });
  }, []);

  const onSeatStatusChanged = useCallback((callback: (data: any) => void) => {
    socketRef.current?.on('current_seat_status', callback);
    socketRef.current?.on('seat_status_changed', callback);
  }, []);

  const onSeatSelectionChanged = useCallback((callback: (data: any) => void) => {
    socketRef.current?.on('seat_selection_changed', callback);
  }, []);

  const emitSeatSelection = useCallback((tripId: number, seatNumbers: string[], action: 'select' | 'deselect') => {
    socketRef.current?.emit('select_seats', {
      trip_id: tripId,
      seat_numbers: seatNumbers,
      action,
    });
  }, []);

  return {
    subscribeToTrip,
    unsubscribeFromTrip,
    onSeatStatusChanged,
    onSeatSelectionChanged,
    emitSeatSelection,
    isConnected: socketRef.current?.connected || false,
  };
}
