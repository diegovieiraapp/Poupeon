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
  parseISO,
  startOfDay,
  endOfDay,
  isSameDay,
  isAfter,
  isBefore,
  addDays,
  getDay,
  getDate,
  startOfMonth,
  endOfMonth
} from 'date-fns';
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
  recurrenceDay: number | null;
  weekDay: number | null;
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

const normalizeDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const normalizedDate = startOfDay(dateObj);
  return format(normalizedDate, 'yyyy-MM-dd');
};

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
              date: data.date || normalizeDate(data.createdAt?.toDate() || new Date()),
              recurrenceDay: data.recurrenceDay !== undefined ? Number(data.recurrenceDay) : null,
              weekDay: data.weekDay !== undefined ? Number(data.weekDay) : null
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
      
      const transactionDate = parseISO(transaction.date);
      
      const transactionData = {
        ...transaction,
        amount: Number(transaction.amount),
        date: normalizeDate(transactionDate),
        createdAt: Timestamp.now(),
        weekDay: transaction.recurrence === 'weekly' ? getDay(transactionDate) : null,
        recurrenceDay: transaction.recurrence === 'monthly' ? getDate(transactionDate) : null
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
      
      const updates: any = {
        ...updatedFields,
        amount: updatedFields.amount ? Number(updatedFields.amount) : undefined,
        updatedAt: Timestamp.now()
      };

      if (updatedFields.date) {
        const date = parseISO(updatedFields.date);
        updates.date = normalizeDate(date);
        
        if (updatedFields.recurrence === 'weekly') {
          updates.weekDay = getDay(date);
          updates.recurrenceDay = null;
        } else if (updatedFields.recurrence === 'monthly') {
          updates.recurrenceDay = getDate(date);
          updates.weekDay = null;
        } else {
          updates.weekDay = null;
          updates.recurrenceDay = null;
        }
      } else if (updatedFields.recurrence !== undefined) {
        if (updatedFields.recurrence === 'none') {
          updates.weekDay = null;
          updates.recurrenceDay = null;
        }
      }

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      const transactionRef = doc(db, 'transactions', id);
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
  
  getTransactionsByDateRange: (startDate: Date, endDate: Date) => {
    const { transactions } = get();
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);
    const result: Transaction[] = [];

    transactions.forEach(t => {
      const transactionDate = parseISO(t.date);

      // Handle non-recurring transactions
      if (t.recurrence === 'none') {
        if (isSameDay(transactionDate, start) || isSameDay(transactionDate, end) || 
            (isAfter(transactionDate, start) && isBefore(transactionDate, end))) {
          result.push(t);
        }
        return;
      }

      // Handle weekly recurring transactions
      if (t.recurrence === 'weekly' && t.weekDay !== null) {
        let currentDate = startOfDay(transactionDate);
        
        while (!isAfter(currentDate, end)) {
          if ((isSameDay(currentDate, start) || isAfter(currentDate, start)) && 
              (isBefore(currentDate, end) || isSameDay(currentDate, end)) && 
              getDay(currentDate) === t.weekDay) {
            result.push({
              ...t,
              date: normalizeDate(currentDate)
            });
          }
          currentDate = addDays(currentDate, 1);
        }
      }
      
      // Handle monthly recurring transactions
      else if (t.recurrence === 'monthly' && t.recurrenceDay !== null) {
        let currentDate = startOfDay(transactionDate);
        
        while (!isAfter(currentDate, end)) {
          if (getDate(currentDate) === t.recurrenceDay && 
              (isSameDay(currentDate, start) || isAfter(currentDate, start)) && 
              (isBefore(currentDate, end) || isSameDay(currentDate, end))) {
            result.push({
              ...t,
              date: normalizeDate(currentDate)
            });
          }
          currentDate = addDays(currentDate, 1);
        }
      }
    });

    return result.sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  },
  
  getTransactionsByMonth: (year: number, month: number) => {
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(startDate);
    return get().getTransactionsByDateRange(startDate, endDate);
  },

  getRecurringTransactions: () => {
    const { transactions } = get();
    return transactions.filter(t => t.recurrence !== 'none');
  },
  
  getSummary: (startDate: Date, endDate: Date) => {
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