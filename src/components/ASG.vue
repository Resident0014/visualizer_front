<template>
  <div id="asg-viewport" ref="container" />
</template>

<script>
import { ref, watch, onMounted } from 'vue'
import { graphviz } from 'd3-graphviz'
import { dataToAsgDigraph, getAsgData } from '@/util/asg'

export default {
  props: {
    astTree: {
      type: Object,
      required: true
    },
    astTreeExtended: {
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
      graphviz('#asg-viewport', { useWorker: false })
        .destroy()
        .width(container.value.offsetWidth)
        .height(container.value.offsetHeight)
        .renderDot(dataToAsgDigraph(getAsgData(props.astTree)))
    }
    watch(() => props.astTree, rerender)
    onMounted(rerender)

    return {
      container
    }
  }
}
</script>
