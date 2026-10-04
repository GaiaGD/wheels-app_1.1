import { describe, expect, it } from 'vitest'
import { routeStatusLabel } from './route-status'

describe('routeStatusLabel', () => {
  it.each([
    ['Departed', 'In the air'],
    ['EnRoute', 'In the air'],
    ['Approaching', 'In the air'],
    ['Arrived', 'Landed'],
    ['Canceled', 'Cancelled'],
    ['CanceledUncertain', 'Cancelled'],
    ['Diverted', 'Diverted'],
    ['Expected', 'Scheduled'],
    ['Unknown', 'Scheduled'],
    [null, 'Scheduled'],
  ])('%s -> %s', (raw, label) => expect(routeStatusLabel(raw)).toBe(label))
})
