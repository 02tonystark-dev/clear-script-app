-- ============================================
-- COMPLETE SUPABASE SCHEMA MIGRATION
-- Pharmacy Management System
-- ============================================

-- ============================================
-- 1. CREATE ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'pharmacist', 'clerk');

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Medicine categories table
CREATE TABLE public.medicine_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medicines table
CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  description TEXT,
  manufacturer TEXT,
  category_id UUID REFERENCES public.medicine_categories(id),
  batch_number TEXT,
  expiry_date DATE,
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  unit_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID REFERENCES public.medicines(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  sold_by UUID REFERENCES auth.users(id),
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. CREATE FUNCTIONS
-- ============================================

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$;

-- Function to check if user has a specific role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 4. CREATE TRIGGERS
-- ============================================

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on medicines
CREATE TRIGGER medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update updated_at on profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. CREATE INDEXES
-- ============================================

CREATE INDEX idx_medicines_category ON public.medicines(category_id);
CREATE INDEX idx_medicines_name ON public.medicines(name);
CREATE INDEX idx_sales_medicine ON public.sales(medicine_id);
CREATE INDEX idx_sales_date ON public.sales(sale_date);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CREATE RLS POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Medicine categories policies
CREATE POLICY "Anyone authenticated can view categories"
  ON public.medicine_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins and pharmacists can manage categories"
  ON public.medicine_categories FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'pharmacist')
  );

-- Medicines policies
CREATE POLICY "Anyone authenticated can view medicines"
  ON public.medicines FOR SELECT
  USING (true);

CREATE POLICY "Admins and pharmacists can manage medicines"
  ON public.medicines FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'pharmacist')
  );

-- Sales policies
CREATE POLICY "Anyone authenticated can view sales"
  ON public.sales FOR SELECT
  USING (true);

CREATE POLICY "All staff can create sales"
  ON public.sales FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all sales"
  ON public.sales FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify installation
DO $$
BEGIN
  RAISE NOTICE 'Schema migration completed successfully!';
  RAISE NOTICE 'Tables created: profiles, user_roles, medicine_categories, medicines, sales';
  RAISE NOTICE 'Functions created: handle_new_user, has_role, handle_updated_at';
  RAISE NOTICE 'RLS policies enabled on all tables';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create your first user via Authentication > Users';
  RAISE NOTICE '2. Assign admin role using: INSERT INTO user_roles (user_id, role) VALUES (''user-uuid'', ''admin'');';
  RAISE NOTICE '3. Run SUPABASE_SEED.sql to add sample data';
END $$;
