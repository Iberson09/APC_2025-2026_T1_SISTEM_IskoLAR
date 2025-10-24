export enum Role {
  USER = 'user',
  BOT = 'bot',
}

export interface Message {
  role: Role;
  content: string;
}
