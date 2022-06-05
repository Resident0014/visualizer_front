import { getData as getAstData } from './ast'
import { escapeQuotes } from './_common'

const getInstructionEdges = (nodes, tree) => {
  const edges = []
  const nodeMap = new Map()
  for (const node of nodes) {
    if (node.orig) {
      nodeMap.set(node.orig, node.idx)
    }
  }

  const edgesQueue = []
  const loopStack = []
  const addInstructionNode = (idx) => {
    do {
      const e = edgesQueue.shift()
      e.to = idx
      edges.push(e)
    } while (edgesQueue.length)
    edgesQueue.push({
      from: idx, to: null
    })
  }

  const addItem = (item) => {
    const adder = addItemByType[item._type]
    if (adder) {
      adder(item)
    } else {
      addInstructionNode(nodeMap.get(item))
    }
  }

  const addItemByType = {
    MethodDeclaration: (m) => {
      edgesQueue.push({
        from: nodeMap.get(m), to: null
      })
      addItem(m.body)
    },
    ExpressionStmt: (st) => {
      addItem(st.expression)
    },
    BlockStmt: (st) => {
      for (const statement of st.statements) {
        addItem(statement)
      }
    },
    WhileStmt: (st) => {
      const idx = nodeMap.get(st.condition)
      addInstructionNode(idx)
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
        from: idx, to: null
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
      const idx = nodeMap.get(forSt.compare)
      addInstructionNode(idx)
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
        from: idx, to: null
      })
      for (const edge of loop.breaks) {
        edgesQueue.push(edge)
      }
      loopStack.pop()
    },
    IfStmt: (st) => {
      const idx = nodeMap.get(st.condition)
      addInstructionNode(idx)
      addItem(st.thenStmt)
      const thenEdges = edgesQueue.splice(0, edgesQueue.length)
      edgesQueue.push({
        from: idx, to: null
      })
      if (st.elseStmt) {
        addItem(st.elseStmt)
      }
      edgesQueue.push(...thenEdges)
    },
    ReturnStmt: (st) => {
      addInstructionNode(nodeMap.get(st))
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

  return edges
}

const getVarEdges = (nodes, hierarchy) => {
  const declTypes = ['VariableDeclarator', 'Parameter']
  const useNodeIdxByVar = {}
  const declNodeIdxByVar = {}
  for (const [i, n] of nodes.entries()) {
    if (n.orig && n.orig._type === 'SimpleName') {
      const varName = n.orig.identifier
      const identifierIdx = hierarchy[i][0]
      if (declTypes.includes(nodes[n.from].orig._type)) {
        declNodeIdxByVar[varName] = identifierIdx
      } else {
        if (!useNodeIdxByVar[varName]) {
          useNodeIdxByVar[varName] = []
        }
        useNodeIdxByVar[varName].push(identifierIdx)
      }
    }
  }
  const varEdges = []
  for (const [varName, declIdx] of Object.entries(declNodeIdxByVar)) {
    for (const useIdx of useNodeIdxByVar[varName]) {
      varEdges.push({ from: useIdx, to: declIdx })
    }
  }
  return varEdges
}

export const getAsgData = (tree) => {
  const { nodes, edges, hierarchy } = getAstData(tree)

  const varEdges = getVarEdges(nodes, hierarchy)
  const instrEdges = getInstructionEdges(nodes, tree)

  return { nodes, edges, varEdges, instrEdges }
}

export const dataToAsgDigraph = ({ nodes, edges, varEdges, instrEdges }) => {
  const lines = []
  for (const [i, node] of nodes.entries()) {
    lines.push(`n${i} [label="${escapeQuotes(node.label)}", shape="box"]`)
  }
  for (const edge of edges) {
    lines.push(`n${edge.from} -> n${edge.to}`)
  }
  for (const edge of varEdges) {
    lines.push(`n${edge.from} -> n${edge.to} [style="dashed", constraint=false, color="blue"]`)
  }
  for (const edge of instrEdges) {
    lines.push(`n${edge.from} -> n${edge.to} [style="dashed", constraint=false, color="red"]`)
  }
  return `digraph { ${lines.join(';')} }`
}
