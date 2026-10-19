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
}

export const buildFinancialContext = (context: BusinessContext): string => {
  const lines = [
    `Business: ${context.businessName || 'SME'}`,
    `Total Revenue (all time): M ${context.totalRevenue.toFixed(2)}`,
    `Total Outstanding (Sekoloto): M ${context.totalPending.toFixed(2)}`,
    `Today's Revenue: M ${context.todayRevenue.toFixed(2)}`,
    `Today's Owed: M ${context.todayOwed.toFixed(2)}`,
    `Total Products: ${context.totalProducts}`,
    `Low Stock Items: ${context.lowStockCount}`,
    `Out of Stock Items: ${context.outOfStockCount}`,
    `Total Stock Value: M ${context.totalStockValue.toFixed(2)}`,
  ];

  if (context.topProducts.length > 0) {
    lines.push('Top Selling Products:');
    context.topProducts.forEach((p, i) => {
      lines.push(`  ${i + 1}. ${p.name} — ${p.sales} sales — M ${p.revenue.toFixed(2)}`);
    });
  }

  if (context.recentTransactions.length > 0) {
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

Bua ka mokhoa o bonolo le o khutšoanyane. U se ke ua fana ka likeletso tsa lichelete tse tebileng — u fana ka tlhahisoleseding feela.`
      : `You are a financial assistant for an SME in Lesotho.

**IMPORTANT: Answer in ENGLISH ONLY. Do not use Sesotho.**

Business data:
${financialContext}

Speak in simple, short terms. Do not give formal financial advice — only provide insights based on data.`;

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