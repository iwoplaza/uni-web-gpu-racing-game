import { vec3 } from 'gl-matrix';

// A class that represents each player's entity
export class Player {
  playerId: string;
  lapsCompleted: number;
  carId: string;
  constructor(playerId:string, carId:string) {
    this.playerId = playerId; // Player's identifier
    this.carId = carId; // Reference to the player's car by ID, not direct object
    this.lapsCompleted = 0; // Number of laps completed
  }

  // Player's actions such as accelerate, decelerate, turn, etc.
  accelerate() {
    // Implementation
  }

  decelerate() {
    // Implementation
  }

  turnRight() {
    // Implementation
  }

  turnLeft() {
    // Implementation
  }

  brake() {
    // Implementation
  }

  // Call this function to update the tire condition based on usage
  updateTireCondition() {
    // Decrease tire condition over time or due to other factors
  }
}
