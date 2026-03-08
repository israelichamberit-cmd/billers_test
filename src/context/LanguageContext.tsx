import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'he';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    'app.title': 'Billers Reconciliation',
    'login.title': 'Login',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Login',
    'nav.compare': 'Compare',
    'nav.aliases': 'Aliases',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',
    'nav.logout': 'Logout',
    'compare.upload.tx': 'Upload Transactions (Excel)',
    'compare.upload.inv': 'Upload Invoices (Excel)',
    'compare.frame.invoices': 'Invoices with Aggregated Transactions',
    'compare.frame.unmatched': 'Unmatched Transactions',
    'action.approve.balanced': 'Approve Balanced',
    'action.approve.partial': 'Approve Partial',
    'action.approve.roll': 'Approve & Roll Forward',
    'action.approve.multi': 'Approve Multi-Match',
    'status.open': 'Open',
    'status.cleared': 'Cleared',
    'status.partial': 'Partial',
    'col.date': 'Date',
    'col.name': 'Name',
    'col.amount': 'Amount',
    'col.reference': 'Reference',
    'col.confidence': 'Confidence',
    'col.actions': 'Actions',
    'admin.users': 'Manage Users',
    'admin.orgs': 'Organizations',
    'settings.language': 'Language',
    'settings.matches': 'Current Name Matches',
    'alias.payer': 'Payer Name',
    'alias.norm': 'Normalized Name',
    'alias.create': 'Create Alias',
    'col.originalInvoiceName': 'Original Invoice Name',
    'col.normalizedInvoiceName': 'Normalized Invoice Name',
    'col.originalTransactionName': 'Original Transaction Name',
    'col.normalizedTransactionName': 'Normalized Transaction Name',
    'action.remove': 'Remove',
  },
  he: {
    'app.title': 'התאמות בילינג',
    'login.title': 'התחברות',
    'login.email': 'אימייל',
    'login.password': 'סיסמה',
    'login.submit': 'התחבר',
    'nav.compare': 'השוואה',
    'nav.aliases': 'כינויים',
    'nav.settings': 'הגדרות',
    'nav.admin': 'ניהול',
    'nav.logout': 'התנתק',
    'compare.upload.tx': 'העלה תנועות (Excel)',
    'compare.upload.inv': 'העלה חשבוניות (Excel)',
    'compare.frame.invoices': 'חשבוניות עם תנועות מצטברות',
    'compare.frame.unmatched': 'תנועות לא מותאמות',
    'action.approve.balanced': 'אשר מאוזן',
    'action.approve.partial': 'אשר חלקי',
    'action.approve.roll': 'אשר וגלגל קדימה',
    'action.approve.multi': 'אשר התאמה מרובה',
    'status.open': 'פתוח',
    'status.cleared': 'סגור',
    'status.partial': 'חלקי',
    'col.date': 'תאריך',
    'col.name': 'שם',
    'col.amount': 'סכום',
    'col.reference': 'אסמכתא',
    'col.confidence': 'התאמה',
    'col.actions': 'פעולות',
    'admin.users': 'ניהול משתמשים',
    'admin.orgs': 'ארגונים',
    'settings.language': 'שפה',
    'settings.matches': 'התאמות שמות נוכחיות',
    'alias.payer': 'שם משלם',
    'alias.norm': 'שם מנורמל',
    'alias.create': 'צור כינוי',
    'col.originalInvoiceName': 'שם חשבונית מקורי',
    'col.normalizedInvoiceName': 'שם חשבונית מנורמל',
    'col.originalTransactionName': 'שם תנועה מקורי',
    'col.normalizedTransactionName': 'שם תנועה מנורמל',
    'action.remove': 'הסר',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('he');

  const t = (key: string) => {
    return TRANSLATIONS[language][key] || key;
  };

  const dir = language === 'he' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      <div dir={dir} className="min-h-screen font-sans">
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
