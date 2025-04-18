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
import { format, isEqual, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type TransactionType = 'income' | 'expense';
export type RecurrenceType = 'none' | 'weekly' | 'monthly';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: TransactionType;
  recurrence: RecurrenceType;
  recurrenceDay?: number;
  weekDay?: number;
  createdAt?: Timestamp;
}

interface TransactionState {
  transactions: Transaction[];
  categories: { [key in TransactionType]: string[] };
  isLoading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Omit<Transaction, 'id' | 'userId'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (type: TransactionType, category: string) => void;
  fetchTransactions: (userId: string) => Promise<void>;
  getTransactionsByDateRange: (startDate: Date, endDate: Date) => Transaction[];
  getTransactionsByMonth: (year: number, month: number) => Transaction[];
  getRecurringTransactions: () => Transaction[];
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
          const transactions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              amount: Number(data.amount) || 0,
              recurrence: data.recurrence || 'none',
              date: data.date || format(data.createdAt?.toDate() || new Date(), 'yyyy-MM-dd'),
              recurrenceDay: data.recurrenceDay ? Number(data.recurrenceDay) : undefined,
              weekDay: data.weekDay !== undefined ? Number(data.weekDay) : undefined
            } as Transaction;
          });
          
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
      set({ isLoading: true });
      
      const transactionData = {
        ...transaction,
        amount: Number(transaction.amount),
        createdAt: Timestamp.now(),
        recurrenceDay: transaction.recurrence === 'monthly' ? Number(transaction.recurrenceDay) : null,
        weekDay: transaction.recurrence === 'weekly' ? Number(transaction.weekDay) : null
      };

      await addDoc(collection(db, 'transactions'), transactionData);
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateTransaction: async (id, updatedFields) => {
    try {
      set({ isLoading: true });
      
      const transactionRef = doc(db, 'transactions', id);
      const updates = {
        ...updatedFields,
        amount: updatedFields.amount ? Number(updatedFields.amount) : undefined,
        recurrenceDay: updatedFields.recurrence === 'monthly' ? Number(updatedFields.recurrenceDay) : null,
        weekDay: updatedFields.recurrence === 'weekly' ? Number(updatedFields.weekDay) : null,
        updatedAt: Timestamp.now()
      };

      await updateDoc(transactionRef, updates);
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
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
  
  getTransactionsByDateRange: (startDate, endDate) => {
    const { transactions } = get();
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);

    return transactions.filter((t) => {
      const transactionDate = startOfDay(new Date(t.date));
      return transactionDate >= start && transactionDate <= end;
    });
  },
  
  getTransactionsByMonth: (year, month) => {
    const { transactions } = get();
    const formatStr = 'yyyy-MM';
    const targetMonth = format(new Date(year, month), formatStr, { locale: ptBR });
    
    return transactions.filter((t) => {
      const transactionMonth = format(new Date(t.date), formatStr, { locale: ptBR });
      return transactionMonth === targetMonth;
    });
  },

  getRecurringTransactions: () => {
    const { transactions } = get();
    return transactions.filter(t => t.recurrence !== 'none');
  },
  
  getSummary: (startDate, endDate) => {
    const transactions = get().getTransactionsByDateRange(startDate, endDate);
    
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