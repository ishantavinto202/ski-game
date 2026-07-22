import type { GameEngine } from '../engine/GameEngine';
import { createInitialInputState } from '../types/InputTypes';
import type { GameSystem } from '../types';

export const INPUT_SYSTEM_ID = 'input-system';

export class InputSystem implements GameSystem {
  readonly id = INPUT_SYSTEM_ID;

  private engine: GameEngine | null = null;

  mount(engine: GameEngine): void {
    this.engine = engine;
    engine.inputRef.current = createInitialInputState();
    engine.inputActionsRef.current = {
      setLeftPressed: this.setLeftPressed,
      setRightPressed: this.setRightPressed,
    };
  }

  unmount(): void {
    if (this.engine) {
      this.engine.inputRef.current = createInitialInputState();
      this.engine.inputActionsRef.current = null;
    }
    this.engine = null;
  }

  private setLeftPressed = (pressed: boolean): void => {
    const input = this.engine?.inputRef.current;
    if (!input) {
      return;
    }

    if (pressed) {
      input.leftPressed = true;
      input.rightPressed = false;
      return;
    }

    input.leftPressed = false;
  };

  private setRightPressed = (pressed: boolean): void => {
    const input = this.engine?.inputRef.current;
    if (!input) {
      return;
    }

    if (pressed) {
      input.rightPressed = true;
      input.leftPressed = false;
      return;
    }

    input.rightPressed = false;
  };
}
