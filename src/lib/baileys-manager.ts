import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { processarLeadWpp } from "./processar-lead-wpp";

export type EstadoConexao = "connecting" | "open" | "close" | "unknown";

interface InstanciaState {
  socket: WASocket | null;
  estado: EstadoConexao;
  qrBase64: string | null;
  // Promises aguardando o primeiro evento (QR ou open)
  resolvers: Array<(r: { estado: EstadoConexao; qrBase64: string | null }) => void>;
}

// Logger silencioso para o Baileys
const silentLogger = {
  level: "silent",
  trace: () => {},
  debug: () => {},
  info:  () => {},
  warn:  () => {},
  error: () => {},
  fatal: () => {},
  child: () => silentLogger,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const AUTH_DIR = process.env.BAILEYS_AUTH_DIR ?? "/app/baileys-auth";

class BaileysManager {
  private instancias = new Map<string, InstanciaState>();

  private authPath(contaId: string) {
    return path.join(AUTH_DIR, contaId);
  }

  getEstado(contaId: string): EstadoConexao {
    return this.instancias.get(contaId)?.estado ?? "close";
  }

  getQr(contaId: string): string | null {
    return this.instancias.get(contaId)?.qrBase64 ?? null;
  }

  async conectar(contaId: string): Promise<{ estado: EstadoConexao; qrBase64: string | null }> {
    const inst = this.instancias.get(contaId);

    if (inst?.estado === "open") return { estado: "open", qrBase64: null };

    // Já tem socket ativo aguardando QR — retorna QR cacheado ou aguarda o próximo
    if (inst?.socket && inst.estado === "connecting") {
      if (inst.qrBase64) return { estado: "connecting", qrBase64: inst.qrBase64 };
      return this.aguardarEvento(contaId);
    }

    return this.criarConexao(contaId);
  }

  async desconectar(contaId: string): Promise<void> {
    const inst = this.instancias.get(contaId);
    if (inst?.socket) {
      try { await inst.socket.logout(); } catch {}
      try { inst.socket.end(undefined); } catch {}
    }
    this.instancias.delete(contaId);
    this.limparAuth(contaId);

    await prisma.contaAnuncio.update({
      where: { id: contaId },
      data: { evolutionStatus: "close" },
    }).catch(() => {});
  }

  async recriar(contaId: string): Promise<{ estado: EstadoConexao; qrBase64: string | null }> {
    const inst = this.instancias.get(contaId);
    if (inst?.socket) {
      try { inst.socket.end(undefined); } catch {}
      this.instancias.delete(contaId);
    }
    this.limparAuth(contaId);
    return this.criarConexao(contaId);
  }

  private aguardarEvento(contaId: string): Promise<{ estado: EstadoConexao; qrBase64: string | null }> {
    const inst = this.instancias.get(contaId);
    if (!inst) return Promise.resolve({ estado: "close", qrBase64: null });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ estado: inst.estado, qrBase64: inst.qrBase64 });
      }, 20_000);

      inst.resolvers.push((r) => {
        clearTimeout(timeout);
        resolve(r);
      });
    });
  }

  private notificarResolvers(contaId: string, result: { estado: EstadoConexao; qrBase64: string | null }) {
    const inst = this.instancias.get(contaId);
    if (!inst) return;
    const resolvers = inst.resolvers.splice(0);
    resolvers.forEach((r) => r(result));
  }

  private async criarConexao(contaId: string): Promise<{ estado: EstadoConexao; qrBase64: string | null }> {
    const authDir = this.authPath(contaId);
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const inst: InstanciaState = {
      socket: null,
      estado: "connecting",
      qrBase64: null,
      resolvers: [],
    };
    this.instancias.set(contaId, inst);

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentLogger),
      },
      logger: silentLogger,
      printQRInTerminal: false,
      browser: ["Elevoy", "Chrome", "126.0"],
      generateHighQualityLinkPreview: false,
    });

    inst.socket = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrBase64 = await QRCode.toDataURL(qr);
        inst.qrBase64 = qrBase64;
        inst.estado = "connecting";
        this.notificarResolvers(contaId, { estado: "connecting", qrBase64 });

        await prisma.contaAnuncio.update({
          where: { id: contaId },
          data: { evolutionStatus: "connecting" },
        }).catch(() => {});
      }

      if (connection === "open") {
        inst.estado = "open";
        inst.qrBase64 = null;
        this.notificarResolvers(contaId, { estado: "open", qrBase64: null });

        await prisma.contaAnuncio.update({
          where: { id: contaId },
          data: { evolutionStatus: "open" },
        }).catch(() => {});
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const foiDeslogado = statusCode === DisconnectReason.loggedOut;

        inst.estado = "close";
        inst.qrBase64 = null;
        inst.socket = null;
        this.notificarResolvers(contaId, { estado: "close", qrBase64: null });

        await prisma.contaAnuncio.update({
          where: { id: contaId },
          data: { evolutionStatus: "close" },
        }).catch(() => {});

        if (foiDeslogado) {
          this.limparAuth(contaId);
          this.instancias.delete(contaId);
        } else {
          // Reconecta automaticamente após 5s (queda de rede, timeout, etc.)
          setTimeout(() => {
            this.criarConexao(contaId).catch(console.error);
          }, 5_000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        await processarLeadWpp(contaId, msg).catch(console.error);
      }
    });

    // Aguarda o primeiro evento — QR, open ou timeout
    return this.aguardarEvento(contaId);
  }

  private limparAuth(contaId: string): void {
    try {
      fs.rmSync(this.authPath(contaId), { recursive: true, force: true });
    } catch {}
  }
}

// Singleton — sobrevive hot-reload no dev e persiste no container de produção
declare global {
  // eslint-disable-next-line no-var
  var _baileysManager: BaileysManager | undefined;
}

export const baileysManager =
  globalThis._baileysManager ?? (globalThis._baileysManager = new BaileysManager());
