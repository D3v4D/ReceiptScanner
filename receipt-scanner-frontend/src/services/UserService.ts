import type { User, UserCreateInput, UserUpdateInput } from "../types/user.types";
import { apiClient } from "./api";

export const listUsers = async (): Promise<User[]> =>
  (await apiClient.get("/api/users")).data;

export const createUser = async (payload: UserCreateInput): Promise<User> =>
  (await apiClient.post("/api/users", payload)).data;

export const updateUser = async (
  id: string,
  payload: UserUpdateInput,
): Promise<User> => (await apiClient.put(`/api/users/${id}`, payload)).data;

export const deleteUser = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/users/${id}`);
};

