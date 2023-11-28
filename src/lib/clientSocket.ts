import io, { Socket } from 'socket.io-client';

class ClientSocket {
  socket: Socket;

  constructor(endpoint?: string) {
    this.socket = endpoint ? io(endpoint) : io();

    this.socket.on('connect', () => {});
  }

  dispose() {}
}

export let clientSocket: ClientSocket | null = null;

export async function connect(endpoint?: string) {
  clientSocket = new ClientSocket(endpoint);
}
