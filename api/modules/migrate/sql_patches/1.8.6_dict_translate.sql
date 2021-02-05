CREATE TABLE IF NOT EXISTS mx_dict_translate (
    id varchar(80),
    en varchar(1500),
    fr varchar(1500),
    es varchar(1500),
    ru varchar(1500),
    zh varchar(1500),
    ar varchar(1500),
    fa varchar(1500),
    ps varchar(1500),
    bn varchar(1500),
    de varchar(1500),
    PRIMARY KEY(id)
);

GRANT SELECT on mx_dict_translate TO readonly, readwrite;
