import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { userVerification, type NewUserVerification, type UserVerification } from '../../schema';

export async function createUserVerification(
  data: Omit<NewUserVerification, 'id' | 'createdAt'>
): Promise<UserVerification> {
  const result = await db
    .insert(userVerification)
    .values({
      ...data,
      createdAt: new Date(),
    })
    .returning();
  return result[0];
}

export async function findUserVerificationByEmail(email: string): Promise<UserVerification | undefined> {
  const result = await db
    .select()
    .from(userVerification)
    .where(eq(userVerification.email, email))
    .limit(1);
  return result[0];
}

export async function findUserVerificationByMacAddress(macAddress: string): Promise<UserVerification | undefined> {
  const result = await db
    .select()
    .from(userVerification)
    .where(eq(userVerification.macAddress, macAddress))
    .limit(1);
  return result[0];
}

export async function verifyUser(email: string, code: string): Promise<boolean> {
  const result = await db
    .update(userVerification)
    .set({
      isVerified: true,
      verifiedAt: new Date(),
    })
    .where(
      and(
        eq(userVerification.email, email),
        eq(userVerification.verificationCode, code),
        eq(userVerification.isVerified, false)
      )
    )
    .returning();
  
  return result.length > 0;
}

export async function isUserVerified(macAddress: string): Promise<boolean> {
  const result = await db
    .select({ isVerified: userVerification.isVerified })
    .from(userVerification)
    .where(
      and(
        eq(userVerification.macAddress, macAddress),
        eq(userVerification.isVerified, true)
      )
    )
    .limit(1);
  
  return result.length > 0 && result[0].isVerified;
}

export async function updateVerificationCode(email: string, code: string): Promise<void> {
  await db
    .update(userVerification)
    .set({
      verificationCode: code,
      isVerified: false,
      verifiedAt: null,
    })
    .where(eq(userVerification.email, email));
}

export async function createOrUpdateVerification(
  email: string,
  macAddress: string,
  code: string
): Promise<UserVerification> {
  const existing = await findUserVerificationByEmail(email);
  
  if (existing) {
    await updateVerificationCode(email, code);
    return { ...existing, verificationCode: code, isVerified: false, verifiedAt: null };
  }
  
  return createUserVerification({
    email,
    macAddress,
    verificationCode: code,
    isVerified: false,
  });
}
