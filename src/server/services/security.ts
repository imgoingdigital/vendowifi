import bcrypt from 'bcryptjs';

const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, rounds);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export function hashDeviceKey(raw: string) {
  // Simple device key hashing with optional pepper
  const pepper = process.env.DEVICE_API_PEPPER || '';
  return bcrypt.hashSync(raw + pepper, rounds);
}
export function verifyDeviceKey(raw: string, hash: string) {
  const pepper = process.env.DEVICE_API_PEPPER || '';
  return bcrypt.compareSync(raw + pepper, hash);
}
