import type {
  AuthSession,
  LoginCredentials,
  LoginApiResponse,
  UserRole,
  DummyJsonUser
} from "../types/index.js";
import { StorageService } from "./storage.js";

const API_BASE_URL = "https://dummyjson.com";

export class AuthService {
  /**
   * Melakukan autentikasi pengguna ke endpoint https://dummyjson.com/auth/login
   * Role diverifikasi dari respons server atau endpoint /auth/me
   */
  public static async login(
    credentials: LoginCredentials
  ): Promise<{ success: boolean; session?: AuthSession; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg =
          (errorData as { message?: string }).message ||
          "Kredensial tidak valid. Silakan periksa username dan password Anda.";
        return { success: false, message: errorMsg };
      }

      const loginData = (await response.json()) as LoginApiResponse;

      // Ambil role pengguna dari data login, atau request ke /auth/me / /users/:id
      let role: UserRole = "user";

      if (
        loginData.role &&
        (loginData.role === "admin" ||
          loginData.role === "moderator" ||
          loginData.role === "user")
      ) {
        role = loginData.role as UserRole;
      } else {
        // Fetch ke /auth/me atau /users/:id untuk memastikan role sebenarnya
        try {
          const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${loginData.accessToken}`
            }
          });
          if (meRes.ok) {
            const meData = (await meRes.json()) as DummyJsonUser;
            if (meData.role) {
              role = meData.role;
            }
          } else {
            // Fallback ke /users/:id
            const userRes = await fetch(`${API_BASE_URL}/users/${loginData.id}`);
            if (userRes.ok) {
              const userData = (await userRes.json()) as DummyJsonUser;
              if (userData.role) {
                role = userData.role;
              }
            }
          }
        } catch {
          // Default role fallback
          role = "user";
        }
      }

      const session: AuthSession = {
        token: loginData.accessToken,
        role: role,
        firstName: loginData.firstName || loginData.username,
        username: loginData.username,
        id: loginData.id,
        email: loginData.email,
        image: loginData.image
      };

      StorageService.saveSession(session);

      return { success: true, session };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? `Gagal terhubung ke server: ${err.message}`
          : "Terjadi kesalahan jaringan saat mencoba login.";
      return { success: false, message };
    }
  }

  public static getCurrentSession(): AuthSession | null {
    return StorageService.getSession();
  }

  public static isAuthenticated(): boolean {
    return this.getCurrentSession() !== null;
  }

  public static logout(): void {
    StorageService.clearSession();
    window.location.href = "login.html";
  }

  /**
   * Auth Guard & Role Guard untuk memproteksi halaman
   * Moderator diperlakukan setara dengan Admin.
   */
  public static requireAuth(allowedRoles?: UserRole[]): AuthSession | null {
    const session = this.getCurrentSession();

    if (!session) {
      window.location.replace("login.html");
      return null;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      // Normalisasi perlakuan role: jika allowedRoles berisi "admin", moderator juga diizinkan
      const effectiveAllowed = [...allowedRoles];
      if (effectiveAllowed.includes("admin") && !effectiveAllowed.includes("moderator")) {
        effectiveAllowed.push("moderator");
      }

      const hasPermission = effectiveAllowed.includes(session.role);
      if (!hasPermission) {
        // Arahkan ke halaman yang sesuai hak aksesnya
        if (session.role === "user") {
          window.location.replace("operator.html");
        } else {
          window.location.replace("index.html");
        }
        return null;
      }
    }

    return session;
  }

  /**
   * Redirect jika pengguna sudah login ketika membuka halaman login
   */
  public static redirectIfLoggedIn(): void {
    const session = this.getCurrentSession();
    if (session) {
      if (session.role === "admin" || session.role === "moderator") {
        window.location.replace("index.html");
      } else {
        window.location.replace("operator.html");
      }
    }
  }
}
