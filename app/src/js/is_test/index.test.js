import { describe, it, expect } from 'vitest'
import {
  isEmpty,
  isNotEmpty,
  isObject,
  isString,
  isNumeric,
  isArray,
  isArrayOf,
  isUrl,
  isUrlHttps,
  isViewId,
  isView,
  isEqual,
  isBbox,
  isEmail,
} from './index.js'

describe('Core Type Checks', () => {
  describe('isObject', () => {
    it('should identify plain objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ a: 1 })).toBe(true)
      expect(isObject([])).toBe(false)
      expect(isObject(null)).toBe(false)
      expect(isObject(undefined)).toBe(false)
    })
  })

  describe('isString', () => {
    it('should identify strings', () => {
      expect(isString('')).toBe(true)
      expect(isString('hello')).toBe(true)
      expect(isString(123)).toBe(false)
      expect(isString(null)).toBe(false)
    })
  })

  describe('isNumeric', () => {
    it('should identify numbers and numeric strings', () => {
      expect(isNumeric(123)).toBe(true)
      expect(isNumeric('123')).toBe(true)
      expect(isNumeric('12.34')).toBe(true)
      expect(isNumeric('abc')).toBe(false)
      expect(isNumeric(null)).toBe(false)
    })
  })
})

describe('Empty Checks', () => {
  describe('isEmpty', () => {
    it('should identify empty values', () => {
      expect(isEmpty('')).toBe(true)
      expect(isEmpty([])).toBe(true)
      expect(isEmpty({})).toBe(true)
      expect(isEmpty(null)).toBe(true)
      expect(isEmpty(undefined)).toBe(true)
    })

    it('should identify non-empty values', () => {
      expect(isEmpty('hello')).toBe(false)
      expect(isEmpty([1])).toBe(false)
      expect(isEmpty({ a: 1 })).toBe(false)
    })
  })

  describe('isNotEmpty', () => {
    it('should be inverse of isEmpty', () => {
      expect(isNotEmpty('')).toBe(false)
      expect(isNotEmpty('hello')).toBe(true)
      expect(isNotEmpty([])).toBe(false)
      expect(isNotEmpty([1])).toBe(true)
    })
  })
})

describe('Array Validation', () => {
  describe('isArray', () => {
    it('should identify arrays', () => {
      expect(isArray([])).toBe(true)
      expect(isArray([1, 2, 3])).toBe(true)
      expect(isArray({})).toBe(false)
      expect(isArray(null)).toBe(false)
    })
  })

  describe('isArrayOf', () => {
    it('should validate array contents', () => {
      expect(isArrayOf([1, 2, 3], isNumeric)).toBe(true)
      expect(isArrayOf(['a', 'b', 'c'], isString)).toBe(true)
      expect(isArrayOf([1, 'b', 3], isNumeric)).toBe(false)
      expect(isArrayOf([], isNumeric)).toBe(true) // Empty arrays are valid
    })
  })
})

describe('URL Validation', () => {
  describe('isUrl', () => {
    it('should validate URLs', () => {
      expect(isUrl('https://example.com')).toBe(true)
      expect(isUrl('http://localhost:3000')).toBe(true)
      expect(isUrl('not-a-url')).toBe(false)
      expect(isUrl('')).toBe(false)
    })
  })

  describe('isUrlHttps', () => {
    it('should validate HTTPS URLs', () => {
      expect(isUrlHttps('https://example.com')).toBe(true)
      expect(isUrlHttps('http://example.com')).toBe(false)
      expect(isUrlHttps('not-a-url')).toBe(false)
    })
  })
})

describe('MapX Specific Validation', () => {
  describe('isViewId', () => {
    it('should validate MapX view IDs', () => {
      expect(isViewId('MX-12345-12345-12345')).toBe(true)
      expect(isViewId('MX-GJ-1234567890')).toBe(true)
      expect(isViewId('invalid-id')).toBe(false)
      expect(isViewId('')).toBe(false)
    })
  })

  describe('isView', () => {
    it('should validate MapX view objects', () => {
      const validView = {
        id: 'MX-12345-12345-12345',
        project: 'MX-ABC-DEF-GHI-JKL-MNO',
        type: 'vt',
        data: { some: 'data' }
      }
      expect(isView(validView)).toBe(true)
      expect(isView({})).toBe(false)
      expect(isView({ id: 'invalid' })).toBe(false)
    })
  })
})

describe('Equality Checks', () => {
  describe('isEqual', () => {
    it('should compare values deeply', () => {
      expect(isEqual({ a: 1 }, { a: 1 })).toBe(true)
      expect(isEqual([1, 2], [1, 2])).toBe(true)
      expect(isEqual({ a: 1 }, { b: 2 })).toBe(false)
      expect(isEqual([1, 2], [2, 1])).toBe(false)
    })
  })
})

describe('Geographic Validation', () => {
  describe('isBbox', () => {
    it('should validate bounding boxes', () => {
      const validBbox = {
        lat1: -10,
        lat2: 10,
        lng1: -20,
        lng2: 20
      }
      expect(isBbox(validBbox)).toBe(true)
      expect(isBbox({})).toBe(false)
      expect(isBbox({ lat1: 91 })).toBe(false) // Invalid latitude
      expect(isBbox({ lat1: 0, lat2: -1 })).toBe(false) // Invalid order
    })
  })
})

describe('Email Validation', () => {
  describe('isEmail', () => {
    it('should validate email addresses', () => {
      expect(isEmail('user@example.com')).toBe(true)
      expect(isEmail('user.name+tag@example.co.uk')).toBe(true)
      expect(isEmail('invalid-email')).toBe(false)
      expect(isEmail('')).toBe(false)
    })
  })
})
