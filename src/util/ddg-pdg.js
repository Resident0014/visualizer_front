import { getType, escapeQuotes } from './_common'
import { getCfgData } from './cfg'

const getNodeReadVariables = (node) => {
  const addItem = (item) => {
    const adder = addItemByType[getType(item['!'])]
    if (adder) {
      adder(item)
    }
  }
  const addItemByType = {
    ExpressionStmt: (st) => {
      addItem(st.expression)
    },
    VariableDeclarationExpr: (expr) => {
      for (const v of expr.variables) {
        addItem(v)
      }
    },
    VariableDeclarator: (expr) => {
      if (expr.initializer) {
        addItem(expr.initializer)
      }
    },
    AssignExpr: (expr) => {
      if (expr.operator !== 'ASSIGN') {
        addItem(expr.target)
      }
      addItem(expr.value)
    },
    ReturnStmt: (st) => {
      addItem(st.expression)
    },
    MethodCallExpr: (expr) => {
      for (const arg of expr.arguments) {
        addItem(arg)
      }
    },
    BinaryExpr: (expr) => {
      addItem(expr.left)
      addItem(expr.right)
    },
    UnaryExpr: (expr) => {
      addItem(expr.expression)
    },
    ArrayCreationExpr: (expr) => {
      for (const level of expr.levels) {
        addItem(level)
      }
    },
    ArrayCreationLevel: (expr) => {
      addItem(expr.dimension)
    },
    FieldAccessExpr: (expr) => {
      addItem(expr.scope)
    },
    ArrayAccessExpr: (expr) => {
      addItem(expr.name)
      addItem(expr.index)
    },
    EnclosedExpr: (expr) => {
      addItem(expr.inner)
    },
    NameExpr: (expr) => {
      addItem(expr.name)
    },
    SimpleName: (name) => {
      set.add(name.identifier)
    }
  }
  const set = new Set()
  addItem(node.elem)
  return set
}
const getNodeWriteVariables = (node) => {
  const addItem = (item) => {
    const adder = addItemByType[getType(item['!'])]
    if (adder) {
      adder(item)
    }
  }
  const addItemByType = {
    MethodDeclaration: (m) => {
      for (const param of m.parameters) {
        addItem(param.name)
      }
    },
    ExpressionStmt: (st) => {
      addItem(st.expression)
    },
    VariableDeclarationExpr: (expr) => {
      for (const v of expr.variables) {
        addItem(v)
      }
    },
    VariableDeclarator: (expr) => {
      if (expr.initializer) {
        addItem(expr.name)
      }
    },
    AssignExpr: (expr) => {
      addItem(expr.target)
    },
    UnaryExpr: (expr) => {
      addItem(expr.expression)
    },
    NameExpr: (expr) => {
      addItem(expr.name)
    },
    SimpleName: (name) => {
      set.add(name.identifier)
    }
  }
  const set = new Set()
  addItem(node.elem)
  return set
}

const setVarContext = (nodes, from, vars) => {
  let changed = false
  for (const [v, nodeIdx] of Object.entries(vars)) {
    let w = nodes[from].varContext[v]
    if (!w) {
      w = nodes[from].varContext[v] = new Set()
    }
    if (!w.has(nodeIdx)) {
      w.add(nodeIdx)
      changed = true
    }
  }
  nodes[from].visited = true
  for (const v of nodes[from].writeVariables) {
    vars[v] = from
  }
  for (const to of nodes[from].jumps) {
    if (!nodes[to].visited || changed) {
      setVarContext(nodes, to, { ...vars })
    }
  }
}

const getDeps = (nodes) => {
  const deps = []
  for (const [to, node] of nodes.entries()) {
    for (const v of node.readVariables) {
      for (const from of node.varContext[v]) {
        deps.push({ from, to })
      }
    }
  }
  return deps
}

const getData = (code, tree) => {
  const { nodes, edges } = getCfgData(code, tree)
  for (const node of nodes) {
    node.jumps = []
    node.varContext = {}
    node.readVariables = getNodeReadVariables(node)
    node.writeVariables = getNodeWriteVariables(node)
  }
  for (const edge of edges) {
    nodes[edge.from].jumps.push(edge.to)
  }
  setVarContext(nodes, 0, {})
  const deps = getDeps(nodes)
  return { nodes, edges, deps }
}

const dataToDigraph = (code, tree, defaultEdgeAttr) => {
  const data = getData(code, tree)
  const lines = []
  for (const [i, node] of data.nodes.entries()) {
    let shape
    if (node.type === 'method' || node.type === 'return') {
      shape = 'ellipse'
    } else if (node.type === 'statement') {
      shape = 'box'
    } else if (node.type === 'condition') {
      shape = 'diamond'
    }
    // node.label += ` (r:[${[...node.readVariables].join(',')}], w:[${[...node.writeVariables].join(',')}])`
    // node.label += ' (' + Object.entries(node.varContext).map(e => `${e[0]}:[${[...e[1]]}]`).join(',') + ')'
    lines.push(`n${i} [label="${escapeQuotes(node.label)}", shape="${shape}"]`)
  }
  for (const edge of data.edges) {
    let line = `n${edge.from} -> n${edge.to}`
    const attrs = [defaultEdgeAttr]
    if (edge.type === 'trueBranch') {
      attrs.push('label="да"')
    }
    if (edge.type === 'falseBranch') {
      attrs.push('label="нет"')
    }
    line += ` [${attrs.join(' ')}]`
    lines.push(line)
  }
  for (const edge of data.deps) {
    lines.push(`n${edge.from} -> n${edge.to} [style="dashed", constraint=false]`)
  }
  return `digraph { ${lines.join(';')} }`
}

export const dataToDdgDigraph = (code, tree) => {
  return dataToDigraph(code, tree, 'style=invis')
}

export const dataToPdgDigraph = (code, tree) => {
  return dataToDigraph(code, tree, 'style=solid')
}
