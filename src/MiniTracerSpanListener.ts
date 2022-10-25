import {
  Attributes,
  Link,
  Span,
  SpanKind,
  SpanStatus,
} from '@opentelemetry/api'
import { tracing, core } from '@opentelemetry/sdk-node'
import { SpanListener } from './SpanListener'

/**
 * @public
 */
export class MiniTracerSpanListener {
  /**
   * @beta
   */
  spans: tracing.ReadableSpan[] = []

  /**
   * @beta
   */
  parentSet = new Set<string>()

  /**
   * @beta
   */
  rootId: string

  /**
   * @beta
   */
  timestamp = core.hrTimeToMicroseconds(core.hrTime())

  /**
   * @internal
   */
  constructor(rootSpan: Span, private _spanListeners: Set<SpanListener>) {
    const spanContext = rootSpan.spanContext()
    this.parentSet.add(spanContext.spanId)
    this.rootId = spanContext.spanId
    this._spanListeners.add(this)
  }

  dispose() {
    this._spanListeners.delete(this)
  }

  onStart(span: tracing.ReadableSpan) {
    const spanContext = span.spanContext()
    if (span.parentSpanId && this.parentSet.has(span.parentSpanId)) {
      this.parentSet.add(spanContext.spanId)
      this.spans.push(span)
    }
  }

  onEnd(_span: tracing.ReadableSpan) {}

  toJSON(): MiniTracerSpanListenerJSONOutput {
    return {
      rootId: this.rootId,
      timestamp: this.timestamp,
      spans: this.spans.map((s) => toJSON(s)),
    }
  }

  toString(options: MiniTracerSpanStringifyOptions) {
    const childrenMap = new Map<string, tracing.ReadableSpan[]>()
    for (const span of this.spans) {
      const parent = span.parentSpanId
      if (!parent) continue
      const children = childrenMap.get(parent) || []
      children.push(span)
      childrenMap.set(parent, children)
    }
    return toTree(this.rootId, childrenMap, options)
  }
}

/**
 * @public
 */
export interface MiniTracerSpanListenerJSONOutput {
  rootId: string
  timestamp: number
  spans: MiniTracerSpanJSONOutput[]
}

/**
 * @public
 */
export interface MiniTracerSpanJSONOutput {
  traceId: string
  parentId?: string
  name: string
  id: string
  kind: SpanKind
  timestamp: number
  ended: boolean
  duration: number
  attributes: Attributes
  status: SpanStatus
  events: tracing.TimedEvent[]
  links: Link[]
}

function toJSON(span: tracing.ReadableSpan): MiniTracerSpanJSONOutput {
  const spanContext = span.spanContext()
  return {
    traceId: spanContext.traceId,
    parentId: span.parentSpanId,
    name: span.name,
    id: spanContext.spanId,
    kind: span.kind,
    timestamp: core.hrTimeToMicroseconds(span.startTime),
    ended: span.ended,
    duration: core.hrTimeToMicroseconds(span.duration),
    attributes: span.attributes,
    status: span.status,
    events: span.events,
    links: span.links,
  }
}

/**
 * @public
 */
export interface MiniTracerSpanStringifyOptions {
  title?: string
  getLabel?: (span: tracing.ReadableSpan) => string
}

function toTree(
  rootId: string,
  childrenMap: Map<string, tracing.ReadableSpan[]>,
  options: MiniTracerSpanStringifyOptions,
) {
  const title = options.title || '.'
  const getLabel =
    options.getLabel ||
    ((span) => {
      return (
        span.name +
        ` ${Math.round(core.hrTimeToMilliseconds(span.duration))}ms` +
        (Object.keys(span.attributes).length > 0
          ? ' ' + JSON.stringify(span.attributes)
          : '')
      )
    })
  const lines: string[] = [title]

  // Generate box-drawing tree representation
  const stack: { i: number; length: number }[] = []
  const traverse = (parentId: string) => {
    const children = childrenMap.get(parentId) || []
    const stackEntry = { i: 0, length: children.length }
    stack.push(stackEntry)
    for (const [index, child] of children.entries()) {
      stackEntry.i = index
      const prefix = stack
        .map((s, i) => {
          if (i === stack.length - 1) {
            if (s.i === s.length - 1) {
              return '└─'
            } else {
              return '├─'
            }
          } else {
            if (s.i === s.length - 1) {
              return '  '
            } else {
              return '│ '
            }
          }
        })
        .join('')
      lines.push(prefix + getLabel(child))
      traverse(child.spanContext().spanId)
    }
    stack.pop()
  }
  traverse(rootId)

  return lines.join('\n')
}
