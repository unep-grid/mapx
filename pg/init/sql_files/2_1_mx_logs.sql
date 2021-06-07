--
-- Name: mx_logs; Type: TABLE; Schema: public; Owner: mapxw
--

CREATE TABLE public.mx_logs (
  pid integer NOT NULL,
  level character varying(40),
  side character varying(10),
  id_log character varying(40),
  id_user integer,
  ip_user character varying(45),
  is_guest boolean,
  id_project character varying(22),
  date_modified timestamp with time zone,
  data jsonb
);


ALTER TABLE public.mx_logs OWNER TO mapxw;

--
-- Name: mx_logs_pid_seq; Type: SEQUENCE; Schema: public; Owner: mapxw
--

CREATE SEQUENCE public.mx_logs_pid_seq
AS integer
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;


ALTER TABLE public.mx_logs_pid_seq OWNER TO mapxw;

--
-- Name: mx_logs_pid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: mapxw
--

ALTER SEQUENCE public.mx_logs_pid_seq OWNED BY public.mx_logs.pid;



--
-- Name: mx_logs pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_logs ALTER COLUMN pid SET DEFAULT nextval('public.mx_logs_pid_seq'::regclass);


--
-- Name: mx_logs_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_logs_pid_seq', 1, false);


--
-- Name: mx_logs mx_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_logs
ADD CONSTRAINT mx_logs_pkey PRIMARY KEY (pid);


--
-- Name: TABLE mx_logs; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_logs TO readonly;


