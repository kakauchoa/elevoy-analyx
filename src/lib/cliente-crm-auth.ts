import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "cliente-crm-token";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret-change-me";
  return new TextEncoder().encode(`cliente-crm:${secret}`);
}

export interface ClienteCrmPayload {
  id: string;
  email: string;
  nome: string;
  contaSlug: string | null;
}

export async function assinarTokenCliente(payload: ClienteCrmPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(getSecret());
}

export async function verificarTokenCliente(token: string): Promise<ClienteCrmPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as ClienteCrmPayload;
  } catch {
    return null;
  }
}

export async function getSessionCliente(): Promise<ClienteCrmPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarTokenCliente(token);
}

export { COOKIE_NAME };
