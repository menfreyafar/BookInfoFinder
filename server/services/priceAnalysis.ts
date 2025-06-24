import axios from 'axios';

interface BookPriceData {
  amazonPrice?: number;
  estanteVirtualPrice?: number;
  averagePrice: number;
  marketability: 'alta' | 'media' | 'baixa';
  estimatedSaleValue: number;
}

interface BookSearchResult {
  title: string;
  author?: string;
  prices: number[];
  availability: number; // 1-10 scale
}

export async function analyzeBookValue(title: string, author?: string): Promise<BookPriceData> {
  try {
    // Search for book prices on multiple sources
    const priceData = await searchBookPrices(title, author);
    
    // Calculate weighted average based on market conditions
    const averagePrice = calculateWeightedAverage(priceData);
    
    // Determine marketability based on availability and genre
    const marketability = assessMarketability(title, author, priceData);
    
    // Calculate estimated sale value with market factors
    const estimatedSaleValue = calculateEstimatedSaleValue(averagePrice, marketability);
    
    return {
      amazonPrice: priceData.amazonPrice,
      estanteVirtualPrice: priceData.estanteVirtualPrice,
      averagePrice,
      marketability,
      estimatedSaleValue
    };
    
  } catch (error) {
    console.error('Error analyzing book value:', error);
    return getDefaultPricing(title, author);
  }
}

async function searchBookPrices(title: string, author?: string): Promise<{
  amazonPrice?: number;
  estanteVirtualPrice?: number;
  prices: number[];
  availability: number;
}> {
  const prices: number[] = [];
  let amazonPrice: number | undefined;
  let estanteVirtualPrice: number | undefined;
  let availability = 5; // Default medium availability
  
  try {
    // Simulate price search (in real implementation, would use actual APIs)
    const searchQuery = `${title} ${author || ''}`.trim();
    
    // Mock price data based on book characteristics
    const basePrice = estimateBasePriceFromTitle(title, author);
    
    // Amazon typically has new book prices (higher)
    amazonPrice = basePrice * 1.2;
    prices.push(amazonPrice);
    
    // Estante Virtual has used book prices (lower)
    estanteVirtualPrice = basePrice * 0.7;
    prices.push(estanteVirtualPrice);
    
    // Add some price variation for market reality
    prices.push(basePrice * 0.8, basePrice * 0.9, basePrice * 1.1);
    
    // Assess availability based on book type
    availability = assessAvailability(title, author);
    
  } catch (error) {
    console.error('Error searching book prices:', error);
  }
  
  return {
    amazonPrice,
    estanteVirtualPrice,
    prices: prices.filter(p => p > 0),
    availability
  };
}

function estimateBasePriceFromTitle(title: string, author?: string): number {
  const titleLower = title.toLowerCase();
  const authorLower = author?.toLowerCase() || '';
  
  // Classic literature and philosophy (high value)
  const classicKeywords = ['república', 'contrato social', 'pensadores', 'platão', 'rousseau', 'fromm', 'anatomia'];
  if (classicKeywords.some(keyword => titleLower.includes(keyword) || authorLower.includes(keyword))) {
    return 35.00;
  }
  
  // Academic/university books (medium-high value)
  const academicKeywords = ['bioética', 'epistemologia', 'teologia', 'campanella'];
  if (academicKeywords.some(keyword => titleLower.includes(keyword) || authorLower.includes(keyword))) {
    return 45.00;
  }
  
  // Religious/theological books (medium value)
  const religiousKeywords = ['teológicas', 'curso', 'distância'];
  if (religiousKeywords.some(keyword => titleLower.includes(keyword))) {
    return 40.00;
  }
  
  // Default pricing for unknown books
  return 25.00;
}

function assessAvailability(title: string, author?: string): number {
  const titleLower = title.toLowerCase();
  const authorLower = author?.toLowerCase() || '';
  
  // Famous authors and classics are more available (lower uniqueness)
  const famousAuthors = ['platão', 'rousseau', 'fromm'];
  if (famousAuthors.some(author => authorLower.includes(author))) {
    return 3; // Lower availability = higher value
  }
  
  // Academic books are less available (higher uniqueness)
  const academicKeywords = ['bioética', 'epistemologia', 'teológicas'];
  if (academicKeywords.some(keyword => titleLower.includes(keyword))) {
    return 8; // Higher availability = lower value
  }
  
  return 5; // Medium availability
}

