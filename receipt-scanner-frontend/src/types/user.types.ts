export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserCreateInput {
  name: string;
  email: string;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
}

