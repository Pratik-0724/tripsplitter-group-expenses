import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigate } from 'react-router-dom';
import { DollarSign, Users, TrendingUp } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  // Redirect to dashboard if authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            TripSplitr
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Split travel expenses effortlessly with your friends and family. Track who paid what, 
            calculate balances, and keep everyone happy on your adventures.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              <a href="/auth">Get Started</a>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <Card className="text-center">
            <CardHeader>
              <DollarSign className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle>Track Expenses</CardTitle>
              <CardDescription>
                Record every expense with details about who paid and how much was spent.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle>Manage Groups</CardTitle>
              <CardDescription>
                Add trip members and keep track of everyone's contributions and balances.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle>Smart Calculations</CardTitle>
              <CardDescription>
                Automatically calculate who owes what and settle up with minimal transactions.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to start splitting?</CardTitle>
              <CardDescription>
                Join thousands of travelers who use TripSplitr to manage their group expenses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full sm:w-auto">
                <a href="/auth">Create Your Account</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
