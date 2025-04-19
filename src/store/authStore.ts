import { create } from 'zustand';
import { auth, db, getConnectionStatus } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

interface User {
  id: string;
  name: string;
  email: string;
  currency?: string;
  emergencyFund?: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserCurrency: (currency: string) => Promise<void>;
  updateEmergencyFund: (amount: number) => Promise<void>;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

const retryWithExponentialBackoff = async (
  operation: () => Promise<any>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<any> => {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0 || !getConnectionStatus()) throw error;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithExponentialBackoff(operation, retries - 1, delay * 2);
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  
  login: async (email: string, password: string) => {
    if (!getConnectionStatus()) {
      throw new Error('Sem conexão com a internet. Por favor, verifique sua conexão e tente novamente.');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { uid, displayName, email: userEmail } = userCredential.user;
      
      // Get user data from Firestore with retry mechanism
      const getUserData = async () => {
        const userDoc = await getDoc(doc(db, 'users', uid));
        return userDoc.data();
      };
      
      const userData = await retryWithExponentialBackoff(getUserData);
      
      set({ 
        user: { 
          id: uid, 
          name: displayName || 'Usuário', 
          email: userEmail || '',
          currency: userData?.currency || 'BRL',
          emergencyFund: userData?.emergencyFund || 0
        }, 
        isAuthenticated: true 
      });
      
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      if (!getConnectionStatus()) {
        throw new Error('Sem conexão com a internet. Por favor, verifique sua conexão e tente novamente.');
      }
      return false;
    }
  },
  
  register: async (name: string, email: string, password: string) => {
    if (!getConnectionStatus()) {
      throw new Error('Sem conexão com a internet. Por favor, verifique sua conexão e tente novamente.');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Create user document in Firestore with retry mechanism
      const createUserDoc = async () => {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name,
          email,
          currency: 'BRL',
          emergencyFund: 0,
          createdAt: new Date()
        });
      };
      
      await retryWithExponentialBackoff(createUserDoc);
      
      set({ 
        user: { 
          id: userCredential.user.uid, 
          name, 
          email,
          currency: 'BRL',
          emergencyFund: 0
        }, 
        isAuthenticated: true 
      });
      
      return true;
    } catch (error) {
      console.error('Erro no registro:', error);
      if (!getConnectionStatus()) {
        throw new Error('Sem conexão com a internet. Por favor, verifique sua conexão e tente novamente.');
      }
      return false;
    }
  },
  
  logout: async () => {
    try {
      await signOut(auth);
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  },

  updateUserCurrency: async (currency: string) => {
    const { user } = get();
    if (!user) return;

    if (!getConnectionStatus()) {
      throw new Error('Sem conexão com a internet. Por favor, verifique sua conexão e tente novamente.');
    }

    const updateCurrency = async () => {
      await updateDoc(doc(db, 'users', user.id), {
        currency
      });
    };

    try {
      await retryWithExponentialBackoff(updateCurrency);
      set(state => ({
        user: state.user ? { ...state.user, currency } : null
      }));
    } catch (error) {
      console.error('Erro ao atualizar moeda:', error);
      throw error;
    }
  },

  updateEmergencyFund: async (amount: number) => {
    const { user } = get();
    if (!user) return;

    if (!getConnectionStatus()) {
      throw new Error('Sem conexão com a internet. Por favor, verifique sua conexão e tente novamente.');
    }

    const updateFund = async () => {
      await updateDoc(doc(db, 'users', user.id), {
        emergencyFund: amount
      });
    };

    try {
      await retryWithExponentialBackoff(updateFund);
      set(state => ({
        user: state.user ? { ...state.user, emergencyFund: amount } : null
      }));
    } catch (error) {
      console.error('Erro ao atualizar reserva de emergência:', error);
      throw error;
    }
  }
}));

// Observador de mudanças na autenticação
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Set basic user data immediately
    const basicUserData = {
      id: user.uid,
      name: user.displayName || 'Usuário',
      email: user.email || '',
      currency: 'BRL',
      emergencyFund: 0
    };

    // Set initial state with basic data
    useAuthStore.setState({
      user: basicUserData,
      isAuthenticated: true
    });

    // Only attempt to fetch additional data if online
    if (getConnectionStatus()) {
      try {
        const getUserData = async () => {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          return userDoc.data();
        };

        const userData = await retryWithExponentialBackoff(getUserData);

        // Update state with Firestore data if fetch was successful
        useAuthStore.setState({
          user: {
            ...basicUserData,
            currency: userData?.currency || 'BRL',
            emergencyFund: userData?.emergencyFund || 0
          },
          isAuthenticated: true
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        // State already set with basic data, so no need to set again
      }
    }
  } else {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  }
});