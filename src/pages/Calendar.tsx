import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTransactionStore } from '../store/transactionStore';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const Calendar = () => {
  const { user } = useAuthStore();
  const { transactions } = useTransactionStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  // Filter transactions for current user
  const userTransactions = transactions.filter(t => t.userId === user?.id);
  
  // Get month boundaries
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Next and previous month handlers
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  // Get transactions for a specific day
  const getTransactionsForDay = (day: Date) => {
    return userTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return isSameDay(transactionDate, day);
    });
  };
  
  // Calculate total income and expenses for a day
  const getDaySummary = (day: Date) => {
    const dayTransactions = getTransactionsForDay(day);
    
    let income = 0;
    let expense = 0;
    
    dayTransactions.forEach(t => {
      const amount = Number(t.amount) || 0;
      if (t.type === 'income') {
        income += amount;
      } else {
        expense += amount;
      }
    });
    
    return { income, expense, balance: income - expense };
  };
  
  // Check if a day has transactions
  const hasTransactions = (day: Date) => {
    return getTransactionsForDay(day).length > 0;
  };
  
  // Get selected day transactions
  const selectedDayTransactions = selectedDate 
    ? getTransactionsForDay(selectedDate) 
    : [];
  
  // Get selected day summary
  const selectedDaySummary = selectedDate 
    ? getDaySummary(selectedDate) 
    : { income: 0, expense: 0, balance: 0 };
  
  return (
    <div className="py-6 fadeIn">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center py-2 text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const dayHasTransactions = hasTransactions(day);
              const daySummary = getDaySummary(day);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              
              return (
                <div 
                  key={day.toString()} 
                  onClick={() => setSelectedDate(day)}
                  className={`
                    min-h-24 border rounded-md p-1 cursor-pointer transition-all
                    ${isCurrentDay ? 'border-primary-500' : 'border-gray-200'}
                    ${isSelected ? 'bg-primary-50 border-primary-500' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="text-right mb-1">
                    <span className={`inline-block w-6 h-6 rounded-full text-xs ${
                      isCurrentDay 
                        ? 'bg-primary-500 text-white font-bold flex items-center justify-center' 
                        : 'text-gray-700'
                    }`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  {dayHasTransactions && (
                    <div className="space-y-1 text-xs">
                      {daySummary.income > 0 && (
                        <div className="text-green-600 font-medium truncate">
                          +${(daySummary.income || 0).toFixed(2)}
                        </div>
                      )}
                      {daySummary.expense > 0 && (
                        <div className="text-red-600 font-medium truncate">
                          -${(daySummary.expense || 0).toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Day Detail */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {selectedDate ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {format(selectedDate, 'MMMM d, yyyy')}
                {isToday(selectedDate) && (
                  <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-md">
                    Today
                  </span>
                )}
              </h3>
              
              {/* Day Summary */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs text-green-700 mb-1">Income</p>
                  <p className="text-lg font-semibold text-green-800">
                    ${(selectedDaySummary.income || 0).toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-red-50 p-3 rounded-md">
                  <p className="text-xs text-red-700 mb-1">Expense</p>
                  <p className="text-lg font-semibold text-red-800">
                    ${(selectedDaySummary.expense || 0).toFixed(2)}
                  </p>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-xs text-blue-700 mb-1">Balance</p>
                  <p className="text-lg font-semibold text-blue-800">
                    ${(selectedDaySummary.balance || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Day Transactions */}
              <h4 className="text-sm font-medium text-gray-700 mb-2">Transactions</h4>
              
              {selectedDayTransactions.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayTransactions.map((transaction) => (
                    <div 
                      key={transaction.id}
                      className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.category}
                          </p>
                        </div>
                        <p className={`text-sm font-medium ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}${(Number(transaction.amount) || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-gray-200 rounded-md">
                  <p className="text-gray-500 text-sm mb-3">No transactions for this day</p>
                  <a
                    href="/transactions"
                    className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add a transaction
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">Select a day to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;