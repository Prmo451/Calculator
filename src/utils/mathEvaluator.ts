/**
 * A highly robust, mathematical expression evaluator implemented as a recursive descent parser.
 * It strictly avoids the insecure eval() function.
 * Supports:
 * - Basic operations (+, -, *, /, ^)
 * - Operator precedence and parentheses
 * - Implicit multiplication (e.g., 2(3+4) -> 2*(3+4), 2π -> 2*π)
 * - Functions: sin, cos, tan, log, ln, sqrt
 * - Constants: π (pi), e (Euler's number)
 * - Percentages (e.g., 5% -> 0.05)
 * - Error reporting for syntax, mismatched parentheses, or division by zero.
 */

export function evaluateExpression(expr: string, isRadians: boolean = false): number {
  let pos = -1;
  let ch = '';

  const cleanedExpr = preprocess(expr);

  function nextChar() {
    pos++;
    ch = pos < cleanedExpr.length ? cleanedExpr.charAt(pos) : '';
  }

  function eat(charToEat: string): boolean {
    while (ch === ' ') nextChar();
    if (ch === charToEat) {
      nextChar();
      return true;
    }
    return false;
  }

  function parse(): number {
    nextChar();
    const x = parseExpression();
    if (pos < cleanedExpr.length) {
      throw new Error(`Unexpected character: '${ch}'`);
    }
    return x;
  }

  // Expression = Term + Term - Term
  function parseExpression(): number {
    let x = parseTerm();
    for (;;) {
      if (eat('+')) x += parseTerm();
      else if (eat('-')) x -= parseTerm();
      else return x;
    }
  }

  // Term = Factor * Factor / Factor
  function parseTerm(): number {
    let x = parseFactor();
    for (;;) {
      if (eat('*') || eat('×')) {
        x *= parseFactor();
      } else if (eat('/') || eat('÷')) {
        const divisor = parseFactor();
        if (divisor === 0) {
          throw new Error('Division by zero');
        }
        x /= divisor;
      } else {
        return x;
      }
    }
  }

  // Factor = Unary | Power | Percentage
  function parseFactor(): number {
    if (eat('+')) return parseFactor(); // unary plus
    if (eat('-')) return -parseFactor(); // unary minus

    let x = 0;
    const startPos = pos;

    if (eat('(')) { // parentheses
      x = parseExpression();
      if (!eat(')')) {
        throw new Error('Missing closing parenthesis \')\'');
      }
    } else if ((ch >= '0' && ch <= '9') || ch === '.') { // numbers
      while ((ch >= '0' && ch <= '9') || ch === '.') {
        nextChar();
      }
      x = parseFloat(cleanedExpr.substring(startPos, pos));
    } else if ((ch >= 'a' && ch <= 'z') || ch === '√' || ch === 'π') { // functions or constants
      let name = '';
      if (ch === '√') {
        name = 'sqrt';
        nextChar();
      } else if (ch === 'π') {
        name = 'pi';
        nextChar();
      } else {
        while ((ch >= 'a' && ch <= 'z')) {
          name += ch;
          nextChar();
        }
      }

      if (name === 'pi') {
        x = Math.PI;
      } else if (name === 'e') {
        x = Math.E;
      } else if (name === 'sqrt') {
        // Handle square root either as sqrt(x) or √x
        let arg: number;
        if (eat('(')) {
          arg = parseExpression();
          if (!eat(')')) {
            throw new Error('Missing closing parenthesis \')\' for sqrt');
          }
        } else {
          arg = parseFactor();
        }
        if (arg < 0) {
          throw new Error('Cannot compute square root of negative number');
        }
        x = Math.sqrt(arg);
      } else if (name === 'sin' || name === 'cos' || name === 'tan' || name === 'log' || name === 'ln') {
        if (!eat('(')) {
          throw new Error(`Missing '(' after function '${name}'`);
        }
        const arg = parseExpression();
        if (!eat(')')) {
          throw new Error(`Missing ')' after function '${name}'`);
        }
        
        if (name === 'sin') {
          const angle = isRadians ? arg : (arg * Math.PI) / 180;
          x = Math.sin(angle);
        } else if (name === 'cos') {
          const angle = isRadians ? arg : (arg * Math.PI) / 180;
          x = Math.cos(angle);
        } else if (name === 'tan') {
          const angle = isRadians ? arg : (arg * Math.PI) / 180;
          // Check for tan(90) which is undefined
          if (Math.abs(Math.cos(angle)) < 1e-12) {
            throw new Error('Tangent undefined');
          }
          x = Math.tan(angle);
        } else if (name === 'log') {
          if (arg <= 0) {
            throw new Error('Logarithm input must be greater than zero');
          }
          x = Math.log10(arg);
        } else if (name === 'ln') {
          if (arg <= 0) {
            throw new Error('Logarithm input must be greater than zero');
          }
          x = Math.log(arg);
        }
      } else {
        throw new Error(`Unknown function or constant: '${name}'`);
      }
    } else {
      throw new Error(`Unexpected character: '${ch}'`);
    }

    // Handle exponents: Factor ^ Factor (e.g., 2^3)
    if (eat('^')) {
      x = Math.pow(x, parseFactor());
    }

    // Handle percentages (e.g., 5% -> 0.05, 5% ^ 2 -> (0.05)^2)
    if (eat('%')) {
      x = x / 100;
    }

    return x;
  }

  /**
   * Preprocesses the mathematical string to support implicit multiplication
   * and normalize symbols.
   */
  function preprocess(s: string): string {
    // 1. Remove space characters and normalize operations
    s = s.replace(/\s+/g, '');
    s = s.replace(/×/g, '*').replace(/÷/g, '/');

    let result = '';
    for (let i = 0; i < s.length; i++) {
      const cur = s.charAt(i);
      result += cur;
      
      if (i < s.length - 1) {
        const next = s.charAt(i + 1);
        
        // Implicit multiplication conditions:
        // - A number or constant or ')' or '%' followed by '(' or constant or function or square root
        const isCurrentOperand = (cur >= '0' && cur <= '9') || cur === 'π' || cur === 'e' || cur === ')' || cur === '%';
        const isNextOperandStart = next === '(' || next === 'π' || next === 'e' || next === '√' || (next >= 'a' && next <= 'z');
        
        // Prevent adding '*' in between letters of a function word (e.g., s-i-n in 'sin')
        const isCurrentLetter = cur >= 'a' && cur <= 'z';
        const isNextLetter = next >= 'a' && next <= 'z';
        
        if (isCurrentOperand && isNextOperandStart) {
          result += '*';
        } else if (isCurrentLetter && isNextLetter) {
          // forming function names (sin, cos, log, ln, sqrt etc)
        } else if (isCurrentLetter && (next === '(' || next === 'π' || next === 'e' || next === '√')) {
          // E.g., 'e sin(3)' or 'e(' -> multiply, unless 'e' is part of a function (no functions currently end with e)
          result += '*';
        }
      }
    }
    return result;
  }

  return parse();
}

/**
 * Format mathematical results for elegant UI display.
 * Avoids long float inaccuracies (e.g., 0.1 + 0.2 = 0.30000000000000004)
 * and trims trailing zeroes.
 */
export function formatResult(value: number): string {
  if (isNaN(value)) return 'Error';
  if (!isFinite(value)) return 'Infinity';
  
  // Handle tiny numbers or giant numbers with exponential notation
  if (Math.abs(value) > 1e12 || (Math.abs(value) < 1e-9 && value !== 0)) {
    return value.toExponential(8).replace(/\.?0+(?=e)/, ''); // Clean exponent representation
  }
  
  // Format standard floats with up to 10 decimal places of accuracy
  const fixed = Number(value.toFixed(10));
  return fixed.toString();
}
