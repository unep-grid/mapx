--
-- Name: mx_projects; Type: TABLE; Schema: public; Owner: mapxw
--

CREATE TABLE public.mx_projects (
  pid integer NOT NULL,
  id character varying(40) NOT NULL,
  id_old character varying(3),
  title jsonb,
  description jsonb,
  active boolean,
  public boolean DEFAULT true,
  admins jsonb,
  members jsonb,
  publishers jsonb,
  map_position jsonb,
  countries jsonb,
  creator integer,
  date_created timestamp with time zone DEFAULT now(),
  date_modified timestamp with time zone DEFAULT now(),
  views_external jsonb DEFAULT '[]'::jsonb,
  alias character varying(40),
  allow_join boolean DEFAULT false,
  contacts jsonb DEFAULT '[]'::jsonb,
  states_views jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.mx_projects OWNER TO mapxw;

--
-- Name: mx_projects_pid_seq; Type: SEQUENCE; Schema: public; Owner: mapxw
--

CREATE SEQUENCE public.mx_projects_pid_seq
AS integer
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;


ALTER TABLE public.mx_projects_pid_seq OWNER TO mapxw;

--
-- Name: mx_projects_pid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: mapxw
--

ALTER SEQUENCE public.mx_projects_pid_seq OWNED BY public.mx_projects.pid;


--
-- Name: TABLE mx_projects; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_projects TO readonly;


--
-- Name: mx_projects pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_projects ALTER COLUMN pid SET DEFAULT nextval('public.mx_projects_pid_seq'::regclass);


--
-- Name: mx_projects_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_projects_pid_seq', 1, true);

--
-- Name: mx_projects mx_projects_id_key; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_projects
ADD CONSTRAINT mx_projects_id_key UNIQUE (id);


--
-- Name: mx_projects mx_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_projects
ADD CONSTRAINT mx_projects_pkey PRIMARY KEY (pid);


--
-- Name: mx_projects_admins_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_projects_admins_idx ON public.mx_projects USING gin (admins);


--
-- Name: mx_projects_id_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_projects_id_idx ON public.mx_projects USING btree (id);


--
-- Name: mx_projects_id_old_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_projects_id_old_idx ON public.mx_projects USING btree (id_old);


--
-- Name: mx_projects_members_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_projects_members_idx ON public.mx_projects USING gin (members);


--
-- Name: mx_projects_publishers_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_projects_publishers_idx ON public.mx_projects USING gin (publishers);


