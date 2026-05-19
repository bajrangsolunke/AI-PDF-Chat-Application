import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { AuthResponse, User } from "@/types/api";
import { useAuthStore } from "@/store/authStore";

export const useSignup = () =>
  useMutation({
    mutationFn: async (vars: { email: string; password: string }) =>
      (await api.post<AuthResponse>("/auth/signup", vars)).data,
    onSuccess: (data) => useAuthStore.getState().setAuth(data.access_token, data.user),
  });

export const useLogin = () =>
  useMutation({
    mutationFn: async (vars: { email: string; password: string }) =>
      (await api.post<AuthResponse>("/auth/login", vars)).data,
    onSuccess: (data) => useAuthStore.getState().setAuth(data.access_token, data.user),
  });

export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get<User>("/auth/me")).data,
    enabled: !!useAuthStore.getState().token,
  });
