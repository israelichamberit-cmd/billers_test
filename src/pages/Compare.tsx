import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable, 
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Upload, Check, X, ArrowRight, Link as LinkIcon, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { Transaction, Invoice } from '../types';

// --- Components ---

const TransactionCard: React.FC<{ transaction: Transaction, isOverlay?: boolean }> = ({ transaction, isOverlay = false }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: transaction.id,
    data: { type: 'transaction', transaction },
  });
  const { skipTransaction, linkTransactionToInvoice, invoices } = useData();

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  // Confidence simulation
  const confidence = transaction.payerName.includes('טכנולוגיים') ? 'high' : 
                     transaction.payerName.includes('גלובליים') ? 'medium' : 'low';
  
  // Find a potential match for "Confirm" action (simple heuristic)
  const potentialMatch = invoices.find(inv => inv.normName.includes(transaction.payerName.split(' ')[0]));

  if (isDragging && !isOverlay) {
    return <div ref={setNodeRef} style={style} className="opacity-30 h-16 bg-gray-100 rounded border border-dashed border-gray-300" />;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        "bg-white p-3 rounded shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow mb-2 text-sm relative group",
        isOverlay ? "shadow-xl rotate-2 scale-105 z-50" : ""
      )}
    >
      <div className="flex justify-between items-start">
        <span className="font-medium text-gray-900">{transaction.payerName}</span>
        <span className="font-mono text-gray-600">{transaction.amount.toLocaleString()} {transaction.currency}</span>
      </div>
      <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
        <span>{transaction.date}</span>
        <span>{transaction.reference}</span>
      </div>

      {/* Phase 1 Actions (Hover) */}
      {!isOverlay && transaction.status === 'unmatched' && (
        <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
          {potentialMatch && (
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Prevent drag start
                linkTransactionToInvoice(transaction.id, potentialMatch.id);
              }}
              className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
              title="Confirm Match"
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
            >
              <Check className="w-3 h-3" />
            </button>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              skipTransaction(transaction.id);
            }}
            className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            title="Skip"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// Simple similarity helper
function getSimilarity(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 90;
  
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  const intersection = aWords.filter(w => bWords.some(bw => bw.includes(w) || w.includes(bw)));
  
  if (intersection.length > 0) {
    return Math.min(40 + (intersection.length * 20), 85);
  }
  
  return 10;
}

