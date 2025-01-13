// 需要考虑页面刷新的问题， 页面刷新那么uid就废弃了 => uid 和节点信息关联 xpath
// 页面一旦刷新数据也就丢失了，所以需要设计缓存的机制 => localStorage缓存重要信息
// 是否可以实现分享的功能

class Flow {
  nodeList;
  proxy;
  updateAction;
  status;
  currentStep; // 当前执行到第几个
  cursorShadowDom;
  constructor() {
    // 是否开启监听用户操作步骤
    this.status = false;
    this.updateAction = [];
    this.init();
  }

  init() {
    // proxy node list
    // when nodeList changed update view data
    const that = this;
    this.nodeList = new Proxy([], {
      set(target, key, value, receiver) {
        const result = Reflect.set(target, key, value, receiver);
        that.execUpdateAction();
        localStorage.setItem("oimi-cache", JSON.stringify(target));
        return result;
      },
    });
    window.addEventListener(
      "contextmenu",
      this.contextMenuListener.bind(this),
      true,
    );
  }

  // update action listeners
  onUpdateAction(callback) {
    if (callback && callback instanceof Function) {
      this.updateAction.push(callback);
    }
  }

  // execute callback when nodeList changed
  execUpdateAction() {
    this.updateAction.forEach((action) => {
      action(this.nodeList);
    });
  }

  /**
   * @description listen contextmenu click
   * @param {boolean} status false clear all step actions
   */
  listen(status) {
    this.status = status;
    if (!status) this.clearStepNode();
    // 如果为 true，那么监听鼠标的mouse 事件
    this.listenMouse(status);
  }

  listenMouse(listen = true) {
    if (listen) {
      document.addEventListener("mouseover", (e) => {
        const el = e.target;
        // 给 dom toggle class 类 border-light
        // el.classList.toggle("oimi-cursor-highlight");
      });
      document.addEventListener("mouseout", () => {
        // el.classList.toggle("oimi-cursor-highlight");
      });
    } else {
      document.removeEventListener("mouseover");
      document.removeEventListener("mouseleave");
    }
  }

  /**
   * @description get element's xpath
   * @param {Element} element
   * @returns xpath string
   */
  readXPath(element) {
    if (element.id !== "") {
      //判断id属性，如果这个元素有id，则显 示//*[@id="xPath"]  形式内容
      return '//*[@id="' + element.id + '"]';
    }
    //这里需要需要主要字符串转译问题，可参考js 动态生成html时字符串和变量转译（注意引号的作用）
    if (element == document.body) {
      //递归到body处，结束递归
      return "/html/" + element.tagName.toLowerCase();
    }
    var ix = 1, //在nodelist中的位置，且每次点击初始化
      siblings = element.parentNode.childNodes; //同级的子元素

    for (var i = 0, l = siblings.length; i < l; i++) {
      var sibling = siblings[i];
      //如果这个元素是siblings数组中的元素，则执行递归操作
      if (sibling == element) {
        return (
          this.readXPath(element.parentNode) +
          //   arguments.callee(element.parentNode) +
          "/" +
          element.tagName.toLowerCase() +
          "[" +
          ix +
          "]"
        );
        //如果不符合，判断是否是element元素，并且是否是相同元素，如果是相同的就开始累加
      } else if (sibling.nodeType == 1 && sibling.tagName == element.tagName) {
        ix++;
      }
    }
  }

  /**
   * @description generate element unique id by element path
   * @param {Element} el
   * @returns {string} unique id
   */
  getElementPath(el) {
    let path = "";
    let parent = el.parentNode;
    const getElIndex = (parent, element) =>
      parent?.children
        ? Array.from(parent.children).findIndex((i) => i === element)
        : 0;
    path += `${getElIndex(parent, el)}`;
    while (parent) {
      path = `${getElIndex(parent.parentNode, parent)}` + path;
      parent = parent.parentNode;
    }
    return path;
  }

