import { create } from 'zustand';

type SkiGameStoreActions = {
  reset: () => void;
};

export type SkiGameStore = SkiGameStoreActions;

export const useSkiGameStore = create<SkiGameStore>()(() => ({
  reset: () => {},
}));
