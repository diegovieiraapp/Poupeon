import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTransactionStore } from '../store/transactionStore';
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  format,
  parseISO,
  startOfYear,
  endOfYear,
  eachMonthOfInterval
} from 'date-fns';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement,
  LineElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement,
  LineElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement
);

type ReportPeriod = '1m' | '3m' | '6m' | '1y';
type ChartType = 'income-expense' | 'income-categories' | 'expense-categories' | 'balance-trend';

const Reports = () => {
  const { user } = useAuthStore();
  const { 
    transactions,
    getSummary,
    getTransactionsByDateRange,
    getTransactionsByMonth
  } = useTransactionStore();
  
  const [period, setPeriod] = useState<ReportPeriod>('3m');
  const [activeChart, setActiveChart] = useState<ChartType>('income-expense');
  
  // Get date range based on selected period
  const getDateRange = () => {
    const endDate = endOfMonth(new Date());
    let startDate;
    
    switch (period) {
      case '1m':
        startDate = startOfMonth(new Date());
        break;
      case '3m':
        startDate = startOfMonth(subMonths(new Date(), 2));
        break;
      case '6m':
        startDate = startOfMonth(subMonths(new Date(), 5));
        break;
      case '1y':
        startDate = startOfYear(new Date());
        break;
      default:
        startDate = startOfMonth(subMonths(new Date(), 2));
    }
    
    return { startDate, endDate };
  };
  
  // Filter transactions for current user
  const userTransactions = transactions.filter(t => t.userId === user?.id);
  
  const { startDate, endDate } = getDateRange();
  const periodTransactions = getTransactionsByDateRange(startDate, endDate);
  const summary = getSummary(startDate, endDate);
  
  // Prepare monthly data
  const getMonthlyData = () => {
    const months = eachMonthOfInterval({ 
      start: startDate, 
      end: endDate 
    });
    
    const labels = months.map(month => format(month, 'MMM yyyy'));
    const incomeData = [];
    const expenseData = [];
    const balanceData = [];
    
    for (const month of months) {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthSummary = getSummary(monthStart, monthEnd);
      
      incomeData.push(monthSummary.totalIncome);
      expenseData.push(monthSummary.totalExpense);
      balanceData.push(monthSummary.balance);
    }
    
    return { labels, incomeData, expenseData, balanceData };
  };
  
  const { labels, incomeData, expenseData, balanceData } = getMonthlyData();
  
  // Prepare pie chart data for income categories
  const incomeCategoriesData = {
    labels: Object.keys(summary.byCategoryIncome),
    datasets: [
      {
        data: Object.values(summary.byCategoryIncome),
        backgroundColor: [
          '#4CC38A', // Primary green
          '#6FCF97', // Light green
          '#27AE60', // Dark green
          '#A7F3D0', // Pale green
          '#34D399', // Medium green
          '#065F46', // Very dark green
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare pie chart data for expense categories
  const expenseCategoriesData = {
    labels: Object.keys(summary.byCategoryExpense),
    datasets: [
      {
        data: Object.values(summary.byCategoryExpense),
        backgroundColor: [
          '#FF5A5F', // Primary red
          '#F87171', // Light red
          '#EF4444', // Medium red
          '#DC2626', // Dark red
          '#B91C1C', // Very dark red
          '#FCA5A5', // Pale red
          '#FECACA', // Very pale red
          '#FEE2E2', // Almost white red
          '#7F1D1D', // Extremely dark red
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare bar chart data for income vs expenses
  const incomeExpenseData = {
    labels,
    datasets: [
      {
        label: 'Income',
        data: incomeData,
        backgroundColor: '#4CC38A',
      },
      {
        label: 'Expenses',
        data: expenseData,
        backgroundColor: '#FF5A5F',
      },
    ],
  };
  
  // Prepare line chart data for balance trend
  const balanceTrendData = {
    labels,
    datasets: [
      {
        label: 'Balance',
        data: balanceData,
        borderColor: '#3A86FF',
        backgroundColor: 'rgba(58, 134, 255, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };
  
  // Chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
  
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };
  
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };
  
  return (
    <div className="py-6 fadeIn">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Analyze your financial data</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <div className="flex items-center bg-white rounded-md border border-gray-300 p-1">
            <Filter className="h-4 w-4 text-gray-500 mx-2" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              className="text-sm bg-transparent border-none focus:outline-none focus:ring-0"
            >
              <option value="1m">This Month</option>
              <option value="3m">Last 3 Months</option>
              <option value="6m">Last 6 Months</option>
              <option value="1y">This Year</option>
            </select>
          </div>
          
          <button
            onClick={() => {
              // In a real app, this would generate and download a PDF or CSV
              alert('Report download functionality would be implemented here');
            }}
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Download className="mr-1 h-4 w-4" />
            Export
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Income */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                ${typeof summary.totalIncome === 'number' ? summary.totalIncome.toFixed(2) : '0.00'}
              </h3>
            </div>
            <div className="p-2 bg-green-100 rounded-md">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        
        {/* Total Expenses */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                ${typeof summary.totalExpense === 'number' ? summary.totalExpense.toFixed(2) : '0.00'}
              </h3>
            </div>
            <div className="p-2 bg-red-100 rounded-md">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>
        
        {/* Balance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Balance</p>
              <h3 className={`text-2xl font-bold mt-1 ${
                (summary.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${typeof summary.balance === 'number' ? summary.balance.toFixed(2) : '0.00'}
              </h3>
            </div>
            <div className={`p-2 rounded-md ${(summary.balance || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {(summary.balance || 0) >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Chart Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveChart('income-expense')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeChart === 'income-expense' 
                ? 'text-primary-600 border-b-2 border-primary-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Income vs Expenses
          </button>
          <button
            onClick={() => setActiveChart('income-categories')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeChart === 'income-categories' 
                ? 'text-green-600 border-b-2 border-green-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Income Categories
          </button>
          <button
            onClick={() => setActiveChart('expense-categories')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeChart === 'expense-categories' 
                ? 'text-red-600 border-b-2 border-red-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Expense Categories
          </button>
          <button
            onClick={() => setActiveChart('balance-trend')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeChart === 'balance-trend' 
                ? 'text-blue-600 border-b-2 border-blue-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Balance Trend
          </button>
        </div>
      </div>
      
      {/* Chart Area */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="h-80">
          {activeChart === 'income-expense' && (
            <Bar data={incomeExpenseData} options={barOptions} />
          )}
          
          {activeChart === 'income-categories' && (
            Object.keys(summary.byCategoryIncome).length > 0 ? (
              <Pie data={incomeCategoriesData} options={pieOptions} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">No income data available for this period</p>
              </div>
            )
          )}
          
          {activeChart === 'expense-categories' && (
            Object.keys(summary.byCategoryExpense).length > 0 ? (
              <Pie data={expenseCategoriesData} options={pieOptions} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">No expense data available for this period</p>
              </div>
            )
          )}
          
          {activeChart === 'balance-trend' && (
            <Line data={balanceTrendData} options={lineOptions} />
          )}
        </div>
      </div>
      
      {/* Data Table */}
      <div className="mt-8 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Transaction Summary
          </h3>
          <p className="text-sm text-gray-600">
            {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
          </p>
        </div>
        
        {periodTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {periodTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}${typeof transaction.amount === 'number' ? transaction.amount.toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions found for this period</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;