// 需要考虑页面刷新的问题， 页面刷新那么uid就废弃了 => uid 和节点信息关联 xpath
// 页面一旦刷新数据也就丢失了，所以需要设计缓存的机制 => localStorage缓存重要信息
// 是否可以实现分享的功能

class Flow {
  nodeList;
  proxy;
  updateAction;
  status;
  currentStep; // 当前执行到第几个
  constructor() {
    this.status = false;
    this.updateAction = [];
    this.init();
  }

  init() {
    // proxy node list
    // when nodeList changed update view data
    const that = this;
    this.nodeList = new Proxy([], {
      set (target, key, value, receiver) {
        const result = Reflect.set(target, key, value, receiver);
        that.execUpdateAction();
        localStorage.setItem("oimi-cache", JSON.stringify(target));
        return result;
      }
    });
    window.addEventListener(
      "contextmenu",
      this.contextMenuListener.bind(this),
      true
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
    this.updateAction.forEach(action => {
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
        ? Array.from(parent.children).findIndex(i => i === element)
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
      const findNode = this.nodeList.find(i => i.id === oimiId);
      if (findNode) {
        const nodeIndex = this.nodeList.findIndex(i => i.id === oimiId);
        delete event.target.dataset.oimiIndex;
        delete event.target.dataset.oimiId;
        this.nodeList.splice(nodeIndex, 1);
        // 更新所有节点的index需要 如果是最后一个 那么不需要update
        if (nodeIndex !== this.nodeList.length) this.updateAllNodeStep();
      }
    }
    event.target.classList.toggle("border-light");
  }

  /**
   * @description clear all setted step
   */
  clearStepNode() {
    const allNodes = document.querySelectorAll("[data-oimi-index]");
    allNodes.forEach(node => {
      delete node.dataset.oimiIndex;
      delete node.dataset.oimiId;
      if (node.classList.contains("border-light")) {
        node.classList.toggle("border-light");
      }
    });
    // 通过修改length 将数组长度修改
    this.nodeList.splice(0, this.nodeList.length);
  }

  updateNodeList (list) {
    this.nodeList.splice(0, this.nodeList.length);
    this.nodeList.push(...list);
  }

  /**
   * @description update node index and node id
   */
  updateAllNodeStep() {
    const allNodes = document.querySelectorAll("[data-oimi-index]");
    allNodes.forEach(node => {
      const oimiId = node.getAttribute("data-oimi-id");
      const nodeIndex = this.nodeList.findIndex(i => i.id === oimiId);
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
      console.log('auto chache', this.nodeList)
      // 设置step
      this.nodeList.forEach(nodeInfo => {
        if (!nodeInfo) return;
        const node = document.evaluate(
          nodeInfo.xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        const el = node.singleNodeValue;
        console.log('el', el)
        if (!el) return;
        if (nodeInfo.isInput && nodeInfo.value) el.value = nodeInfo.value;
        if (nodeInfo.isInput && nodeInfo.enter) {
          var event = document.createEvent('Event')
          event.initEvent('keydown', true, false)   //注意这块触发的是keydown事件，在awx的ui源码中bind监控的是keypress事件，所以这块要改成keypress
          event = Object.assign(event, {
            ctrlKey: false,
            metaKey: false,
            altKey: false,
            which: 13,
            keyCode: 13,
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
            cancelable: false
          })
          el.focus();
          el.dispatchEvent(event);
        }
        el.setAttribute("data-oimi-id", nodeInfo.id);
        el.setAttribute("data-oimi-index", nodeInfo.index + 1);
        if (!el.classList.contains('border-light')) el.classList.toggle("border-light");
      });
      if (this.currentStep && this.currentStep !== this.nodeList.length) {
        this.run(this.currentStep)
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

  /**
   * @description run the actions
   */
  run(startIndex = 0) {
    // find the element by oimi id
    // click the element
    // and do next action
    this.promiseDo(
      this.nodeList.slice(startIndex),
      nodeInfo => {
        if (!nodeInfo) return;
        const node = document.evaluate(
          nodeInfo.xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        const el = node.singleNodeValue;
        if (!el) return;
        // if node type is Input and setted value
        if (nodeInfo.value && nodeInfo.isInput) el.value = nodeInfo.value
        if (!el.classList.contains("border-light")) {
          el.setAttribute("data-oimi-index", nodeInfo.index + 1);
          el.classList.toggle("border-light");
        }
        if (el) el?.click();
        // 在执行之间先高亮节点
        this.currentStep = nodeInfo.index + 1;
        localStorage.setItem("oimi-step", this.currentStep);
      },
      1000
    ).then(() => {
      this.currentStep = null;
      console.log("finished action run");
      // continue make dom highlight
      // this.updateAllNodeStep()
    });
  }
}

export default Flow;
