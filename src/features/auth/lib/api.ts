import { api } from "@/lib/axios";
import { LoginDTO, RegisterDTO } from "../types/forms";

export async function register(data: RegisterDTO) {
  const { data: out } = await api.post("/auth/register", data);
  return out; // si falla, lanza ApiError
}

export async function login(data: LoginDTO){
  const { data: out } = await api.post("", data)
  return out;
}