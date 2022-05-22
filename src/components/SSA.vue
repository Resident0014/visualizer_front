<template>
  <div id="ssa-viewport" ref="container" />
</template>

<script>
import { ref, watch, onMounted } from 'vue'
import { graphviz } from 'd3-graphviz'
import { dataToSsaDigraph } from '@/util/ssa'

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
      graphviz('#ssa-viewport', { useWorker: false })
        .destroy()
        .width(container.value.offsetWidth)
        .height(container.value.offsetHeight)
        .renderDot(dataToSsaDigraph(props.code, props.astTree))
    }
    watch(() => props.astTree, rerender)
    onMounted(rerender)

    return {
      container
    }
  }
}
</script>
