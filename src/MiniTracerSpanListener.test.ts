import { core, tracing } from '@opentelemetry/sdk-node'
import { defaultGetLabel } from './MiniTracerSpanListener'

describe('defaultGetLabel', () => {
  it('should return the span label with time', async () => {
    expect(
      defaultGetLabel({
        name: 'foo',
        duration: [0, 0],
        attributes: {},
      } as tracing.ReadableSpan),
    ).toBe('foo 0ms')
  })
})
