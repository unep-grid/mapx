--
-- Name: mx_users; Type: TABLE; Schema: public; Owner: mapxw
--

CREATE TABLE public.mx_users (
    pid integer NOT NULL,
	id integer NOT NULL,
    username public.citext,
    email public.citext,
    key text,
    validated boolean,
    hidden boolean,
    date_validated timestamp without time zone,
    date_hidden timestamp without time zone,
    date_last_visit timestamp without time zone,
    data jsonb
);


ALTER TABLE public.mx_users OWNER TO mapxw;

--
-- Name: mx_users_id_seq; Type: SEQUENCE; Schema: public; Owner: mapxw
--

CREATE SEQUENCE public.mx_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mx_users_id_seq OWNER TO mapxw;

--
-- Name: mx_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: mapxw
--

ALTER SEQUENCE public.mx_users_id_seq OWNED BY public.mx_users.id;


--
-- Name: mx_users_pid_seq; Type: SEQUENCE; Schema: public; Owner: mapxw
--

CREATE SEQUENCE public.mx_users_pid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mx_users_pid_seq OWNER TO mapxw;

--
-- Name: mx_users_pid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: mapxw
--

ALTER SEQUENCE public.mx_users_pid_seq OWNED BY public.mx_users.pid;

--
-- Name: mx_views; Type: TABLE; Schema: public; Owner: mapxw
--

--
-- Name: mx_users id; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_users ALTER COLUMN id SET DEFAULT nextval('public.mx_users_id_seq'::regclass);


--
-- Name: mx_users pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_users ALTER COLUMN pid SET DEFAULT nextval('public.mx_users_pid_seq'::regclass);


--
-- Name: mx_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_users_id_seq', 1, true);


--
-- Name: mx_users_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_users_pid_seq', 1, true);

--
-- Name: mx_users mx_users_email_key; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_users
    ADD CONSTRAINT mx_users_email_key UNIQUE (email);


--
-- Name: mx_users mx_users_id_key; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_users
    ADD CONSTRAINT mx_users_id_key UNIQUE (id);


--
-- Name: mx_users mx_users_pkey; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_users
    ADD CONSTRAINT mx_users_pkey PRIMARY KEY (pid);


--
-- Name: mx_users mx_users_username_key; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_users
    ADD CONSTRAINT mx_users_username_key UNIQUE (username);


--
-- Name: TABLE mx_users; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_users TO readonly;


