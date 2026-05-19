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

// Protege rotas do dashboard — exclui rotas públicas e do portal do cliente CRM
export const config = {
  matcher: [
    "/((?!login|api/health|api/jobs|compartilhavel|api/compartilhavel|api/auth|api/rastreamento/webhook|api/cliente-crm|crm-cliente|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
