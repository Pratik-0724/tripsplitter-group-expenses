-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, title)
);

-- Enable Row Level Security
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Create policies for trips
CREATE POLICY "Users can view their own trips" 
ON public.trips 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips" 
ON public.trips 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" 
ON public.trips 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips" 
ON public.trips 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trip_members table
CREATE TABLE public.trip_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_members (users can access members of their trips)
CREATE POLICY "Users can view members of their trips" 
ON public.trip_members 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.trips 
  WHERE trips.id = trip_members.trip_id 
  AND trips.user_id = auth.uid()
));

CREATE POLICY "Users can create members for their trips" 
ON public.trip_members 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.trips 
  WHERE trips.id = trip_members.trip_id 
  AND trips.user_id = auth.uid()
));

CREATE POLICY "Users can update members of their trips" 
ON public.trip_members 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.trips 
  WHERE trips.id = trip_members.trip_id 
  AND trips.user_id = auth.uid()
));

CREATE POLICY "Users can delete members of their trips" 
ON public.trip_members 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.trips 
  WHERE trips.id = trip_members.trip_id 
  AND trips.user_id = auth.uid()
));

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_by_member_id UUID NOT NULL REFERENCES public.trip_members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses (users can access expenses of their trips)
CREATE POLICY "Users can view expenses of their trips" 
ON public.expenses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.trips 
  WHERE trips.id = expenses.trip_id 
  AND trips.user_id = auth.uid()
));

CREATE POLICY "Users can create expenses for their trips" 
ON public.expenses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.trips 
  WHERE trips.id = expenses.trip_id 
  AND trips.user_id = auth.uid()
));

CREATE POLICY "Users can update expenses of their trips" 
ON public.expenses 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.trips 
  WHERE trips.id = expenses.trip_id 
  AND trips.user_id = auth.uid()
));

CREATE POLICY "Users can delete expenses of their trips" 
ON public.expenses 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.trips 
  WHERE trips.id = expenses.trip_id 
  AND trips.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'name', 'User'));
  RETURN new;
END;
$$;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();