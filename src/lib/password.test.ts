import { expect, it } from 'vitest'
import { passwordIssue } from './password'

it('rejects short passwords', () => {
  expect(passwordIssue('Ab1!')).toContain('8 位')
  expect(passwordIssue('')).not.toBeNull()
})

it('reports every missing character class', () => {
  expect(passwordIssue('abcdefgh')).toBe('还需包含大写字母、数字、符号')
  expect(passwordIssue('ABCDEFGH')).toBe('还需包含小写字母、数字、符号')
  expect(passwordIssue('Abcdefgh')).toBe('还需包含数字、符号')
  expect(passwordIssue('Abcdefg1')).toBe('还需包含符号')
})

it('accepts a compliant password', () => {
  expect(passwordIssue('Abcd1234!')).toBeNull()
  expect(passwordIssue('Defense2026#')).toBeNull()
})