const InvoiceRow: React.FC<{ invoice: Invoice, linkedTransactions: Transaction[], onApprove: (type: 'balanced' | 'partial' | 'roll') => void }> = ({ invoice, linkedTransactions, onApprove }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: invoice.id,
    data: { type: 'invoice', invoice },
  });

  const { t } = useLanguage();
  const { unlinkTransaction, aliases, addAlias, removeAlias } = useData();
  const { user } = useAuth();

  const totalLinked = linkedTransactions.reduce((sum, t) => sum + t.amount, 0);
  const balance = invoice.amount - totalLinked;
  const isBalanced = balance === 0;

  // Calculate average confidence
  const avgConfidence = linkedTransactions.length > 0
    ? Math.round(linkedTransactions.reduce((sum, tx) => sum + getSimilarity(invoice.normName, tx.payerName), 0) / linkedTransactions.length)
    : 0;

  // Green palette calculation: Higher confidence -> Brighter/More Opaque Green
  // We'll use HSL for easier lightness/opacity control or just opacity on a base green
  // Tailwind green-500 is roughly #22c55e. 
  // Let's use a dynamic style for the background opacity.
  const confidenceStyle = {
    backgroundColor: `rgba(34, 197, 94, ${Math.max(0.1, avgConfidence / 100)})`, // Green-500 with opacity
    color: avgConfidence > 50 ? '#fff' : '#166534', // White text for dark backgrounds, Dark green for light
  };

  return (
    <div 
      ref={setNodeRef}
      className={clsx(
        "bg-white border rounded-lg mb-2 transition-colors shadow-sm", // Reduced margin mb-4 -> mb-2
        isOver ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-gray-200",
        invoice.status === 'cleared' ? "opacity-60 bg-gray-50" : ""
      )}
    >
      {/* Invoice Header - Reduced padding p-4 -> p-2 */}
      <div className="p-2 flex justify-between items-center border-b border-gray-100">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-sm">{invoice.normName}</h3>
          </div>
          <div className="text-[10px] text-gray-500 flex gap-2 mt-0.5">
            <span>{invoice.number}</span>
            <span>{invoice.date}</span>
          </div>
        </div>
        <div className="text-end">
          <div className="font-mono font-bold text-sm">{invoice.amount.toLocaleString()} {invoice.currency}</div>
          <div className={clsx(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block",
            invoice.status === 'open' ? "bg-blue-100 text-blue-800" :
            invoice.status === 'cleared' ? "bg-green-100 text-green-800" :
            "bg-yellow-100 text-yellow-800"
          )}>
            {t(`status.${invoice.status}`)}
          </div>
        </div>
      </div>

      {/* Linked Transactions Area - Reduced padding p-4 -> p-2 */}
      <div className="p-2 bg-gray-50 min-h-[40px]">
        {linkedTransactions.length > 0 ? (
          <div className="space-y-1">
            {linkedTransactions.map(tx => {
              const similarity = getSimilarity(invoice.normName, tx.payerName);
              // Calculate opacity for the border color
              const opacity = Math.max(0.3, similarity / 100);
              const borderColor = `rgba(34, 197, 94, ${opacity})`;
              
              const existingAlias = aliases.find(a => a.payerName === tx.payerName && a.normName === invoice.normName);

              return (
                <div 
                  key={tx.id} 
                  className="relative p-2 rounded border border-gray-200 text-xs shadow-sm group transition-all bg-white border-s-[4px]"
                  style={{ 
                    borderInlineStartColor: 
                      similarity >= 90 ? '#bbf7d0' : // green-200
                      similarity >= 60 ? '#fef08a' : // yellow-200
                      '#fecaca' // red-200
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <LinkIcon className="w-3 h-3 text-gray-600 shrink-0" />
                      <span className="font-medium text-gray-900 truncate" title={tx.payerName}>
                        {tx.payerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Similarity Indicator */}
                      <span className={clsx(
                        "text-[10px] font-medium px-1.5 rounded-full border",
                        similarity >= 90 ? "bg-green-50 text-green-700 border-green-200" :
                        similarity >= 60 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      )}>
                        {similarity}%
                      </span>

                      <span className="font-mono font-semibold text-gray-900">
                        {tx.amount.toLocaleString()} {tx.currency}
                      </span>
                      
                      {/* Unlink Button (X) */}
                      <button 
                        onClick={() => unlinkTransaction(tx.id)}
                        className="text-gray-400 hover:text-red-600 p-0.5 rounded hover:bg-gray-100 transition-colors"
                        title="Remove from Invoice"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1.5 text-[10px] text-gray-700 font-medium">
                    <span className="opacity-80">{tx.date}</span>
                    <span className="opacity-80 font-mono">{tx.reference}</span>
                  </div>
                </div>
              );
            })}
            
            {/* Aggregate Summary */}
            <div className="flex justify-between items-center pt-1 mt-1 border-t border-gray-200 font-medium text-xs">
              <span>Total Linked:</span>
              <span className={clsx(
                "font-mono",
                isBalanced ? "text-green-600" : "text-red-600"
              )}>
                {totalLinked.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 text-xs py-1 italic">
            Drag transactions here to match
          </div>
        )}
      </div>

      {/* Actions Footer - Reduced padding p-3 -> p-2 */}
      {invoice.status !== 'cleared' && linkedTransactions.length > 0 && (
        <div className="p-2 bg-gray-100 border-t border-gray-200 flex gap-2 justify-end">
          {isBalanced ? (
            <button 
              onClick={() => onApprove('balanced')}
              className="flex items-center px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-3 h-3 me-1" />
              {t('action.approve.balanced')}
            </button>
          ) : (
            <>
              <button 
                onClick={() => onApprove('partial')}
                className="flex items-center px-2 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors"
              >
                {t('action.approve.partial')}
              </button>
              <button 
                onClick={() => onApprove('roll')}
                className="flex items-center px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
              >
                <ArrowRight className="w-3 h-3 me-1" />
                {t('action.approve.roll')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function UnmatchedFrame({ transactions }: { transactions: Transaction[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unmatched-frame',
    data: { type: 'unmatched-frame' },
  });
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">{t('compare.frame.unmatched')}</h2>
      <div 
        ref={setNodeRef}
        className={clsx(
          "flex-1 bg-gray-50 rounded-xl border-2 border-dashed p-4 overflow-y-auto transition-colors",
          isOver ? "border-indigo-400 bg-indigo-50" : "border-gray-300"
        )}
      >
        {transactions.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>All transactions matched!</p>
          </div>
        ) : (
          transactions.map(tx => (
            <TransactionCard key={tx.id} transaction={tx} />
          ))
        )}
      </div>
    </div>
  );
}

// --- Main Page Component ---

export default function Compare() {
  const { 
    invoices, 
    transactions, 
    linkTransactionToInvoice, 
    unlinkTransaction,
    approveBalanced,
    approvePartial,
    approveRollForward
  } = useData();
  const { t, dir } = useLanguage();
  const [activeDragItem, setActiveDragItem] = useState<Transaction | null>(null);

  // Filter transactions
  const unmatchedTransactions = transactions.filter(t => t.status === 'unmatched' || t.status === 'skipped');
  
  // Handle Drag Start
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'transaction') {
      setActiveDragItem(event.active.data.current.transaction as Transaction);
    }
  };

  // Handle Drag End
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const transactionId = active.id as string;
    const overId = over.id as string;
    const overType = over.data.current?.type;

    // Dragged to an Invoice
    if (overType === 'invoice') {
      linkTransactionToInvoice(transactionId, overId);
    }
    
    // Dragged back to Unmatched Frame (Unlink)
    if (overType === 'unmatched-frame') {
      unlinkTransaction(transactionId);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-6" dir={dir}>
      {/* Header & Upload Controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.compare')}</h1>
        <div className="flex gap-3">
          <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
            <Upload className="w-4 h-4 me-2" />
            {t('compare.upload.tx')}
          </button>
          <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
            <Upload className="w-4 h-4 me-2" />
            {t('compare.upload.inv')}
          </button>
        </div>
      </div>

      {/* Main Comparison Area */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
          
          {/* Frame 1: Invoices (Larger) */}
          <div className="md:col-span-8 flex flex-col min-h-0">
            <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">{t('compare.frame.invoices')}</h2>
            <div className="flex-1 overflow-y-auto pr-2 pb-2">
              {invoices.map(inv => (
                <InvoiceRow 
                  key={inv.id} 
                  invoice={inv} 
                  linkedTransactions={transactions.filter(t => t.invoiceId === inv.id)}
                  onApprove={(type) => {
                    if (type === 'balanced') approveBalanced(inv.id);
                    if (type === 'partial') approvePartial(inv.id);
                    if (type === 'roll') approveRollForward(inv.id);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Frame 2: Unmatched Transactions (Smaller) */}
          <div className="md:col-span-4 flex flex-col min-h-0">
            <UnmatchedFrame transactions={unmatchedTransactions} />
          </div>

        </div>

        <DragOverlay>
          {activeDragItem ? (
            <TransactionCard transaction={activeDragItem} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
