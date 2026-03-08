import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { Trash2, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

export default function Settings() {
  const { language, setLanguage, t, dir } = useLanguage();
  const { invoices, transactions, unlinkTransaction, aliases, addAlias, removeAlias } = useData();
  const { user } = useAuth();

  // Alias State
  const [newPayer, setNewPayer] = useState('');
  const [newNorm, setNewNorm] = useState('');
  const [payerSuggestions, setPayerSuggestions] = useState<string[]>([]);
  const [normSuggestions, setNormSuggestions] = useState<string[]>([]);

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Update suggestions when inputs change
  const handlePayerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPayer(value);
    if (value.length > 0) {
      const uniquePayers = Array.from(new Set(transactions.map(t => t.payerName)));
      setPayerSuggestions(uniquePayers.filter(p => p.toLowerCase().includes(value.toLowerCase())));
    } else {
      setPayerSuggestions([]);
    }
  };

  const handleNormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewNorm(value);
    if (value.length > 0) {
      const uniqueNorms = Array.from(new Set(invoices.map(i => i.normName)));
      setNormSuggestions(uniqueNorms.filter(n => n.toLowerCase().includes(value.toLowerCase())));
    } else {
      setNormSuggestions([]);
    }
  };

  const selectPayer = (name: string) => {
    setNewPayer(name);
    setPayerSuggestions([]);
  };

  const selectNorm = (name: string) => {
    setNewNorm(name);
    setNormSuggestions([]);
  };

  const handleAddAlias = (e: React.FormEvent) => {
    e.preventDefault();
    // If normName is empty, default to payerName (though UI requires both, this is a fallback)
    const finalNorm = newNorm || newPayer; 
    
    addAlias({ 
      payerName: newPayer, 
      normName: finalNorm, 
      organizationId: user?.organizationId || 'org1' 
    });
    setNewPayer('');
    setNewNorm('');
    setPayerSuggestions([]);
    setNormSuggestions([]);
  };

  // Derive current matches for display
  const matchedTransactions = transactions.filter(tx => tx.status === 'matched' && tx.invoiceId);

  // Combine Data for Unified Table
  // We need a unique list based on the 4-column key:
  // Invoice Norm Name | Invoice Orig Name (N/A usually, we use Norm) | Tx Payer Name | Tx Norm Name (N/A)
  // The user requested: Orig Invoice, Norm Invoice, Orig Tx, Norm Tx.
  // In our data model:
  // Invoice: normName (we don't have separate orig/norm for invoice in the mock, assuming normName is the main one)
  // Transaction: payerName
  
  // Let's map our data to the requested columns:
  // 1. Orig Invoice Name -> Invoice.normName (or a placeholder if we had it)
  // 2. Norm Invoice Name -> Invoice.normName
  // 3. Orig Tx Name -> Transaction.payerName
  // 4. Norm Tx Name -> Invoice.normName (The target it was matched to)

  const tableData = [
    ...aliases.map(a => ({
      id: `alias-${a.id}`,
      type: 'alias',
      origInv: a.normName, // Alias stores the target norm name
      normInv: a.normName,
      origTx: a.payerName,
      normTx: a.normName,
      raw: a
    })),
    ...matchedTransactions.map(tx => {
      const inv = invoices.find(i => i.id === tx.invoiceId);
      return {
        id: `tx-${tx.id}`,
        type: 'match',
        origInv: inv?.normName || '?',
        normInv: inv?.normName || '?',
        origTx: tx.payerName,
        normTx: inv?.normName || '?',
        raw: tx
      };
    })
  ];

  // Remove Duplicates based on the 4 columns
  // If an alias exists, we prefer showing the alias (it's a permanent rule).
  // If a match exists that is NOT covered by an alias, we show the match.
  const uniqueData = tableData.reduce((acc, current) => {
    const key = `${current.origInv}|${current.normInv}|${current.origTx}|${current.normTx}`;
    if (!acc.find(item => `${item.origInv}|${item.normInv}|${item.origTx}|${item.normTx}` === key)) {
      acc.push(current);
    }
    return acc;
  }, [] as typeof tableData);

  // Sorting Logic
  const sortedData = [...uniqueData].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    // @ts-ignore
    const aValue = a[key] || '';
    // @ts-ignore
    const bValue = b[key] || '';

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6" dir={dir}>
      <h1 className="text-2xl font-bold text-gray-900">{t('nav.settings')}</h1>

      {/* Language Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{t('settings.language')}</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setLanguage('en')}
            className={`px-4 py-2 rounded-md ${
              language === 'en'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('he')}
            className={`px-4 py-2 rounded-md ${
              language === 'he'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            עברית
          </button>
        </div>
      </div>

      {/* Unified Matches Table */}
      <div className="bg-white shadow rounded-lg p-6 flex flex-col h-[600px]">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex-shrink-0">{t('settings.matches')}</h2>
        
        {/* Alias Creation Form */}
        <form onSubmit={handleAddAlias} className="flex gap-4 items-end mb-6 bg-gray-50 p-4 rounded-md flex-shrink-0 relative z-20">
          <div className="flex-1 relative">
            <label className="block text-sm font-medium text-gray-700">{t('col.originalTransactionName')}</label>
            <input
              type="text"
              value={newPayer}
              onChange={handlePayerChange}
              onBlur={() => setTimeout(() => setPayerSuggestions([]), 200)} // Delay to allow click
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              required
              placeholder={t('alias.payer')}
              autoComplete="off"
            />
            {payerSuggestions.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                {payerSuggestions.map((suggestion, idx) => (
                  <li 
                    key={idx}
                    onClick={() => selectPayer(suggestion)}
                    className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700"
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex-1 relative">
            <label className="block text-sm font-medium text-gray-700">{t('col.originalInvoiceName')}</label>
            <input
              type="text"
              value={newNorm}
              onChange={handleNormChange}
              onBlur={() => setTimeout(() => setNormSuggestions([]), 200)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              required
              placeholder={t('alias.norm')}
              autoComplete="off"
            />
            {normSuggestions.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                {normSuggestions.map((suggestion, idx) => (
                  <li 
                    key={idx}
                    onClick={() => selectNorm(suggestion)}
                    className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700"
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 me-2" /> {t('alias.create')}
          </motion.button>
        </form>

        <div className="flex-1 overflow-auto border border-gray-200 rounded-lg relative">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th 
                  onClick={() => requestSort('origInv')}
                  className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  {t('col.originalInvoiceName')} {sortConfig?.key === 'origInv' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => requestSort('normInv')}
                  className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  {t('col.normalizedInvoiceName')} {sortConfig?.key === 'normInv' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => requestSort('origTx')}
                  className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  {t('col.originalTransactionName')} {sortConfig?.key === 'origTx' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => requestSort('normTx')}
                  className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  {t('col.normalizedTransactionName')} {sortConfig?.key === 'normTx' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">{t('col.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((row) => (
                <tr key={row.id} className={row.type === 'alias' ? 'bg-indigo-50/30' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.origInv}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.normInv}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.origTx}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.normTx}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                    <button 
                      onClick={() => {
                        if (row.type === 'alias') {
                          removeAlias((row.raw as any).id);
                        } else {
                          unlinkTransaction((row.raw as any).id);
                        }
                      }}
                      className="text-red-600 hover:text-red-900 bg-white border border-gray-200 rounded px-2 py-1 shadow-sm"
                      title={t('action.remove')}
                    >
                      <Trash2 className="w-3 h-3 inline me-1" />
                      {t('action.remove')}
                    </button>
                  </td>
                </tr>
              ))}
              
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No matches or aliases found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
