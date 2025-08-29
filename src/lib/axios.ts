// import { useSessionStore } from "@/features/shared/auth/stores/session-store";
import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  //   withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export type FieldErrors = Record<string, string[]>;
export class ApiError extends Error {
  status?: number;
  fields?: FieldErrors;
  constructor(msg: string, status?: number, fields?: FieldErrors) {
    super(msg);
    this.status = status;
    this.fields = fields;
  }
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const res = err.response;
    // mensaje (usa el que mande tu API)
    const msg =
      res?.data?.message ||
      res?.data?.error ||
      err.message ||
      "Error inesperado";

    // redirect 401 solo en cliente (App Router hace SSR)
    if (
      res?.status === 403 &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.replace("/login");
    }
    throw new ApiError(msg, res?.status);
  }
);
