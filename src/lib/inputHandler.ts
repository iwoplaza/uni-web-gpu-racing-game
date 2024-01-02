import { get } from 'svelte/store';
import type CameraController from './game/cameraController';
import type { CameraMode } from './game/cameraController';
import type CarObject from './game/carObject';
import persistent from './persistent';

const cameraMode = persistent<CameraMode>('camera_mode', 'third-person');

export class InputHandler {
  public car: CarObject | null = null;
  private _cameraController: CameraController | null = null;
  public pressedKeysSet = new Set<string>();

  constructor() {
    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      this.pressedKeysSet.add(key);
      this.onKeyDown(key);
      this.onStateChanged();
    });

    document.addEventListener('keyup', (event) => {
      this.pressedKeysSet.delete(event.key.toLowerCase());
      this.onStateChanged();
    });
  }

  set cameraController(value: CameraController) {
    this._cameraController = value;
    this._cameraController.mode = get(cameraMode);
  }

  onKeyDown(key: string) {
    if (this._cameraController && key === '1') {
      cameraMode.update((mode) => {
        if (mode === 'map') {
          return 'third-person';
        }
        return 'map';
      });
      this._cameraController.mode = get(cameraMode);
    }
  }

  onStateChanged() {
    if (this.car) {
      this.car.entity.isAccelerating =
        this.pressedKeysSet.has('w') || this.pressedKeysSet.has('leftarrow');
      this.car.entity.isBraking =
        this.pressedKeysSet.has('s') || this.pressedKeysSet.has('downarrow');

      this.car.entity.isTurningLeft = this.pressedKeysSet.has('a');
      this.car.entity.isTurningRight = this.pressedKeysSet.has('d');
    }
  }
}
