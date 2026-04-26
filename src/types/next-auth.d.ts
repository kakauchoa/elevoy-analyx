import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tipo: string;
    } & DefaultSession["user"];
  }

  interface User {
    tipo: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tipo: string;
  }
}