  /**
   * @description mouse right click handler
   * @param {Event} event
   */
  contextMenuListener(event) {
    if (!this.status) return;
    event.preventDefault();
    const oimiId = event.target.getAttribute("data-oimi-id");
    if (!oimiId) {
      // 处理 input 还有 select
      const isInput = event.target.tagName === "INPUT";
      const id = this.getElementPath(event.target);
      const xpath = this.readXPath(event.target);
      event.target.setAttribute("data-oimi-id", id);
      const index = this.nodeList.length;
      this.nodeList.push({
        id,
        index,
        timeout: 1000,
        xpath,
        isInput,
        value: null,
        enter: false,
      });
      event.target.setAttribute("data-oimi-index", index + 1);
    } else {
      // 反选的时候，取消之前的操作
      const findNode = this.nodeList.find((i) => i.id === oimiId);
      if (findNode) {
        const nodeIndex = this.nodeList.findIndex((i) => i.id === oimiId);
        delete event.target.dataset.oimiIndex;
        delete event.target.dataset.oimiId;
        this.nodeList.splice(nodeIndex, 1);
        // 更新所有节点的index需要 如果是最后一个 那么不需要update
        if (nodeIndex !== this.nodeList.length) this.updateAllNodeStep();
      }
    }
    // 样式切换
    event.target.classList.toggle("border-light");
  }

  // 给 dom 节点添加样式信息
  setMoveCursor() {
    // 1. 按照自定义属性查询虚拟的 dom 节点
    if (this.cursorShadowDom) return;
    const shadowDom = document.createElement("div");
    shadowDom.className = "oimi-cursor";
    shadowDom.style = `width: 100vw;height: 100vh;position: absolute;left: 0;top: 0;pointer-events: none;`;
    document.body.appendChild(shadowDom);
    const shadowEl = shadowDom.attachShadow({ mode: "open" });
    const cursorEl = document.createElement("div");
    cursorEl.className = "oimi-cursor-inner";
    cursorEl.id = "oimiCursorInner";
    cursorEl.style = `tranfrom: translate(-9999px, -9999px)`;
    shadowDom.shadowRoot.appendChild(cursorEl);
    shadowDom.shadowRoot.appendChild(document.createElement("style"));
    // add popup style and tailwind style to shadow root
    shadowEl.querySelector(
      "style",
    ).innerHTML = `.oimi-cursor-inner {display: inline-block;position: absolute;background-size: 20px 20px;width: 20px;height: 20px;z-index: 22222; transition: transform 1s both;
        background-image: url("data:image/png;base64,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");}
    `;
    this.cursorShadowDom = shadowDom;
  }

  /**
   * @description clear all setted step
   */
  clearStepNode() {
    const allNodes = document.querySelectorAll("[data-oimi-index]");
    allNodes.forEach((node) => {
      delete node.dataset.oimiIndex;
      delete node.dataset.oimiId;
      if (node.classList.contains("border-light")) {
        node.classList.toggle("border-light");
      }
    });
    // 通过修改length 将数组长度修改
    this.nodeList.splice(0, this.nodeList.length);
  }

  updateNodeList(list) {
    this.nodeList.splice(0, this.nodeList.length);
    this.nodeList.push(...list);
  }

  /**
   * @description update node index and node id
   */
  updateAllNodeStep() {
    const allNodes = document.querySelectorAll("[data-oimi-index]");
    allNodes.forEach((node) => {
      const oimiId = node.getAttribute("data-oimi-id");
      const nodeIndex = this.nodeList.findIndex((i) => i.id === oimiId);
      delete node.dataset.oimiIndex;
      nodeIndex !== -1 && node.setAttribute("data-oimi-index", nodeIndex);
    });
  }

