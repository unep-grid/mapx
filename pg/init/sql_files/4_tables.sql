
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;
SET default_tablespace = '';
SET default_with_oids = false;

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
-- Name: mx_logs; Type: TABLE; Schema: public; Owner: mapxw
--

CREATE TABLE public.mx_logs (
    pid integer NOT NULL,
    level character varying(40),
    side character varying(10),
    id_log character varying(40),
    id_user integer,
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

CREATE TABLE public.mx_views (
	pid integer NOT NULL,
    id character varying(20) NOT NULL,
    editor integer,
    target jsonb,
    date_modified timestamp with time zone,
    data jsonb,
    type character varying(10),
    project character varying(22),
    readers jsonb,
    editors jsonb
);


ALTER TABLE public.mx_views OWNER TO mapxw;

--
-- Name: mx_views_pid_seq; Type: SEQUENCE; Schema: public; Owner: mapxw
--

CREATE SEQUENCE public.mx_views_pid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.mx_views_pid_seq OWNER TO mapxw;

--
-- Name: mx_views_pid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: mapxw
--

ALTER SEQUENCE public.mx_views_pid_seq OWNED BY public.mx_views.pid;


--
-- Name: mx_config pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_config ALTER COLUMN pid SET DEFAULT nextval('public.mx_config_pid_seq'::regclass);


--
-- Name: mx_logs pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_logs ALTER COLUMN pid SET DEFAULT nextval('public.mx_logs_pid_seq'::regclass);


--
-- Name: mx_projects pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_projects ALTER COLUMN pid SET DEFAULT nextval('public.mx_projects_pid_seq'::regclass);


--
-- Name: mx_sources pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_sources ALTER COLUMN pid SET DEFAULT nextval('public.mx_sources_pid_seq'::regclass);


--
-- Name: mx_users id; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_users ALTER COLUMN id SET DEFAULT nextval('public.mx_users_id_seq'::regclass);


--
-- Name: mx_users pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_users ALTER COLUMN pid SET DEFAULT nextval('public.mx_users_pid_seq'::regclass);


--
-- Name: mx_views pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_views ALTER COLUMN pid SET DEFAULT nextval('public.mx_views_pid_seq'::regclass);


--
-- Name: mx_config_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_config_pid_seq', 1, true);


--
-- Name: mx_logs_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_logs_pid_seq', 1, false);


--
-- Name: mx_projects_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_projects_pid_seq', 1, true);


--
-- Name: mx_sources_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_sources_pid_seq', 1, true);


--
-- Name: mx_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_users_id_seq', 1, true);


--
-- Name: mx_users_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_users_pid_seq', 1, true);


--
-- Name: mx_views_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_views_pid_seq', 1, true);


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
-- Name: mx_logs mx_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_logs
    ADD CONSTRAINT mx_logs_pkey PRIMARY KEY (pid);


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
-- Name: mx_views mx_views_pkey; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_views
    ADD CONSTRAINT mx_views_pkey PRIMARY KEY (pid);


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


--
-- Name: mx_sources_editors_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_sources_editors_idx ON public.mx_sources USING gin (editors);


--
-- Name: mx_sources_readers_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_sources_readers_idx ON public.mx_sources USING gin (readers);


--
-- Name: mx_views_date_modified_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_views_date_modified_idx ON public.mx_views USING btree (date_modified);


--
-- Name: mx_views_editor_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_views_editor_idx ON public.mx_views USING btree (editor);


--
-- Name: mx_views_editors_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_views_editors_idx ON public.mx_views USING gin (editors);


--
-- Name: mx_views_id_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_views_id_idx ON public.mx_views USING btree (id);


--
-- Name: mx_views_id_latest_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_views_id_latest_idx ON public.mx_views USING btree (id, date_modified DESC NULLS LAST);


--
-- Name: mx_views_readers_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_views_readers_idx ON public.mx_views USING gin (readers);


--
-- Name: mx_views_target_idx; Type: INDEX; Schema: public; Owner: mapxw
--

CREATE INDEX mx_views_target_idx ON public.mx_views USING btree (target);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pguser
--

GRANT USAGE ON SCHEMA public TO mapxc;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT USAGE ON SCHEMA public TO readwrite;


--
-- Name: TABLE mx_config; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_config TO readonly;



--
-- Name: TABLE mx_logs; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_logs TO readonly;


--
-- Name: TABLE mx_projects; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_projects TO readonly;


--
-- Name: TABLE mx_sources; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_sources TO readonly;


--
-- Name: TABLE mx_users; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_users TO readonly;


--
-- Name: TABLE mx_views; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_views TO readonly;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: mapxw
--

ALTER DEFAULT PRIVILEGES FOR ROLE mapxw GRANT SELECT ON TABLES  TO readonly;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: mapxw
--

ALTER DEFAULT PRIVILEGES FOR ROLE mapxw IN SCHEMA public GRANT SELECT ON TABLES TO mapxc;
