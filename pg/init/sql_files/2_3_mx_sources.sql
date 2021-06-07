--
-- Name: mx_sources; Type: TABLE; Schema: public; Owner: mapxw
--

CREATE TABLE public.mx_sources (
  pid integer NOT NULL,
  id character varying(50) NOT NULL,
  editor integer,
  target jsonb,
  date_modified timestamp with time zone,
  data jsonb,
  type character varying(10),
  project character varying(22),
  readers jsonb,
  editors jsonb,
  services jsonb DEFAULT '[]'::jsonb,
  validated boolean DEFAULT false
);


ALTER TABLE public.mx_sources OWNER TO mapxw;

--
-- Name: mx_sources_pid_seq; Type: SEQUENCE; Schema: public; Owner: mapxw
--

CREATE SEQUENCE public.mx_sources_pid_seq
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;


ALTER TABLE public.mx_sources_pid_seq OWNER TO mapxw;

--
-- Name: mx_sources_pid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: mapxw
--

ALTER SEQUENCE public.mx_sources_pid_seq OWNED BY public.mx_sources.pid;

-- Name: mx_sources pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_sources ALTER COLUMN pid SET DEFAULT nextval('public.mx_sources_pid_seq'::regclass);


--
-- Name: mx_sources_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_sources_pid_seq', 1, true);


--
-- Name: mx_sources mx_sources_id_key; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_sources
ADD CONSTRAINT mx_sources_id_key UNIQUE (id);


--
-- Name: mx_sources mx_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_sources
ADD CONSTRAINT mx_sources_pkey PRIMARY KEY (pid);



--
-- Name: mx_sources_editors_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_sources_editors_idx ON public.mx_sources USING gin (editors);


--
-- Name: mx_sources_readers_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_sources_readers_idx ON public.mx_sources USING gin (readers);


--
-- Name: TABLE mx_sources; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_sources TO readonly;


