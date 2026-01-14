
export interface Square {
  id: string; // "row-col" format
  owner: string;
  row: number;
  col: number;
  isPaid?: boolean;
  isPending?: boolean;
  paymentMethod?: 'venmo' | 'cashapp' | 'cash';
}

export type Theme = 'stadium' | 'classic' | 'neon';

export interface PrizeDistribution {
  q1: number;
  q2: number;
  q3: number;
  final: number;
}

export interface GameState {
  title: string;
  homeTeam: string;
  awayTeam: string;
  homeNumbers: number[] | null;
  awayNumbers: number[] | null;
  squares: Record<string, Square>;
  isLocked: boolean; // Game is fully active (numbers generated)
  isGridLocked: boolean; // Ownership is locked (no more edits)
  homeScore: string;
  awayScore: string;
  isSoundEnabled: boolean;
  theme: Theme;
  quarterWinners: {
    q1?: string;
    q2?: string;
    q3?: string;
  };
  paymentSettings?: {
    venmo?: string;
    cashApp?: string;
    cash?: string;
    pricePerSquare?: string;
  };
  prizeDistribution?: PrizeDistribution;
  poolCode: string; // Code for players to join
  adminPin: string; // Custom PIN for admin
  isInitialized: boolean; // Whether the pool has been set up
  isPaidPool: boolean; // Whether the $5 pool fee has been paid
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}
