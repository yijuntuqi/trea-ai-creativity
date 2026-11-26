import { expect, it } from 'vitest'
import { passwordIssue } from './password'

it('rejects short passwords', () => {
  expect(passwordIssue('a1b2c3')).toContain('8 位')
  expect(passwordIssue('')).not.toBeNull()
})

it('requires both letters and digits', () => {
  expect(passwordIssue('abcdefgh')).toContain('字母和数字')
  expect(passwordIssue('12345678')).toContain('字母和数字')
})

it('accepts a compliant password', () => {
  expect(passwordIssue('abcd1234')).toBeNull()
  expect(passwordIssue('Defense2026')).toBeNull()
})
