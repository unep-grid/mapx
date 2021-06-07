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
-- Name: mx_views pid; Type: DEFAULT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_views ALTER COLUMN pid SET DEFAULT nextval('public.mx_views_pid_seq'::regclass);


--
-- Name: mx_views_pid_seq; Type: SEQUENCE SET; Schema: public; Owner: mapxw
--

SELECT pg_catalog.setval('public.mx_views_pid_seq', 1, true);

--
-- Name: mx_views mx_views_pkey; Type: CONSTRAINT; Schema: public; Owner: mapxw
--

ALTER TABLE ONLY public.mx_views
    ADD CONSTRAINT mx_views_pkey PRIMARY KEY (pid);


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
-- Name: TABLE mx_views; Type: ACL; Schema: public; Owner: mapxw
--

GRANT SELECT ON TABLE public.mx_views TO readonly;


