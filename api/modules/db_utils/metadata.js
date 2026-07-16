import { settings } from "#root/settings";
import { createSourceRevision } from "../source/revision.js";

const languages = settings.validation_defaults.languages.codes;
const emptyLanguageItem = Object.fromEntries(
  languages.map((language) => [language, ""]),
);

function getAttributes(revision) {
  revision.data ||= {};
  revision.data.meta ||= {};
  revision.data.meta.text ||= {};
  revision.data.meta.text.attributes ||= {};
  revision.data.meta.text.attributes_alias ||= {};
  return revision.data.meta.text;
}

export function addColumnMetadata(
  idSource,
  column,
  idUser,
  client = null,
  revisions = null,
) {
  if (revisions) {
    return revisions.mutate(idSource, (revision) => {
      const text = getAttributes(revision);
      text.attributes[column] = structuredClone(emptyLanguageItem);
      text.attributes_alias[column] = structuredClone(emptyLanguageItem);
    });
  }
  return createSourceRevision({
    idSource,
    idUser,
    client,
    mutate(revision) {
      const text = getAttributes(revision);
      text.attributes[column] = structuredClone(emptyLanguageItem);
      text.attributes_alias[column] = structuredClone(emptyLanguageItem);
    },
  });
}

export function renameColumnMetadata(
  idSource,
  oldColumn,
  newColumn,
  idUser,
  client = null,
  revisions = null,
) {
  if (revisions) {
    return revisions.mutate(idSource, (revision) => {
      renameAttributes(revision, oldColumn, newColumn);
    });
  }
  return createSourceRevision({
    idSource,
    idUser,
    client,
    mutate(revision) {
      renameAttributes(revision, oldColumn, newColumn);
    },
  });
}

export function removeColumnMetadata(
  idSource,
  column,
  idUser,
  client = null,
  revisions = null,
) {
  if (revisions) {
    return revisions.mutate(idSource, (revision) => {
      const text = getAttributes(revision);
      delete text.attributes[column];
      delete text.attributes_alias[column];
    });
  }
  return createSourceRevision({
    idSource,
    idUser,
    client,
    mutate(revision) {
      const text = getAttributes(revision);
      delete text.attributes[column];
      delete text.attributes_alias[column];
    },
  });
}

export function duplicateColumnMetadata(
  idSource,
  sourceColumn,
  newColumn,
  idUser,
  client = null,
  revisions = null,
) {
  if (revisions) {
    return revisions.mutate(idSource, (revision) => {
      duplicateAttributes(revision, sourceColumn, newColumn);
    });
  }
  return createSourceRevision({
    idSource,
    idUser,
    client,
    mutate(revision) {
      duplicateAttributes(revision, sourceColumn, newColumn);
    },
  });
}

function renameAttributes(revision, oldColumn, newColumn) {
  duplicateAttributes(revision, oldColumn, newColumn);
  const text = getAttributes(revision);
  delete text.attributes[oldColumn];
  delete text.attributes_alias[oldColumn];
}

function duplicateAttributes(revision, sourceColumn, newColumn) {
  const text = getAttributes(revision);
  text.attributes[newColumn] = structuredClone(
    text.attributes[sourceColumn] ?? {},
  );
  text.attributes_alias[newColumn] = structuredClone(
    text.attributes_alias[sourceColumn] ?? {},
  );
}
