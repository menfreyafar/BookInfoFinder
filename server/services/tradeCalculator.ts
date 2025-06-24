// Calculadora de Valores de Troca - Política Luar Sebo e Livraria

interface TradeCalculationInput {
  estimatedSaleValue: number;
  publishYear?: number;
  isCompleteSeries?: boolean;
  condition: 'novo' | 'usado';
}

interface TradeCalculationResult {
  basePercentage: number;
  valueBonus: number;
  yearBonus: number;
  finalPercentage: number;
  calculatedTradeValue: number;
  finalTradeValue: number;
}

export function calculateTradeValue(input: TradeCalculationInput): TradeCalculationResult {
  const { estimatedSaleValue, publishYear, isCompleteSeries = false, condition } = input;
  
  // 1. Valor base: 20%
  let basePercentage = 20;
  
  // 2. Progressão por valor (para valores acima de R$ 30, +10% para cada R$ 10 excedentes)
  let valueBonus = 0;
  if (estimatedSaleValue > 30) {
    const excessValue = estimatedSaleValue - 30;
    const bonusSteps = Math.floor(excessValue / 10);
    valueBonus = bonusSteps * 10;
  }
  
  // 3. Bônus por ano de lançamento
  let yearBonus = 0;
  if (publishYear) {
    const currentYear = new Date().getFullYear();
    if (publishYear >= 2024) {
      yearBonus = 10;
    } else if (publishYear >= 2022) {
      yearBonus = 5;
    }
  }
  
  // 4. Cálculo do percentual total
  let totalPercentage = basePercentage + valueBonus + yearBonus;
  
  // 5. Aplicar regras especiais
  if (isCompleteSeries) {
    // Série completa: aplicar 50% direto
    totalPercentage = 50;
  }
  
  // 6. Limite máximo de 50%
  const finalPercentage = Math.min(totalPercentage, 50);
  
  // 7. Calcular valor da troca
  const calculatedTradeValue = (estimatedSaleValue * finalPercentage) / 100;
  
  // 8. Arredondar para múltiplo de R$ 5 mais próximo (para cima)
  const finalTradeValue = Math.ceil(calculatedTradeValue / 5) * 5;
  
  return {
    basePercentage,
    valueBonus,
    yearBonus,
    finalPercentage,
    calculatedTradeValue,
    finalTradeValue
  };
}

export function formatTradeExplanation(input: TradeCalculationInput, result: TradeCalculationResult): string {
  const { estimatedSaleValue, publishYear, isCompleteSeries, condition } = input;
  const { basePercentage, valueBonus, yearBonus, finalPercentage, calculatedTradeValue, finalTradeValue } = result;
  
  let explanation = `Cálculo da Troca:\n`;
  explanation += `• Valor estimado de venda: R$ ${estimatedSaleValue.toFixed(2)}\n`;
  explanation += `• Condição: ${condition}\n`;
  
  if (isCompleteSeries) {
    explanation += `• Série completa: 50% direto\n`;
  } else {
    explanation += `• Percentual base: ${basePercentage}%\n`;
    
    if (valueBonus > 0) {
      explanation += `• Bônus por valor (acima de R$ 30): +${valueBonus}%\n`;
    }
    
    if (yearBonus > 0 && publishYear) {
      explanation += `• Bônus por ano (${publishYear}): +${yearBonus}%\n`;
    }
  }
  
  explanation += `• Percentual final: ${finalPercentage}%\n`;
  explanation += `• Valor calculado: R$ ${calculatedTradeValue.toFixed(2)}\n`;
  explanation += `• Valor final (arredondado): R$ ${finalTradeValue.toFixed(2)}`;
  
  return explanation;
}