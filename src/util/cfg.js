import { getType, getCodeGetterByElement, escapeQuotes } from './_common'

export const getCfgData = (code, tree) => {
  const getCode = getCodeGetterByElement(code)

  const nodes = []
  const edges = []

  const operators = {
    PLUS: '+',
    MINUS: '-',
    MULTIPLY: '*',
    DIVIDE: '/',
    REMAINDER: '%',
    XOR: '^',
    BINARY_AND: '&',
    BINARY_OR: '|',
    ASSIGN: ''
  }

  const edgesQueue = []
  const loopStack = []
  const addSimpleNode = (node) => {
    const idx = nodes.push(node) - 1
    do {
      const e = edgesQueue.shift()
      e.to = idx
      edges.push(e)
    } while (edgesQueue.length)
    edgesQueue.push({
      from: idx, to: null, type: 'simple'
    })
    return idx
  }

  const addItem = (item) => {
    const adder = addItemByType[getType(item['!'])]
    if (adder) {
      adder(item)
    } else {
      addSimpleNode({
        type: 'statement',
        label: `${getCode(item)}`,
        elem: item
      })
    }
  }

  const addItemByType = {
    MethodDeclaration: (m) => {
      const params = m.parameters.map(p => p.name.identifier).join(', ')
      const idx = nodes.push({
        type: 'method',
        label: `${m.name.identifier}(${params})`,
        elem: m
      }) - 1
      edgesQueue.push({
        from: idx, to: null, type: 'simple'
      })
      addItem(m.body)
    },
    ExpressionStmt: (st) => {
      addItem(st.expression)
    },
    VariableDeclarationExpr: (expr) => {
      for (const v of expr.variables) {
        if (v.initializer) {
          addSimpleNode({
            type: 'statement',
            label: `${v.name.identifier} = ${getCode(v.initializer)}`,
            elem: v
          })
        }
      }
    },
    AssignExpr: (expr) => {
      addSimpleNode({
        type: 'statement',
        label: `${getCode(expr.target)} ${operators[expr.operator]}= ${getCode(expr.value)}`,
        elem: expr
      })
    },
    BlockStmt: (st) => {
      for (const statement of st.statements) {
        addItem(statement)
      }
    },
    WhileStmt: (st) => {
      const idx = addSimpleNode({
        type: 'condition',
        label: `${getCode(st.condition)}`,
        elem: st.condition
      })
      edgesQueue[0].type = 'trueBranch'
      const loop = {
        breaks: [],
        continues: []
      }
      loopStack.push(loop)
      addItem(st.body)
      for (const edge of loop.continues) {
        edgesQueue.push(edge)
      }
      while (edgesQueue.length) {
        const e = edgesQueue.shift()
        e.to = idx
        edges.push(e)
      }
      edgesQueue.push({
        from: idx, to: null, type: 'falseBranch'
      })
      for (const edge of loop.breaks) {
        edgesQueue.push(edge)
      }
      loopStack.pop()
    },
    ForStmt: (forSt) => {
      for (const st of forSt.initialization) {
        addItem(st)
      }
      const idx = addSimpleNode({
        type: 'condition',
        label: `${forSt.compare ? getCode(forSt.compare) : 'true'}`,
        elem: forSt.compare
      })
      edgesQueue[0].type = 'trueBranch'
      const loop = {
        breaks: [],
        continues: []
      }
      loopStack.push(loop)
      addItem(forSt.body)
      for (const edge of loop.continues) {
        edgesQueue.push(edge)
      }
      for (const st of forSt.update) {
        addItem(st)
      }
      while (edgesQueue.length) {
        const e = edgesQueue.shift()
        e.to = idx
        edges.push(e)
      }
      edgesQueue.push({
        from: idx, to: null, type: 'falseBranch'
      })
      for (const edge of loop.breaks) {
        edgesQueue.push(edge)
      }
      loopStack.pop()
    },
    IfStmt: (st) => {
      const idx = addSimpleNode({
        type: 'condition',
        label: `${getCode(st.condition)}`,
        elem: st.condition
      })
      edgesQueue[0].type = 'trueBranch'
      addItem(st.thenStmt)
      const thenEdges = edgesQueue.splice(0, edgesQueue.length)
      edgesQueue.push({
        from: idx, to: null, type: 'falseBranch'
      })
      if (st.elseStmt) {
        addItem(st.elseStmt)
      }
      edgesQueue.push(...thenEdges)
    },
    ReturnStmt: (st) => {
      addSimpleNode({
        type: 'return',
        label: `return ${getCode(st.expression)}`,
        elem: st
      })
      while (edgesQueue.length) {
        edgesQueue.pop()
      }
    },
    BreakStmt: () => {
      const { breaks } = loopStack[loopStack.length - 1]
      while (edgesQueue.length) {
        breaks.push(edgesQueue.shift())
      }
    },
    ContinueStmt: () => {
      const { continues } = loopStack[loopStack.length - 1]
      while (edgesQueue.length) {
        continues.push(edgesQueue.shift())
      }
    }
  }

  addItem(tree)

  return { nodes, edges }
}

export const cfgDataToDigraph = (cfgData) => {
  const lines = []
  for (const [i, node] of cfgData.nodes.entries()) {
    let shape
    if (node.type === 'method' || node.type === 'return') {
      shape = 'ellipse'
    } else if (node.type === 'statement') {
      shape = 'box'
    } else if (node.type === 'condition') {
      shape = 'diamond'
    }
    lines.push(`n${i} [label="${escapeQuotes(node.label)}", shape="${shape}"]`)
  }
  for (const edge of cfgData.edges) {
    let line = `n${edge.from} -> n${edge.to}`
    const attrs = []
    if (edge.type === 'trueBranch') {
      attrs.push('label="да"')
    }
    if (edge.type === 'falseBranch') {
      attrs.push('label="нет"')
    }
    if (attrs.length) {
      line += ` [${attrs.join(' ')}]`
    }
    lines.push(line)
  }
  return `digraph { ${lines.join(';')} }`
}
