import { api, NodeSDK } from '@opentelemetry/sdk-node'
import { MiniTracer } from './MiniTracer'
import { MiniTracerSpanStringifyOptions } from './MiniTracerSpanListener'

const miniTracer = new MiniTracer()
const sdk = new NodeSDK({
  spanProcessor: miniTracer.createSpanProcessor(),
})
const tracer = api.trace.getTracer('MiniTracer.test')

sdk.start()

it('works', async () => {
  const result = await tracer.startActiveSpan('test', async (span) => {
    const listener = miniTracer.createSpanListener(span)
    await tracer.startActiveSpan('a', async (a) => {
      await tracer.startActiveSpan('b', async (b) => {
        b.end()
      })
      a.end()
    })
    await tracer.startActiveSpan('c', async (b) => {
      b.end()
    })
    return listener
  })
  const options: MiniTracerSpanStringifyOptions = {
    title: 'Trace',
    getLabel: (span) => span.name,
  }
  expect(result.toString(options)).toMatchInlineSnapshot(`
    "Trace
    ├─a
    │ └─b
    └─c"
  `)
})
