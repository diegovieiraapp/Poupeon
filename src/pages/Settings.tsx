import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTransactionStore, TransactionType } from '../store/transactionStore';
import { useForm } from 'react-hook-form';
import { 
  Save, 
  PlusCircle, 
  Trash2, 
  User, 
  Mail, 
  Lock, 
  DollarSign,
  Wallet,
  ShieldCheck
} from 'lucide-react';

interface ProfileFormData {
  name: string;
  email: string;
  newPassword: string;
  confirmPassword: string;
}

interface EmergencyFundFormData {
  amount: number;
}

const currencies = [
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro' },
  { code: 'USD', symbol: '$', name: 'Dólar Americano' },
  { code: 'EUR', symbol: '€', name: 'Euro' }
];

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, updateUserCurrency, updateEmergencyFund } = useAuthStore();
  const { categories, addCategory } = useTransactionStore();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'categories' | 'preferences' | 'emergency'>('profile');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<TransactionType>('expense');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [error, setError] = useState('');
  const [currencySaved, setCurrencySaved] = useState(false);
  const [emergencyFundSaved, setEmergencyFundSaved] = useState(false);
  
  const { 
    register: registerProfile, 
    handleSubmit: handleSubmitProfile, 
    formState: { errors: profileErrors },
    watch
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const { 
    register: registerEmergencyFund,
    handleSubmit: handleSubmitEmergencyFund,
    formState: { errors: emergencyFundErrors },
    setValue: setEmergencyFundValue
  } = useForm<EmergencyFundFormData>({
    defaultValues: {
      amount: user?.emergencyFund || 0
    }
  });
  
  const newPassword = watch('newPassword');
  
  const onSubmitProfile = (data: ProfileFormData) => {
    // In a real app, this would make an API call to update the user's profile
    setProfileSaved(true);
    setTimeout(() => {
      setProfileSaved(false);
    }, 3000);
  };

  const onSubmitEmergencyFund = async (data: EmergencyFundFormData) => {
    try {
      await updateEmergencyFund(data.amount);
      setEmergencyFundSaved(true);
      setTimeout(() => {
        setEmergencyFundSaved(false);
      }, 3000);
    } catch (error) {
      setError('Erro ao atualizar reserva de emergência');
    }
  };
  
  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories[categoryType].includes(newCategoryName)) {
      addCategory(categoryType, newCategoryName);
      setNewCategoryName('');
      setShowCategoryInput(false);
    }
  };

  const handleCurrencyChange = async (currency: string) => {
    try {
      await updateUserCurrency(currency);
      setCurrencySaved(true);
      setTimeout(() => setCurrencySaved(false), 3000);
    } catch (error) {
      setError('Erro ao atualizar moeda');
    }
  };
  
  return (
    <div className="py-6 fadeIn">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações</h1>
      
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'profile' 
                ? 'text-primary-600 border-b-2 border-primary-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'categories' 
                ? 'text-primary-600 border-b-2 border-primary-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Categorias
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'preferences' 
                ? 'text-primary-600 border-b-2 border-primary-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Preferências
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'emergency' 
                ? 'text-primary-600 border-b-2 border-primary-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Reserva de Emergência
          </button>
        </div>
      </div>
      
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações do Perfil</h2>
          
          {profileSaved && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              Perfil atualizado com sucesso!
            </div>
          )}
          
          <form onSubmit={handleSubmitProfile(onSubmitProfile)}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  type="text"
                  className={`pl-10 block w-full border ${
                    profileErrors.name ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...registerProfile('name', { required: 'Nome é obrigatório' })}
                />
              </div>
              {profileErrors.name && (
                <p className="mt-1 text-sm text-red-600">{profileErrors.name.message}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  className={`pl-10 block w-full border ${
                    profileErrors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...registerProfile('email', { 
                    required: 'Email é obrigatório', 
                    pattern: {
                      value: /\S+@\S+\.\S+/,
                      message: 'Por favor, insira um email válido',
                    } 
                  })}
                />
              </div>
              {profileErrors.email && (
                <p className="mt-1 text-sm text-red-600">{profileErrors.email.message}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha (deixe em branco para manter a atual)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  type="password"
                  className={`pl-10 block w-full border ${
                    profileErrors.newPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...registerProfile('newPassword', {
                    minLength: {
                      value: 6,
                      message: 'A senha deve ter pelo menos 6 caracteres',
                    },
                  })}
                />
              </div>
              {profileErrors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{profileErrors.newPassword.message}</p>
              )}
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  className={`pl-10 block w-full border ${
                    profileErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...registerProfile('confirmPassword', {
                    validate: value => 
                      !newPassword || value === newPassword || 'As senhas não coincidem',
                  })}
                />
              </div>
              {profileErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{profileErrors.confirmPassword.message}</p>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Perfil
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações da Conta</h3>
            
            <div className="space-y-4">
              <button
                onClick={() => logout()}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sair
              </button>
              
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
                    // In a real app, this would make an API call to delete the account
                    logout();
                    navigate('/login');
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Excluir Conta
              </button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gerenciar Categorias</h2>
          
          <div className="mb-6">
            <div className="flex mb-2">
              <button
                onClick={() => setCategoryType('expense')}
                className={`px-4 py-2 text-sm font-medium ${
                  categoryType === 'expense'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                } rounded-l-md`}
              >
                Categorias de Despesa
              </button>
              <button
                onClick={() => setCategoryType('income')}
                className={`px-4 py-2 text-sm font-medium ${
                  categoryType === 'income'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                } rounded-r-md`}
              >
                Categorias de Receita
              </button>
            </div>
            
            <div className="mt-4">
              <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700 mb-1">
                Adicionar Nova Categoria
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="newCategory"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={`Nova categoria de ${categoryType === 'income' ? 'receita' : 'despesa'}`}
                />
                <button
                  onClick={handleAddCategory}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar
                </button>
              </div>
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3">
                Categorias de Despesa
              </h3>
              <ul className="space-y-2">
                {categories.expense.map((category) => (
                  <li 
                    key={category}
                    className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-md text-sm text-red-800"
                  >
                    {category}
                    <button
                      onClick={() => {
                        alert(`Delete functionality would be implemented here for: ${category}`);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3">
                Categorias de Receita
              </h3>
              <ul className="space-y-2">
                {categories.income.map((category) => (
                  <li 
                    key={category}
                    className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-md text-sm text-green-800"
                  >
                    {category}
                    <button
                      onClick={() => {
                        alert(`Delete functionality would be implemented here for: ${category}`);
                      }}
                      className="text-green-600 hover:text-green-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferências</h2>

          {currencySaved && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              Moeda atualizada com sucesso!
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moeda
            </label>
            <div className="max-w-xs">
              {currencies.map((currency) => (
                <div
                  key={currency.code}
                  className={`flex items-center p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                    user?.currency === currency.code
                      ? 'bg-primary-50 border-2 border-primary-500'
                      : 'border-2 border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleCurrencyChange(currency.code)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mr-3">
                    <span className="text-lg font-semibold">{currency.symbol}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{currency.name}</p>
                    <p className="text-sm text-gray-500">{currency.code}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <ShieldCheck className="h-6 w-6 text-primary-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Reserva de Emergência</h2>
          </div>

          {emergencyFundSaved && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              Reserva de emergência atualizada com sucesso!
            </div>
          )}

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Configure aqui o valor da sua reserva de emergência. Este valor servirá como referência para seu planejamento financeiro.
            </p>

            <form onSubmit={handleSubmitEmergencyFund(onSubmitEmergencyFund)}>
              <div className="mb-4">
                <label htmlFor="emergencyFund" className="block text-sm font-medium text-gray-700 mb-1">
                  Valor da Reserva de Emergência
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Wallet className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="emergencyFund"
                    type="number"
                    step="0.01"
                    min="0"
                    className={`pl-10 block w-full border ${
                      emergencyFundErrors.amount ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                    {...registerEmergencyFund('amount', {
                      required: 'Valor é obrigatório',
                      min: { value: 0, message: 'O valor não pode ser negativo' }
                    })}
                  />
                </div>
                {emergencyFundErrors.amount && (
                  <p className="mt-1 text-sm text-red-600">{emergencyFundErrors.amount.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Valor
                </button>
              </div>
            </form>
          </div>

          <div className="bg-blue-50 rounde
d-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Dica</h3>
            <p className="text-sm text-blue-600">
              Recomenda-se manter uma reserva de emergência equivalente a 3-6 meses de despesas mensais. 
              Isso ajuda a lidar com imprevistos financeiros sem comprometer seu orçamento regular.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;