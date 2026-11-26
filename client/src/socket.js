import { io } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
});

socket.on('connect', () => {
  console.log('[Socket] connected', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] disconnected', reason);
});

export function emit(event, data) {
  return new Promise((resolve) => {
    if (!socket.connected) {
      // Queue until connected
      socket.once('connect', () => socket.emit(event, data, resolve));
    } else {
      socket.emit(event, data, resolve);
    }
  });
}
