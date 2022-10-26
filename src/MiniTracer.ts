import { Span, SpanContext } from '@opentelemetry/api'
import { tracing } from '@opentelemetry/sdk-node'
import { MiniTracerSpanListener } from './MiniTracerSpanListener'
import { MiniTracerSpanProcessor } from './MiniTracerSpanProcessor'
import { SpanListener } from './SpanListener'

/**
 * @public
 */
export class MiniTracer {
  /**
   * @public
   */
  spanListeners = new Set<SpanListener>()

  /**
   * @public
   */
  createSpanProcessor(baseSpanProcessor = new tracing.NoopSpanProcessor()) {
    return new MiniTracerSpanProcessor(this.spanListeners, baseSpanProcessor)
  }

  /**
   * @public
   */
  createSpanListener(
    spanOrSpanContext: Pick<Span, 'spanContext'> | SpanContext,
  ) {
    const spanContext =
      'spanContext' in spanOrSpanContext
        ? spanOrSpanContext.spanContext()
        : spanOrSpanContext
    return new MiniTracerSpanListener(spanContext, this.spanListeners)
  }
}
