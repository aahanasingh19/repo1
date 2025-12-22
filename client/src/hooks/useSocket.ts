import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

export function useSocket(onResult: (payload: any) => void) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onResult);
  callbackRef.current = onResult;

  const connect = useCallback(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      socket.emit('setUserId', user.id);
    });

    socket.on('evalResultResponse', (payload: any) => {
      callbackRef.current(payload);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socketRef.current = socket;
  }, [user]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { socket: socketRef.current };
}
