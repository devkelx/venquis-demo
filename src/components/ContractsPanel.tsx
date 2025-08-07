import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Calendar, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
interface Contract {
  id: string;
  conversation_id: string;
  file_name: string;
  file_url: string;
  full_text: string | null;
  overview: string | null;
  created_at: string;
}
interface ContractsPanelProps {
  conversationId?: string;
}
export function ContractsPanel({
  conversationId
}: ContractsPanelProps) {
  const queryClient = useQueryClient();
  
  const {
    data: contracts,
    isLoading,
    error
  } = useQuery({
    queryKey: ['contracts', conversationId],
    queryFn: async () => {
      let query = supabase.from('contracts').select('*').order('created_at', {
        ascending: false
      });
      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.id,
        conversation_id: item.conversation_id,
        file_name: item.file_name,
        file_url: item.file_url,
        full_text: item.full_text,
        overview: item.overview,
        created_at: item.created_at
      }));
    },
    enabled: true
  });

  const deleteContract = useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', conversationId] });
      toast.success('Contract deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete contract');
      console.error('Delete error:', error);
    }
  });

  if (isLoading) {
    return <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>;
  }
  if (error) {
    return <div className="p-4 text-center text-muted-foreground">
        Error loading contracts
      </div>;
  }
  if (!contracts || contracts.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">
        <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>No contracts uploaded yet</p>
      </div>;
  }
  return <div className="p-4 space-y-4">
      
      
      <div className="space-y-3">
        {contracts.map(contract => <Card key={contract.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-start justify-between gap-2">
                <span className="truncate" title={contract.file_name}>
                  {contract.file_name}
                </span>
                <Badge variant="secondary" className="shrink-0">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(new Date(contract.created_at), 'MMM d')}
                </Badge>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="pt-0">
              {contract.overview && <div className="mb-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {contract.overview}
                  </p>
                </div>}
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(contract.created_at), 'MMM d, yyyy h:mm a')}
                </span>
                <div className="flex items-center gap-2">
                  <a href={contract.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    View File
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contract</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{contract.file_name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteContract.mutate(contract.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>
    </div>;
}