// import { useSessionStore } from "@/features/shared/auth/stores/session-store";
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
//   withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  res => res,
  err => {
    const is401 = err.response?.status === 401;
    const notOnLogin = typeof window !== "undefined" && window.location.pathname !== "/login";

    if (is401 && notOnLogin) {
    //   useSessionStore.getState().clearSession();
      window.location.replace("/login");
    }
    return Promise.reject(err);
  }
);