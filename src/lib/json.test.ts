import { parseLooseJSON } from './json'

it('parses fenced json', () => {
  expect(parseLooseJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 })
})

it('parses json with prose around it', () => {
  expect(parseLooseJSON('好的，结果如下：{"a":2} 完毕')).toEqual({ a: 2 })
})

it('repairs trailing comma', () => {
  expect(parseLooseJSON('{"a":3,}')).toEqual({ a: 3 })
})

it('throws on junk', () => {
  expect(() => parseLooseJSON('不是 JSON')).toThrow('JSON_PARSE_FAILED')
})
