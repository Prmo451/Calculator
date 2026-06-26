import { motion } from 'motion/react';
import { Clock, Trash2, X, CornerDownLeft } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  onSelect: (item: HistoryItem, type: 'result' | 'expression') => void;
  onDeleteOne: (id: string) => void;
}

export default function HistoryPanel({
  history,
  isOpen,
  onClose,
  onClear,
  onSelect,
  onDeleteOne,
}: HistoryPanelProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-0 bg-[#111111]/98 backdrop-blur-md rounded-[40px] z-40 flex flex-col p-8 overflow-hidden border border-white/10 shadow-2xl"
      id="history-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4" id="history-header">
        <div className="flex flex-col">
          <div className="text-[10px] uppercase tracking-[3px] text-gray-500 mb-1">Journal</div>
          <h2 className="font-serif text-2xl text-premium-gold italic leading-tight" id="history-title">
            Calculation History
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={onClear}
              className="p-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 font-medium"
              title="Clear All History"
              id="clear-all-history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            id="close-history"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar" id="history-list">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-8" id="empty-history">
            <Clock className="w-12 h-12 stroke-[1.2] mb-3 opacity-30 text-premium-gold" />
            <p className="text-sm font-medium">No calculations yet</p>
            <p className="text-xs max-w-[180px] mt-1 opacity-75">Your formulas and answers will show up here as you calculate.</p>
          </div>
        ) : (
          history.slice().reverse().map((item) => (
            <div
              key={item.id}
              className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-premium-gold/20 rounded-2xl p-4 transition-all"
              id={`history-item-${item.id}`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Expression */}
                  <div className="text-xs text-gray-400 font-mono break-all leading-relaxed mb-1 pr-6">
                    {item.expression}
                  </div>
                  {/* Result */}
                  <div className="text-lg text-premium-gold font-bold font-mono tracking-tight break-all">
                    = {item.result}
                  </div>
                </div>

                {/* Delete button (individual) */}
                <button
                  onClick={() => onDeleteOne(item.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-rose-400 rounded transition-opacity"
                  title="Delete calculation"
                  id={`delete-history-${item.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Actions Footer */}
              <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center gap-2 justify-end opacity-60 hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onSelect(item, 'expression')}
                  className="text-[10px] text-gray-400 hover:text-premium-gold hover:bg-premium-gold/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
                  id={`reuse-expr-${item.id}`}
                >
                  <CornerDownLeft className="w-2.5 h-2.5" />
                  <span>Insert Formula</span>
                </button>
                <button
                  onClick={() => onSelect(item, 'result')}
                  className="text-[10px] text-gray-400 hover:text-premium-gold hover:bg-premium-gold/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
                  id={`reuse-res-${item.id}`}
                >
                  <CornerDownLeft className="w-2.5 h-2.5" />
                  <span>Insert Answer</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-4 pt-2 text-[10px] text-gray-500 text-center border-t border-white/5" id="history-footer">
        Click items to insert them back into the active panel.
      </div>
    </motion.div>
  );
}
