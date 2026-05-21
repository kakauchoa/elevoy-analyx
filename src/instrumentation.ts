export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { baileysManager } = await import("./lib/baileys-manager");
    await baileysManager.reconectarInstanciasAtivas();
  }
}
