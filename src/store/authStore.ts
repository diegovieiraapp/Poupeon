import { create } from 'zustand';
import { auth, db } from '../config/firebase';
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
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserCurrency: (currency: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  
  login: async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { uid, displayName, email: userEmail } = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', uid));
      const userData = userDoc.data();
      
      set({ 
        user: { 
          id: uid, 
          name: displayName || 'Usuário', 
          email: userEmail || '',
          currency: userData?.currency || 'BRL'
        }, 
        isAuthenticated: true 
      });
      
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  },
  
  register: async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Criar documento do usuário no Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        email,
        currency: 'BRL',
        createdAt: new Date()
      });
      
      set({ 
        user: { 
          id: userCredential.user.uid, 
          name, 
          email,
          currency: 'BRL'
        }, 
        isAuthenticated: true 
      });
      
      return true;
    } catch (error) {
      console.error('Erro no registro:', error);
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

    try {
      await updateDoc(doc(db, 'users', user.id), {
        currency
      });

      set(state => ({
        user: state.user ? { ...state.user, currency } : null
      }));
    } catch (error) {
      console.error('Erro ao atualizar moeda:', error);
      throw error;
    }
  }
}));

// Observador de mudanças na autenticação
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    useAuthStore.setState({ 
      user: { 
        id: user.uid, 
        name: user.displayName || 'Usuário', 
        email: user.email || '',
        currency: userData?.currency || 'BRL'
      }, 
      isAuthenticated: true 
    });
  } else {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  }
});