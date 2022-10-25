import { Span } from '@opentelemetry/api'
import { tracing } from '@opentelemetry/sdk-node'
import { MiniTracerSpanListener } from './MiniTracerSpanListener'
import { MiniTracerSpanProcessor } from './MiniTracerSpanProcessor'
import { SpanListener } from './SpanListener'

export class MiniTracer {
  spanListeners = new Set<SpanListener>()

  createSpanProcessor(baseSpanProcessor = new tracing.NoopSpanProcessor()) {
    return new MiniTracerSpanProcessor(this.spanListeners, baseSpanProcessor)
  }

  createSpanListener(rootSpan: Span) {
    return new MiniTracerSpanListener(rootSpan, this.spanListeners)
  }
}
