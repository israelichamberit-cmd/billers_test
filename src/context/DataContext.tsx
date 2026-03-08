import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Invoice, Transaction, Alias } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  invoices: Invoice[];
  transactions: Transaction[];
  aliases: Alias[];
  setInvoices: (invoices: Invoice[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addAlias: (alias: Omit<Alias, 'id'>) => void;
  removeAlias: (id: string) => void;
  linkTransactionToInvoice: (transactionId: string, invoiceId: string) => void;
  unlinkTransaction: (transactionId: string) => void;
  approveBalanced: (invoiceId: string) => void;
  approvePartial: (invoiceId: string) => void;
  approveRollForward: (invoiceId: string) => void;
  approveMultiMatch: (transactionId: string, invoiceIds: string[]) => void;
  skipTransaction: (transactionId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Mock Data Generators
const generateMockInvoices = (orgId: string): Invoice[] => {
  if (orgId !== 'org1') return [];
  return [
    { id: 'inv1', date: '2023-01-15', normName: 'פתרונות טכנולוגיים בע״מ', amount: 1000, currency: 'ILS', number: 'INV-001', status: 'open', linkedTransactions: [] },
    { id: 'inv2', date: '2023-02-10', normName: 'שירותים גלובליים', amount: 2500, currency: 'ILS', number: 'INV-002', status: 'open', linkedTransactions: [] },
    { id: 'inv3', date: '2023-03-05', normName: 'אלפא קורפ', amount: 500, currency: 'ILS', number: 'INV-003', status: 'open', linkedTransactions: [] },
  ];
};

const generateMockTransactions = (orgId: string): Transaction[] => {
  if (orgId !== 'org1') return [];
  return [
    { id: 'tx1', date: '2023-01-20', payerName: 'פתרונות טכנולוגיים', amount: 1000, currency: 'ILS', reference: 'REF123', status: 'unmatched' },
    { id: 'tx2', date: '2023-02-12', payerName: 'שירותים גלובליים בע״מ', amount: 2000, currency: 'ILS', reference: 'REF456', status: 'unmatched' }, // Partial match
    { id: 'tx3', date: '2023-03-10', payerName: 'אלפא תאגיד', amount: 500, currency: 'ILS', reference: 'REF789', status: 'unmatched' },
    { id: 'tx4', date: '2023-04-01', payerName: 'משלם לא ידוע', amount: 150, currency: 'ILS', reference: 'REF999', status: 'unmatched' },
  ];
};

const generateMockAliases = (orgId: string): Alias[] => {
  if (orgId !== 'org1') return [];
  return [
    { id: 'a1', payerName: 'פתרונות טכנולוגיים', normName: 'פתרונות טכנולוגיים בע״מ', organizationId: 'org1' },
  ];
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);

  // Load mock data when user logs in
  useEffect(() => {
    if (user) {
      setInvoices(generateMockInvoices(user.organizationId));
      setTransactions(generateMockTransactions(user.organizationId));
      setAliases(generateMockAliases(user.organizationId));
    } else {
      setInvoices([]);
      setTransactions([]);
      setAliases([]);
    }
  }, [user]);

  const addAlias = (newAlias: Omit<Alias, 'id'>) => {
    // Check for duplicates based on the composite key: payerName + normName
    const exists = aliases.some(
      a => a.payerName === newAlias.payerName && a.normName === newAlias.normName
    );
    
    if (exists) return; // Prevent duplicates

    const id = Math.random().toString(36).substr(2, 9);
    setAliases([...aliases, { ...newAlias, id }]);
  };

  // Auto-link transactions based on aliases whenever transactions or aliases change
  useEffect(() => {
    if (aliases.length === 0 || transactions.length === 0) return;

    let hasChanges = false;
    const newTransactions = [...transactions];
    const newInvoices = [...invoices];

    newTransactions.forEach((tx, index) => {
      if (tx.status === 'unmatched') {
        const match = aliases.find(a => a.payerName === tx.payerName);
        if (match) {
          const invoice = newInvoices.find(inv => inv.normName === match.normName && inv.status === 'open');
          if (invoice) {
            // Link them
            newTransactions[index] = { ...tx, status: 'matched', invoiceId: invoice.id };
            
            const invIndex = newInvoices.findIndex(i => i.id === invoice.id);
            if (invIndex !== -1) {
               // Avoid adding duplicate transaction IDs
               if (!newInvoices[invIndex].linkedTransactions.includes(tx.id)) {
                 newInvoices[invIndex] = {
                   ...newInvoices[invIndex],
                   linkedTransactions: [...newInvoices[invIndex].linkedTransactions, tx.id]
                 };
                 hasChanges = true;
               }
            }
          }
        }
      }
    });

    if (hasChanges) {
      setTransactions(newTransactions);
      setInvoices(newInvoices);
    }
  }, [aliases, transactions.length]); // Depend on length to trigger on new uploads, but avoid infinite loops on status changes if possible. 
  // Better dependency management:
  // We want to run this when:
  // 1. Aliases change (user adds a new rule)
  // 2. Transactions are loaded (initial load)
  // We need to be careful not to create an infinite loop if we update transactions inside.
  // The check `if (tx.status === 'unmatched')` helps, but `setTransactions` will trigger re-render.
  
  // Refined Auto-link Effect
  useEffect(() => {
    let updatesNeeded = false;
    
    const updatedTransactions = transactions.map(tx => {
      if (tx.status === 'unmatched') {
        const match = aliases.find(a => a.payerName === tx.payerName);
        if (match) {
          const invoice = invoices.find(inv => inv.normName === match.normName && inv.status === 'open');
          if (invoice) {
            updatesNeeded = true;
            return { ...tx, status: 'matched', invoiceId: invoice.id } as Transaction;
          }
        }
      }
      return tx;
    });

    if (updatesNeeded) {
      setTransactions(updatedTransactions);
      
      // Also update invoices to reflect the new links
      const updatedInvoices = invoices.map(inv => {
        const newLinkedTxs = updatedTransactions
          .filter(tx => tx.invoiceId === inv.id)
          .map(tx => tx.id);
        
        // Only update if different to avoid loops
        if (newLinkedTxs.length !== inv.linkedTransactions.length) {
           return { ...inv, linkedTransactions: newLinkedTxs };
        }
        return inv;
      });
      setInvoices(updatedInvoices);
    }
  }, [aliases, invoices.length, transactions.length]); // Trigger on count changes or alias changes


  const removeAlias = (id: string) => {
    setAliases(aliases.filter(a => a.id !== id));
  };

  const linkTransactionToInvoice = (transactionId: string, invoiceId: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        return { ...inv, linkedTransactions: [...inv.linkedTransactions, transactionId] };
      }
      return inv;
    }));
    setTransactions(prev => prev.map(tx => {
      if (tx.id === transactionId) {
        return { ...tx, status: 'matched', invoiceId };
      }
      return tx;
    }));
  };

  const unlinkTransaction = (transactionId: string) => {
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx || !tx.invoiceId) return;

    setInvoices(prev => prev.map(inv => {
      if (inv.id === tx.invoiceId) {
        return { ...inv, linkedTransactions: inv.linkedTransactions.filter(id => id !== transactionId) };
      }
      return inv;
    }));

    setTransactions(prev => prev.map(t => {
      if (t.id === transactionId) {
        return { ...t, status: 'unmatched', invoiceId: undefined };
      }
      return t;
    }));
  };

  const approveBalanced = (invoiceId: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        return { ...inv, status: 'cleared' };
      }
      return inv;
    }));
  };

  const approvePartial = (invoiceId: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        return { ...inv, status: 'partial' };
      }
      return inv;
    }));
  };

  const approveRollForward = (invoiceId: string) => {
    // Logic to roll forward excess amount to next invoice (FIFO)
    // Simplified for UI demo: Just mark cleared
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        return { ...inv, status: 'cleared' };
      }
      return inv;
    }));
  };

  const approveMultiMatch = (transactionId: string, invoiceIds: string[]) => {
    // Logic to split transaction across multiple invoices
    // Simplified for UI demo
    console.log('Multi-match approved', transactionId, invoiceIds);
  };

  const skipTransaction = (transactionId: string) => {
    setTransactions(prev => prev.map(tx => {
      if (tx.id === transactionId) {
        return { ...tx, status: 'skipped' };
      }
      return tx;
    }));
  };

  return (
    <DataContext.Provider value={{
      invoices,
      transactions,
      aliases,
      setInvoices,
      setTransactions,
      addAlias,
      removeAlias,
      linkTransactionToInvoice,
      unlinkTransaction,
      approveBalanced,
      approvePartial,
      approveRollForward,
      approveMultiMatch,
      skipTransaction
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
