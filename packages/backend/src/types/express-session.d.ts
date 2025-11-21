import 'express-session';

declare module 'express-session' {
  // Dodajemy pole user bezpośrednio do Session, aby TS widział je przy odczycie i zapisie
  interface Session {
    user?: { id: number; email?: string; role: string };
  }

  // Dodatkowe metadane w SessionData (opcjonalnie)
  interface SessionData {
    userId?: number;
    userRole?: string;
  }
}

declare module 'express' {
  interface Request {
    session: import('express-session').Session & Partial<import('express-session').SessionData>;
    memberRole?: 'OWNER' | 'WORKER';
  }
}
