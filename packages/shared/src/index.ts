export type Player = {
  id: string;
  username: string;
  status: 'lobby' | 'in-game';
};

export type Room = {
  id: string;
  name: string;
  players: string[];
  maxPlayers: number;
};

export type AuthRequestEvent = {
  type: 'authRequest';
  payload: {
    username: string;
  };
};

export type AuthResponseEvent = {
  type: 'authResponse';
  payload: {
    sessionId: string;
    userId: string;
    username: string;
  };
};

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

export type AppEvent = GameEvent | AuthRequestEvent | AuthResponseEvent;
