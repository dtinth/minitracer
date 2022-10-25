import { Span } from '@opentelemetry/api'
import { tracing, core } from '@opentelemetry/sdk-node'
import { SpanListener } from './SpanListener'

export class MiniTracerSpanListener {
  spans: tracing.Span[] = []
  parentSet = new Set<string>()
  rootId: string
  timestamp = core.hrTimeToMicroseconds(core.hrTime())
  constructor(rootSpan: Span, private _spanListeners: Set<SpanListener>) {
    const spanContext = rootSpan.spanContext()
    this.parentSet.add(spanContext.spanId)
    this.rootId = spanContext.spanId
    this._spanListeners.add(this)
  }
  dispose() {
    this._spanListeners.delete(this)
  }
  onStart(span: tracing.Span) {
    const spanContext = span.spanContext()
    if (span.parentSpanId && this.parentSet.has(span.parentSpanId)) {
      this.parentSet.add(spanContext.spanId)
      this.spans.push(span)
    }
  }
  onEnd(_span: tracing.ReadableSpan) {}
  toJSON() {
    return {
      rootId: this.rootId,
      timestamp: this.timestamp,
      spans: this.spans.map((s) => toJSON(s)),
    }
  }
  toString(name = '.') {
    const childrenMap = new Map<string, tracing.Span[]>()
    for (const span of this.spans) {
      const parent = span.parentSpanId
      if (!parent) continue
      const children = childrenMap.get(parent) || []
      children.push(span)
      childrenMap.set(parent, children)
    }
    return toTree(name, this.rootId, childrenMap)
  }
}
function toJSON(span: tracing.ReadableSpan) {
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
function toTree(
  name: string,
  rootId: string,
  childrenMap: Map<string, tracing.Span[]>,
) {
  const lines: string[] = [name]

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
      const keys = Object.keys(child.attributes)
      const suffix = keys.length ? ' ' + JSON.stringify(child.attributes) : ''
      lines.push(
        prefix +
          child.name +
          ` ${Math.round(core.hrTimeToMilliseconds(child.duration))}ms` +
          suffix,
      )
      traverse(child.spanContext().spanId)
    }
    stack.pop()
  }
  traverse(rootId)

  return lines.join('\n')
}
