import { api } from "@/lib/axios";
import { RegisterDTO } from "../types/forms";

export async function register(data: RegisterDTO) {
  const { data: out } = await api.post("/auth/register", data);
  return out; // si falla, lanza ApiError
}