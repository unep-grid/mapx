import { isRoot, isAdmin } from "#mapx/authentication";
import { validate } from "./validate.js";
import { isNotEmpty } from "@fxi/mx_valid";
import { pgRead, pgWrite } from "#mapx/db";
import { randomString } from "#mapx/helpers";

/**
 * Create a new theme
 */
export async function ioThemeCreate(socket, data, cb) {
  try {
    const auth = isRoot(socket) || isAdmin(socket);
    if (!auth) {
      throw new Error("theme_creation_not_allowed");
    }

    // Validate theme data
    const issues = await validate(data.theme);
    if (isNotEmpty(issues)) {
      throw new Error("theme_data_not_valid");
    }

    const idUser = socket.session.user_id;
    const idProject = socket.session.project_id;
    const themeId =
      data.theme.id || `theme_${randomString("", 8, 0, false, true)}`;

    // Prepare theme object
    const theme = {
      id: themeId,
      id_project: idProject,
      creator: idUser,
      last_editor: idUser,
      public: data.theme.public || false,
      colors: JSON.stringify(data.theme.colors),
      dark: data.theme.dark || false,
      vegetation: data.theme.tree || false,
      water: data.theme.water || false,
      base: data.theme.base || false,
      description: JSON.stringify(data.theme.description || {}),
    };

    // Insert theme
    await pgWrite.query(
      `INSERT INTO mx_themes(
        id, creator, last_editor, public, colors, dark, tree, water, base, description
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )`,
      [
        theme.id,
        theme.creator,
        theme.last_editor,
        theme.public,
        theme.colors,
        theme.dark,
        theme.vegetation,
        theme.water,
        theme.base,
        theme.description,
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
 * List themes
 */
export async function ioThemeList(socket, data, cb) {
  try {
    const idUser = socket.session.user_id;
    const idProject = socket.session.project_id;
    // const isUserRoot = isRoot(socket);

    const query = `
      SELECT * FROM mx_themes 
      WHERE
      (
        creator = ${idUser} OR 
        public = true
      ) AND
      id_project = '${idProject}' 
      ORDER BY date_modified DESC
    `;

    const { rows } = await pgRead.query(query);

    // Parse JSON fields
    const themes = rows.map((theme) => ({
      ...theme,
      colors: JSON.parse(theme.colors),
      description: JSON.parse(theme.description),
    }));

    data.themes = themes;
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
export async function ioThemeUpdate(socket, data, cb) {
  try {
    const idUser = socket.session.user_id;
    const isUserRoot = isRoot(socket);
    const themeId = data.theme.id;

    if (!themeId) {
      throw new Error("theme_id_required");
    }

    // Check permissions
    const { rows } = await pgRead.query(
      `SELECT creator FROM mx_themes WHERE id = $1`,
      [themeId]
    );

    if (rows.length === 0) {
      throw new Error("theme_not_found");
    }

    const canEdit = isUserRoot || rows[0].creator === idUser;
    if (!canEdit) {
      throw new Error("theme_update_not_allowed");
    }

    // Validate theme data
    const issues = await validate(data.theme);
    if (isNotEmpty(issues)) {
      throw new Error("theme_data_not_valid");
    }

    // Update theme
    await pgWrite.query(
      `UPDATE mx_themes SET
        last_editor = $1,
        public = $2,
        colors = $3,
        dark = $4,
        vegetation = $5,
        water = $6,
        base = $7,
        description = $8
      WHERE id = $9`,
      [
        idUser,
        data.theme.public || false,
        JSON.stringify(data.theme.colors),
        data.theme.dark || false,
        data.theme.vegetation || false,
        data.theme.water || false,
        data.theme.base || false,
        JSON.stringify(data.theme.description || {}),
        themeId,
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
    const idUser = socket.session.user_id;
    const isUserRoot = isRoot(socket);
    const themeId = data.themeId;

    if (!themeId) {
      throw new Error("theme_id_required");
    }

    // Check if theme exists and permissions
    const { rows } = await pgRead.query(
      `SELECT creator, base FROM mx_themes WHERE id = $1`,
      [themeId]
    );

    if (rows.length === 0) {
      throw new Error("theme_not_found");
    }

    // Prevent deletion of base themes
    if (rows[0].base) {
      throw new Error("base_theme_deletion_not_allowed");
    }

    const canDelete = isUserRoot || rows[0].creator === idUser;
    if (!canDelete) {
      throw new Error("theme_deletion_not_allowed");
    }

    // Delete theme
    await pgWrite.query(`DELETE FROM mx_themes WHERE id = $1`, [themeId]);

    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * Get a specific theme by ID
 */
export async function ioThemeGet(socket, data, cb) {
  try {
    const idUser = socket.session.user_id;
    const isUserRoot = isRoot(socket);
    const themeId = data.themeId;

    if (!themeId) {
      throw new Error("theme_id_required");
    }

    // Get theme
    const { rows } = await pgRead.query(
      `SELECT * FROM mx_themes WHERE id = $1`,
      [themeId]
    );

    if (rows.length === 0) {
      throw new Error("theme_not_found");
    }

    // Check permissions
    const isPublic = rows[0].public;
    const isOwner = rows[0].creator === idUser;

    if (!isPublic && !isOwner && !isUserRoot) {
      throw new Error("theme_access_not_allowed");
    }

    // Parse JSON fields
    const theme = {
      ...rows[0],
      colors: JSON.parse(rows[0].colors),
      description: JSON.parse(rows[0].description),
    };

    data.theme = theme;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}
