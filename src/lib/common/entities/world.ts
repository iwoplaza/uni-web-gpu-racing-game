import type { Car } from './car';
import type { Player } from './player';

export class WorldState {
  cars: Map<string, Car>;
  players: Map<string, Player>;

  constructor() {
    this.cars = new Map(); // Holds cars by ID
    this.players = new Map(); // Holds players by ID
  }

  addCar(car: Car) {
    this.cars.set(car.carId, car);
  }

  getCarById(carId: string): Car | undefined {
    return this.cars.get(carId);
  }

  addPlayer(player: Player) {
    this.players.set(player.playerId, player);
  }

  getPlayerById(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }
}
