
\set admin `echo "$MAIL_ADMIN"`
\set guest `echo "$MAIL_GUEST"`

--
-- Data for Name: mx_config; Type: TABLE DATA; Schema: public; Owner: mapxw
--

COPY public.mx_config (pid, key, data, date_modified) FROM stdin;
1	about	[{"title": {"bn": "", "de": "", "en": "Disclaimer", "es": "", "fa": "", "fr": "Conditions d’utilisation", "ps": "", "ru": "", "zh": ""}, "content": {"bn": "", "de": "", "en": "\\n <ol>\\n <li> The contents of this website are provided by a range of data suppliers and do not necessarily reflect the views or policies of UN Environment Programme, its contributory organizations or editors or Member States.</li>\\n <li> The designations employed and the presentations of material in this course do not imply the expression of any opinion whatsoever on the part of UN Environment Programme or contributory organizations, editors or publishers concerning the legal status\\n of any country, territory, city area or its authorities, or concerning the delimitation of its frontiers or boundaries or the designation of its name, frontiers or boundaries.</li>\\n <li> Materials provided on this site are provided \\"as is\\" and UN Environment Programme specifically does not make any warranties or representations as to the accuracy or completeness of any such materials.</li>\\n <li> This site may contain links and references to third-party web sites. The linked sites are not under the control of UN Environment Programmme and UN Environment Programme is not responsible for, nor does it necessarily endorse, any of the their content.</li>\\n <li>The performance of the MapX platform will be assessed on a regular basis using aggregated performance statistics that are collected from user logins, as well as data visualizations, uploads and downloads. No personal data will ever be released in the assessment of the platform's performance. User registration with MapX implies consent to collect and publish performance data of non-personally identifiable information at an aggregate level.</li>\\n </ol>\\n", "es": "", "fa": "", "fr": "\\n <ol>\\n <li> Le contenu de ce site web est assuré par divers fournisseurs de données et ne reflète en aucune cas les vues ou les politiques du Programme des Nations Unies pour l’environnement, des organisations et individus qui y contribuent ou des États membres.</li>\\n <li> Les appellations utilisées sur ce site web et la présentation des données qui y figurent n’impliquent de la part du Programme des Nations Unies pour l’environnement, des organisations et individus qui y contribuent ou des États membres, aucune prise de position quant au statut juridique des pays, territoires, villes ou zones, ou de leurs autorités, ni quant au tracé de leurs frontières ou limites.</li>\\n <li> Les informations fournies sur ce site sont restituées en l’état et le Programme des Nations Unies pour l’environnement ne donne aucune garantie, explicite ou implicite, en ce qui concerne l’exactitude, l’intégralité ou la fiabilité de ces informations.</li>\\n <li> Ce site peut contenir des liens et des références vers des sites web tiers. Ces sites ne sont pas sous le contrôle du Programme des Nations Unies pour l’environnement qui n’est pas responsable de, et n’approuve pas nécessairement, leur contenu.</li>\\n <li> Les performances de la plateforme MapX sont évaluées régulièrement à l’aide de statistiques de performance collectées à partir des connexions des utilisateurs, ainsi que de la visualisation, de l’ajout et du téléchargement de données. Aucune donnée personnelle ne sera publiée lors de l’évaluation des performances de la plateforme. L’enregistrement d’un utilisateur auprès de MapX implique l’autorisation de collecter et de publier des données de performance d’informations non personnellement identifiables à un niveau global.</li>\\n </ol>\\n", "ps": "", "ru": "", "zh": ""}}]	now()
\.

--
-- Data for Name: mx_projects; Type: TABLE DATA; Schema: public; Owner: mapxw
--

COPY public.mx_projects (pid, id, id_old, title, description, active, public, admins, members, publishers, map_position, countries, creator, date_created, date_modified, views_external, alias, allow_join, contacts) FROM stdin;
1	MX-3ZK-82N-DY8-WU2-IGF	WLD	{"bn": "বিশ্", "de": "Welt", "en": "World", "es": "Mundo", "fa": "ﺞﻫﺎﻧ", "fr": "Monde", "ps": "نړۍ", "ru": "Мир", "zh": "世界"}	{"bn": "বিশ্", "de": "Welt", "en": "World", "es": "Mundo", "fa": "ﺞﻫﺎﻧ", "fr": "Monde", "ps": "نړۍ", "ru": "Мир", "zh": "世界"}	t	t	[1]	[1]	[1]	{"z": 2, "lat": 0, "lng": 0}	["WLD"]	1	now()	now()	[]	\N	f	[] 
\.

--
-- Data for Name: mx_users; Type: TABLE DATA; Schema: public; Owner: mapxw
--

INSERT INTO
  public.mx_users (pid, id, username, email, key, validated, hidden, date_validated, date_last_visit, data)
VALUES
  (1, 1, 'user_1', :'admin', '3oqf43x3mbr1j78', 't', 'f', now(), now(), '{"user": {"cache": {"last_project": "MX-3ZK-82N-DY8-WU2-IGF", "last_language": "en"}}}'),
  (2, 2, 'user_2', :'guest', 'g8ejy73lqe7e8m6', 't', 'f', now(), now(), '{"user": {"cache": {"last_project": "MX-3ZK-82N-DY8-WU2-IGF", "last_language": "en"}}}');

