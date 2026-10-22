// node --test src/composables/thirdsLayout.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { thirdsLayout } from './thirdsLayout.js'

const P = 'vertical'
const L = 'horizontal'
const layout = (list, options) => thirdsLayout(list, (x) => x === P, options)

test('horizontal y vertical comparten fila: 2/3 + 1/3', () => {
  assert.deepEqual(layout([L, P]), [
    { row: 1, col: 1, span: 2 },
    { row: 1, col: 3, span: 1 },
  ])
})

test('tres verticales llenan una fila, un tercio cada una', () => {
  assert.deepEqual(layout([P, P, P]).map((p) => p.col), [1, 2, 3])
})

test('filas incompletas alternan izquierda y derecha', () => {
  // Fila 1 incompleta (pegada a la izquierda); la fila 2 queda llena con 2/3 + 1/3
  assert.deepEqual(layout([L, L, P]), [
    { row: 1, col: 1, span: 2 },
    { row: 2, col: 1, span: 2 },
    { row: 2, col: 3, span: 1 },
  ])
  // Dos filas incompletas: la primera a la izquierda, la segunda a la derecha
  assert.deepEqual(layout([L, L]), [
    { row: 1, col: 1, span: 2 },
    { row: 2, col: 2, span: 2 },
  ])
})

test('wideFirst: el primero ocupa los tres tercios', () => {
  assert.deepEqual(layout([L, P], { wideFirst: true }), [
    { row: 1, col: 1, span: 3 },
    { row: 2, col: 3, span: 1 },
  ])
})

test('lista vacía', () => {
  assert.deepEqual(layout([]), [])
})

test('con 2 columnas: lo horizontal ocupa la fila y lo vertical va de a pares, alternando el lado', () => {
  const items = ['h', 'v', 'v', 'v', 'h']
  assert.deepEqual(thirdsLayout(items, (x) => x === 'v', { cols: 2 }), [
    { row: 1, col: 1, span: 2 },
    { row: 2, col: 1, span: 1 },
    { row: 2, col: 2, span: 1 },
    { row: 3, col: 1, span: 1 },
    { row: 4, col: 1, span: 2 },
  ])
})
