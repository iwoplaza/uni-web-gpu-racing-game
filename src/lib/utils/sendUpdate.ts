import { clientSocket } from '$lib/clientSocket';
import { get } from 'svelte/store';

export async function sendUpdate(name: string, value: object) {
  const socket = get(clientSocket);
  if (!socket) {
    return;
  }
  socket.socket.emit(name, value);
}
