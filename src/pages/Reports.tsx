import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTransactionStore } from '../store/transactionStore';
import { 
  format, 
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachMonthOfInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { formatCurrency } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';
import { parseDateAsUTC } from '../utils/date';

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

const Reports = () => {
  const { user } = useAuthStore();
  const { 
    transactions,
    getSummary,
    getTransactionsByDateRange
  } = useTransactionStore();
  
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '1y'>('3m');
  const [activeChart, setActiveChart] = useState<'income-expense' | 'income-categories' | 'expense-categories' | 'balance-trend'>('income-expense');

  const getDateRange = () => {
    const endDate = endOfMonth(new Date());
    const startDate = {
      '1m': startOfMonth(new Date()),
      '3m': startOfMonth(subMonths(new Date(), 2)),
      '6m': startOfMonth(subMonths(new Date(), 5)),
      '1y': startOfYear(new Date()),
    }[period];
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();
  const periodTransactions = getTransactionsByDateRange(startDate, endDate);
  const summary = getSummary(startDate, endDate);
  const userCurrency = (user?.currency || 'BRL') as CurrencyCode;

  const months = eachMonthOfInterval({ start: startDate, end: endDate });
  const labels = months.map((month) => format(month, 'MMM yyyy', { locale: ptBR }));
  const incomeData = months.map((month) => getSummary(startOfMonth(month), endOfMonth(month)).totalIncome);
  const expenseData = months.map((month) => getSummary(startOfMonth(month), endOfMonth(month)).totalExpense);
  const balanceData = months.map((month) => getSummary(startOfMonth(month), endOfMonth(month)).balance);

  const chartData = {
    'income-expense': {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Receitas', data: incomeData, backgroundColor: '#4CC38A' },
          { label: 'Despesas', data: expenseData, backgroundColor: '#FF5A5F' },
        ],
      },
    },
    'income-categories': {
      type: 'pie',
      data: {
        labels: Object.keys(summary.byCategoryIncome),
        datasets: [
          {
            data: Object.values(summary.byCategoryIncome),
            backgroundColor: ['#4CC38A', '#6FCF97', '#27AE60', '#A7F3D0', '#34D399', '#065F46'],
            borderWidth: 1,
          },
        ],
      },
    },
    'expense-categories': {
      type: 'pie',
      data: {
        labels: Object.keys(summary.byCategoryExpense),
        datasets: [
          {
            data: Object.values(summary.byCategoryExpense),
            backgroundColor: ['#FF5A5F', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#FCA5A5', '#FECACA', '#FEE2E2', '#7F1D1D'],
            borderWidth: 1,
          },
        ],
      },
    },
    'balance-trend': {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Saldo',
            data: balanceData,
            borderColor: '#3A86FF',
            backgroundColor: 'rgba(58, 134, 255, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
    },
  };

  const chartOptions = {
    bar: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } },
    },
    pie: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
    },
    line: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: false } },
    },
  };

  const renderChart = () => {
    const { type, data } = chartData[activeChart];
    if (type === 'bar') return <Bar data={data} options={chartOptions.bar} />;
    if (type === 'pie') {
      const hasData = data.datasets[0].data.length > 0;
      return hasData ? (
        <Pie data={data} options={chartOptions.pie} />
      ) : (
        <div className="h-full flex items-center justify-center text-gray-500">
          Nenhum dado disponível neste período
        </div>
      );
    }
    if (type === 'line') return <Line data={data} options={chartOptions.line} />;
    return null;
  };

  return (
    <div className="py-6 fadeIn">
      <div className="mt-8 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Resumo de Transações</h3>
          <p className="text-sm text-gray-600">
            {format(startDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })} -{' '}
            {format(endDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {periodTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'].map((head) => (
                    <th key={head} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {periodTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">{format(parseDateAsUTC(t.date), 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {t.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium text-right ${
                      t.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, userCurrency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma transação encontrada neste período</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
