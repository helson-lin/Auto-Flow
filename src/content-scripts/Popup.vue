<script>
import { defineComponent, ref, onMounted, reactive, toRefs } from "vue";

export default defineComponent({
  setup() {
    const visible = ref(false);
    const asideClose = ref(false);
    const flow = ref(false);
    const switchRef = ref(false);
    const list = ref([]); // action list

    const expand = () => {
      asideClose.value = !asideClose.value;
    }
    // 执行actions
    const execAction = () => {
      // if not set actions return
      if (!flow.value) return
      // send updated list data to flow and run action
      chrome.runtime.sendMessage({ type: "FLOW_RUN", list: list.value }, async data => {
        console.log('flow: run action',)
      });
    }

    /**
     * @description set action step or clear action step
     */
    const doAction = () => {
      flow.value = !flow.value
      chrome.runtime.sendMessage({ type: "FLOW", value: flow.value }, async data => {
        console.log(' flow: ' + (flow.value ? 'start' : 'close'))
      });
    }

    const dragStart = (e) => {
      console.log(e, 'dragStart')
    }

    const dragMove = (event) => {
      const { pageX, clientX, pageY, clientY, target } = event
			if (!target) return;
			const { offsetLeft, offsetTop } = target;
			const deltaLeft = clientX - offsetLeft;
			const deltaTop = clientY - offsetTop;
      console.log(event, deltaLeft, deltaTop)
      // e.target.style = `top: ${pageX}px; left: ${pageY}px`
      target.style = `transform: translate(${deltaLeft}px, ${deltaTop}px);`
    }

    const switchTrigger = () => {
      switchRef.value?.click()
    }

    onMounted(() => {
      chrome.runtime.onMessage.addListener(message => {
        // action list update
        if (message.type === 'ACTION_DATA') {
          list.value = message.list;
          if (list.value.length && !flow.value) flow.value = true;
        }
      })
      // get localStorage action data
      chrome.runtime.sendMessage({ type: "AUTO_CACHE" }, () => {
        console.log('AUTO_CACHE')
      })
    });

    return {
      visible,
      asideClose,
      list,
      flow,
      expand,
      doAction,
      execAction,
      dragStart,
      dragMove,
      switchRef,
      switchTrigger
    };
  }
});
</script>
<template>
  <div class="overlay" v-show="visible">
    <div draggable="true" @drag="dragMove" @dragstart="dragStart" :class="['popup', asideClose ? 'popup-close' : 'popup-open']">
      <!-- 侧边按钮信息 -->
    <div class="oimi-icon" @click="expand">
      <svg width="30px" v-if="asideClose" height="30px" viewBox="0 0 1024 1024" version="1.1"
        xmlns="http://www.w3.org/2000/svg">
        <path fill="#906DD6"
          d="M512 64C264.96 64 64 264.96 64 512s200.96 448 448 448 448-200.96 448-448S759.04 64 512 64zM566.368 647.616c12.48 12.512 12.448 32.768-0.064 45.248-6.24 6.208-14.4 9.344-22.592 9.344-8.192 0-16.416-3.136-22.656-9.408l-158.912-159.36c-0.032-0.032-0.032-0.064-0.064-0.096s-0.064-0.032-0.096-0.064c-2.496-2.528-4.128-5.504-5.6-8.544-0.32-0.672-0.992-1.216-1.28-1.92-4.704-11.616-2.336-25.408 7.136-34.784l160.256-158.496c12.576-12.448 32.832-12.32 45.248 0.256 12.448 12.576 12.32 32.832-0.256 45.248l-137.408 135.904L566.368 647.616z" />
      </svg>
      <svg width="30px" v-else height="30px" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <path fill="#906DD6"
          d="M512 64C264.96 64 64 264.96 64 512s200.96 448 448 448 448-200.96 448-448S759.04 64 512 64zM661.76 535.968l-160.256 158.496c-6.24 6.144-14.368 9.248-22.496 9.248-8.256 0-16.512-3.168-22.752-9.504-12.416-12.576-12.32-32.8 0.256-45.248l137.408-135.904-136.288-136.672c-12.48-12.512-12.448-32.768 0.064-45.248 12.512-12.512 32.768-12.448 45.248 0.064l158.912 159.36c0.032 0.032 0.032 0.064 0.064 0.096s0.064 0.032 0.096 0.064c2.944 2.976 5.056 6.432 6.592 10.048 0.064 0.128 0.224 0.256 0.256 0.384C673.6 512.768 671.232 526.592 661.76 535.968z" />
      </svg>
    </div>
      <!--- 展示的内容 -->
      <div class="tool-area">
        <button
          class="h-10 px-6 mb-2 font-semibold rounded-md text-slate-900  border-primary hover:bg-gray-800 hover:text-white"
          :class="{ 'bg-purple-400': flow, 'text-white': flow }" @click="doAction">{{ flow ? '清空action' :
            '设置action' }}</button>
        <button
          class="h-10 px-6 font-semibold rounded-md border-primary text-slate-900 hover:bg-gray-800 hover:text-white"
          @click="execAction">执行</button>
      </div>
      <!--- actions -->
      <div class="actions" :class="{ 'filter blur-xl': asideClose }">
        <div class="action" v-for="action in list" :key="action.id">
          <div class="action-item">
            <div class="action-item-label">
              序号：
            </div>
            <div class="action-item-value">
              {{ action.index }}
            </div>
          </div>
          <div class="action-item">
            <div class="action-item-label">
              延时执行：
            </div>
            <div class="action-item-value">
              <input
                class="block w-40 rounded-md border-0 py-1.5 pl-7 pr-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                type="text" min="100" v-model="action.timeout" placeholder="延时">
            </div>
          </div>
          <div class="action-item" v-if="action.isInput">
            <div class="action-item-label">
              文本内容
            </div>
            <div class="action-item-value">
              <input
                class="block w-40 rounded-md border-0 py-1.5 pl-7 pr-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                type="text" min="100" v-model="action.value" placeholder="文本内容">
            </div>
          </div>
          <div class="action-item" v-if="action.isInput">
            <div class="action-item-label">
              回车事件
            </div>
            <div class="action-item-value switch" @click="switchTrigger">
              <input
                ref="switchRef"
                class="block w-40 rounded-md border-0 py-1.5 pl-7 pr-7 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                type="checkbox" v-model="action.enter" placeholder="文本内容">
                <div class="slider"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.overlay {
  @apply fixed inset-0 w-full h-full pointer-events-none;
  z-index: 99999;
}

