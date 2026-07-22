export type InputState = {
  leftPressed: boolean;
  rightPressed: boolean;
};

export type InputActions = {
  setLeftPressed: (pressed: boolean) => void;
  setRightPressed: (pressed: boolean) => void;
};

export function createInitialInputState(): InputState {
  return {
    leftPressed: false,
    rightPressed: false,
  };
}
