import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTransactionStore, TransactionType } from '../store/transactionStore';
import { useForm } from 'react-hook-form';
import { Save, PlusCircle, Trash2, User, Mail, Lock, DollarSign } from 'lucide-react';

interface ProfileFormData {
  name: string;
  email: string;
  newPassword: string;
  confirmPassword: string;
}

const currencies = [
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro' },
  { code: 'USD', symbol: '$', name: 'Dólar Americano' },
  { code: 'EUR', symbol: '€', name: 'Euro' }
];

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, updateUserCurrency } = useAuthStore();
  const { categories, addCategory } = useTransactionStore();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'categories' | 'preferences'>('profile');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState<TransactionType>('expense');
  const [profileSaved, setProfileSaved] = useState(false);
  const [error, setError] = useState('');
  const [currencySaved, setCurrencySaved] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      newPassword: '',
      confirmPassword: ''
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
  
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      setError('Category name cannot be empty');
      return;
    }
    
    if (categories[categoryType].includes(newCategoryName)) {
      setError('Category already exists');
      return;
    }
    
    addCategory(categoryType, newCategoryName);
    setNewCategoryName('');
    setError('');
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      
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
            Profile Settings
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'categories' 
                ? 'text-primary-600 border-b-2 border-primary-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === 'preferences' 
                ? 'text-primary-600 border-b-2 border-primary-500' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Preferences
          </button>
        </div>
      </div>
      
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
          
          {profileSaved && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              Profile updated successfully!
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmitProfile)}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  type="text"
                  className={`pl-10 block w-full border ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...register('name', { required: 'Name is required' })}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  className={`pl-10 block w-full border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /\S+@\S+\.\S+/,
                      message: 'Please enter a valid email address',
                    }
                  })}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password (leave blank to keep current password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  type="password"
                  className={`pl-10 block w-full border ${
                    errors.newPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...register('newPassword', {
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                />
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  className={`pl-10 block w-full border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                  {...register('confirmPassword', {
                    validate: value => 
                      !newPassword || value === newPassword || 'Passwords do not match',
                  })}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
            
            <div className="space-y-4">
              <button
                onClick={() => logout()}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Log Out
              </button>
              
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    // In a real app, this would make an API call to delete the account
                    logout();
                    navigate('/login');
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Categories</h2>
          
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
                Expense Categories
              </button>
              <button
                onClick={() => setCategoryType('income')}
                className={`px-4 py-2 text-sm font-medium ${
                  categoryType === 'income'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                } rounded-r-md`}
              >
                Income Categories
              </button>
            </div>
            
            <div className="mt-4">
              <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700 mb-1">
                Add New Category
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="newCategory"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={`New ${categoryType} category`}
                />
                <button
                  onClick={handleAddCategory}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add
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
                Expense Categories
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
                Income Categories
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Preferences</h2>

          {currencySaved && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              Currency updated successfully!
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
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
    </div>
  );
};

export default Settings;