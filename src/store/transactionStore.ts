import { create } from 'zustand';
import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  Timestamp,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  isBefore, 
  isAfter, 
  isSameDay,
  parseISO,
  addMonths
} from 'date-fns';

export type TransactionType = 'income' | 'expense';
export type PaymentStatus = 'pending' | 'paid';
export type RecurrenceType = 'none' | 'monthly';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: string; // Format: "yyyy-MM-dd"
  type: TransactionType;
  status: PaymentStatus;
  recurrence: {
    type: RecurrenceType;
    dayOfMonth?: number;
    endDate?: string;
  };
  createdAt?: Timestamp;
}

interface TransactionState {
  transactions: Transaction[];
  categories: { [key in TransactionType]: string[] };
  isLoading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Omit<Transaction, 'id' | 'userId'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  toggleTransactionStatus: (id: string) => Promise<void>;
  addCategory: (type: TransactionType, category: string) => void;
  fetchTransactions: (userId: string) => Promise<void>;
  getTransactionsByDateRange: (startDate: Date, endDate: Date) => Transaction[];
  getTransactionsByMonth: (year: number, month: number) => Transaction[];
  getSummary: (startDate: Date, endDate: Date) => {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    byCategoryIncome: { [category: string]: number };
    byCategoryExpense: { [category: string]: number };
  };
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  
  categories: {
    income: ['Salário', 'Investimentos', 'Presentes', 'Outros'],
    expense: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Utilidades', 'Saúde', 'Pessoal', 'Educação', 'Outros'],
  },
  
  fetchTransactions: async (userId: string) => {
    try {
      set({ isLoading: true });
      
      const q = query(
        collection(db, 'transactions'), 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, {
        next: (querySnapshot) => {
          const transactions = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            amount: Number(doc.data().amount) || 0,
            status: doc.data().status || 'pending',
            recurrence: doc.data().recurrence || { type: 'none' },
          } as Transaction));
          
          set({ transactions, isLoading: false });
        },
        error: (error) => {
          console.error('Erro ao observar transações:', error);
          set({ isLoading: false });
        }
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      set({ isLoading: false });
    }
  },
  
  addTransaction: async (transaction) => {
    try {
      // Create base transaction data
      const baseTransactionData = {
        ...transaction,
        amount: Number(transaction.amount),
        createdAt: Timestamp.now(),
        recurrence: {
          type: transaction.recurrence.type,
          // Only include dayOfMonth and endDate for monthly transactions
          ...(transaction.recurrence.type === 'monthly' && {
            dayOfMonth: transaction.recurrence.dayOfMonth,
            endDate: transaction.recurrence.endDate
          })
        }
      };

      // If it's a recurring transaction, create future instances
      if (transaction.recurrence.type === 'monthly') {
        const startDate = parseISO(transaction.date);
        const endDate = transaction.recurrence.endDate ? parseISO(transaction.recurrence.endDate) : addMonths(startDate, 12);
        let currentDate = startDate;

        while (isBefore(currentDate, endDate)) {
          const currentTransactionData = {
            ...baseTransactionData,
            date: format(currentDate, 'yyyy-MM-dd'),
          };
          await addDoc(collection(db, 'transactions'), currentTransactionData);
          currentDate = addMonths(currentDate, 1);
        }
      } else {
        // For non-recurring transactions, just add a single document
        await addDoc(collection(db, 'transactions'), baseTransactionData);
      }
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      throw error;
    }
  },
  
  updateTransaction: async (id, updatedFields) => {
    try {
      set({ isLoading: true });
      
      const updates: any = {
        ...updatedFields,
        amount: updatedFields.amount ? Number(updatedFields.amount) : undefined,
        updatedAt: Timestamp.now()
      };

      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      const transactionRef = doc(db, 'transactions', id);
      await updateDoc(transactionRef, updates);
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  toggleTransactionStatus: async (id: string) => {
    try {
      set({ isLoading: true });
      const transaction = get().transactions.find(t => t.id === id);
      if (!transaction) return;

      const newStatus: PaymentStatus = transaction.status === 'pending' ? 'paid' : 'pending';
      const transactionRef = doc(db, 'transactions', id);
      await updateDoc(transactionRef, { status: newStatus });
    } catch (error) {
      console.error('Erro ao alterar status da transação:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteTransaction: async (id) => {
    try {
      set({ isLoading: true });
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  addCategory: (type, category) => {
    if (get().categories[type].includes(category)) return;
    
    set((state) => ({
      categories: {
        ...state.categories,
        [type]: [...state.categories[type], category],
      },
    }));
  },
  
  getTransactionsByDateRange: (startDate: Date, endDate: Date) => {
    const { transactions } = get();
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);
    
    return transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return (
        isSameDay(transactionDate, start) || 
        isSameDay(transactionDate, end) || 
        (isAfter(transactionDate, start) && isBefore(transactionDate, end))
      );
    }).sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  },
  
  getTransactionsByMonth: (year: number, month: number) => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return get().getTransactionsByDateRange(startDate, endDate);
  },
  
  getSummary: (startDate: Date, endDate: Date) => {
    const transactions = get().getTransactionsByDateRange(startDate, endDate)
      .filter(t => t.status === 'paid');
    
    let totalIncome = 0;
    let totalExpense = 0;
    const byCategoryIncome: { [category: string]: number } = {};
    const byCategoryExpense: { [category: string]: number } = {};
    
    transactions.forEach((t) => {
      const amount = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amount;
        byCategoryIncome[t.category] = (byCategoryIncome[t.category] || 0) + amount;
      } else {
        totalExpense += amount;
        byCategoryExpense[t.category] = (byCategoryExpense[t.category] || 0) + amount;
      }
    });
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      byCategoryIncome,
      byCategoryExpense,
    };
  },
}));