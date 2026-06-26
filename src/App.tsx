import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Volume2, 
  VolumeX, 
  History as HistoryIcon, 
  Copy, 
  Check, 
  RotateCcw,
  Info,
  ChevronLeft,
  X,
  Download
} from 'lucide-react';

import { HistoryItem, CalculatorState } from './types';
import { evaluateExpression, formatResult } from './utils/mathEvaluator';
import { playTactileClick, triggerHaptic } from './utils/audio';
import HistoryPanel from './components/HistoryPanel';
import ScientificPanel from './components/ScientificPanel';

export default function App() {
  // Calculator States
  const [expression, setExpression] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [isScientific, setIsScientific] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [angleMode, setAngleMode] = useState<'DEG' | 'RAD'>('DEG');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [justCalculated, setJustCalculated] = useState<boolean>(false);
  
  // UI States
  const [copied, setCopied] = useState<boolean>(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PWA Install States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);
  const [isInstallInfoOpen, setIsInstallInfoOpen] = useState<boolean>(false);

  // Listen for PWA installation capability
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (soundEnabled) playTactileClick();
    triggerHaptic('success');
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  const handleDownloadClick = () => {
    if (soundEnabled) playTactileClick();
    triggerHaptic('medium');
    if (deferredPrompt) {
      handleInstallClick();
    } else {
      setIsInstallInfoOpen(true);
    }
  };

  // Refs for dynamic scrolling
  const displayScrollRef = useRef<HTMLDivElement>(null);
  const expressionScrollRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('calculator_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('LocalStorage not available or corrupted');
    }
  }, []);

  // Auto scroll to the right for long inputs/displays
  useEffect(() => {
    if (expressionScrollRef.current) {
      expressionScrollRef.current.scrollLeft = expressionScrollRef.current.scrollWidth;
    }
  }, [expression]);

  useEffect(() => {
    if (displayScrollRef.current) {
      displayScrollRef.current.scrollLeft = displayScrollRef.current.scrollWidth;
    }
  }, [displayValue]);

  // Handle saving history to localStorage
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem('calculator_history', JSON.stringify(newHistory));
    } catch (e) {
      console.warn('Could not save history to localStorage');
    }
  };

  const handleClearHistory = () => {
    if (soundEnabled) playTactileClick();
    saveHistory([]);
  };

  const handleDeleteOneHistory = (id: string) => {
    if (soundEnabled) playTactileClick();
    const updated = history.filter(item => item.id !== id);
    saveHistory(updated);
  };

  const handleSelectHistory = (item: HistoryItem, type: 'result' | 'expression') => {
    if (soundEnabled) playTactileClick();
    if (type === 'result') {
      setDisplayValue(item.result);
      setExpression(item.result);
    } else {
      setExpression(item.expression);
      setDisplayValue('0');
    }
    setJustCalculated(false);
    setIsHistoryOpen(false);
  };

  const handleBackspace = () => {
    if (expression.length === 0) return;

    // Helper to check what word is at the end of expression
    const endsWithWord = (words: string[]) => {
      for (const word of words) {
        if (expression.endsWith(word)) return word;
      }
      return null;
    };

    // Advanced scientific function blocks
    const wordsToDelete = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', '√(', '^2'];
    const matchedWord = endsWithWord(wordsToDelete);

    let updatedExpr = '';
    if (matchedWord) {
      updatedExpr = expression.slice(0, -matchedWord.length);
    } else {
      // Check if last character is a spaced operator (e.g. " + ")
      if (expression.endsWith(' + ') || expression.endsWith(' - ') || expression.endsWith(' × ') || expression.endsWith(' ÷ ') || expression.endsWith(' ^ ')) {
        updatedExpr = expression.slice(0, -3);
      } else {
        updatedExpr = expression.slice(0, -1);
      }
    }

    setExpression(updatedExpr);

    // Reconstruct displayValue
    if (updatedExpr.length === 0) {
      setDisplayValue('0');
    } else {
      // Extract the last number or token block
      const tokens = updatedExpr.trim().split(/\s+/);
      const lastToken = tokens[tokens.length - 1];
      if (lastToken) {
        // clean any trailing function syntax
        setDisplayValue(lastToken.replace(/^(sin|cos|tan|log|ln|√)\(/, ''));
      } else {
        setDisplayValue('0');
      }
    }
    
    setErrorMessage(null);
    setJustCalculated(false);
  };

  const handleKeyPress = (key: string) => {
    if (soundEnabled) playTactileClick();

    // Reset error when user starts typing again
    setErrorMessage(null);

    // 1. Digital inputs
    if (key >= '0' && key <= '9') {
      if (justCalculated) {
        setExpression(key);
        setDisplayValue(key);
        setJustCalculated(false);
      } else {
        const isDisplayZero = displayValue === '0';
        setDisplayValue(isDisplayZero ? key : displayValue + key);
        setExpression(expression === '0' ? key : expression + key);
      }
      return;
    }

    // 2. Decimal point
    if (key === '.') {
      if (justCalculated) {
        setExpression('0.');
        setDisplayValue('0.');
        setJustCalculated(false);
        return;
      }

      // Check if the current display block already has a decimal
      // Splitting displayValue is a safe check for the currently typed number
      if (!displayValue.includes('.')) {
        setDisplayValue(displayValue + '.');
        setExpression(expression + '.');
      }
      return;
    }

    // 3. Mathematical basic operations (+ - * /)
    if (['+', '-', '×', '÷', '^', '^2'].includes(key)) {
      let baseExpr = expression;
      
      if (justCalculated) {
        baseExpr = displayValue;
        setJustCalculated(false);
      }

      if (baseExpr === '' || baseExpr === 'Error') {
        if (key === '-') {
          // Allow starting with a negative sign
          setExpression('-');
          setDisplayValue('-');
          return;
        }
        return;
      }

      // Handle square exponent instantly
      if (key === '^2') {
        setExpression(baseExpr + '^2');
        setDisplayValue(displayValue + '²');
        return;
      }

      // If expression already ends with an operator, replace it!
      const lastCharSpaced = baseExpr.slice(-3);
      if ([' + ', ' - ', ' × ', ' ÷ ', ' ^ '].includes(lastCharSpaced)) {
        setExpression(baseExpr.slice(0, -3) + ` ${key} `);
      } else if (baseExpr.endsWith('^')) {
        setExpression(baseExpr.slice(0, -1) + ` ${key} `);
      } else {
        setExpression(baseExpr + ` ${key} `);
      }
      
      setDisplayValue('0');
      return;
    }

    // 4. Percentage (%)
    if (key === '%') {
      if (justCalculated) {
        const val = parseFloat(displayValue);
        if (!isNaN(val)) {
          const res = val / 100;
          setDisplayValue(formatResult(res));
          setExpression(formatResult(res));
        }
        setJustCalculated(false);
        return;
      }

      if (expression !== '' && !expression.endsWith('%')) {
        setExpression(expression + '%');
        setDisplayValue(displayValue + '%');
      }
      return;
    }

    // 5. Scientific functions
    if (['sin(', 'cos(', 'tan(', 'log(', 'ln(', '√(', 'π', 'e', '(', ')'].includes(key)) {
      if (justCalculated) {
        setExpression(key);
        setDisplayValue(key.replace('(', ''));
        setJustCalculated(false);
      } else {
        const isExprEmpty = expression === '' || expression === '0';
        setExpression(isExprEmpty ? key : expression + key);
        setDisplayValue(key.replace('(', ''));
      }
      return;
    }

    // 6. Equals (=) solver
    if (key === '=') {
      if (!expression || expression === '0') return;

      try {
        const isRad = angleMode === 'RAD';
        const resValue = evaluateExpression(expression, isRad);
        const resStr = formatResult(resValue);

        if (resStr === 'Error' || resStr === 'Infinity') {
          throw new Error('Math Error');
        }

        // Add to history
        const historyItem: HistoryItem = {
          id: Math.random().toString(36).substr(2, 9),
          expression: expression,
          result: resStr,
          timestamp: new Date().toISOString(),
        };
        
        saveHistory([...history, historyItem]);
        
        // Update display states
        setDisplayValue(resStr);
        setJustCalculated(true);
        triggerHaptic('success'); // Smooth ripple pulse on math resolution
      } catch (err: any) {
        setErrorMessage(err.message || 'Syntax Error');
        setDisplayValue('Error');
        setJustCalculated(true);
        triggerHaptic('medium'); // Warning feedback on error
      }
      return;
    }

    // 7. Clear functions
    if (key === 'AC') {
      setExpression('');
      setDisplayValue('0');
      setJustCalculated(false);
      setErrorMessage(null);
      triggerHaptic('medium'); // Deep pulse on reset
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore inputs if target is an interactive element (not the case here, but safe practice)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      let mappedKey: string | null = null;
      
      if (e.key >= '0' && e.key <= '9') mappedKey = e.key;
      else if (e.key === '.') mappedKey = '.';
      else if (e.key === '+') mappedKey = '+';
      else if (e.key === '-') mappedKey = '-';
      else if (e.key === '*') mappedKey = '×';
      else if (e.key === '/') mappedKey = '÷';
      else if (e.key === '%') mappedKey = '%';
      else if (e.key === '(') mappedKey = '(';
      else if (e.key === ')') mappedKey = ')';
      else if (e.key === '^') mappedKey = '^';
      else if (e.key === 'Enter' || e.key === '=') mappedKey = '=';
      else if (e.key === 'Backspace') mappedKey = 'Backspace';
      else if (e.key === 'Escape') mappedKey = 'AC';
      else if (e.key.toLowerCase() === 'c') mappedKey = 'AC';
      
      // Scientific keys (available as standard keyboard shortcuts)
      else if (e.key.toLowerCase() === 's') mappedKey = 'sin(';
      else if (e.key.toLowerCase() === 'o') mappedKey = 'cos(';
      else if (e.key.toLowerCase() === 't') mappedKey = 'tan(';
      else if (e.key.toLowerCase() === 'l') mappedKey = 'log(';
      else if (e.key.toLowerCase() === 'n') mappedKey = 'ln(';
      else if (e.key.toLowerCase() === 'r') mappedKey = '√(';
      else if (e.key.toLowerCase() === 'p') mappedKey = 'π';
      else if (e.key.toLowerCase() === 'e') mappedKey = 'e';

      if (mappedKey) {
        e.preventDefault();
        setActiveKey(mappedKey);
        
        if (mappedKey === 'Backspace') {
          handleBackspace();
        } else {
          handleKeyPress(mappedKey);
        }

        // Reset active key highlighting
        setTimeout(() => {
          setActiveKey(null);
        }, 120);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expression, displayValue, justCalculated, angleMode, soundEnabled, history]);

  // Copy to clipboard helper
  const handleCopy = () => {
    if (displayValue === 'Error' || displayValue === '0') return;
    if (soundEnabled) playTactileClick();
    triggerHaptic('double'); // Distinct dual-pulse haptic feedback on copy
    
    navigator.clipboard.writeText(displayValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback
    });
  };

  // Dynamically change font size of primary display so numbers fit comfortably
  const getDisplayFontSize = (text: string) => {
    if (text.length < 10) return 'text-4xl md:text-5xl';
    if (text.length < 16) return 'text-2xl md:text-3xl';
    return 'text-xl break-all';
  };

  return (
    <div 
      className="min-h-screen w-full bg-[#080808] bg-[radial-gradient(circle_at_10%_10%,_#151515_0%,_#080808_100%)] text-[#E5E5E5] flex items-center justify-center p-4 md:p-6 select-none"
      id="calculator-app"
    >
      {/* Container holding the responsive layout */}
      <div className="w-full max-w-sm md:max-w-none md:flex md:justify-center" id="calculator-wrapper">
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className={`
            relative bg-[#111111] border border-white/10 rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col p-8 gap-6
            transition-all duration-300 w-full
            ${isScientific ? 'md:w-[720px]' : 'md:w-[420px]'}
          `}
          id="calculator-card"
        >
          {/* Header Controls */}
          <div className="flex items-center justify-between" id="calculator-header">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[3px] text-gray-500 font-sans leading-none mb-1">
                Axiom Precision
              </span>
              <span className="font-serif font-bold text-lg italic text-premium-gold leading-none">
                Instruments
              </span>
            </div>
            
            <div className="flex items-center gap-2.5" id="header-actions">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2.5 rounded-xl border transition-all duration-200 ${soundEnabled ? 'text-premium-gold bg-premium-gold/5 border-premium-gold/20 hover:bg-premium-gold/10' : 'text-gray-500 border-transparent hover:bg-white/5'}`}
                title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
                id="sound-toggle"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* History Toggle */}
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="p-2.5 text-gray-400 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/5 rounded-xl transition-all"
                title="View History"
                id="history-toggle"
              >
                <HistoryIcon className="w-4 h-4" />
              </button>

              {/* Install / Download App Button */}
              <button
                onClick={handleDownloadClick}
                className="p-2.5 text-premium-gold hover:text-white border border-premium-gold/10 bg-premium-gold/5 hover:bg-premium-gold/10 rounded-xl transition-all flex items-center justify-center"
                title="Download App"
                id="pwa-install-btn"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* LCD/OLED Screen Area */}
          <div 
            className="bg-[#080808]/60 border border-white/10 rounded-3xl p-6 flex flex-col justify-end items-end h-36 md:h-40 overflow-hidden relative group"
            id="calculator-screen"
          >
            {/* Copy button */}
            {displayValue !== '0' && displayValue !== 'Error' && (
              <button
                onClick={handleCopy}
                className="absolute top-4 left-4 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 border border-white/5"
                title="Copy Result"
                id="copy-result-btn"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-premium-gold" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Error or Alert Badge */}
            {errorMessage && (
              <span className="absolute top-4 right-4 text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full font-mono" id="error-badge">
                {errorMessage}
              </span>
            )}

            {/* Upper line: Formula Expression */}
            <div 
              ref={expressionScrollRef}
              className="text-premium-gold/80 font-mono text-xs md:text-sm tracking-[2px] text-right w-full overflow-x-auto whitespace-nowrap scroll-smooth pb-1.5"
              id="formula-display"
            >
              {expression || '0'}
            </div>

            {/* Lower line: Primary Digits */}
            <motion.div 
              ref={displayScrollRef}
              animate={copied ? { 
                scale: [1, 0.94, 1.03, 1], 
                color: ['#FFFFFF', '#DFBA73', '#DFBA73', '#FFFFFF'] 
              } : {}}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className={`font-sans font-extralight tracking-tight text-right w-full overflow-x-auto whitespace-nowrap scroll-smooth ${getDisplayFontSize(displayValue)} ${displayValue === 'Error' ? 'text-rose-500' : 'text-white'}`}
              id="primary-display"
            >
              {displayValue}
            </motion.div>

            {/* Tiny Angle Indicator */}
            {isScientific && (
              <span className="absolute bottom-2 left-4 text-[9px] uppercase tracking-[2px] text-premium-gold font-bold font-mono">
                {angleMode}
              </span>
            )}
          </div>

          {/* Keys Layout Box */}
          <div className="flex flex-col md:flex-row gap-4" id="keys-layout-box">
            {/* Scientific Panel (Toggleable) */}
            <AnimatePresence mode="wait">
              {isScientific && (
                <div className="w-full md:w-[320px] shrink-0" id="scientific-wrapper">
                  <ScientificPanel
                    onKeyPress={handleKeyPress}
                    angleMode={angleMode}
                    toggleAngleMode={() => setAngleMode(angleMode === 'DEG' ? 'RAD' : 'DEG')}
                    activeKey={activeKey}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Standard Keypad */}
            <div className="grid grid-cols-4 gap-3 flex-1" id="standard-keypad">
              {/* Row 1 */}
              <button
                onClick={() => handleKeyPress('AC')}
                className={`
                  w-full aspect-square rounded-full font-semibold font-sans text-sm flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === 'AC' ? 'scale-95 bg-rose-500 text-white border-transparent shadow-lg shadow-rose-500/20' : 'bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 border-rose-500/10'}
                `}
                id="btn-ac"
              >
                {expression ? 'C' : 'AC'}
              </button>
              
              <button
                onClick={handleBackspace}
                className={`
                  w-full aspect-square rounded-full font-semibold text-sm flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === 'Backspace' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                title="Backspace"
                id="btn-backspace"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={() => handleKeyPress('%')}
                className={`
                  w-full aspect-square rounded-full font-semibold text-base flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '%' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-premium-gold/[0.04] text-premium-gold hover:bg-premium-gold/10 border-premium-gold/10'}
                `}
                id="btn-percent"
              >
                %
              </button>

              <button
                onClick={() => handleKeyPress('÷')}
                className={`
                  w-full aspect-square rounded-full font-semibold text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '÷' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-premium-gold/[0.04] text-premium-gold hover:bg-premium-gold/10 border-premium-gold/10'}
                `}
                id="btn-divide"
              >
                ÷
              </button>

              {/* Row 2 */}
              <button
                onClick={() => handleKeyPress('7')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '7' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-7"
              >
                7
              </button>
              <button
                onClick={() => handleKeyPress('8')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '8' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-8"
              >
                8
              </button>
              <button
                onClick={() => handleKeyPress('9')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '9' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-9"
              >
                9
              </button>
              <button
                onClick={() => handleKeyPress('×')}
                className={`
                  w-full aspect-square rounded-full font-semibold text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '×' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-premium-gold/[0.04] text-premium-gold hover:bg-premium-gold/10 border-premium-gold/10'}
                `}
                id="btn-multiply"
              >
                ×
              </button>

              {/* Row 3 */}
              <button
                onClick={() => handleKeyPress('4')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '4' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-4"
              >
                4
              </button>
              <button
                onClick={() => handleKeyPress('5')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '5' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-5"
              >
                5
              </button>
              <button
                onClick={() => handleKeyPress('6')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '6' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-6"
              >
                6
              </button>
              <button
                onClick={() => handleKeyPress('-')}
                className={`
                  w-full aspect-square rounded-full font-semibold text-xl flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '-' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-premium-gold/[0.04] text-premium-gold hover:bg-premium-gold/10 border-premium-gold/10'}
                `}
                id="btn-subtract"
              >
                -
              </button>

              {/* Row 4 */}
              <button
                onClick={() => handleKeyPress('1')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '1' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-1"
              >
                1
              </button>
              <button
                onClick={() => handleKeyPress('2')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '2' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-2"
              >
                2
              </button>
              <button
                onClick={() => handleKeyPress('3')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '3' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-3"
              >
                3
              </button>
              <button
                onClick={() => handleKeyPress('+')}
                className={`
                  w-full aspect-square rounded-full font-semibold text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '+' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-premium-gold/[0.04] text-premium-gold hover:bg-premium-gold/10 border-premium-gold/10'}
                `}
                id="btn-add"
              >
                +
              </button>

              {/* Row 5 */}
              {/* Scientific Toggle Key */}
              <button
                onClick={() => {
                  if (soundEnabled) playTactileClick();
                  setIsScientific(!isScientific);
                }}
                className={`
                  w-full aspect-square rounded-full font-semibold text-xs flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-200 border
                  ${isScientific ? 'bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-premium-gold/[0.04] text-premium-gold border-premium-gold/20 hover:bg-premium-gold/10'}
                `}
                id="btn-toggle-scientific"
              >
                <span className="font-sans leading-none">f(x)</span>
                <span className="text-[7px] uppercase tracking-wider opacity-60 font-mono mt-0.5">Sci Mode</span>
              </button>

              <button
                onClick={() => handleKeyPress('0')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '0' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-0"
              >
                0
              </button>

              <button
                onClick={() => handleKeyPress('.')}
                className={`
                  w-full aspect-square rounded-full font-normal text-lg flex items-center justify-center cursor-pointer select-none transition-all duration-150 border
                  ${activeKey === '.' ? 'scale-95 bg-premium-gold text-dark-black border-transparent shadow-lg shadow-premium-gold/25' : 'bg-white/[0.03] text-gray-200 hover:text-white hover:bg-white/[0.08] border-white/5'}
                `}
                id="btn-decimal"
              >
                .
              </button>

              <button
                onClick={() => handleKeyPress('=')}
                className={`
                  w-full aspect-square rounded-full font-semibold text-xl flex items-center justify-center cursor-pointer select-none transition-all duration-150 shadow-lg shadow-premium-gold/15 border border-transparent
                  ${activeKey === '=' ? 'scale-95 bg-white text-dark-black' : 'bg-premium-gold hover:bg-[#bda773] text-dark-black'}
                `}
                id="btn-equals"
              >
                =
              </button>
            </div>
          </div>

          {/* Copied Clipboard Tooltip Banner */}
          <AnimatePresence>
            {copied && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-premium-gold text-dark-black text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 z-50 pointer-events-none"
                id="copy-toast"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Copied to Clipboard!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive History Panel Overlay */}
          <AnimatePresence>
            {isHistoryOpen && (
              <HistoryPanel
                history={history}
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onClear={handleClearHistory}
                onSelect={handleSelectHistory}
                onDeleteOne={handleDeleteOneHistory}
              />
            )}
          </AnimatePresence>

          {/* Custom Download App Guide Panel */}
          <AnimatePresence>
            {isInstallInfoOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 bg-[#111111]/98 backdrop-blur-md rounded-[40px] z-40 flex flex-col p-8 overflow-hidden border border-white/10 shadow-2xl"
                id="install-info-panel"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4" id="install-header">
                  <div className="flex flex-col">
                    <div className="text-[10px] uppercase tracking-[3px] text-gray-500 mb-1 font-sans">Device Setup</div>
                    <h2 className="font-serif text-2xl text-premium-gold italic leading-tight" id="install-title">
                      Download Application
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      if (soundEnabled) playTactileClick();
                      setIsInstallInfoOpen(false);
                    }}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    id="close-install-info"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Instructions */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-5 scrollbar text-sm text-gray-300 font-sans" id="install-instructions">
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Install Axiom Precision Instruments directly on your Android device to run it offline as a standalone app.
                  </p>

                  <div className="space-y-4">
                    {/* Android Instruction */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-premium-gold font-medium mb-1.5">
                        <span className="text-xs bg-premium-gold/10 text-premium-gold px-2 py-0.5 rounded font-mono">Android</span>
                        <span className="text-xs">Chrome / Edge / Firefox</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Tap the menu button <span className="font-bold text-white font-mono">⋮</span> in your browser's top right or bottom corner and select <span className="text-premium-gold font-medium">Install App</span> or <span className="text-premium-gold font-medium">Add to Home screen</span>.
                      </p>
                    </div>

                    {/* iOS Instruction */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-premium-gold font-medium mb-1.5">
                        <span className="text-xs bg-premium-gold/10 text-premium-gold px-2 py-0.5 rounded font-mono">iOS</span>
                        <span className="text-xs">Safari</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Tap the share button <span className="font-bold text-white font-mono">⎋</span> at the bottom of Safari, scroll down, and select <span className="text-premium-gold font-medium">Add to Home Screen</span>.
                      </p>
                    </div>

                    {/* Desktop Instruction */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-premium-gold font-medium mb-1.5">
                        <span className="text-xs bg-premium-gold/10 text-premium-gold px-2 py-0.5 rounded font-mono">Desktop</span>
                        <span className="text-xs">Chrome / Brave / Edge</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Click the computer install icon <span className="text-premium-gold font-medium font-mono">⊕</span> in the browser URL address bar to download immediately.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-white/10 flex justify-end" id="install-footer">
                  <button
                    onClick={() => {
                      if (soundEnabled) playTactileClick();
                      setIsInstallInfoOpen(false);
                    }}
                    className="bg-premium-gold text-dark-black hover:bg-[#bda773] px-5 py-2 rounded-full text-xs font-semibold shadow-lg shadow-premium-gold/15 transition-all"
                  >
                    Got It
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
