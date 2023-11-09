import { createApp } from "vue";
import Flow from "./flow";
import Popup from "./Popup.vue";
import style from '@/styles/main.css'
import popupStyle from '@/styles/popup.scss'
import figlet from "figlet";
import standard from "figlet/importable-fonts/Standard.js";
figlet.parseFont("Standard", standard);
figlet.text(
  "Oimi",
  {
    font: "Standard"
  },
  function(err, data) {
    console.log(
      `%c ${data}`,
      '"background:#1a73e8; padding: 5px; border-radius: 3px 0 0 3px; color: #fff;"'
    );
  }
);

let vm;

const createWindow = () => {
  const MOUNT_EL_ID = "oimi-auto-flow";
  let mountEl = document.getElementById(MOUNT_EL_ID);
  if (mountEl) mountEl.innerHTML = "";
  mountEl = document.createElement("div");
  mountEl.setAttribute("id", MOUNT_EL_ID);
  document.body.appendChild(mountEl)
  // create shadow root to isolation style
  const shadowEl = mountEl.attachShadow({ mode: 'open' })
  // mounted Popup vue component to shadow root
  vm = createApp(Popup).mount(shadowEl);
  // add style to shadow root
  mountEl.shadowRoot.appendChild(document.createElement('style'))
  // add popup style and tailwind style to shadow root
  shadowEl.querySelector('style').innerHTML = (style + popupStyle);
}

const initFlow = () => {
  const flow = new Flow()
  flow.onUpdateAction((list) => {
    chrome.runtime.sendMessage({ type: "ACTION_DATA", list }, () => {});
  })
  chrome.runtime.onMessage.addListener(message => {
    if (message.toggleVisible) {
      vm.visible = !vm.visible;
    } else if (message.type === "FLOW") {
      // 按照参数来控制
      flow.listen(message.value)
    } else if (message.type === "FLOW_RUN") {
      // 执行action
      flow.updateNodeList(message.list)
      flow.run()
    } else if (message.type === "AUTO_CACHE") {
      // sync local data
      window.onload = () => {
        flow.autoCache();
      }
    }
  });
}

const register = () => {
  createWindow();
  initFlow();
}

window.onload = register;

