
--
-- Name: mx_config; Type: TABLE; Schema: public; Owner: mapxw
--

CREATE TABLE public.mx_config (
  pid integer NOT NULL,
  key public.citext,
  data jsonb,
  date_modified timestamp with time zone DEFAULT now()
);


ALTER TABLE public.mx_config OWNER TO mapxw;

--
-- Name: mx_config_pid_seq; Type: SEQUENCE; Schema: public; Owner: mapxw
--

CREATE SEQUENCE public.mx_config_pid_seq
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;


ALTER TABLE public.mx_config_pid_seq OWNER TO mapxw;

--
-- Name: mx_config_pid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: mapxw
--

ALTER SEQUENCE public.mx_config_pid_seq OWNED BY public.mx_config.pid;


--
-- Name: mx_config pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_config ALTER COLUMN pid SET DEFAULT nextval('public.mx_config_pid_seq'::regclass);


--
-- Name: mx_config_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_config_pid_seq', 1, true);


--
-- Name: mx_config mx_config_key_key; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_config
ADD CONSTRAINT mx_config_key_key UNIQUE (key);


--
-- Name: mx_config mx_config_pkey; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_config
ADD CONSTRAINT mx_config_pkey PRIMARY KEY (pid);



--
-- Name: TABLE mx_config; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_config TO readonly;


