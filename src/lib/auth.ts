import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, dbConfigured } from "./db";
import { consumeLoginAttempt, loginClientIp } from "./login-throttle";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw, request) => {
        if (!dbConfigured) return null;

        // Brute-force / DoS throttle, ANTES do bcrypt. O e-mail do admin e
        // publico e este callback e atingivel direto por POST, sem passar pela
        // Server Action de login — entao a defesa mora aqui. Bloqueado = recusa
        // imediata, sem gastar CPU de bcrypt.
        const ip = loginClientIp(request);
        const throttle = await consumeLoginAttempt(ip);
        if (throttle.locked) {
          console.warn(
            `[auth] login bloqueado por rate limit (retry ~${throttle.retryAfterSeconds}s)`
          );
          return null;
        }

        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        try {
          const user = await db.user.findUnique({
            where: { email: parsed.data.email.toLowerCase() },
          });
          if (!user) return null;

          const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
          if (!ok) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? user.email,
            role: user.role,
          };
        } catch (err) {
          console.error("[auth] authorize threw", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role ?? "admin";
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        (session.user as { role?: string }).role =
          (token.role as string | undefined) ?? "admin";
      }
      return session;
    },
  },
});
