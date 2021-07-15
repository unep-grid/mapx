\set admin `echo "$MAIL_ADMIN"`
\set guest `echo "$MAIL_GUEST"`
\set projectdef `echo "$MAPX_PROJECT_DEFAULT"`
--
-- Data for Name: mx_config; Type: TABLE DATA; Schema: public; Owner: mapxw
--
INSERT INTO public.mx_config (pid, key, data, date_modified) VALUES
(
  1,
  'about', 
  '[{"title":{"bn": "", "de": "", "en": "Disclaimer", "es": "", "fa": "", "fr": "Conditions d’utilisation", "ps": "", "ru": "", "zh": ""}, "content": {"bn": "", "de": "", "en": "", "es": "", "fa": "", "fr": "", "ps": "", "ru": "", "zh": ""}}]',
  now()
);

--
-- Data for Name: mx_projects; Type: TABLE DATA; Schema: public; Owner: mapxw
--

INSERT INTO public.mx_projects (pid, id, id_old, title, description, active, public, admins, members, publishers, map_position, countries, creator, date_created, date_modified, views_external, alias, allow_join, contacts, states_views) VALUES
(
  1,
  :'projectdef',
  'WLD',
  '{"bn": "বিশ্", "de": "Welt", "en": "World", "es": "Mundo", "fa": "ﺞﻫﺎﻧ", "fr": "Monde", "ps": "نړۍ", "ru": "Мир", "zh": "世界"}',
  '{"bn": "বিশ্", "de": "Welt", "en": "World", "es": "Mundo", "fa": "ﺞﻫﺎﻧ", "fr": "Monde", "ps": "نړۍ", "ru": "Мир", "zh": "世界"}',
  true,
  true,
  '[1]',
  '[1]',
  '[1]',
  '{"z": 2, "lat": 0, "lng": 0}',
  '["WLD"]',
  1,
  now(),
  now(),
  '[]',
  'default',
  false,
  '[]',
  '[]' 
);

--
-- Data for Name: mx_users; Type: TABLE DATA; Schema: public; Owner: mapxw
--

INSERT INTO
public.mx_users (pid, id, username, email, key, validated, hidden, date_validated, date_last_visit, data)
VALUES
(
  1,
  1,
  'user_1',
  'admin@localhost',
  '3oqf43x3mbr1j78',
  't',
  'f',
  now(),
  now(),
  '{"user": {"cache": {"last_project": "", "last_language": "en"}}}'
),
(
  2,
  2,
  'user_2',
  'guest@localhost',
  'g8ejy73lqe7e8m6',
  't', 
  'f',
  now(),
  now(),
  '{"user": {"cache": {"last_project": "", "last_language": "en"}}}'
);

