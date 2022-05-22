<template>
  <div id="ast-viewport" ref="container" />
</template>

<script>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { graphviz } from 'd3-graphviz'
import { getData, dataToAstDigraph } from '@/util/ast'

export default {
  props: {
    astTree: {
      type: Object,
      required: true
    },
    code: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const container = ref(null)
    const digraphData = ref(null)
    let hiddenNodesSet

    const rerender = () => {
      container.value.innerHTML = ''
      graphviz('#ast-viewport', { useWorker: false })
        .destroy()
        .width(container.value.offsetWidth)
        .height(container.value.offsetHeight)
        .renderDot(dataToAstDigraph(digraphData.value.nodes, digraphData.value.edges))
    }
    const reload = () => {
      digraphData.value = getData(props.astTree)
      hiddenNodesSet = new Set()
      rerender()
    }
    watch(() => props.astTree, reload)

    onMounted(reload)

    const isSubnode = (parentIdx, childIdx) => {
      const h = digraphData.value.hierarchy
      for (const idx of h[parentIdx] || []) {
        if (idx === childIdx || isSubnode(idx, childIdx)) {
          return true
        }
      }
      return false
    }

    const nodeClickHandler = (e) => {
      const nodeElem = e.target.closest('.node')
      if (!nodeElem) return
      const nodeIdx = +nodeElem.__data__.key.slice(1)
      if (hiddenNodesSet.has(nodeIdx)) {
        hiddenNodesSet.delete(nodeIdx)
        delete digraphData.value.nodes[nodeIdx].clicked
      } else {
        hiddenNodesSet.add(nodeIdx)
        digraphData.value.nodes[nodeIdx].clicked = true
      }
      for (const node of digraphData.value.nodes) {
        node.hidden = false
      }
      for (const edge of digraphData.value.edges) {
        edge.hidden = false
      }
      for (const hiddenIdx of hiddenNodesSet) {
        for (const [i, node] of digraphData.value.nodes.entries()) {
          if (isSubnode(hiddenIdx, i)) {
            node.hidden = true
          }
        }
        for (const edge of digraphData.value.edges) {
          if (isSubnode(hiddenIdx, edge.to)) {
            edge.hidden = true
          }
        }
      }
      rerender()
    }
    onMounted(() => {
      document.addEventListener('click', nodeClickHandler)
    })
    onUnmounted(() => {
      document.removeEventListener('click', nodeClickHandler)
    })

    return {
      container
    }
  }
}
</script>
