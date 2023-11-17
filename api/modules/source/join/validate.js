import { readJSON } from "#mapx/helpers";
import Ajv from "ajv";
import { columnExists, idExists } from "#mapx/db_utils";
import { isSourceId } from "@fxi/mx_valid";

// Load schema
const schema = await readJSON("./schema.json", import.meta.url);

/**
 * Validator class for performing data validation using AJV with custom
 * database-related validations.
 */
class Validator {
  constructor() {
    this._ajv = new Ajv();

    this._ajv.addKeyword({
      keyword: "id_exists",
      type: "string",
      validate: this._idExists.bind(this),
    });

    this._ajv.addKeyword({
      keyword: "col_exists_source",
      type: "string",
      validate: this._columnExistsSource.bind(this),
    });

    this._validate = this._ajv.compile(schema);
  }

  /**
   * Validates the given data against the compiled schema. It uses the provided
   * PostgreSQL client for any database-related validations.
   *
   * @param {Object} data - The data object to be validated.
   * @param {Object} client - The PostgreSQL client for database operations.
   * @returns {Promise<boolean>} A promise that resolves to `true` if validation passes,
   *                             or `false` otherwise. In case of errors during validation,
   *                             the promise resolves to `false`.
   */
  async checkErrors(data, client) {
    this._client = client;
    try {
      await this._validate(data);
      // Nothing returned if valid, errors if not
      return [];
    } catch (err) {
      if (!err instanceof Ajv.ValidationError) {
        throw err;
      }
      return err.errors;
    }
  }

  /**
   * Validate the source existance
   */
  async _columnExistsSource(schema, data, _, context) {
    const idSource = context?.parentData?.id_source;
    if (!isSourceId(idSource)) {
      return false;
    }

    try {
      const exists = await columnExists(
        schema.table,
        schema.id_col,
        data,
        this._client
      );
      return exists;
    } catch (error) {
      console.error("Error in columnExistsSource validation:", error);
      return false;
    }
  }

  /**
   * Validate if item id exists
   */
  async _idExists(schema, data) {
    try {
      const exists = await idExists(
        schema.table,
        schema.id_col,
        data,
        this._client
      );
      return exists;
    } catch (error) {
      console.error("Error in idExists validation:", error);
      return false;
    }
  }
}

export const validator = new Validator();
