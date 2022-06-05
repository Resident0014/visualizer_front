import { escapeQuotes, getType } from './_common'

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

const getReadVariables = (node) => {
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
      set.add(name)
    }
  }
  const set = new Set()
  addItem(node.elem)
  return set
}
const getWriteVariables = (node) => {
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
    FieldAccessExpr: (expr) => {
      addItem(expr.scope)
    },
    ArrayAccessExpr: (expr) => {
      addItem(expr.name)
      addItem(expr.index)
    },
    NameExpr: (expr) => {
      addItem(expr.name)
    },
    SimpleName: (name) => {
      map.set(name.identifier, name)
    }
  }
  const map = new Map()
  node.type !== 'return' && addItem(node.elem)
  return map
}

const getCfgData = (tree) => {
  const nodes = []
  const edges = []

  const edgesQueue = []
  const loopStack = []
  const addSimpleNode = (node) => {
    const idx = nodes.push(node) - 1
    node.idx = idx
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
        elem: item
      })
    }
  }

  const addItemByType = {
    MethodDeclaration: (m) => {
      const idx = nodes.push({
        type: 'method',
        elem: m
      }) - 1
      nodes[idx].idx = idx
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
            elem: v
          })
        }
      }
    },
    AssignExpr: (expr) => {
      addSimpleNode({
        type: 'statement',
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
        elem: st.expression
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

const addVariables = (nodes) => {
  for (const node of nodes) {
    node.readVariables = getReadVariables(node)
    node.writeVariables = getWriteVariables(node)
  }
  console.log(nodes)
}

const subNums = '₀₁₂₃₄₅₆₇₈₉'
const getSubNumberStr = (num = 0) => {
  return Array.from(num.toString()).map(i => subNums[i]).join('')
}

const addVariableVersions = (nodes, edges) => {
  for (const node of nodes) {
    node.nodesFrom = []
    node.nodesTo = []
    node.varContext = {}
    node.writeVariableVersions = {}
  }
  for (const edge of edges) {
    nodes[edge.to].nodesFrom.push(nodes[edge.from])
    nodes[edge.from].nodesTo.push(nodes[edge.to])
  }
  for (const node of nodes) {
    node.visited = false
    node.isMultiFrom = node.nodesFrom.length > 1
    if (node.isMultiFrom) {
      node.versionsByFrom = {}
    }
  }
  const varVersions = {}
  const getNextVersion = (v) => {
    varVersions[v] = (varVersions[v] || 0) + 1
    return varVersions[v]
  }
  const setVariableVersions = (node, fromIdx) => {
    let runSubnodes = true
    const varContext = { ...nodes[fromIdx].varContext, ...nodes[fromIdx].writeVariableVersions }
    if (node.isMultiFrom) {
      runSubnodes = false
      for (const [v, version] of Object.entries(varContext)) {
        if (version === node.varContext[v]) continue
        let map = node.versionsByFrom[v]
        if (!map) {
          node.versionsByFrom[v] = map = new Map()
        }
        if (map.get(fromIdx) !== version) {
          runSubnodes = true
        }
        const versionsSet = new Set(map.values())
        map.set(fromIdx, version)
        if (map.size === 1) {
          node.varContext[v] = version
        } else if (versionsSet.size === 1 && !versionsSet.has(version)) {
          node.varContext[v] = getNextVersion(v)
        }
      }
    } else {
      Object.assign(node.varContext, varContext)
    }
    if (node.writeVariables.size > 0 && !node.visited) {
      node.visited = true
      for (const v of node.writeVariables.keys()) {
        node.writeVariableVersions[v] = getNextVersion(v)
      }
    }
    if (runSubnodes) {
      for (const subnode of node.nodesTo) {
        setVariableVersions(subnode, node.idx)
      }
    }
  }
  setVariableVersions(nodes[0], 0)
}

const fixVariableVersions = (nodes) => {
  const versionsMap = {}
  const varCounter = {}
  const getMatchedVersion = (varName, oldVersion) => {
    if (!versionsMap[varName]) {
      versionsMap[varName] = {}
    }
    if (!versionsMap[varName][oldVersion]) {
      const version = (varCounter[varName] || 0) + 1
      varCounter[varName] = versionsMap[varName][oldVersion] = version
    }
    return versionsMap[varName][oldVersion]
  }
  for (const node of nodes) {
    if (node.isMultiFrom) {
      for (const [varName, map] of Object.entries(node.versionsByFrom)) {
        const set = new Set(map.values())
        if (set.size > 1) {
          getMatchedVersion(varName, node.varContext[varName])
        }
      }
    }
    for (const [varName, version] of Object.entries(node.writeVariableVersions)) {
      node.writeVariableVersions[varName] = getMatchedVersion(varName, version)
    }
  }
  for (const node of nodes) {
    for (const [varName, version] of Object.entries(node.varContext)) {
      node.varContext[varName] = getMatchedVersion(varName, version)
    }
    if (node.isMultiFrom) {
      for (const [varName, map] of Object.entries(node.versionsByFrom)) {
        for (const [fromIdx, version] of map) {
          map.set(fromIdx, getMatchedVersion(varName, version))
        }
      }
    }
  }
}

const arrayTrim = (a) => {
  let i = a.length - 1
  while (a[i][0] === '\n') i--
  return a.slice(0, i + 1)
}

const getFixedCodeByRange = (codeLines, { beginLine, beginColumn, endLine, endColumn }) => {
  if (beginLine === endLine) {
    return codeLines[beginLine - 1].slice(beginColumn - 1, endColumn)
  }
  const lines = codeLines.slice(beginLine, endLine + 1)
  lines[0] = lines[0].slice(beginColumn)
  const idx = lines.length - 1
  lines[idx] = lines[idx].slice(0, endColumn)
  lines.forEach(s => arrayTrim(s))
  return lines.join(' ')
}

const addNodeLabels = (code, nodes) => {
  const codeLines = code.split('\n')
  const fixedCode = codeLines.map(line => Array.from(line))
  for (const node of nodes) {
    for (const [v, item] of node.writeVariables) {
      fixedCode[item.range.beginLine - 1][item.range.endColumn - 1] += getSubNumberStr(node.writeVariableVersions[v])
    }
    for (const item of node.readVariables) {
      fixedCode[item.range.beginLine - 1][item.range.endColumn - 1] += getSubNumberStr(node.varContext[item.identifier])
    }
  }
  const getCode = (elem) => getFixedCodeByRange(fixedCode, elem.range).join('')
  for (const node of nodes) {
    const { elem } = node
    if (node.type === 'method') {
      const params = elem.parameters.map(p => getCode(p.name)).join(', ')
      node.label = `${elem.name.identifier}(${params})`
    } else if (node.type === 'statement' || node.type === 'condition') {
      const type = getType(elem['!'])
      if (type === 'AssignExpr' && elem.operator !== 'ASSIGN') {
        const varName = elem.target.name.identifier
        const readVarVersion = varName + getSubNumberStr(node.varContext[varName])
        let rightSide = getCode(elem.value)
        if (getType(elem.value['!']) === 'BinaryExpr') {
          rightSide = `(${rightSide})`
        }
        node.label = `${getCode(elem.target)} = ${readVarVersion} ${operators[node.elem.operator]} ${rightSide}`
      } else if (type === 'UnaryExpr' && elem.operator.includes('CREMENT')) {
        const varName = elem.expression.name.identifier
        const writeVarVersion = varName + getSubNumberStr(node.writeVariableVersions[varName])
        const readVarVersion = varName + getSubNumberStr(node.varContext[varName])
        const sign = elem.operator.includes('INCREMENT') ? '+' : '-'
        node.label = `${writeVarVersion} = ${readVarVersion} ${sign} 1`
      } else {
        node.label = getCode(elem)
      }
    } else if (node.type === 'return') {
      node.label = `return ${getCode(elem)}`
    }
  }
}

export const dataToSsaDigraph = (code, tree) => {
  const cfgData = getCfgData(tree)
  addVariables(cfgData.nodes)
  addVariableVersions(cfgData.nodes, cfgData.edges)
  fixVariableVersions(cfgData.nodes)
  addNodeLabels(code, cfgData.nodes)

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
    if (node.isMultiFrom) {
      const varVersionsByFrom = Object.entries(node.versionsByFrom)
      const extraNodes = []
      for (const [v, map] of varVersionsByFrom) {
        const versionsSet = new Set(map.values())
        if (versionsSet.size > 1) {
          extraNodes.push({
            varName: v,
            versionsSet
          })
        }
      }
      if (extraNodes.length > 0) {
        const firstNodeId = `${i}_${extraNodes[0].varName}`
        for (const edge of cfgData.edges) {
          if (edge.to === i) {
            edge.to = firstNodeId
          }
        }
        for (let j = 1; j < extraNodes.length; j++) {
          const from = `${i}_${extraNodes[j - 1].varName}`
          const to = `${i}_${extraNodes[j].varName}`
          cfgData.edges.push({ from, to })
        }
        cfgData.edges.push({ from: `${i}_${extraNodes[extraNodes.length - 1].varName}`, to: i })

        for (const { varName, versionsSet } of extraNodes) {
          const phiList = [...versionsSet].map(v => varName + getSubNumberStr(v)).join(', ')
          const label = `${varName}${getSubNumberStr(node.varContext[varName])} = φ(${phiList})`
          lines.push(`n${i}_${varName} [label="${label}", shape="box"]`)
        }
      }
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
