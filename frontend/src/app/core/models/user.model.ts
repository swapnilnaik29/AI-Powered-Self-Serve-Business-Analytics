export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'analyst' | 'viewer';
  is_active: boolean;
}
 
export interface LoginRequest {
  email: string;
  password: string;
}
 
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}
 
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
 
export interface ResetPasswordRequest {
  email: string;
  new_password: string;
}