export function generateApiToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashToken(token: string): Promise<string> {
  return Bun.password.hash(token, { algorithm: "bcrypt", cost: 10 });
}

export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return Bun.password.verify(token, hash);
}
