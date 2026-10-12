export type UserRole = "admin" | "moderator" | "user";

export interface AuthSession {
  token: string;
  role: UserRole;
  firstName: string;
  username: string;
  id?: number;
  email?: string;
  image?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginApiResponse {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  image: string;
  accessToken: string;
  refreshToken: string;
  role?: string;
}

export interface DummyJsonUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: UserRole;
  image?: string;
}
