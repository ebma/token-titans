export type Player = {
  id: string;
  username: string;
  status: "lobby" | "in-game";
};

export type Room = {
  id: string;
  name: string;
  players: string[];
  maxPlayers: number;
};

export type TitanStat = "HP" | "Attack" | "Defense" | "Speed" | "Stamina" | "Evasion" | "Accuracy" | "CriticalChance";

export const TITAN_STATS_ORDER: readonly TitanStat[] = [
  "HP",
  "Attack",
  "Defense",
  "Speed",
  "Stamina",
  "Evasion",
  "Accuracy",
  "CriticalChance"
];

export type Ability = {
  id: string;
  name: string;
  cost: number;
  description?: string;
  isDamageAbility: boolean;
  scalesWithAttack: boolean;
};

export type Titan = {
  id: string;
  name: string;
  ownerId: string;
  stats: Record<TitanStat, number>;
  abilities: Ability[];
};

export type GameState = "Lobby" | "PreBattle" | "Battle" | "Finished";

export type GameMode = "1v1" | "2v2";

export type RoundResult = {
  roundSequence: RoundSequence;
  roundLog: string[];
  roundNumber: number;
};

export type Game = {
  meta?: Partial<{
    lockedPlayers: Record<string, boolean>;
    lockedActions: Record<string, string>;
    titanCharges: { [p: string]: number };
    titanHPs: { [p: string]: number };
    titanAbilities: Record<string, Ability[]>;
  }>;
  id: string;
  players: string[];
  titans: Record<string, Titan>; // PlayerID to Titan
  gameState: GameState;
  gameMode: GameMode;
  roundNumber: number;
};

export type GameAction =
  | { type: "Attack"; payload: { targetId: string } }
  | { type: "Defend" }
  | { type: "Ability"; payload: { targetId: string; abilityId?: string } }
  | { type: "Rest" };

export type RoundActionKind = "Attack" | "Defend" | "Rest" | "Ability";
export type RoundActionResult = "Hit" | "Miss" | "Death";
export interface RoundAction {
  actorId: string;
  action: RoundActionKind;
  targetId?: string;
  abilityId?: string;
  result?: RoundActionResult;
}
export type RoundSequence = RoundAction[];

export type AuthRequestEvent = {
  type: "authRequest";
  payload: {
    username: string;
  };
};

export type AuthResponseEvent = {
  type: "authResponse";
  payload: {
    sessionId: string;
    userId: string;
    username: string;
    titans: Titan[];
  };
};

export type ReconnectRequestEvent = {
  type: "reconnectRequest";
  payload: {
    sessionId: string;
  };
};

export type ReconnectFailedEvent = {
  type: "reconnectFailed";
  payload: {
    reason?: string;
  };
};

export type CreateGameRequestEvent = {
  type: "createGameRequest";
  payload: {
    playerIds: string[];
  };
};

export type GameStartEvent = {
  type: "gameStart";
  payload: {
    game: Game;
    titans: Titan[];
  };
};

export type PlayerActionEvent = {
  type: "playerAction";
  payload: {
    gameId: string;
    playerId: string;
    action: GameAction;
  };
};

export type GameEvent =
  | { type: "GameStart"; payload: { game: Game } }
  | { type: "GameUpdate"; payload: { game: Game } }
  | { type: "RoundComplete"; payload: { roundResult: RoundResult } }
  | { type: "ActionRequest"; payload: { playerId: string } }
  | { type: "ActionResponse"; payload: { playerId: string; action: GameAction } };

export type LobbyInfoRequestEvent = {
  type: "lobbyInfoRequest";
};

export type LobbyUpdateEvent = {
  type: "lobbyUpdate";
  payload: {
    players: Player[];
    rooms: Room[];
  };
};

export type CreateRoomRequestEvent = {
  type: "createRoomRequest";
  payload: {
    name: string;
    maxPlayers: number;
  };
};
export type JoinRoomRequestEvent = {
  type: "joinRoomRequest";
  payload: {
    roomId: string;
  };
};

export type TitansUpdateEvent = {
  type: "titansUpdate";
  payload: {
    titans: Titan[];
  };
};

export type AppEvent =
  | GameEvent
  | AuthRequestEvent
  | AuthResponseEvent
  | CreateGameRequestEvent
  | GameStartEvent
  | PlayerActionEvent
  | LobbyInfoRequestEvent
  | LobbyUpdateEvent
  | CreateRoomRequestEvent
  | JoinRoomRequestEvent
  | ReconnectRequestEvent
  | ReconnectFailedEvent
  | TitansUpdateEvent;
