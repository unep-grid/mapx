import Ajv from "ajv";
import { columnsExist, columnExists, isSourceRegistered } from "#mapx/db_utils";
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
      keyword: "mx_validators",
      type: ["string", "object"],
      validate: this._mx_validators.bind(this),
    });

    /*
     * json-editor options
     */
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
      // Nothing returned if valid, errors if not
      await this._ajv_validate(data);
      return [];
    } catch (err) {
      if (err instanceof Ajv.ValidationError) {
        return err.errors;
      } else {
        throw err;
      }
    }
  }

  /**
   * Internal method to handle custom validations as specified in the mx_validators keyword.
   * @param {Array} validators - The array of custom validators to be executed.
   * @param {Object} dataValidator - The subset of data to be validated.
   * @param {Object} dataRoot - The root data object, used for relative validations.
   * @returns {Promise<boolean>} A promise that resolves to `true` if all validations pass, or `false` if any fail.
   * @private
   */
  async _mx_validators(validators = [], dataValidator, dataRoot) {
    try {
      for (const validator of validators) {
        const { type, columns, column, table, path } = validator;
        const data = validator.path === "." ? dataValidator : dataRoot[path];
        let isValid;
        switch (type) {
          case "source_registered":
            isValid = await isSourceRegistered(data, this._client);
            break;
          case "columns_in_table":
            isValid = await columnsExist(
              data[columns],
              data[table],
              this._client
            );
            break;
          case "column_in_table":
            isValid = await columnExists(
              data[column],
              data[table],
              this._client
            );
            break;
          default:
            throw new Error(`Unknown validator type: ${type}`);
        }

        if (!isValid) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Error in _mx_validators:", error);
      throw error;
    }
  }
}
