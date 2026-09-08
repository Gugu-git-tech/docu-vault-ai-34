
CREATE TYPE public.app_role AS ENUM ('admin','approver','viewer');
CREATE TYPE public.doc_type AS ENUM ('invoice','credit_note');
CREATE TYPE public.doc_status AS ENUM ('processing','pending','approved','rejected','duplicate');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash TEXT,
  doc_type public.doc_type,
  vendor TEXT,
  invoice_number TEXT,
  doc_date DATE,
  subtotal NUMERIC(14,2),
  vat_amount NUMERIC(14,2),
  total_amount NUMERIC(14,2),
  currency TEXT,
  extraction_confidence NUMERIC(5,2),
  validation_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_extraction JSONB,
  extraction_error TEXT,
  status public.doc_status NOT NULL DEFAULT 'processing',
  current_stage SMALLINT NOT NULL DEFAULT 1,
  duplicate_of UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  duplicate_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_vendor ON public.documents(lower(vendor));
CREATE INDEX idx_documents_invoice_number ON public.documents(lower(invoice_number));
CREATE INDEX idx_documents_doc_date ON public.documents(doc_date);
CREATE INDEX idx_documents_hash ON public.documents(file_hash);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  stage SMALLINT NOT NULL CHECK (stage BETWEEN 1 AND 3),
  action TEXT NOT NULL CHECK (action IN ('approved','rejected')),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role public.app_role NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, stage)
);
CREATE INDEX idx_approvals_document ON public.document_approvals(document_id);
GRANT SELECT ON public.document_approvals TO authenticated;
GRANT ALL ON public.document_approvals TO service_role;
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  stage SMALLINT,
  previous_status TEXT,
  new_status TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- user_roles policies
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- documents policies
CREATE POLICY "documents_select_authenticated" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "documents_insert_uploaders" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'approver')));
CREATE POLICY "documents_update_admin" ON public.documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "documents_delete_admin" ON public.documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- approvals + audit are readable by signed-in users; writes happen server-side only
CREATE POLICY "approvals_select_authenticated" ON public.document_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_select_authenticated" ON public.audit_logs FOR SELECT TO authenticated USING (true);

-- new user handling: first user = admin, others = viewer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'viewer'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER documents_touch_updated_at BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