.oimi-icon {
  @apply bg-white rounded-full shadow-md absolute pointer-events-auto top-1/2 transform -translate-y-1/2 -translate-x-full;
  width: 30px;
  height: 30px;
  z-index: 99999;
}

.popup {
  pointer-events: all;
  transition: all 0.3s linear;
  @apply absolute top-4 right-4 bg-white shadow-lg p-4 rounded-md pr-2 pb-2 pl-2 pt-2 z-auto;

  &-open {
    @apply w-72;
  }

  &-close {
    @apply w-0 p-0;
  }
}



.tool-area {
  @apply overflow-hidden w-full h-full box-border flex flex-col border-b pb-2 pt-2;
}

.actions {
  @apply flex flex-col;

  .action {
    @apply flex flex-col pb-3 border-b border-gray-300;

    &-item {
      @apply flex items-center pl-2 pr-2 pt-2 pb-2 box-border h-10;

      &-label {
        @apply text-black font-bold pr-2 box-border text-sm w-20;
      }
    }
  }
}
.switch {
  @apply relative inline-block w-10 h-6 ;
}

.switch input {
  display: none;
}

.slider {
  -webkit-transition: .4s;
  transition: .4s;
  @apply absolute cursor-pointer top-0 left-0 right-0 bottom-0 pt-1 pb-1 bg-gray-200 box-border rounded-sm shadow-inner ;
}

.slider::after {
  content: "";
  @apply absolute inline-block top-0 left-0 right-0 bottom-0 w-full h-full border-2 border-gray-100;
}

.slider:before {
  content: "";
  -webkit-transition: .4s;
  transition: .4s;
  @apply absolute w-1/2 h-full bottom-0 bg-white inline-block ;
}

input:checked + .slider {
  background-color: #a883f7c6;
}

input:checked + .slider:before {
  @apply transform translate-x-5;
}

</style>