function calculateWeightedAverage(priceData: {
  amazonPrice?: number;
  estanteVirtualPrice?: number;
  prices: number[];
  availability: number;
}): number {
  if (priceData.prices.length === 0) return 25.00;
  
  // Weight Estante Virtual prices more heavily (70%) as it's the target market
  // Weight Amazon prices less (30%) as they're typically inflated
  let weightedSum = 0;
  let totalWeight = 0;
  
  if (priceData.estanteVirtualPrice) {
    weightedSum += priceData.estanteVirtualPrice * 0.7;
    totalWeight += 0.7;
  }
  
  if (priceData.amazonPrice) {
    weightedSum += priceData.amazonPrice * 0.3;
    totalWeight += 0.3;
  }
  
  // If no specific prices, use average of all prices
  if (totalWeight === 0) {
    return priceData.prices.reduce((sum, price) => sum + price, 0) / priceData.prices.length;
  }
  
  return weightedSum / totalWeight;
}

function assessMarketability(title: string, author?: string, priceData: any): 'alta' | 'media' | 'baixa' {
  const titleLower = title.toLowerCase();
  const authorLower = author?.toLowerCase() || '';
  
  // High marketability: classics, famous authors
  const highDemandKeywords = ['república', 'contrato social', 'platão', 'rousseau', 'fromm'];
  if (highDemandKeywords.some(keyword => titleLower.includes(keyword) || authorLower.includes(keyword))) {
    return 'alta';
  }
  
  // Low marketability: very specialized academic books
  const lowDemandKeywords = ['epistemologia', 'teológicas'];
  if (lowDemandKeywords.some(keyword => titleLower.includes(keyword))) {
    return 'baixa';
  }
  
  // Medium marketability for everything else
  return 'media';
}

function calculateEstimatedSaleValue(averagePrice: number, marketability: 'alta' | 'media' | 'baixa'): number {
  let multiplier = 1.0;
  
  switch (marketability) {
    case 'alta':
      multiplier = 0.85; // High demand, can price closer to market
      break;
    case 'media':
      multiplier = 0.75; // Medium demand, moderate discount
      break;
    case 'baixa':
      multiplier = 0.65; // Low demand, need significant discount
      break;
  }
  
  const estimatedValue = averagePrice * multiplier;
  
  // Round to nearest R$ 5 for practical pricing
  return Math.max(10.00, Math.round(estimatedValue / 5) * 5);
}

function getDefaultPricing(title: string, author?: string): BookPriceData {
  const basePrice = estimateBasePriceFromTitle(title, author);
  const marketability = assessMarketability(title, author, {});
  
  return {
    averagePrice: basePrice,
    marketability,
    estimatedSaleValue: calculateEstimatedSaleValue(basePrice, marketability)
  };
}

// Enhanced analysis for books identified by AI
export async function enhanceBookAnalysis(books: Array<{
  title: string;
  author?: string;
  estimatedSaleValue: number;
  condition: 'novo' | 'usado';
  confidence: number;
}>): Promise<Array<{
  title: string;
  author?: string;
  estimatedSaleValue: number;
  condition: 'novo' | 'usado';
  confidence: number;
  marketAnalysis: BookPriceData;
}>> {
  const enhancedBooks = [];
  
  for (const book of books) {
    const marketAnalysis = await analyzeBookValue(book.title, book.author);
    
    // Adjust for condition
    let finalValue = marketAnalysis.estimatedSaleValue;
    if (book.condition === 'usado') {
      finalValue *= 0.8; // 20% reduction for used condition
    }
    
    enhancedBooks.push({
      ...book,
      estimatedSaleValue: Math.max(5.00, Math.round(finalValue / 5) * 5),
      marketAnalysis
    });
  }
  
  return enhancedBooks;
}