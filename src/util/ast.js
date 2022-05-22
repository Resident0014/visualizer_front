import { escapeQuotes } from './_common'

export const getData = (tree) => {
  const nodes = []
  const edges = []
  const hierarchy = {}

  const addNode = (node, from) => {
    node.idx = nodes.push(node) - 1
    node.hidden = false
    node.from = from
    if (!hierarchy[from]) {
      hierarchy[from] = []
    }
    hierarchy[from].push(node.idx)
    edges.push({ from, to: node.idx, hidden: false })
    return node.idx
  }

  const parseNode = (node, edgeFrom = null, name = null) => {
    if (Array.isArray(node)) {
      const parentIdx = addNode({ label: name }, edgeFrom)
      for (const subNode of node) {
        parseNode(subNode, parentIdx)
      }
    } else if (typeof node === 'object') {
      const { _type, ...fields } = node
      const parentIdx = addNode({
        label: name ? `${name}\n${_type}` : _type,
        orig: node
      }, edgeFrom)
      for (const [fieldName, subNode] of Object.entries(fields)) {
        parseNode(subNode, parentIdx, fieldName)
      }
    } else {
      addNode({ label: `${name}\n${node}` }, edgeFrom)
    }
  }

  parseNode(tree)

  edges.shift()

  return { nodes, edges, hierarchy }
}

export const dataToAstDigraph = (nodes, edges) => {
  const lines = []
  for (const [i, node] of nodes.entries()) {
    if (node.hidden) continue
    const attrs = [
      `label="${escapeQuotes(node.label)}"`,
      'shape="box"'
    ]
    if (node.clicked) {
      attrs.push('style="filled", fillcolor="blue", fontcolor="white"')
    }
    lines.push(`n${i} [${attrs.join(',')}]`)
  }
  for (const edge of edges) {
    if (edge.hidden) continue
    lines.push(`n${edge.from} -> n${edge.to}`)
  }
  console.log(`digraph {\n${lines.join(';\n')}\n}`)
  return `digraph { ${lines.join(';')} }`
}
