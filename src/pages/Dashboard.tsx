import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Plus, User, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Trip {
  id: string;
  title: string;
  member_count: number;
  created_at: string;
  total_expense?: number;
  per_head_expense?: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      // Fetch trips with expense calculations
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      // Calculate total expenses for each trip
      const tripsWithExpenses = await Promise.all(
        (tripsData || []).map(async (trip) => {
          const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('amount')
            .eq('trip_id', trip.id);

          if (expensesError) {
            console.error('Error fetching expenses:', expensesError);
            return {
              ...trip,
              total_expense: 0,
              per_head_expense: 0
            };
          }

          const totalExpense = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
          const perHeadExpense = trip.member_count > 0 ? totalExpense / trip.member_count : 0;

          return {
            ...trip,
            total_expense: totalExpense,
            per_head_expense: perHeadExpense
          };
        })
      );

      setTrips(tripsWithExpenses);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading your trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">TripSplitr</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome back!</span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Your Trips</h2>
            <p className="text-muted-foreground">Manage and track your travel expenses</p>
          </div>
          <Button onClick={() => navigate('/create-trip')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Trip
          </Button>
        </div>

        {trips.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-semibold mb-2">No trips yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first trip to start tracking expenses with your group.
                </p>
                <Button onClick={() => navigate('/create-trip')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Trip
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-lg transition-shadow cursor-pointer" 
                   onClick={() => navigate(`/trip/${trip.id}`)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {trip.title}
                  </CardTitle>
                  <CardDescription>
                    Created {new Date(trip.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{trip.member_count} member{trip.member_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Total: ${trip.total_expense?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Per person: ${trip.per_head_expense?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}