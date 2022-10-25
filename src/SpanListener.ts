import { tracing } from '@opentelemetry/sdk-node'

/**
 * @public
 */
export interface SpanListener {
  onStart(span: tracing.ReadableSpan): void
  onEnd(span: tracing.ReadableSpan): void
}
