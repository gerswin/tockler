import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  email: string;
  setEmail: (email: string) => void;
  code: string;
  setCode: (code: string) => void;
  isCodeSent: boolean;
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;
  sendVerificationCode: () => Promise<void>;
  verifyCode: () => Promise<boolean>;
  reset: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check localStorage for existing verification on initial load
  useState(() => {
    const storedVerification = localStorage.getItem('emailVerification');
    if (storedVerification) {
      const { email, verified } = JSON.parse(storedVerification);
      if (verified) {
        setEmail(email);
        setIsVerified(true);
      }
    }
  });

  const getMacAddress = async (): Promise<string> => {
    try {
      // In a real Electron app, you would get the MAC address here
      // For now, we'll use a placeholder
      return '00:1A:2B:3C:4D:5E';
    } catch (error) {
      console.error('Error getting MAC address:', error);
      return '';
    }
  };

  const sendVerificationCode = async () => {
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const macAddress = await getMacAddress();
      const response = await fetch('https://auto.linktic.com/webhook/tockler/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          macAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar el código de verificación');
      }

      setIsCodeSent(true);
    } catch (error) {
      console.error('Error sending verification code:', error);
      setError(error instanceof Error ? error.message : 'Error al enviar el código de verificación');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async (): Promise<boolean> => {
    if (!code) {
      setError('Por favor ingresa el código de verificación');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const macAddress = await getMacAddress();
      const response = await fetch('https://auto.linktic.com/webhook/tockler/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
          macAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Código de verificación inválido');
      }

      // Store verification in localStorage
      localStorage.setItem(
        'emailVerification',
        JSON.stringify({ email, verified: true })
      );
      setIsVerified(true);
      return true;
    } catch (error) {
      console.error('Error verifying code:', error);
      setError(error instanceof Error ? error.message : 'Error al verificar el código');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setEmail('');
    setCode('');
    setIsCodeSent(false);
    setIsVerified(false);
    setError(null);
    localStorage.removeItem('emailVerification');
  };

  return (
    <AuthContext.Provider
      value={{
        email,
        setEmail,
        code,
        setCode,
        isCodeSent,
        isVerified,
        isLoading,
        error,
        sendVerificationCode,
        verifyCode,
        reset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
