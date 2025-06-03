import { isRoot, isAdmin } from "#mapx/authentication";
import { isEmpty } from "@fxi/mx_valid";
import {
  schemaFull,
  schemaMeta,
  validateFull,
  validateMeta,
} from "./validate.js";
import { isNotEmpty } from "@fxi/mx_valid";
import { pgRead, pgWrite } from "#mapx/db";

/**
 * Validate
 */
export async function ioThemeValidate(_, data, cb) {
  try {
    data.issues = [];

    if (data.full) {
      data.issues = await validateFull(data.theme);
    } else {
      data.issues = await validateMeta(data.theme);
    }
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

export async function ioThemeGetSchema(_, data, cb) {
  if (data.full) {
    cb(schemaFull);
  } else {
    cb(schemaMeta);
  }
}

/**
 * Create a new theme
 */
export async function ioThemeCreate(socket, data, cb) {
  try {
    const isUserAllowed = isRoot(socket) || isAdmin(socket);

    if (!isUserAllowed) {
      throw new Error("theme_creation_not_allowed");
    }

    const idUser = socket.session.user_id;
    const idProject = socket.session.project_id;

    const issues = await validateMeta(data.theme);

    if (isNotEmpty(issues)) {
      throw new Error("theme_data_not_valid");
    }

    // Prepare theme object
    const theme = {
      id: data.theme.id,
      id_project: idProject,
      creator: idUser,
      last_editor: idUser,
      colors: data.theme.colors,
      dark: data.theme.dark || false,
      tree: data.theme.tree || false,
      water: data.theme.water || false,
      description: data.theme.description || {},
      label: data.theme.label || {},
    };

    const issuesFull = await validateFull(theme);

    if (isNotEmpty(issuesFull)) {
      throw new Error("theme_data_not_valid");
    }

    // Insert theme
    await pgWrite.query(
      `INSERT INTO mx_themes(
        id, id_project, creator, last_editor, colors, dark, tree, water, description, label
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )`,
      [
        theme.id,
        theme.id_project,
        theme.creator,
        theme.last_editor,
        theme.colors,
        theme.dark,
        theme.tree,
        theme.water,
        theme.description,
        theme.label,
      ]
    );

    data.theme = theme;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * List themes by project
 */
export async function ioThemeList(socket, data, cb) {
  try {
    const idProject = socket.session.project_id;

    // Use parameterized query to prevent SQL injection
    const query = `
      SELECT * FROM mx_themes
      WHERE
        id_project = $1
      ORDER BY date_modified DESC
    `;

    const { rows } = await pgRead.query(query, [idProject]);
    data.themes = rows;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * Lit all themes ids
 */
export async function ioThemeListIds(_, data, cb) {
  try {
    // Use parameterized query to prevent SQL injection
    const query = `SELECT id FROM mx_themes`;

    const { rows } = await pgRead.query(query);
    data.ids = rows.map((r) => r.id);
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * Update a theme
 */
export async function ioThemeSave(socket, data, cb) {
  try {
    const idUser = socket.session.user_id;

    const isUserAllowed = isRoot(socket) || isAdmin(socket);

    if (!isUserAllowed) {
      throw new Error("theme_update_not_allowed");
    }

    const issues = await validateMeta(data.theme);

    if (isNotEmpty(issues)) {
      throw new Error("theme_data_not_valid");
    }

    const idTheme = data.theme.id;

    // Check uf exists upsert
    const { rows } = await pgRead.query(
      `SELECT creator FROM mx_themes WHERE id = $1`,
      [idTheme]
    );

    if (isEmpty(rows)) {
      return ioThemeCreate(socket, data, cb);
    }

    data.theme.last_editor = idUser;
    data.theme.creator = rows[0].creator;

    // Validate theme data
    const issuesFull = await validateFull(data.theme);

    if (isNotEmpty(issuesFull)) {
      throw new Error("theme_data_not_valid");
    }

    // Update theme
    await pgWrite.query(
      `UPDATE mx_themes SET
        last_editor = $1,
        colors = $2,
        dark = $3,
        tree = $4,
        water = $5,
        description = $6,
        label = $7
      WHERE id = $8`,
      [
        idUser,
        data.theme.colors,
        data.theme.dark || false,
        data.theme.tree || false,
        data.theme.water || false,
        data.theme.description || {},
        data.theme.label || {},
        idTheme,
      ]
    );

    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * Delete a theme
 */
export async function ioThemeDelete(socket, data, cb) {
  try {
    const isUserAllowed = isRoot(socket) || isAdmin(socket);

    if (!isUserAllowed) {
      throw new Error("theme_deletion_not_allowed");
    }
    const { idTheme } = data;

    if (!idTheme) {
      throw new Error("theme_id_required");
    }

    // Check if theme exists and permissions
    const { rows } = await pgRead.query(
      `SELECT pid FROM mx_themes WHERE id = $1`,
      [idTheme]
    );

    if (rows.length === 0) {
      throw new Error("theme_not_found");
    }

    // Delete theme
    await pgWrite.query(`DELETE FROM mx_themes WHERE id = $1`, [idTheme]);

    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

export async function ioThemeValidateId(_, data, cb) {
  try {
    const idTheme = data.idTheme;

    if (!idTheme) {
      throw new Error("theme_id_required");
    }

    const { rows } = await pgRead.query(
      `SELECT pid FROM mx_themes WHERE id = $1 LIMIT 1`,
      [idTheme]
    );

    data.exists = rows.length > 0;
    data.valid = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * Get a specific theme by ID
 */
export async function ioThemeGet(_, data, cb) {
  try {
    const idTheme = data.idTheme;
    if (!idTheme) {
      throw new Error("theme_id_required");
    }
    // Get theme
    const { rows } = await pgRead.query(
      `SELECT * FROM mx_themes WHERE id = $1 LIMIT 1`,
      [idTheme]
    );

    if (rows.length === 0) {
      throw new Error("theme_not_found");
    }

    const theme = rows[0];

    data.theme = theme;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}
