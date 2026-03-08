export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string;
  name: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  date: string;
  payerName: string;
  amount: number;
  currency: string;
  reference: string;
  status: 'unmatched' | 'matched' | 'partial' | 'skipped';
  invoiceId?: string; // If matched to a specific invoice
}

export interface Invoice {
  id: string;
  date: string;
  normName: string; // The normalized entity name
  amount: number;
  currency: string;
  number: string;
  status: 'open' | 'cleared' | 'partial';
  linkedTransactions: string[]; // IDs of linked transactions
}

export interface Alias {
  id: string;
  payerName: string;
  normName: string;
  organizationId: string;
}

export interface MatchSuggestion {
  transactionId: string;
  invoiceId: string;
  confidence: number; // 0-100
  reason: string;
}
