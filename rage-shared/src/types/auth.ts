/**
 * Shared types for the auth + character system.
 * Imported by both CEF and server.
 */

export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface CharacterSummary {
  id: number;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  cash: number;
  createdAt: string;
}
