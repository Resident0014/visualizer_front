<template>
  <div class="d-flex h-full">
    <div class="left">
      <div class="d-flex flex-column">
        <div class="flex-fill">
          <textarea class="code" :class="{ wrong: codeIsWrong }" placeholder="code here" v-model="code"></textarea>
        </div>
      </div>
    </div>
    <div class="right">
      <div class="d-flex flex-column">
        <div class="tabs mb-0">
          <ul class="flex-wrap">
            <li :class="{ 'is-active': activeTab === 'ast' }">
              <a @click.stop="activeTab = 'ast'">Absract syntax tree</a>
            </li>
            <li :class="{ 'is-active': activeTab === 'cfg' }">
              <a @click.stop="activeTab = 'cfg'">Control flow graph</a>
            </li>
            <li :class="{ 'is-active': activeTab === 'ddg' }">
              <a @click.stop="activeTab = 'ddg'">Data dependency graph</a>
            </li>
            <li :class="{ 'is-active': activeTab === 'pdg' }">
              <a @click.stop="activeTab = 'pdg'">Program dependency graph</a>
            </li>
            <li :class="{ 'is-active': activeTab === 'asg' }">
              <a @click.stop="activeTab = 'asg'">Abstract semantic graph</a>
            </li>
            <li :class="{ 'is-active': activeTab === 'ssa' }">
              <a @click.stop="activeTab = 'ssa'">Static single assignment</a>
            </li>
          </ul>
        </div>
        <template v-if="activeTab === 'ast'">
          <AST v-if="astTree" :code="code" :astTree="astTree" class="flex-fill" />
        </template>
        <template v-else-if="activeTab === 'cfg'">
          <CFG v-if="astTree" :code="code" :astTree="astTreeExtended" class="flex-fill" />
        </template>
        <template v-else-if="activeTab === 'ddg'">
          <DDG v-if="astTree" :code="code" :astTree="astTreeExtended" class="flex-fill" />
        </template>
        <template v-else-if="activeTab === 'pdg'">
          <PDG v-if="astTree" :code="code" :astTree="astTreeExtended" class="flex-fill" />
        </template>
        <template v-else-if="activeTab === 'asg'">
          <ASG v-if="astTree" :code="code" :astTreeExtended="astTreeExtended" :astTree="astTree" class="flex-fill" />
        </template>
        <template v-else-if="activeTab === 'ssa'">
          <SSA v-if="astTree" :code="code" :astTree="astTreeExtended" class="flex-fill" />
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { ref, watch } from 'vue'
import AST from './components/AST'
import CFG from './components/CFG'
import DDG from './components/DDG'
import PDG from './components/PDG'
import ASG from './components/ASG'
import SSA from './components/SSA'

export default {
  components: {
    AST,
    CFG,
    DDG,
    PDG,
    ASG,
    SSA
  },
  setup() {
    const code = ref('')
    const codeIsWrong = ref(false)
    const activeTab = ref('ast')
    const astTree = ref(null)
    const astTreeExtended = ref(null)

    let timer
    watch(code, async () => {
      clearInterval(timer)
      timer = setTimeout(() => {
        axios.post('http://localhost:4567/java/ast', {
          code: code.value
        }).then(
          (resp) => {
            if (resp.data.status === 'success') {
              codeIsWrong.value = false
              astTree.value = JSON.parse(resp.data.data.simple)
              astTreeExtended.value = JSON.parse(resp.data.data.extended)
            }
          }
        ).catch((err) => {
          console.error(err)
          codeIsWrong.value = true
        })
      }, 1000)
    })

    return {
      code,
      codeIsWrong,
      activeTab,
      astTree,
      astTreeExtended
    }
  }
}
</script>

<style>
* {
  box-sizing: border-box;
}
.tabs {
  min-height: 41px;
}
body {
  margin: 0;
}
.node {
  height: 50px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: white;
  width: 200px;
  justify-content: center;
  flex-direction: column;
}
.d-flex {
  display: flex;
}
.left {
  flex: 1;
  padding: 15px;
}
.left > div {
  height: 100%;
}
.right {
  flex: 2;
  padding: 15px;
}
.right > div {
  height: 100%;
  border: 1px solid black;
  overflow: hidden;
}
.h-full {
  height: 100vh;
}
.flex-fill {
  flex: 1;
}
.flex-column {
  flex-direction: column;
}
.flex-wrap {
  flex-wrap: wrap;
}
.mt-15 {
  margin-top: 15px;
}
.code {
  width: 100%;
  height: 100%;
  font-family: monospace;
  padding: 5px 8px;
  font-size: inherit;
  color: black;
  resize: none;
  outline: none;
}
.code.wrong {
  background-color: #ff00001f;
}
</style>
