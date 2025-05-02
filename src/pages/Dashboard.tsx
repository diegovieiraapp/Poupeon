import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTransactionStore } from '../store/transactionStore';
import { subMonths, startOfMonth, endOfMonth, format, startOfDay, endOfDay, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { PlusCircle, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign, ShieldCheck, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';
import AdSense from '../components/AdSense';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    transactions,
    getSummary,
    getCumulativeSummary,
    getTransactionsByDateRange,
    fetchTransactions
  } = useTransactionStore();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [periodLabel, setPeriodLabel] = useState('');
  
  useEffect(() => {
    if (user) {
      fetchTransactions(user.id);
    }
  }, [user]);

  const handlePreviousMonth = () => {
    setSelectedMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prevMonth => addMonths(prevMonth, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date());
  };
  
  const currentMonthStart = startOfMonth(selectedMonth);
  const currentMonthEnd = endOfMonth(selectedMonth);
  
  const prevMonthStart = startOfMonth(subMonths(selectedMonth, 1));
  const prevMonthEnd = endOfMonth(subMonths(selectedMonth, 1));
  
  // Get monthly summary
  const monthSummary = getSummary(currentMonthStart, currentMonthEnd);
  const prevMonthSummary = getSummary(prevMonthStart, prevMonthEnd);
  
  // Get cumulative summary up to current month
  const cumulativeSummary = getCumulativeSummary(currentMonthEnd);
  
  const incomeChange = prevMonthSummary.totalIncome !== 0
    ? ((monthSummary.totalIncome - prevMonthSummary.totalIncome) / prevMonthSummary.totalIncome) * 100
    : 0;
    
  const expenseChange = prevMonthSummary.totalExpense !== 0
    ? ((monthSummary.totalExpense - prevMonthSummary.totalExpense) / prevMonthSummary.totalExpense) * 100
    : 0;
    
  const balanceChange = prevMonthSummary.balance !== 0
    ? ((monthSummary.balance - prevMonthSummary.balance) / Math.abs(prevMonthSummary.balance)) * 100
    : 0;
  
  const today = endOfDay(new Date());
  const recentTransactions = getTransactionsByDateRange(startOfMonth(subMonths(today, 1)), today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  const expenseCategoriesData = {
    labels: Object.keys(monthSummary.byCategoryExpense),
    datasets: [
      {
        data: Object.values(monthSummary.byCategoryExpense),
        backgroundColor: [
          '#FF5A5F',
          '#FF9E80',
          '#FFCC80',
          '#FFD54F',
          '#FFF176',
          '#AED581',
          '#81C784',
          '#4DB6AC',
          '#4DD0E1',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const last6MonthsData = () => {
    const labels = [];
    const incomeData = [];
    const expenseData = [];
    
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(selectedMonth, i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthLabel = format(month, 'MMM', { locale: ptBR });
      
      labels.push(monthLabel);
      
      const monthSummary = getSummary(monthStart, monthEnd);
      incomeData.push(monthSummary.totalIncome);
      expenseData.push(monthSummary.totalExpense);
    }
    
    return {
      labels,
      datasets: [
        {
          label: 'Receitas',
          data: incomeData,
          borderColor: '#4CC38A',
          backgroundColor: 'rgba(76, 195, 138, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Despesas',
          data: expenseData,
          borderColor: '#FF5A5F',
          backgroundColor: 'rgba(255, 90, 95, 0.1)',
          tension: 0.4,
        },
      ],
    };
  };
  
  useEffect(() => {
    setPeriodLabel(format(selectedMonth, 'MMMM yyyy', { locale: ptBR }));
  }, [selectedMonth]);

  const userCurrency = (user?.currency || 'BRL') as CurrencyCode;

  const emergencyFundTotal = user?.emergencyFund || 0;
  const cumulativeIncome = cumulativeSummary.totalIncome;
  const cumulativeExpenses = cumulativeSummary.totalExpense;
  const cumulativeBalance = cumulativeIncome - cumulativeExpenses;
  const emergencyFundUsed = cumulativeSummary.emergencyFundUsed;
  const emergencyFundRemaining = Math.max(0, emergencyFundTotal - emergencyFundUsed);

  const emergencyFundUsedPercentage = emergencyFundTotal > 0
    ? (emergencyFundUsed / emergencyFundTotal) * 100
    : 0;

  return (
    <div className="py-6 fadeIn">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel</h1>
            <p className="text-gray-600">Bem-vindo de volta, {user?.name}!</p>
          </div>
          
          <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
              title="Mês anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleCurrentMonth}
              className="px-3 py-1 hover:bg-gray-100 rounded-md flex items-center"
            >
              <Calendar className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
              title="Próximo mês"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <AdSense
          client="ca-pub-8030661382354180"
          slot="1234567890"
          format="auto"
          responsive={true}
          style={{ display: 'block', marginBottom: '2rem' }}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(cumulativeIncome || 0, userCurrency)}
              </h3>
            </div>
            <div className="p-2 bg-green-100 rounded-md">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {incomeChange > 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
            )}
            <span className={`text-sm ${incomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(incomeChange).toFixed(1)}% {incomeChange >= 0 ? 'aumento' : 'redução'}
            </span>
            <span className="text-xs text-gray-500 ml-1">este mês</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-600">Despesa Total</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(cumulativeExpenses || 0, userCurrency)}
              </h3>
            </div>
            <div className="p-2 bg-red-100 rounded-md">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {expenseChange < 0 ? (
              <ArrowDownRight className="h-4 w-4 text-green-600 mr-1" />
            ) : (
              <ArrowUpRight className="h-4 w-4 text-red-600 mr-1" />
            )}
            <span className={`text-sm ${expenseChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(expenseChange).toFixed(1)}% {expenseChange < 0 ? 'redução' : 'aumento'}
            </span>
            <span className="text-xs text-gray-500 ml-1">este mês</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo Atual</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(cumulativeBalance || 0, userCurrency)}
              </h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-md">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {balanceChange > 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
            )}
            <span className={`text-sm ${balanceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(balanceChange).toFixed(1)}% {balanceChange >= 0 ? 'aumento' : 'redução'}
            </span>
            <span className="text-xs text-gray-500 ml-1">este mês</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-600">Reserva de Emergência</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(emergencyFundRemaining, userCurrency)}
              </h3>
            </div>
            <div className="p-2 bg-yellow-100 rounded-md">
              <ShieldCheck className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">Utilizado</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(emergencyFundUsed, userCurrency)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  emergencyFundUsedPercentage >= 75 
                    ? 'bg-red-500' 
                    : emergencyFundUsedPercentage >= 50 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${emergencyFundUsedPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {emergencyFundUsedPercentage.toFixed(1)}% utilizado do total de {formatCurrency(emergencyFundTotal, userCurrency)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <AdSense
          client="ca-pub-8030661382354180"
          slot="0987654321"
          format="auto"
          responsive={true}
          style={{ display: 'block', marginTop: '2rem' }}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Receitas vs Despesas <span className="text-sm font-normal text-gray-500">Últimos 6 Meses</span>
          </h3>
          <div className="h-64">
            <Line 
              data={last6MonthsData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    align: 'end',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      borderDash: [2],
                      color: 'rgba(0, 0, 0, 0.05)',
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
        
        <div className="md:col-span-4 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Despesas por Categoria <span className="text-sm font-normal text-gray-500">{periodLabel}</span>
          </h3>
          <div className="h-64 flex justify-center items-center">
            {Object.keys(monthSummary.byCategoryExpense).length > 0 ? (
              <Doughnut 
                data={expenseCategoriesData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        boxWidth: 12,
                        padding: 15,
                      },
                    },
                  },
                  cutout: '60%',
                }}
              />
            ) : (
              <p className="text-gray-500 text-center">Nenhuma despesa registrada neste período</p>
            )}
          </div>
        </div>
        
        <div className="md:col-span-12 bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transações Recentes</h3>
            <button 
              onClick={() => navigate('/transactions')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Ver todas
            </button>
          </div>
          
          {recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(transaction.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.category}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount || 0, userCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Nenhuma transação registrada</p>
              <button
                onClick={() => navigate('/transactions')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Transação
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;