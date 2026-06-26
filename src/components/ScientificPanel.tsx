import { motion } from 'motion/react';

interface ScientificPanelProps {
  onKeyPress: (key: string) => void;
  angleMode: 'DEG' | 'RAD';
  toggleAngleMode: () => void;
  activeKey: string | null;
}

export default function ScientificPanel({
  onKeyPress,
  angleMode,
  toggleAngleMode,
  activeKey,
}: ScientificPanelProps) {
  const keys = [
    { label: '(', action: '(', type: 'func' },
    { label: ')', action: ')', type: 'func' },
    { label: 'deg/rad', action: 'toggleMode', type: 'toggle' },
    { label: 'x²', action: '^2', type: 'operator' },
    
    { label: 'sin', action: 'sin(', type: 'func' },
    { label: 'cos', action: 'cos(', type: 'func' },
    { label: 'tan', action: 'tan(', type: 'func' },
    { label: 'xʸ', action: '^', type: 'operator' },
    
    { label: 'ln', action: 'ln(', type: 'func' },
    { label: 'log', action: 'log(', type: 'func' },
    { label: '√', action: '√(', type: 'func' },
    { label: 'π', action: 'π', type: 'constant' },
    
    { label: 'e', action: 'e', type: 'constant' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="grid grid-cols-4 gap-2 pb-2 md:pb-0"
      id="scientific-panel"
    >
      {keys.map((key) => {
        const isToggle = key.type === 'toggle';
        const isKeyPressed = activeKey === key.action || (key.action === 'toggleMode' && activeKey === 'angleMode');

        return (
          <motion.button
            key={key.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (isToggle) {
                toggleAngleMode();
              } else {
                onKeyPress(key.action);
              }
            }}
            className={`
              relative flex flex-col items-center justify-center h-12 md:h-14 rounded-2xl font-semibold text-sm transition-colors cursor-pointer select-none
              ${isKeyPressed ? 'scale-95 bg-premium-gold text-dark-black shadow-lg shadow-premium-gold/20' : ''}
              ${!isKeyPressed && isToggle ? 'bg-premium-gold/5 text-premium-gold border border-premium-gold/20 hover:bg-premium-gold/10 hover:border-premium-gold/40' : ''}
              ${!isKeyPressed && !isToggle && key.type === 'constant' ? 'bg-white/[0.02] text-gray-200 border border-white/5 hover:bg-white/[0.06] hover:border-premium-gold/20' : ''}
              ${!isKeyPressed && !isToggle && key.type === 'func' ? 'bg-white/[0.02] text-gray-300 border border-white/5 hover:bg-white/[0.06] hover:border-premium-gold/20' : ''}
              ${!isKeyPressed && !isToggle && key.type === 'operator' ? 'bg-premium-gold/[0.03] text-premium-gold border border-premium-gold/10 hover:bg-premium-gold/10' : ''}
            `}
            id={`sci-btn-${key.label.replace('(', 'open').replace(')', 'close').replace('²', 'square').replace('ʸ', 'power')}`}
          >
            <span className="font-sans tracking-wide">
              {isToggle ? angleMode : key.label}
            </span>
            {isToggle && (
              <span className="text-[8px] uppercase tracking-wider text-premium-gold/60 font-mono -mt-0.5">
                Toggle Mode
              </span>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
