/**
 * Token Management Service
 * 
 * Handles Firebase token refresh, expiration monitoring, and automatic logout.
 * Industry-standard implementation for session management.
 */

import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Token expires after 1 hour in Firebase
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000; // Refresh every 50 minutes
const TOKEN_EXPIRY_CHECK_INTERVAL = 60 * 1000; // Check every minute

export class TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private expiryCheckTimer: NodeJS.Timeout | null = null;
  private onTokenExpired: (() => void) | null = null;

  /**
   * Start monitoring and refreshing the token
   */
  start(onTokenExpired: () => void) {
    this.onTokenExpired = onTokenExpired;
    this.startRefreshTimer();
    this.startExpiryCheck();
  }

  /**
   * Stop all token monitoring
   */
  stop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.expiryCheckTimer) {
      clearInterval(this.expiryCheckTimer);
      this.expiryCheckTimer = null;
    }
    this.onTokenExpired = null;
  }

  /**
   * Get fresh token for API calls
   */
  async getToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      // Force refresh if token is about to expire
      const token = await user.getIdToken(false);
      const tokenResult = await user.getIdTokenResult();
      
      // Check if token expires in less than 5 minutes
      const expirationTime = new Date(tokenResult.expirationTime).getTime();
      const now = Date.now();
      const timeUntilExpiry = expirationTime - now;

      if (timeUntilExpiry < 5 * 60 * 1000) {
        // Force refresh
        return await user.getIdToken(true);
      }

      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Manually refresh the token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      // Force token refresh
      const token = await user.getIdToken(true);
      console.log('[TokenManager] Token refreshed successfully');
      return token;
    } catch (error) {
      console.error('[TokenManager] Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Check if current token is valid
   */
  async isTokenValid(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      const tokenResult = await user.getIdTokenResult();
      const expirationTime = new Date(tokenResult.expirationTime).getTime();
      const now = Date.now();

      return expirationTime > now;
    } catch (error) {
      console.error('[TokenManager] Error checking token validity:', error);
      return false;
    }
  }

  /**
   * Start automatic token refresh
   */
  private startRefreshTimer() {
    // Refresh immediately
    this.refreshToken();

    // Then refresh periodically
    this.refreshTimer = setInterval(() => {
      this.refreshToken();
    }, TOKEN_REFRESH_INTERVAL);
  }

  /**
   * Start checking for token expiration
   */
  private startExpiryCheck() {
    this.expiryCheckTimer = setInterval(async () => {
      const isValid = await this.isTokenValid();
      if (!isValid && this.onTokenExpired) {
        console.log('[TokenManager] Token expired, logging out');
        this.stop();
        this.onTokenExpired();
      }
    }, TOKEN_EXPIRY_CHECK_INTERVAL);
  }
}

// Singleton instance
export const tokenManager = new TokenManager();
