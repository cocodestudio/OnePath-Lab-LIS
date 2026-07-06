import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password");
        }

        try {
          const apiURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/lis";
          const loginURL = apiURL.replace(/\/api\/lis\/?$/, '/api/auth/login');
          const res = await fetch(loginURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password })
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            throw new Error(data.message || "Invalid credentials");
          }

          const user = data.user;
          // Return user and access token
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            labId: user.lab_id,
            labName: user.lab_name,
            accessToken: data.access_token
          };
        } catch (error: any) {
          throw new Error(error.message);
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.labId = (user as any).labId;
        token.labName = (user as any).labName;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).labId = token.labId;
        (session.user as any).labName = token.labName;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "onepath-secret-key-2026-lims",
};
