// components/custom/ActionableDocumentCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react'; // Hanya yang dipakai

interface ActionableDocumentCardProps {
  title: string;
  count: number;
  targetTab: string;
  actionText: string;
  icon: React.ComponentType<{ className?: string }>; // Icon sebagai komponen React
  onNavigate: (tab: string) => void;
}

/**
 * Kartu ringkasan dokumen yang membutuhkan tindakan (misalnya: Approval, Input GRN).
 */
const ActionableDocumentCard: React.FC<ActionableDocumentCardProps> = ({
  title,
  count,
  targetTab,
  actionText,
  icon: Icon,
  onNavigate,
}) => {
  return (
    <Card className={`transition-transform hover:shadow-lg ${count > 0 ? 'border-2 border-amber-400' : ''}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-md font-semibold text-gray-700">{title}</CardTitle>
          <p className={`text-3xl font-bold mt-1 ${count > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{count}</p>
        </div>
        <Icon className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Dokumen menunggu tindakan Anda.
        </p>
        <Button 
          variant={count > 0 ? 'default' : 'outline'} 
          disabled={count === 0} 
          className="w-full"
          onClick={() => onNavigate(targetTab)}
        >
          {actionText} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ActionableDocumentCard;
