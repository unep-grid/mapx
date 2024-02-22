import Ajv from "ajv";
import { columnsExist, columnExists, isSourceRegistered } from "#mapx/db_utils";
import { validateJoins } from "#mapx/source";
import { isObject } from "@fxi/mx_valid";

/**
 * Validator class for JSON schema validation with custom database-related validations.
 * This class integrates AJV with custom validation logic, particularly for PostgreSQL database transactions.
 */
export class Validator {
  /**
   * Constructs a Validator instance with a given JSON schema.
   * @param {Object} schema - The JSON schema used for validation.
   */
  constructor(schema) {
    this._ajv = new Ajv();

    /**
     * mapx validators
     */
    this._ajv.addKeyword({
      keyword: "mx_validate",
      async: true,
      type: ["string", "object", "array"],
      validate: this._mx_validate.bind(this),
    });

    /*
     * json-editor options
     */
    this._ajv.addKeyword({
      keyword: "options",
      type: "string",
      validate: isObject,
    });

    this._ajv.addKeyword({
      keyword: "mx_options",
      type: ["object", "string", "array"],
      validate: isObject,
    });

    /**
     * Compile validator
     * (returns a promise, but not detected by linter : using resolve)
     */
    this._ajv_validate = this._ajv.compile(schema);
    return this;
  }

  /**
   * Sets the PostgreSQL client for database-related validations.
   * This is useful for validations that need to be part of an ongoing transaction.
   * @param {Object} client - The PostgreSQL client to be used in validations.
   */
  setClient(client) {
    this._client = client;
  }

  /**
   * Validates the given data against the compiled schema.
   * Utilizes the PostgreSQL client for database validations.
   *
   * @param {Object} data - The data object to be validated.
   * @param {Object} client - The PostgreSQL client for database operations.
   * @returns {Promise<Array>} A promise that resolves to an array of errors
   * if validation fails, or an empty array if validation passes.
   * @throws Will throw an error for non-validation related issues during the validation process.
   */
  async validate(data, client) {
    this.setClient(client);
    try {
      await this._ajv_validate(data);
      // https://ajv.js.org/guide/async-validation.html
      return [];
    } catch (err) {
      if (err instanceof Ajv.ValidationError) {
        return err.errors;
      } else {
        throw err;
      }
    }
  }

  resolveDataPath(path, dataPath, property) {
    const { rootData, parentData } = dataPath;

    if (!path || path === ".") {
      return parentData[property];
    }

    const pathParts = path.split(".");
    let currentData = rootData;

    for (const part of pathParts) {
      if (part === "root") {
        currentData = rootData;
      } else if (currentData && typeof currentData === "object") {
        currentData = currentData[part];
      } else {
        // Path not found or invalid
        return undefined;
      }
    }

    return currentData[property];
  }

  async _mx_validate(
    config,
    value,
    _, //parentSchema,
    dataPath // {parentData,rootData,etc..}
    //parentData,
    //parentDataProperty,
  ) {
    const cv = this;

    try {
      if (!isObject(config)) {
        return true; // Skip if schema is not properly defined
      }

      const { path, type, property } = config;
      let isValid = true;
      let source;
      switch (type) {
        case "source_registered":
          isValid = await isSourceRegistered(value, cv._client);
          break;
        case "columns_exist":
          source = cv.resolveDataPath(path, dataPath, property);
          isValid = await columnsExist(value, source, cv._client);
          break;
        case "column_exists":
          source = cv.resolveDataPath(path, dataPath, property);
          isValid = await columnExists(value, source, cv._client);
          break;
        case "valid_joins":
          isValid = await validateJoins(value, cv._client);
          if (!isValid) {
            const data = await cv._client.query(
              `Select * from ${value.base.id_source}`
            );
            console.log(data.rows);
          }
          break;
        default:
          console.error(`Missing validate keyword ${type}`);
          isValid = false;
      }

      return isValid;
    } catch (error) {
      console.error("Error in _mx_validate:", error);
      throw error;
    }
  }
}
