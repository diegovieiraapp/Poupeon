import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTransactionStore, Transaction, TransactionType, PaymentStatus, RecurrenceType } from '../store/transactionStore';
import { format, parseISO, addYears, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { 
  PlusCircle, 
  Filter, 
  Trash2, 
  Edit, 
  Save, 
  X,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Repeat,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';

type SortField = 'date' | 'description' | 'category' | 'amount';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface TransactionFormData {
  amount: number;
  description: string;
  category: string;
  date: string;
  type: TransactionType;
  status: PaymentStatus;
  recurrence: {
    type: RecurrenceType;
    dayOfMonth?: number;
    dayOfWeek?: number;
    endDate?: string;
  };
}

const weekDays = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

const Transactions = () => {
  const { user } = useAuthStore();
  const { 
    transactions,
    categories,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    toggleTransactionStatus,
    addCategory
  } = useTransactionStore();
  
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    type?: TransactionType;
    search?: string;
    status?: PaymentStatus;
    startDate: Date;
    endDate: Date;
  }>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date())
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', direction: 'desc' });
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors },
    setValue,
    watch
  } = useForm<TransactionFormData>({
    defaultValues: {
      amount: 0,
      description: '',
      category: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'expense',
      status: 'pending',
      recurrence: {
        type: 'none'
      }
    }
  });
  
  const selectedType = watch('type');
  const recurrenceType = watch('recurrence.type');
  
  // Filter transactions for current user
  const userTransactions = transactions.filter(t => t.userId === user?.id);
  
  // Apply filters including date range
  const filteredTransactions = userTransactions.filter(transaction => {
    const transactionDate = parseISO(transaction.date);
    const isInDateRange = isWithinInterval(transactionDate, {
      start: filter.startDate,
      end: filter.endDate
    });

    if (!isInDateRange) return false;
    
    if (filter.type && transaction.type !== filter.type) {
      return false;
    }
    
    if (filter.status && transaction.status !== filter.status) {
      return false;
    }
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.category.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
  
  // Apply sorting
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortConfig.field) {
      case 'date':
        comparison = parseISO(b.date).getTime() - parseISO(a.date).getTime();
        break;
      case 'description':
        comparison = a.description.localeCompare(b.description);
        break;
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
      case 'amount':
        comparison = Number(a.amount) - Number(b.amount);
        break;
    }
    
    return sortConfig.direction === 'asc' ? -comparison : comparison;
  });
  
  const handleSort = (field: SortField) => {
    setSortConfig(prevConfig => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const onSubmitTransaction = (data: TransactionFormData) => {
    if (!user) return;
    
    const transactionData = {
      ...data,
      amount: Number(data.amount),
      recurrence: {
        ...data.recurrence,
        dayOfMonth: data.recurrence.type === 'monthly' 
          ? new Date(data.date).getDate()
          : undefined,
        endDate: data.recurrence.type !== 'none'
          ? data.recurrence.endDate || format(addYears(new Date(data.date), 1), 'yyyy-MM-dd')
          : undefined
      }
    };
    
    if (editingTransactionId) {
      updateTransaction(editingTransactionId, transactionData);
      setEditingTransactionId(null);
    } else {
      addTransaction({
        userId: user.id,
        ...transactionData
      });
    }
    
    setIsAddingTransaction(false);
    reset();
  };
  
  const handleEdit = (transaction: Transaction) => {
    setValue('amount', Number(transaction.amount));
    setValue('description', transaction.description);
    setValue('category', transaction.category);
    setValue('date', transaction.date);
    setValue('type', transaction.type);
    setValue('status', transaction.status || 'pending');
    setValue('recurrence', transaction.recurrence || { type: 'none' });
    
    setEditingTransactionId(transaction.id);
    setIsAddingTransaction(true);
  };
  
  const handleCancel = () => {
    setIsAddingTransaction(false);
    setEditingTransactionId(null);
    reset();
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.')) {
      await deleteTransaction(id);
      setShowDeleteConfirm(null);
    }
  };
  
  const handleAddCategory = () => {
    if (newCategory.trim() && !categories[selectedType].includes(newCategory)) {
      addCategory(selectedType, newCategory);
      setNewCategory('');
      setShowCategoryInput(false);
    }
  };
  
  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return null;
    
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="inline-block h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="inline-block h-4 w-4 ml-1" />
    );
  };

  const userCurrency = (user?.currency || 'BRL') as CurrencyCode;
  
  const formatAmount = (amount: number | string): string => {
    const numAmount = Number(amount);
    return formatCurrency(numAmount, userCurrency);
  };

  const currentMonthLabel = format(filter.startDate, "MMMM 'de' yyyy", { locale: ptBR });

  const handlePreviousMonth = () => {
    setFilter(prev => ({
      ...prev,
      startDate: startOfMonth(subMonths(prev.startDate, 1)),
      endDate: endOfMonth(subMonths(prev.startDate, 1))
    }));
  };

  const handleNextMonth = () => {
    setFilter(prev => ({
      ...prev,
      startDate: startOfMonth(addMonths(prev.startDate, 1)),
      endDate: endOfMonth(addMonths(prev.startDate, 1))
    }));
  };

  const handleCurrentMonth = () => {
    setFilter(prev => ({
      ...prev,
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date())
    }));
  };
  
  return (
    <div className="py-6 fadeIn">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-600">Gerencie suas receitas e despesas</p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => setIsAddingTransaction(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Transação
          </button>
        </div>
      </div>
      
      {/* Add/Edit Transaction Form */}
      {isAddingTransaction && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 slideIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingTransactionId ? 'Editar Transação' : 'Nova Transação'}
            </h3>
            <button 
              onClick={() => {
                if (window.confirm('Tem certeza que deseja cancelar? As alterações não salvas serão perdidas.')) {
                  handleCancel();
                }
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit(onSubmitTransaction)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Valor
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="amount"
                  className={`w-full px-3 py-2 border ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...register('amount', { 
                    required: 'Valor é obrigatório',
                    min: { value: 0.01, message: 'Valor deve ser maior que 0' },
                    setValueAs: v => Number(v)
                  })}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  id="date"
                  className={`w-full px-3 py-2 border ${
                    errors.date ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...register('date', { required: 'Data é obrigatória' })}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  id="description"
                  className={`w-full px-3 py-2 border ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...register('description', { required: 'Descrição é obrigatória' })}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  id="type"
                  className={`w-full px-3 py-2 border ${
                    errors.type ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...register('type', { required: 'Tipo é obrigatório' })}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  className={`w-full px-3 py-2 border ${
                    errors.status ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...register('status')}
                >
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                </select>
              </div>

              <div>
                <label htmlFor="recurrence.type" className="block text-sm font-medium text-gray-700 mb-1">
                  Recorrência
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    id="recurrence.type"
                    className={`w-full px-3 py-2 border ${
                      errors.recurrence?.type ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    {...register('recurrence.type')}
                  >
                    <option value="none">Não recorrente</option>
                    <option value="monthly">Mensal</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                  </select>
                  {recurrenceType !== 'none' && (
                    <div className="flex items-center bg-blue-50 px-2 py-1 rounded-md">
                      <Repeat className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-xs text-blue-700">
                        {recurrenceType === 'monthly' && 'Mensal'}
                        {recurrenceType === 'weekly' && 'Semanal'}
                        {recurrenceType === 'biweekly' && 'Quinzenal'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {recurrenceType === 'weekly' && (
                <div className="mt-4">
                  <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-1">
                    Dia da Semana
                  </label>
                  <select
                    id="dayOfWeek"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    {...register('recurrence.dayOfWeek')}
                  >
                    {weekDays.map(day => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {recurrenceType === 'biweekly' && (
                <div className="mt-4">
                  <p className="text-sm text-blue-600 mb-2">
                    As transações quinzenais ocorrerão a cada dois sábados, começando do próximo sábado após a data selecionada.
                  </p>
                </div>
              )}

              {recurrenceType !== 'none' && (
                <div className="mt-4">
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Data Final (opcional)
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    {...register('recurrence.endDate')}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Se não definida, as transações serão criadas para o próximo ano.
                  </p>
                </div>
              )}
              
              <div className="md:col-span-2">
                <div className="flex justify-between">
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  {!showCategoryInput && (
                    <button
                      type="button"
                      onClick={() => setShowCategoryInput(true)}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      Adicionar Nova Categoria
                    </button>
                  )}
                </div>
                
                {showCategoryInput ? (
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Nome da nova categoria"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="ml-2 px-3 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCategoryInput(false)}
                      className="ml-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      id="category"
                      className={`w-full px-3 py-2 border ${
                        errors.category ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                      {...register('category', { required: 'Categoria é obrigatória' })}
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories[selectedType]?.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 mr-3"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Save className="mr-2 h-4 w-4" />
                {editingTransactionId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Filter and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
          <div className="flex items-center mb-4 md:mb-0">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 mr-2">Filtrar:</span>
            <select
              value={filter.type || ''}
              onChange={(e) => setFilter({ ...filter, type: e.target.value as TransactionType || undefined })}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Todos os Tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
          </div>

          <div className="flex items-center mb-4 md:mb-0">
            <CheckCircle className="h-5 w-5 text-gray-400 mr-2" />
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter({ ...filter, status: e.target.value as PaymentStatus || undefined })}
              className="px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </select>
          </div>

          <div className="flex items-center mb-4 md:mb-0 space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="flex items-center bg-gray-100 rounded-md">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-200 rounded-l-md"
                title="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleCurrentMonth}
                className="px-3 py-1 hover:bg-gray-200 text-sm font-medium"
              >
                {currentMonthLabel}
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-200 rounded-r-md"
                title="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por descrição ou categoria"
              value={filter.search || ''}
              onChange={(e) => setFilter({ ...filter, search: e.target.value || undefined })}
              className="w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>
      
      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {sortedTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('date')}
                  >
                    <span className="flex items-center">
                      Data {getSortIcon('date')}
                    </span>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('description')}
                  >
                    <span className="flex items-center">
                      Descrição {getSortIcon('description')}
                    </span>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('category')}
                  >
                    <span className="flex items-center">
                      Categoria {getSortIcon('category')}
                    </span>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('amount')}
                  >
                    <span className="flex items-center justify-end">
                      Valor {getSortIcon('amount')}
                    </span>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        {format(parseISO(transaction.date), 'dd/MM/yyyy')}
                        {transaction.recurrence?.type === 'monthly' && (
                          <Repeat className="h-4 w-4 text-blue-500 ml-2" title="Transação Recorrente" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {transaction.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => toggleTransactionStatus(transaction.id)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {transaction.status === 'paid' ? (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        {transaction.status === 'paid' ? 'Pago' : 'Pendente'}
                      </button>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                      transaction.type ===
                      'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Nenhuma transação encontrada</p>
            <button
              onClick={() => setIsAddingTransaction(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Transação
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;