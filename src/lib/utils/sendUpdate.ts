import { carGame } from '$lib/carGame';

export async function sendUpdate(name: string, value: object) {
  carGame?.clientSocket.socket.emit(name, value);
}
