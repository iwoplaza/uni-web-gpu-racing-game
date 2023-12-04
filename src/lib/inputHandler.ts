import type CarObject from './carObject';

export class InputHandler {
  public car: CarObject | null = null;
  public pressedKeysSet = new Set<string>();

  constructor() {
    document.addEventListener('keydown', (event) => {
      this.pressedKeysSet.add(event.key.toLowerCase());
      this.updateCar();
    });

    document.addEventListener('keyup', (event) => {
      this.pressedKeysSet.delete(event.key.toLowerCase());
      this.updateCar();
    });
  }

  updateCar() {
    if (!this.car) return;

    this.car.entity.isAccelerating =
      this.pressedKeysSet.has('w') || this.pressedKeysSet.has('leftarrow');
    this.car.entity.isBreaking =
      this.pressedKeysSet.has('s') || this.pressedKeysSet.has('downarrow');

    this.car.entity.isTurningLeft = this.pressedKeysSet.has('a');
    this.car.entity.isTurningRight = this.pressedKeysSet.has('d');
  }
}
