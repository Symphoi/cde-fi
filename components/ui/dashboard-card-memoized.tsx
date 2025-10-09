'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReactNode, useState, memo } from "react"

// Memoized DashboardCard component to prevent unnecessary re-renders
const DashboardCard = memo(({ title, value, description, icon }: {
  title: string;
  value: number;
  description?: string;
  icon?: ReactNode;
}) => {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <Card className="shadow-sm hover:shadow-md transition-all duration-200 relative">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div
          className="text-2xl font-bold cursor-default relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {formatRupiahShort(value)}

          {showTooltip && (
            <div className="absolute top-[-40px] left-0 z-10 rounded-md bg-white px-3 py-1 text-sm shadow-md border">
              {formatRupiahFull(value)}
            </div>
          )}
        </div>

        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
});

DashboardCard.displayName = 'DashboardCard';

// Format singkat
function formatRupiahShort(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)} M`
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)} JT`
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(1)} K`
  return `Rp ${value.toLocaleString("id-ID")}`
}

// Format lengkap
function formatRupiahFull(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`
}

export default DashboardCard