-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- FAQs
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Chat logs
CREATE TABLE public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- RLS: profiles
CREATE POLICY "Profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: faqs (public read, admin write)
CREATE POLICY "FAQs readable by all" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Admins insert FAQs" ON public.faqs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update FAQs" ON public.faqs FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete FAQs" ON public.faqs FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS: chat_logs
CREATE POLICY "Users view own logs" ON public.chat_logs FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own logs" ON public.chat_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER faqs_touch BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Domain check + profile/role bootstrap on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) NOT LIKE '%@paruluniversity.ac.in' THEN
    RAISE EXCEPTION 'Only @paruluniversity.ac.in email addresses can sign in. Use the free chat instead.';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed FAQs
INSERT INTO public.faqs (question, answer, keywords, category) VALUES
('When do end-semester exams start?', 'End-semester exams begin Dec 5, 2026. The datesheet is published on the Exam Cell board and student portal one week before commencement.', ARRAY['exam','exams','schedule','datesheet'], 'exams'),
('What is the hostel fee?', 'Annual hostel fee is ₹68,000 (shared) or ₹92,000 (single). Includes mess, electricity, and Wi-Fi. Pay via the Fee Portal before July 31.', ARRAY['hostel','fee','accommodation','rent'], 'fees'),
('What is the admission deadline?', 'UG admissions close July 15. PG admissions close August 10. Late applications attract a ₹2,000 fee until July 25.', ARRAY['admission','deadline','apply','application'], 'admissions'),
('What are the library hours?', 'Central Library: 8 AM – 11 PM (Mon–Sat), 10 AM – 6 PM (Sun). Reading halls stay open 24/7 during exam weeks.', ARRAY['library','hours','timings','reading'], 'campus'),
('How do I get a transcript?', 'Request transcripts via the Academic Section portal. Processing: 5 working days. Cost: ₹200 per copy; international courier extra.', ARRAY['transcript','marksheet','certificate'], 'academics'),
('When does placement season start?', 'Placement season starts Aug 20. Register on the T&P portal, upload an updated CV, and complete pre-placement training to be eligible.', ARRAY['placement','job','recruitment','tnp'], 'placements');