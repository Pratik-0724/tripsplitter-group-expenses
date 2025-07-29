import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function CreateTrip() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [memberCount, setMemberCount] = useState(2);
  const [memberNames, setMemberNames] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const updateMemberCount = (count: number) => {
    const newCount = Math.max(1, count);
    setMemberCount(newCount);
    
    const newNames = [...memberNames];
    if (newCount > memberNames.length) {
      // Add empty strings for new members
      for (let i = memberNames.length; i < newCount; i++) {
        newNames.push('');
      }
    } else if (newCount < memberNames.length) {
      // Remove excess members
      newNames.splice(newCount);
    }
    setMemberNames(newNames);
  };

  const updateMemberName = (index: number, name: string) => {
    const newNames = [...memberNames];
    newNames[index] = name;
    setMemberNames(newNames);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Trip Title Required",
        description: "Please enter a trip title",
        variant: "destructive"
      });
      return;
    }

    const validMembers = memberNames.filter(name => name.trim());
    if (validMembers.length === 0) {
      toast({
        title: "Members Required",
        description: "Please add at least one member",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Create the trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
          title: title.trim(),
          member_count: validMembers.length,
          user_id: user.id
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Create trip members
      const membersToInsert = validMembers.map(name => ({
        trip_id: tripData.id,
        name: name.trim()
      }));

      const { error: membersError } = await supabase
        .from('trip_members')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      toast({
        title: "Trip Created!",
        description: `${title} has been created with ${validMembers.length} members.`
      });

      navigate(`/trip/${tripData.id}`);
    } catch (error: any) {
      toast({
        title: "Error Creating Trip",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Create New Trip</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
            <CardDescription>
              Set up your trip and add the members who will be sharing expenses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Trip Title */}
              <div>
                <Label htmlFor="title">Trip Title</Label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Europe Summer 2024"
                  required
                />
              </div>

              {/* Member Count */}
              <div>
                <Label htmlFor="memberCount">Number of Members</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => updateMemberCount(memberCount - 1)}
                    disabled={memberCount <= 1}
                  >
                    -
                  </Button>
                  <Input
                    id="memberCount"
                    type="number"
                    value={memberCount}
                    onChange={(e) => updateMemberCount(parseInt(e.target.value) || 1)}
                    min="1"
                    max="20"
                    className="text-center w-20"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => updateMemberCount(memberCount + 1)}
                    disabled={memberCount >= 20}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Member Names */}
              <div>
                <Label>Member Names</Label>
                <div className="space-y-2 mt-2">
                  {memberNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => updateMemberName(index, e.target.value)}
                        placeholder={`Member ${index + 1} name`}
                        className="flex-1"
                      />
                      {memberCount > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateMemberCount(memberCount - 1)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Trip'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}