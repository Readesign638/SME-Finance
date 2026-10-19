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
  // ---- NEW: expense tracking ----
  totalExpenses: number;
  todayExpenses: number;
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
      ? `Uena ke mothusi oa lichelete bakeng sa SME e Lesotho.

**HLOKOMELA: Araba ka SESOTHO FEELA. Se sebelise Senyesemane ho hang.**

Lintlha tsa khoebo:
${financialContext}

Bua ka mokhoa o bonolo le o khutšoanyane.
- Ha u botsa ka pholokelo (profit), sebelisa Net Profit = Revenue − Expenses.
- Ha u botsa ka litšenyehelo (expenses), sebelisa Total Expenses kapa Today's Expenses.
- U se ke ua fana ka likeletso tsa lichelete tse tebileng — u fana ka tlhahisoleseding feela.`
      : `You are a financial assistant for an SME in Lesotho.

**IMPORTANT: Answer in ENGLISH ONLY. Do not use Sesotho.**

Business data:
${financialContext}

Speak in simple, short terms.
- When asked about profit, use Net Profit = Revenue − Expenses.
- When asked about spending, use Total Expenses or Today's Expenses.
- Do not give formal financial advice — only provide insights based on data.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion },
      ],
      model: 'openai/gpt-oss-120b',
    });

    return completion.choices[0]?.message?.content || 'No response received.';
  } catch (error) {
    console.error('Groq error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `AI error: ${message}`;
  }
};