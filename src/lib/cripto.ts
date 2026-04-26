import crypto from "crypto";

const ALGORITMO = "aes-256-cbc";
const TAMANHO_IV = 16;

function obterChave(): Buffer {
  const chave = process.env.TOKEN_ENCRYPTION_KEY;
  if (!chave || chave.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY deve ter exatamente 32 caracteres");
  }
  return Buffer.from(chave, "utf-8");
}

export function criptografar(texto: string): string {
  const chave = obterChave();
  const iv = crypto.randomBytes(TAMANHO_IV);
  const cipher = crypto.createCipheriv(ALGORITMO, chave, iv);
  const criptografado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${criptografado.toString("hex")}`;
}

export function descriptografar(textoCriptografado: string): string {
  const chave = obterChave();
  const [ivHex, dadosHex] = textoCriptografado.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const dados = Buffer.from(dadosHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITMO, chave, iv);
  return Buffer.concat([decipher.update(dados), decipher.final()]).toString("utf8");
}
