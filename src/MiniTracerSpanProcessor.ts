import { Context } from '@opentelemetry/api'
import { tracing } from '@opentelemetry/sdk-node'
import { SpanListener } from './SpanListener'

export class MiniTracerSpanProcessor implements tracing.SpanProcessor {
  constructor(
    private _spanListeners: Set<SpanListener>,
    private _baseSpanProcessor: tracing.SpanProcessor,
  ) {}

  forceFlush() {
    return this._baseSpanProcessor.forceFlush()
  }

  onStart(span: tracing.Span, parentContext: Context) {
    this._spanListeners.forEach((listener) => listener.onStart?.(span))
    return this._baseSpanProcessor.onStart(span, parentContext)
  }

  onEnd(span: tracing.ReadableSpan) {
    this._spanListeners.forEach((listener) => listener.onEnd?.(span))
    return this._baseSpanProcessor.onEnd(span)
  }

  shutdown() {
    return this._baseSpanProcessor.shutdown()
  }
}
