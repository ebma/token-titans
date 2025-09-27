export type GameEvent = {
  type: 'playerMove';
  payload: {
    x: number;
    y: number;
    z: number;
  };
} | {
  type: 'playerAttack';
  payload: {
    targetId: string;
  };
};
