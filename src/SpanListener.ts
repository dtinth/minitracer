import { tracing } from '@opentelemetry/sdk-node'

export interface SpanListener {
  onStart(span: tracing.ReadableSpan): void
  onEnd(span: tracing.ReadableSpan): void
}
