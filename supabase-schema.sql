-- Row↔Bike Converter Database Schema
-- This file contains the database schema for user data and calibration sync

-- Enable Row Level Security (RLS) by default
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  preferred_units TEXT CHECK (preferred_units IN ('watts', 'pace', 'rpm')) DEFAULT 'watts',
  last_damper INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calibration profiles table
CREATE TABLE calibration_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  damper INTEGER NOT NULL,
  coefficient_a DECIMAL(10, 6) NOT NULL,
  coefficient_b DECIMAL(10, 6) NOT NULL,
  r_squared DECIMAL(10, 6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calibration samples table
CREATE TABLE calibration_samples (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  calibration_id UUID REFERENCES calibration_profiles(id) ON DELETE CASCADE,
  rpm INTEGER NOT NULL,
  watts INTEGER NOT NULL,
  source TEXT CHECK (source IN ('manual', 'ble')) DEFAULT 'manual',
  timestamp_recorded TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_samples ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for calibration_profiles
CREATE POLICY "Users can view their own calibrations" ON calibration_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calibrations" ON calibration_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calibrations" ON calibration_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calibrations" ON calibration_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for calibration_samples
CREATE POLICY "Users can view their own calibration samples" ON calibration_samples
  FOR SELECT USING (
    auth.uid() = (
      SELECT user_id FROM calibration_profiles 
      WHERE id = calibration_samples.calibration_id
    )
  );

CREATE POLICY "Users can insert their own calibration samples" ON calibration_samples
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM calibration_profiles 
      WHERE id = calibration_samples.calibration_id
    )
  );

CREATE POLICY "Users can update their own calibration samples" ON calibration_samples
  FOR UPDATE USING (
    auth.uid() = (
      SELECT user_id FROM calibration_profiles 
      WHERE id = calibration_samples.calibration_id
    )
  );

CREATE POLICY "Users can delete their own calibration samples" ON calibration_samples
  FOR DELETE USING (
    auth.uid() = (
      SELECT user_id FROM calibration_profiles 
      WHERE id = calibration_samples.calibration_id
    )
  );

-- Indexes for performance
CREATE INDEX idx_calibration_profiles_user_id ON calibration_profiles(user_id);
CREATE INDEX idx_calibration_profiles_created_at ON calibration_profiles(created_at DESC);
CREATE INDEX idx_calibration_samples_calibration_id ON calibration_samples(calibration_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calibration_profiles_updated_at BEFORE UPDATE ON calibration_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();