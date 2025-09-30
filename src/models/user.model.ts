
export type UserRole = 'admin' | 'user' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  apps?: string[]; // Array of application identifiers from OIDC claims
}
