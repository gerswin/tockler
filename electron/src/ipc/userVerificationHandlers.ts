import { ipcMain } from 'electron';
import { getMacAddress } from '../utils/mac-address';
import {
  createOrUpdateVerification,
  findUserVerificationByEmail,
  findUserVerificationByMacAddress,
  isUserVerified as checkUserVerified,
  verifyUser,
} from '../drizzle/worker/queries/userVerification.db';

export function setupUserVerificationHandlers() {
  // Get MAC address handler
  ipcMain.handle('get-mac-address', async () => {
    return getMacAddress();
  });

  // Create or update a verification record
  ipcMain.handle('user-verification:create-or-update', async (_, data) => {
    try {
      const { email, macAddress, code } = data;
      const verification = await createOrUpdateVerification(email, macAddress, code);
      return verification;
    } catch (error) {
      console.error('Error creating/updating verification:', error);
      throw error;
    }
  });

  // Find verification by email
  ipcMain.handle('user-verification:find-by-email', async (_, email: string) => {
    try {
      const verification = await findUserVerificationByEmail(email);
      return verification || null;
    } catch (error) {
      console.error('Error finding verification by email:', error);
      throw error;
    }
  });

  // Find verification by MAC address
  ipcMain.handle('user-verification:find-by-mac', async (_, macAddress: string) => {
    try {
      const verification = await findUserVerificationByMacAddress(macAddress);
      return verification || null;
    } catch (error) {
      console.error('Error finding verification by MAC address:', error);
      throw error;
    }
  });

  // Verify a user's code
  ipcMain.handle('user-verification:verify', async (_, email: string, code: string) => {
    try {
      const isVerified = await verifyUser(email, code);
      return isVerified;
    } catch (error) {
      console.error('Error verifying user:', error);
      throw error;
    }
  });

  // Check if a user is verified
  ipcMain.handle('user-verification:is-verified', async (_, macAddress: string) => {
    try {
      const isVerified = await checkUserVerified(macAddress);
      return isVerified;
    } catch (error) {
      console.error('Error checking verification status:', error);
      throw error;
    }
  });
}
