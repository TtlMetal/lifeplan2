import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, ReferenceLine, Label
} from 'recharts';
import { Milestone } from '../types';
import { fmtK } from '../utils';

interface MilestoneReferenceProps {
  milestones: Milestone[];
  xScale?: any;
}

const CustomTooltip = ({ active, payload, label, milestones, showSuccess, showNetWorth }: any) => {
  if (active && payload && payload.length) {
    const activeMilestone = milestones.find((m: any) => m.age === label);
    
    // Sort payload by value descending so it looks ordered in the tooltip
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

    // Get the survived percentage and net worth from the payload
    const survived = payload[0]?.payload?.survived;
    const netWorth = payload[0]?.payload?.netWorth;

    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs z-50 relative">
        <div className="flex justify-between items-center mb-2 gap-4 border-b border-slate-700 pb-2">
          <p className="text-slate-400 font-bold uppercase tracking-wider">Age {label}</p>
          {showSuccess && survived !== undefined && (
            <span className={`font-bold ${survived >= 0.9 ? 'text-emerald-400' : survived >= 0.75 ? 'text-amber-400' : 'text-red-400'}`}>
              {Math.round(survived * 100)}% Success
            </span>
          )}
        </div>
        {sortedPayload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-slate-300">{entry.name}:</span>
            <span className="font-mono font-bold ml-auto" style={{ color: entry.color }}>{fmtK(entry.value)}</span>
          </div>
        ))}
        {showNetWorth && netWorth !== undefined && (
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-700">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-slate-300">Net Worth:</span>
            <span className="font-mono font-bold ml-auto text-emerald-400">{fmtK(netWorth)}</span>
          </div>
        )}
        {activeMilestone && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-bold">🎯 {activeMilestone.name}:</span>
              <span className="font-mono font-bold ml-auto text-amber-400">{fmtK(activeMilestone.impact)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const LifetimeAreaChart = ({ data, series, milestones, retirementAge, fireNumber, showSuccess }: any) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s: any) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis 
          dataKey="age" 
          stroke="#475569" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis 
          stroke="#475569" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={fmtK}
        />
        <Tooltip content={<CustomTooltip milestones={milestones} showSuccess={showSuccess} />} />
        
        <ReferenceLine x={retirementAge} stroke="#38bdf8" strokeDasharray="5 5">
          <Label value="Retire" position="insideTopLeft" fill="#38bdf8" fontSize={9} offset={5} />
        </ReferenceLine>

        {fireNumber && (
          <Area 
            type="monotone" 
            dataKey="fireTarget" 
            stroke="#fbbf24" 
            strokeWidth={1.5}
            strokeDasharray="3 3"
            fill="transparent"
            dot={false}
            activeDot={false}
            name="FIRE Target"
          />
        )}

        {milestones.map((m: any) => (
          <ReferenceLine key={m.id} x={m.age} stroke="#fbbf24" strokeDasharray="3 3" opacity={0.4} />
        ))}

        {/* Sample Runs (Historical Patterns) */}
        {data[0]?.sampleRuns && [0, 1, 2].map(i => (
          <Area 
            key={`run-${i}`}
            type="monotone" 
            dataKey={(row) => row.sampleRuns?.[i]} 
            stroke="#56e39f" 
            strokeWidth={0.5}
            fill="transparent"
            strokeOpacity={0.3}
            dot={false}
            activeDot={false}
            name={i === 0 ? "Actual Path (Ended Bottom 5%)" : i === 1 ? "Actual Path (Ended Median)" : "Actual Path (Ended Top 5%)"}
          />
        ))}

        {series.map((s: any) => (
          <Area 
            key={s.key}
            type="monotone" 
            dataKey={s.key} 
            name={s.label}
            stroke={s.color} 
            fillOpacity={s.fillOpacity ?? 1} 
            fill={`url(#grad-${s.key})`} 
            strokeWidth={2}
            strokeDasharray={s.dash}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export const CashFlowBarChart = ({ data, milestones, showSuccess, showNetWorth }: any) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis 
          dataKey="age" 
          stroke="#475569" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
        />
        <YAxis 
          stroke="#475569" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={fmtK}
        />
        <Tooltip content={<CustomTooltip milestones={milestones} showSuccess={showSuccess} showNetWorth={showNetWorth} />} />
        
        <Bar dataKey="annualIncome" name="Income" fill="#56e39f" radius={[2, 2, 0, 0]} />
        <Bar dataKey="annualExpenses" name="Expenses" fill="#f87171" radius={[2, 2, 0, 0]} />
        <Bar dataKey="annualContributions" name="Contributions" fill="#38bdf8" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
