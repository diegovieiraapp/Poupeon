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
  isEqual, 
  startOfDay, 
  endOfDay, 
  isBefore, 
  isAfter, 
  eachWeekOfInterval, 
  eachMonthOfInterval, 
  isSameDay, 
  getDay, 
  getDate, 
  parseISO, 
  setHours,
  addDays,
  addMonths,
  setDate,
  startOfWeek
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

const normalizeDate = (dateString: string): string => {
  // Ajusta a data para meio-dia no fuso horário local para evitar problemas com UTC
  const date = new Date(dateString);
  date.setHours(12, 0, 0, 0);
  return format(date, 'yyyy-MM-dd');
};

const createRecurrentDate = (baseDate: Date, recurrenceDay: number): Date => {
  const date = new Date(baseDate);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const actualDay = Math.min(recurrenceDay, lastDayOfMonth);
  date.setDate(actualDay);
  date.setHours(12, 0, 0, 0);
  return date;
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
            const date = new Date(data.date);
            date.setHours(12, 0, 0, 0);
            
            return {
              id: doc.id,
              ...data,
              amount: Number(data.amount) || 0,
              recurrence: data.recurrence || 'none',
              date: format(date, 'yyyy-MM-dd'),
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
      
      const date = new Date(transaction.date);
      date.setHours(12, 0, 0, 0);
      
      const transactionData = {
        ...transaction,
        amount: Number(transaction.amount),
        date: format(date, 'yyyy-MM-dd'),
        createdAt: Timestamp.now(),
        recurrenceDay: transaction.recurrence === 'monthly' ? date.getDate() : null,
        weekDay: transaction.recurrence === 'weekly' ? date.getDay() : null
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
        const date = new Date(updatedFields.date);
        date.setHours(12, 0, 0, 0);
        updates.date = format(date, 'yyyy-MM-dd');
        
        if (updatedFields.recurrence === 'weekly') {
          updates.weekDay = date.getDay();
          updates.recurrenceDay = null;
        } else if (updatedFields.recurrence === 'monthly') {
          updates.recurrenceDay = date.getDate();
          updates.weekDay = null;
        }
      }

      if (updatedFields.recurrence === 'none') {
        updates.weekDay = null;
        updates.recurrenceDay = null;
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

    transactions.forEach((t) => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(12, 0, 0, 0);

      // Para transações não recorrentes
      if (t.recurrence === 'none') {
        if (isSameDay(transactionDate, start) || isSameDay(transactionDate, end) || 
            (isAfter(transactionDate, start) && isBefore(transactionDate, end))) {
          result.push(t);
        }
        return;
      }

      // Data inicial da recorrência
      const transactionStart = transactionDate;
      
      // Para transações semanais
      if (t.recurrence === 'weekly' && t.weekDay !== null) {
        const weeks = eachWeekOfInterval({ start, end });
        weeks.forEach(week => {
          const weekStart = startOfWeek(week);
          const recurrentDate = addDays(weekStart, t.weekDay);
          recurrentDate.setHours(12, 0, 0, 0);

          if (!isBefore(recurrentDate, transactionStart) && 
              (isSameDay(recurrentDate, start) || isSameDay(recurrentDate, end) || 
              (isAfter(recurrentDate, start) && isBefore(recurrentDate, end)))) {
            result.push({
              ...t,
              date: format(recurrentDate, 'yyyy-MM-dd')
            });
          }
        });
      }
      // Para transações mensais
      else if (t.recurrence === 'monthly' && t.recurrenceDay !== null) {
        const months = eachMonthOfInterval({ start, end });
        months.forEach(month => {
          const recurrentDate = createRecurrentDate(month, t.recurrenceDay!);

          if (!isBefore(recurrentDate, transactionStart) && 
              (isSameDay(recurrentDate, start) || isSameDay(recurrentDate, end) || 
              (isAfter(recurrentDate, start) && isBefore(recurrentDate, end)))) {
            result.push({
              ...t,
              date: format(recurrentDate, 'yyyy-MM-dd')
            });
          }
        });
      }
    });

    return result.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      dateA.setHours(12, 0, 0, 0);
      dateB.setHours(12, 0, 0, 0);
      return dateB.getTime() - dateA.getTime();
    });
  },
  
  getTransactionsByMonth: (year, month) => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    startDate.setHours(12, 0, 0, 0);
    endDate.setHours(12, 0, 0, 0);
    return get().getTransactionsByDateRange(startDate, endDate);
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