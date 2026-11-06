import OpenAI from 'openai';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

if (!API_KEY) {
  console.warn('Groq API key not found. Add VITE_GROQ_API_KEY to your .env file.');
}

const groq = new OpenAI({
  apiKey: API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
  dangerouslyAllowBrowser: true,
});

export interface BusinessContext {
  businessName: string;
  totalRevenue: number;
  totalPending: number;
  todayRevenue: number;
  todayOwed: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  topProducts: { name: string; sales: number; revenue: number }[];
  recentTransactions: {
    name: string;
    items?: string;
    amount: number;
    status: string;
  }[];
  totalExpenses: number;
  todayExpenses: number;
  // NEW: Added to match the frontend anomaly detection
  anomalies: string[];
}

export const buildFinancialContext = (context: BusinessContext): string => {
  const netProfit = context.totalRevenue - context.totalExpenses;
  const todayProfit = context.todayRevenue - context.todayExpenses;
  const profitLabel = netProfit >= 0 ? 'Profit' : 'Loss';

  const lines = [
    `Business: ${context.businessName || 'SME'}`,
    ``,
    `=== MONEY IN ===`,
    `Total Revenue (all time): M ${context.totalRevenue.toFixed(2)}`,
    `Today's Revenue: M ${context.todayRevenue.toFixed(2)}`,
    ``,
    `=== MONEY OUT ===`,
    `Total Expenses (all time): M ${context.totalExpenses.toFixed(2)}`,
    `Today's Expenses: M ${context.todayExpenses.toFixed(2)}`,
    ``,
    `=== PROFIT ===`,
    `Net ${profitLabel} (all time): M ${netProfit.toFixed(2)}`,
    `Today's ${profitLabel}: M ${todayProfit.toFixed(2)}`,
    ``,
    `=== OWED TO YOU ===`,
    `Total Outstanding (Sekoloto): M ${context.totalPending.toFixed(2)}`,
    `Today's Owed: M ${context.todayOwed.toFixed(2)}`,
    ``,
    `=== INVENTORY ===`,
    `Total Products: ${context.totalProducts}`,
    `Low Stock Items: ${context.lowStockCount}`,
    `Out of Stock Items: ${context.outOfStockCount}`,
    `Total Stock Value: M ${context.totalStockValue.toFixed(2)}`,
  ];

  if (context.topProducts.length > 0) {
    lines.push('');
    lines.push('Top Selling Products:');
    context.topProducts.forEach((p, i) => {
      lines.push(`  ${i + 1}. ${p.name} — ${p.sales} sales — M ${p.revenue.toFixed(2)}`);
    });
  }

  if (context.recentTransactions.length > 0) {
    lines.push('');
    lines.push('Recent Transactions:');
    context.recentTransactions.forEach((t) => {
      const itemsText = t.items && t.items.length > 0 ? t.items : '-';
      lines.push(`  - ${t.name}: ${itemsText} — M ${t.amount.toFixed(2)} (${t.status})`);
    });
  }

  // NEW: Pass the anomalies to the AI
  if (context.anomalies && context.anomalies.length > 0) {
    lines.push('');
    lines.push('=== CRITICAL ANOMALIES (UNUSUAL ACTIVITY DETECTED) ===');
    context.anomalies.forEach((a) => {
      lines.push(`  🔴 WARNING: ${a}`);
    });
  }

  return lines.join('\n');
};

export const askGemini = async (
  userQuestion: string,
  context: BusinessContext,
  language: 'en' | 'st' = 'en'
): Promise<string> => {
  if (!API_KEY) {
    return 'AI Assistant is not configured. Please add your Groq API key.';
  }

  const financialContext = buildFinancialContext(context);

  const systemPrompt =
    language === 'st'
      ? `Uena ke moeletsi oa lichelete ea nang le boiphihlelo bakeng sa SME e Lesotho.

**HLOKOMELA: Araba ka SESOTHO FEELA. Se sebelise Senyesemane ho hang.**
**SEBEDISA MARKDOWN:** Kaho e hlophisitsoeng hantle. Sebelisa **mongolo o motenya** bakeng sa chelete (mohlala, **M 500.00**). Sebelisa lintlha (bullet points) ha u thathamisa lintho tse fetang e le 'ngoe.

Lintlha tsa khoebo:
${financialContext}

Litaelo tsa bohlokoa:
1. Ha u botsa ka pholokelo (profit), sebelisa Net Profit = Revenue − Expenses.
2. Ha u botsa ka litšenyehelo (expenses), sebelisa Total Expenses kapa Today's Expenses.
3. **TLHOKOMELO E KHOLO:** Haeba ho na le "CRITICAL ANOMALIES" ho data e ka holimo, qala karabo ea hau ka ho hlokomelisa mosebelisi ka bothata bona. Sebelisa letshwao lena: 🔴.
4. U se ke ua fana ka likeletso tsa lichelete tse tebileng — u fana ka tlhahisoleseding feela.`
      : `You are an expert financial advisor for an SME in Lesotho.

**IMPORTANT: Answer in ENGLISH ONLY. Do not use Sesotho.**
**USE MARKDOWN:** Format your answers beautifully. **Bold** all currency amounts (e.g., **M 500.00**). Use bullet points when listing multiple items.

Business data:
${financialContext}

Critical instructions:
1. When asked about profit, use Net Profit = Revenue − Expenses.
2. When asked about spending, use Total Expenses or Today's Expenses.
3. **CRITICAL ALERT:** If there are "CRITICAL ANOMALIES" in the data above, you MUST begin your response by warning the user about these unusual doings. Use a red circle emoji (🔴) for warnings.
4. Do not give formal financial advice — only provide insights based on the data.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion },
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.3, // Lower temperature makes the AI more focused and professional
    });

    return completion.choices[0]?.message?.content || 'No response received.';
  } catch (error) {
    console.error('Groq error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `AI error: ${message}`;
  }
};