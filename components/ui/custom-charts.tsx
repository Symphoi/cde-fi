'use client';

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

// ----------------------
// TYPES
// ----------------------
export type TransactionSummary = {
  name: string;
  expense: number;
  revenue: number;
  balance: number;
};

export type FinancialBreakdown = {
  name: string;
  value: number;
};

export type RevenueTrend = {
  name: string;
  value: number;
};

export type CashAdvanceTrend = {
  name: string;
  value: number;
};

export type ReimburseAnalysis = {
  name: string;
  value: number;
};

// ----------------------
// HELPER FORMAT RUPIAH
// ----------------------
export function formatRupiahShort(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)} T`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(1)} K`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export function formatRupiahFull(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

// ----------------------
// TOOLTIP CUSTOM
// ----------------------
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md bg-white shadow-md border px-3 py-2 text-sm text-foreground">
        <p className="font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-muted-foreground">
            {entry.name}: <span className="font-semibold">{formatRupiahFull(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ----------------------
// BAR CHART - Financial Overview / Reimburse Analysis
// ----------------------
export function CustomBarChart({ data }: { data: TransactionSummary[] | ReimburseAnalysis[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis tickFormatter={formatRupiahShort} stroke="#9ca3af" />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="balance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ----------------------
// PIE CHART - Reimburse / Expense Breakdown
// ----------------------
const PIE_COLORS = [
  '#60a5fa','#f472b6','#c0c0c0','#000000','#fbbf24','#34d399','#a78bfa','#f87171',
  '#3b82f6','#22c55e','#8b5cf6','#f59e0b','#10b981','#6366f1','#f43f5e','#e879f9',
  '#facc15','#14b8a6','#7c3aed','#ef4444','#2563eb','#16a34a','#db2777','#fde68a',
  '#38bdf8','#84cc16','#a78bfa','#f97316','#22d3ee','#ec4899','#fcd34d','#0ea5e9','#4ade80'
];

export function CustomPieChart({ data }: { data: FinancialBreakdown[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

// ----------------------
// AREA CHART - Revenue / Cash Advance Trend
// ----------------------
export function CustomAreaChart({ data }: { data: RevenueTrend[] | CashAdvanceTrend[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
        <XAxis dataKey="name" axisLine={false} tickLine={false}/>
        <YAxis axisLine={false} tickLine={false} tickFormatter={formatRupiahShort}/>
        <Tooltip content={<CustomTooltip />}/>
        <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fill="url(#colorValue)" dot={{r:4,strokeWidth:2,fill:'#fff'}} activeDot={{r:6}}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ----------------------
// LINE CHART - optional
// ----------------------
export function CustomLineChart({ data }: { data: RevenueTrend[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top:10,right:30,left:0,bottom:0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
        <XAxis dataKey="name" stroke="#9ca3af"/>
        <YAxis tickFormatter={formatRupiahShort} stroke="#9ca3af"/>
        <Tooltip content={<CustomTooltip />}/>
        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, stroke:'#3b82f6', strokeWidth:2, fill:'white' }} activeDot={{ r:6, fill:'#3b82f6', stroke:'white', strokeWidth:2 }}/>
      </LineChart>
    </ResponsiveContainer>
  );
}

// ----------------------
// EXPORT CHARTS FOR DASHBOARD
// ----------------------
export function FinancialOverviewChart({ data }: { data: TransactionSummary[] }) {
  return <CustomBarChart data={data} />;
}

export function ReimburseBreakdownChart({ data }: { data: FinancialBreakdown[] }) {
  return <CustomPieChart data={data} />;
}

export function ExpenseBreakdownChart({ data }: { data: FinancialBreakdown[] }) {
  return <CustomPieChart data={data} />;
}

export function RevenueTrendChart({ data }: { data: RevenueTrend[] }) {
  return <CustomAreaChart data={data} />;
}

export function CashAdvanceTrendChart({ data }: { data: CashAdvanceTrend[] }) {
  return <CustomAreaChart data={data} />;
}

export function ReimburseAnalysisChart({ data }: { data: ReimburseAnalysis[] }) {
  // Convert to bar chart structure
  const barData = data.map(item => ({ name: item.name, expense:0, revenue:item.value, balance:item.value }));
  return <CustomBarChart data={barData} />;
}
