import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protege todas as rotas exceto login, health check, dashboard compartilhável e assets do Next.js
export const config = {
  matcher: [
    "/((?!login|api/health|compartilhavel|api/compartilhavel|api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
