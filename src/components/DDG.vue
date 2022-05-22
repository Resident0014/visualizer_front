<template>
  <div id="ddg-viewport" ref="container" />
</template>

<script>
import { ref, watch, onMounted } from 'vue'
import { graphviz } from 'd3-graphviz'
import { dataToDdgDigraph } from '@/util/ddg-pdg'

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
    const rerender = () => {
      container.value.innerHTML = ''
      graphviz('#ddg-viewport', { useWorker: false })
        .destroy()
        .width(container.value.offsetWidth)
        .height(container.value.offsetHeight)
        .renderDot(dataToDdgDigraph(props.code, props.astTree))
    }
    watch(() => props.astTree, rerender)
    onMounted(rerender)

    return {
      container
    }
  }
}
</script>
