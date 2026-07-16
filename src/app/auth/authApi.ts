import { api } from "@/lib/api/client";

export type BackendUser = {
  id: number;
  nombre: string;
  email: string;
  rol: string | null;
};

type LoginResponse = {
  token: string;
  user: BackendUser;
};

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
  return data;
}
