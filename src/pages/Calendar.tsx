import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTransactionStore } from '../store/transactionStore';
import { 
  format, 
  addMonths, 
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isSaturday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Repeat, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const Calendar = () => {
  const { user } = useAuthStore();
  const { 
    transactions,
    getSummary,
    getTransactionsByDateRange,
    getTransactionsByMonth,
    toggleTransactionStatus
  } = useTransactionStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Get calendar boundaries
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  // Get all days to display
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get transactions for the entire calendar view
  const calendarTransactions = getTransactionsByDateRange(calendarStart, calendarEnd);

  // Navigation handlers
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Get transactions for a specific day
  const getTransactionsForDay = (day: Date) => {
    return calendarTransactions.filter(t => {
      const transactionDate = parseISO(t.date);
      return isSameDay(transactionDate, day);
    });
  };

  // Calculate day summary
  const getDaySummary = (day: Date) => {
    const dayTransactions = getTransactionsForDay(day);
    let income = 0;
    let expense = 0;
    let paidIncome = 0;
    let paidExpense = 0;

    dayTransactions.forEach(t => {
      const amount = Number(t.amount) || 0;
      if (t.type === 'income') {
        income += amount;
        if (t.status === 'paid') paidIncome += amount;
      } else {
        expense += amount;
        if (t.status === 'paid') paidExpense += amount;
      }
    });

    return { 
      income, 
      expense, 
      paidIncome,
      paidExpense,
      balance: income - expense 
    };
  };

  // Get selected day transactions and summary
  const selectedDayTransactions = selectedDate ? getTransactionsForDay(selectedDate) : [];
  const selectedDaySummary = selectedDate ? getDaySummary(selectedDate) : { 
    income: 0, 
    expense: 0, 
    paidIncome: 0,
    paidExpense: 0,
    balance: 0 
  };

  // Week days header
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="py-6 fadeIn">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendário</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Hoje
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center py-2 text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const dayTransactions = getTransactionsForDay(day);
              const daySummary = getDaySummary(day);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSaturdayHighlight = isSaturday(day);

              return (
                <div
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    min-h-24 border rounded-md p-1 cursor-pointer transition-all
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isCurrentDay ? 'border-primary-500' : 'border-gray-200'}
                    ${isSelected ? 'bg-primary-50 border-primary-500' : 'hover:bg-gray-50'}
                    ${isSaturdayHighlight && isCurrentMonth ? 'bg-blue-50' : ''}
                  `}
                >
                  <div className="text-right mb-1">
                    <span className={`
                      inline-block w-6 h-6 rounded-full text-xs
                      ${isCurrentDay ? 'bg-primary-500 text-white font-bold flex items-center justify-center' : ''}
                      ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
                      ${isSaturdayHighlight && isCurrentMonth && !isCurrentDay ? 'text-blue-700 font-semibold' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {dayTransactions.length > 0 && (
                    <div className="space-y-1 text-xs">
                      {daySummary.income > 0 && (
                        <div className={`font-medium truncate flex items-center ${
                          daySummary.paidIncome === daySummary.income 
                            ? 'text-blue-600' 
                            : daySummary.paidIncome > 0 
                              ? 'text-indigo-600'
                              : 'text-green-600'
                        }`}>
                          {daySummary.paidIncome === daySummary.income && (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          {formatCurrency(daySummary.income, user?.currency)}
                        </div>
                      )}
                      {daySummary.expense > 0 && (
                        <div className={`font-medium truncate flex items-center ${
                          daySummary.paidExpense === daySummary.expense 
                            ? 'text-blue-600' 
                            : daySummary.paidExpense > 0 
                              ? 'text-indigo-600'
                              : 'text-red-600'
                        }`}>
                          {daySummary.paidExpense === daySummary.expense && (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          {formatCurrency(daySummary.expense, user?.currency)}
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
                {format(selectedDate, "d 'de' MMMM',' yyyy", { locale: ptBR })}
                {isToday(selectedDate) && (
                  <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-md">
                    Hoje
                  </span>
                )}
                {isSaturday(selectedDate) && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                    Sábado
                  </span>
                )}
              </h3>

              {/* Day Summary */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs text-green-700 mb-1">Receitas</p>
                  <p className="text-lg font-semibold text-green-800">
                    {formatCurrency(selectedDaySummary.income, user?.currency)}
                  </p>
                </div>

                <div className="bg-red-50 p-3 rounded-md">
                  <p className="text-xs text-red-700 mb-1">Despesas</p>
                  <p className="text-lg font-semibold text-red-800">
                    {formatCurrency(selectedDaySummary.expense, user?.currency)}
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-xs text-blue-700 mb-1">Saldo</p>
                  <p className="text-lg font-semibold text-blue-800">
                    {formatCurrency(selectedDaySummary.balance, user?.currency)}
                  </p>
                </div>
              </div>

              {/* Day Transactions */}
              <h4 className="text-sm font-medium text-gray-700 mb-2">Transações</h4>

              {selectedDayTransactions.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.description}
                            </p>
                            {transaction.status === 'paid' && (
                              <CheckCircle className="h-4 w-4 text-blue-500 ml-2" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {transaction.category}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTransactionStatus(transaction.id);
                            }}
                            className={`p-1 rounded-full transition-colors ${
                              transaction.status === 'paid'
                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={transaction.status === 'paid' ? 'Marcar como pendente' : 'Marcar como pago'}
                          >
                            {transaction.status === 'paid' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </button>
                          <p className={`text-sm font-medium ${
                            transaction.type === 'income' 
                              ? transaction.status === 'paid' ? 'text-blue-600' : 'text-green-600'
                              : transaction.status === 'paid' ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(transaction.amount, user?.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-gray-200 rounded-md">
                  <p className="text-gray-500 text-sm">Nenhuma transação para este dia</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">Selecione um dia para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;