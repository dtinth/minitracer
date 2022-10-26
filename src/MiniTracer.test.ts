import { api, NodeSDK } from '@opentelemetry/sdk-node'
import { MiniTracer } from './MiniTracer'
import {
  MiniTracerSpanListenerJSONOutput,
  MiniTracerSpanStringifyOptions,
} from './MiniTracerSpanListener'

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
    listener.dispose()
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
  expect(processJSON(result.toJSON())).toMatchInlineSnapshot(`
    Object {
      "spans": Array [
        Object {
          "ended": true,
          "name": "a",
          "parent": undefined,
          "status": Object {
            "code": 0,
          },
        },
        Object {
          "ended": true,
          "name": "b",
          "parent": "a",
          "status": Object {
            "code": 0,
          },
        },
        Object {
          "ended": true,
          "name": "c",
          "parent": undefined,
          "status": Object {
            "code": 0,
          },
        },
      ],
    }
  `)
})

it('works with spans that are started out of order', async () => {
  const result = await tracer.startActiveSpan('test', async (span) => {
    const listener = miniTracer.createSpanListener(span.spanContext())
    await tracer.startActiveSpan('a', async (a) => {
      listener.TEST_deferSpans(1)
      await tracer.startActiveSpan('b', async (b) => {
        await tracer.startActiveSpan('c', async (c) => {
          c.end()
        })
        b.end()
      })
      a.end()
      listener.TEST_flushDeferredSpans()
    })
    listener.dispose()
    return listener
  })
  const options: MiniTracerSpanStringifyOptions = {
    title: 'Trace',
    getLabel: (span) => span.name,
  }
  expect(result.toString(options)).toMatchInlineSnapshot(`
    "Trace
    └─a
      └─b
        └─c"
  `)
})

function processJSON(json: MiniTracerSpanListenerJSONOutput): any {
  return {
    spans: json.spans.map((s) => ({
      name: s.name,
      parent: json.spans.find((p) => p.id === s.parentId)?.name,
      ended: s.ended,
      status: s.status,
    })),
  }
}
