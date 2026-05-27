import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;

    // Rotas /admin/* (exceto /admin/login) usam cookie próprio do admin master
    if (path.startsWith("/admin/") && !path.startsWith("/admin/login")) {
      const cookie = req.cookies.get("admin-session");
      const token = process.env.ADMIN_MASTER_TOKEN;
      if (!cookie || !token || cookie.value !== token) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Rotas /admin/* têm auth própria por cookie — NextAuth não interfere
        if (req.nextUrl.pathname.startsWith("/admin/")) return true;
        return !!token;
      },
    },
  }
);

// Protege rotas do dashboard — exclui rotas públicas e do portal do cliente CRM
export const config = {
  matcher: [
    "/((?!login|cadastro|admin/login|api/health|api/jobs|api/admin-master|compartilhavel|api/compartilhavel|api/auth|api/rastreamento/webhook|api/cliente-crm|crm-cliente|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
