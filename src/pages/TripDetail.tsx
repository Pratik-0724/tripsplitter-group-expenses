import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, DollarSign, User } from 'lucide-react';

interface Trip {
  id: string;
  title: string;
  member_count: number;
  created_at: string;
}

interface Member {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  paid_by_member_id: string;
  created_at: string;
  paid_by_member?: Member;
}

interface MemberBalance {
  member: Member;
  totalPaid: number;
  shouldPay: number;
  balance: number;
}

export default function TripDetail() {
  const { user } = useAuth();
  const { tripId } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    if (tripId) {
      fetchTripData();
    }
  }, [tripId]);

  const fetchTripData = async () => {
    try {
      // Fetch trip details
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .eq('user_id', user.id)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData);

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('trip_members')
        .select('*')
        .eq('trip_id', tripId)
        .order('name');

      if (membersError) throw membersError;
      setMembers(membersData || []);

      // Fetch expenses with member names
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          paid_by_member:trip_members(id, name)
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;
      
      const formattedExpenses = (expensesData || []).map(expense => ({
        ...expense,
        paid_by_member: Array.isArray(expense.paid_by_member) 
          ? expense.paid_by_member[0] 
          : expense.paid_by_member
      }));
      
      setExpenses(formattedExpenses);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseTitle.trim() || !expenseAmount || !selectedMemberId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          trip_id: tripId,
          title: expenseTitle.trim(),
          amount: amount,
          paid_by_member_id: selectedMemberId
        });

      if (error) throw error;

      toast({
        title: "Expense Added",
        description: `${expenseTitle} has been added successfully.`
      });

      // Reset form
      setExpenseTitle('');
      setExpenseAmount('');
      setSelectedMemberId('');
      setShowAddExpense(false);

      // Refresh data
      fetchTripData();
    } catch (error: any) {
      toast({
        title: "Error Adding Expense",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateBalances = (): MemberBalance[] => {
    const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const perHeadExpense = trip ? totalExpense / trip.member_count : 0;

    return members.map(member => {
      const totalPaid = expenses
        .filter(expense => expense.paid_by_member_id === member.id)
        .reduce((sum, expense) => sum + expense.amount, 0);

      return {
        member,
        totalPaid,
        shouldPay: perHeadExpense,
        balance: totalPaid - perHeadExpense
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return <Navigate to="/dashboard" replace />;
  }

  const totalExpense = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const perHeadExpense = trip.member_count > 0 ? totalExpense / trip.member_count : 0;
  const balances = calculateBalances();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{trip.title}</h1>
            <p className="text-sm text-muted-foreground">
              {trip.member_count} members • Created {new Date(trip.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Summary & Balances */}
          <div className="lg:col-span-1 space-y-6">
            {/* Trip Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Trip Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Expense:</span>
                    <span className="font-bold">${totalExpense.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Per Person:</span>
                    <span className="font-bold">${perHeadExpense.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Members:</span>
                    <span>{trip.member_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Member Balances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Member Balances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {balances.map(({ member, totalPaid, shouldPay, balance }) => (
                    <div key={member.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Paid: ${totalPaid.toFixed(2)} | Should pay: ${shouldPay.toFixed(2)}
                        </div>
                      </div>
                      <div className={`font-bold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {balance > 0 ? '+' : ''}${balance.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Expenses */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Expenses</h2>
              <Button onClick={() => setShowAddExpense(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </div>

            {/* Add Expense Form */}
            {showAddExpense && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Add New Expense</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddExpense} className="space-y-4">
                    <div>
                      <Label htmlFor="expenseTitle">Expense Title</Label>
                      <Input
                        id="expenseTitle"
                        type="text"
                        value={expenseTitle}
                        onChange={(e) => setExpenseTitle(e.target.value)}
                        placeholder="e.g., Hotel, Dinner, Gas"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="expenseAmount">Amount</Label>
                      <Input
                        id="expenseAmount"
                        type="number"
                        step="0.01"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="paidBy">Paid By</Label>
                      <Select value={selectedMemberId} onValueChange={setSelectedMemberId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select who paid" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map(member => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddExpense(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting} className="flex-1">
                        {submitting ? 'Adding...' : 'Add Expense'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Expenses List */}
            {expenses.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <h3 className="text-xl font-semibold mb-2">No expenses yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start adding expenses to track your group spending.
                  </p>
                  <Button onClick={() => setShowAddExpense(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Expense
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{expense.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Paid by {expense.paid_by_member?.name} • {new Date(expense.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">${expense.amount.toFixed(2)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}