  /**
   * @description automatically caches data
   */
  autoCache() {
    const oimiCache = localStorage.getItem("oimi-cache");
    const currentStep = localStorage.getItem("oimi-step");
    if (currentStep) this.currentStep = Number(currentStep);
    if (!oimiCache) return;
    try {
      const data = JSON.parse(oimiCache);
      this.nodeList.push(...data);
      // 设置step
      this.nodeList.forEach((nodeInfo) => {
        if (!nodeInfo) return;
        const node = document.evaluate(
          nodeInfo.xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        );
        const el = node.singleNodeValue;
        if (!el) return;
        if (nodeInfo.isInput && nodeInfo.value) el.value = nodeInfo.value;
        if (nodeInfo.isInput && nodeInfo.enter) {
          var event = document.createEvent("Event");
          event.initEvent("keydown", true, false); //注意这块触发的是keydown事件，在awx的ui源码中bind监控的是keypress事件，所以这块要改成keypress
          event = Object.assign(event, {
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            which: 13,
            keyCode: 13,
            key: "Enter",
            code: "Enter",
            bubbles: true,
            cancelable: false,
          });
          el.focus();
          el.dispatchEvent(event);
        }
        el.setAttribute("data-oimi-id", nodeInfo.id);
        el.setAttribute("data-oimi-index", nodeInfo.index + 1);
        if (!el.classList.contains("border-light"))
          el.classList.toggle("border-light");
      });
      if (this.currentStep && this.currentStep !== this.nodeList.length) {
        this.run(this.currentStep);
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @description do callback function step by step
   * @param {Array<any>} arr
   * @param {Function} callback
   * @param {number} timeout
   * @returns
   */
  promiseDo(arr, callback, timeout = 0) {
    return new Promise((resolve, reject) => {
      try {
        const item = arr[0];
        setTimeout(async () => {
          await callback(item);
          arr.shift();
          if (arr.length) {
            resolve(await this.promiseDo(arr, callback, timeout));
          } else {
            resolve("");
          }
        }, item?.timeout || timeout);
      } catch (e) {
        reject(e);
      }
    });
  }

  moveCursor(target) {
    const rect = target.getBoundingClientRect();
    // 计算相对屏幕的坐标
    const screenX = rect.left + window.scrollX;
    const screenY = rect.top + window.scrollY;
    // 设置 shadowDom的位置
    const oimiCursorInner =
      this.cursorShadowDom.shadowRoot.getElementById("oimiCursorInner");
    oimiCursorInner.style.transform = `translate(${screenX}px, ${screenY}px)`;
  }

  hiddenCursor(show = false) {
    const oimiCursorInner =
      this.cursorShadowDom.shadowRoot.getElementById("oimiCursorInner");
    oimiCursorInner.style.transform = `translate(-9999px, -9999px)`;
  }

  /**
   * @description run the actions
   */
  run(startIndex = 0) {
    this.setMoveCursor();
    // find the element by oimi id
    // click the element
    // and do next action
    this.promiseDo(
      this.nodeList.slice(startIndex),
      (nodeInfo) => {
        if (!nodeInfo) return;
        const node = document.evaluate(
          nodeInfo.xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        );
        const el = node.singleNodeValue;
        if (!el) return;
        // if node type is Input and setted value
        if (nodeInfo.value && nodeInfo.isInput) el.value = nodeInfo.value;
        if (!el.classList.contains("border-light")) {
          el.setAttribute("data-oimi-index", nodeInfo.index + 1);
          el.classList.toggle("border-light");
        } else {
          // todo: 添加什么样式表示当前节点正在被执行呢？
        }
        this.moveCursor(el);
        // todo: 自动移动鼠标
        if (el) el?.click();
        // 在执行之间先高亮节点
        this.currentStep = nodeInfo.index + 1;
        localStorage.setItem("oimi-step", this.currentStep);
      },
      1000,
    ).then(() => {
      this.currentStep = null;
      // 隐藏 cursor
      this.hiddenCursor();
      // continue make dom highlight
      // this.updateAllNodeStep()
    });
  }
}

export default Flow;
