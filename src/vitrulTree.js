// 创建一个 虚拟滚动 tree 组件，api 保持与 element-ui tree 一致
// 1. 先用方法 把 tree 数据根据展开及层级转换成数组结构
// 2. 根据需要展示的dom 数量生成虚拟滚动容器及对应dom
// 3. 监听滚动事件，根据滚动位置计算滚动容器 paddingTop 及更新 dom内容
// 4. 通过点击事件更新展开状态及更新滚动容器内容

const defaultNodeHeight = 26;
class Node {
    constructor() {
        this.children = [];
        this.expanded = false;
        this.checked = false;
        this.indeterminate = false;
        this.visible = true;
        this.level = 0;
        this.parentId = null;
        this.id = null;
        this.label = null;
        this.data = null;
        this.height = defaultNodeHeight;
        this.disabled = false;
        this.loading = false;
        this.isLeaf = false;
    }
}

export class VitrulHTree {
    constructor(options) {
        // this.options = options;
        // 保存原始数据，用于展开时加载数据
        this.datas = options.data || [];
        // 保存节点数据 用于快速查找
        this.nodeMap = new Map();
        // 保存树节点数据
        this.treeNodes = [];
        // 保存虚拟滚动容器中显示的节点
        this.visibleNodes = [];
        // 节点唯一key
        this.nodeKey = options.nodeKey || "id";
        // 根节点
        this.el = options.el;
        // 树节点配置
        this.props = {
            children: "children",
            label: "label",
            disabled: "disabled",
            isLeaf: "isLeaf",
            ...options.props,
        };
        // 加载子集方法
        this.load = options.load;

        // 是否高亮当前选中节点
        this.highlightCurrent = options.highlightCurrent || false;
        // 是否默认展开所有节点
        // this.defaultExpandAll = options.defaultExpandAll || false;
        // 默认展开节点
        this.defaultExpandedKeys = options.defaultExpandedKeys || [];
        // 默认选中节点
        this.defaultCheckedKeys = options.defaultCheckedKeys || [];
        // 是否自动展开父节点
        this.autoExpandParent = options.autoExpandParent || true;
        // 是否显示复选框
        this.showCheckbox = options.showCheckbox || false;
        // 在显示复选框的情况下，是否严格的遵循父子不互相关联的做法，默认为 false
        this.checkStrictly = options.checkStrictly || false;
 
        // 设置初始化选中节点
        this.currentNodeKey = options.defaultCurrentNodeKey || null;
        // 缩进距离
        this.indent = options.indent || 16;
        // 默认滚动展示多少个节点
        this.showDomNum = options.showDomNum || 50;
        // 每个node 高度方法
        this.getNodeHeight = options.getNodeHeight || (() => defaultNodeHeight);
        // 滚动显示的开发节点
        this.startIndex = 0;
        // 自定义渲染节点
        this.renderContent = options.renderContent || null;

        this.filterNodeMethod = options.filterNodeMethod || (() => true);


        this.expandOnClickNode = options.expandOnClickNode || false;
        this.checkOnClickNode = options.checkOnClickNode || false;
        // 是否手风琴模式
        this.accordion = options.accordion || false;

        this.nodeClick = options.nodeClick || (() => {});

        this.filterText = "";

        // 生成dom 集合
        this.treeNodeDoms = [];

        // 初始构建树节点
        this.treeNodes = this.initTreeNodes(this.datas, null, 0);
        // 根据默认展开节点来构建所需要展示的所有节点
        this.initExpandedNodes();
        // 根据默认选中节点来构建所需要展示的所有节点
        if (this.showCheckbox) {
            this.initCheckedNodes();
        }
        // 根据展开节点来构建所需要展示的所有节点
        this.initVisibleNodes(this.treeNodes, this.visibleNodes);
        
        // 初始化dom
        this.initDom();
    }
    initExpandedNodes() {
        this.defaultExpandedKeys.forEach((key) => {
            const node = this.nodeMap.get(key);
            if (!node) {
                return;
            }
            if (typeof this.load === "function" && this.load && (!node.children || node.children.length === 0)) {
                node.expanded = false; // 如果是异步加载子节点，则默认不展开
                return;
            }
            node.expanded = true;// 递归展开所有父节点
            if (!this.autoExpandParent) {
                return;
            }
            let parentNode = this.nodeMap.get(node.parentId);
            while (parentNode) {
                parentNode.expanded = true;
                parentNode = this.nodeMap.get(parentNode.parentId);
            }
        });
    }
    initCheckedNodes() {
        this.defaultCheckedKeys.forEach((key) => {
            const node = this.nodeMap.get(key);
            if (!node) {
                return;
            }
            node.checked = true;
            node.indeterminate = false;
            if (this.checkStrictly) {
                return; // 如果是父子不互相关联，则不递归设置父子节点
            }
            let parentNode = this.nodeMap.get(node.parentId);
            while (parentNode) {
                parentNode.checked = parentNode.children.every((child) => child.checked);
                parentNode.indeterminate = parentNode.children.some((child) => !child.checked || child.indeterminate);
                parentNode = this.nodeMap.get(parentNode.parentId);
            }
        });
    }

    // 初始化树节点
    // 初始化树节点
        // 遍历数据
    initTreeNodes(datas, parentId, level) {
            // 创建节点
        return datas.map((item) => {
            // 设置节点id
            const node = new Node();
            node.id = item[this.nodeKey];
            // 设置节点标签
            
            // 设置节点是否禁用
            node.label = item[this.props.label];
            // 设置节点是否为叶子节点
            node.disabled = item[this.props.disabled] || false;
            // 设置节点数据
            node.isLeaf = item[this.props.isLeaf] || false;
            node.data = {
                ...item,
            };
            node.data[this.props.children] = null; // 清空 children 防止重复渲染

            node.parentId = parentId;
            node.level = level;
            node.height = this.getNodeHeight(item);
            node.visible = this.filterNodeMethod( this.filterText, item);

            this.nodeMap.set(node.id, node);

            if (item[this.props.children] && item[this.props.children].length > 0) {
                node.children = this.initTreeNodes(item[this.props.children], node.id, level + 1);
            }

            return node;
        });
    }

    // 初始化可见节点
    initVisibleNodes(nodeList, arr) {
        // 遍历节点列表
        nodeList.forEach((node) => {
            // 将节点添加到数组中
            if (!node.visible) {
                return;
            }
            arr.push(node);
            // 如果节点展开且有子节点，则递归调用initVisibleNodes函数
            if (node.expanded && node.children) {
                this.initVisibleNodes(node.children, arr);
            }
        });
    }
    get paddingTop() {
        return this.visibleNodes.slice(0, this.startIndex).reduce((prev, node) => prev + node.height, 0);
    }
    get allHeight() {
        return this.visibleNodes.reduce((prev, node) => prev + node.height, 0);
    }
    initDom() {
        this.treeWrap = document.createElement("div");
        this.treeWrap.className = "h-tree";
        this.treeWrap.style.overflowY = "auto";
        this.treeWrap.addEventListener("scroll", this.treeWrapScroll.bind(this));
        this.el.appendChild(this.treeWrap);

        this.treeWrapContent = document.createElement("div");
        this.treeWrap.appendChild(this.treeWrapContent);

        this.treeWrapContent.className = "h-tree-content";
        this.treeWrapContent.style.height = `${this.allHeight}px`; // 初始化高度
        this.treeWrapContent.style.paddingTop = `${this.paddingTop}px`;
        this.treeWrapContent.style.boxSizing = "border-box";
        // this.treeWrapContent.style.overflowY = 'auto';

        const itemLen = Math.min(this.visibleNodes.length, this.showDomNum); 
        for (let i = 0; i < itemLen; i++) {
            const node = this.visibleNodes[this.startIndex + i];
            const item = this.createElementByNode(node, i);
            this.treeNodeDoms.push(item);
            this.treeWrapContent.appendChild(item);
        }
    }

    createElementByNode(node, index) {
        
        const item = document.createElement("div");
        item.className = "h-tree-item";
        item.style.height = `${node.height}px`;
        item.style.paddingLeft = `${node.level * this.indent}px`;
        item.dataset.id = index;

        item.addEventListener("click", (e) => {
            console.log("h-tree-item--", e);
            
            e.preventDefault();
            e.stopPropagation();
            const index = this.treeNodeDoms.findIndex((dom) => dom === e.target || dom.contains(e.target));
            const node = this.visibleNodes[this.startIndex + index];
            this.treeNodeDoms.forEach((dom) => {
                dom.classList.remove("h-is-current");
            });
            e.target.classList.add("h-is-current");
            this.currentNodeKey = node.id;
            this.nodeClick(node);

            if (this.expandOnClickNode) {
                this.expandNode(node);
            }
            if (this.showCheckbox && this.checkOnClickNode) {
                this.checkedNode(node);
            }
        });




        // 生成展开节点dom
        const expandIcon = document.createElement("span");
        expandIcon.className = "h-tree-expand-icon";
        expandIcon.style.display = "flex";
        expandIcon.style.width = "26px";
        expandIcon.style.height = "100%";
        expandIcon.style.marginRight = "6px";
        expandIcon.style.cursor = "pointer";
        expandIcon.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = this.treeNodeDoms.findIndex((dom) => dom === e.target || dom.contains(e.target));
            const node = this.visibleNodes[this.startIndex + index];
            if (typeof this.load === "function" && this.load && (!node.children || node.children.length === 0)) {
                e.target.parentNode.classList.add("h-is-loading");
            }
            this.expandNode(node);
        });
        item.appendChild(expandIcon);


        if (this.showCheckbox) {
            //生成 选中框dom
            const checkbox = document.createElement("span");
            checkbox.className = "h-tree-checkbox";
            checkbox.style.display = "flex";
            checkbox.style.width = "26px";
            checkbox.style.height = "100%";
            checkbox.style.marginRight = "6px";
            checkbox.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const index = this.treeNodeDoms.findIndex((dom) => dom === e.target || dom.contains(e.target));
                const node = this.visibleNodes[this.startIndex + index];
                this.checkedNode(node);
            });
            item.appendChild(checkbox);
        }
        let labelDom;
        if (this.renderContent) {
            labelDom = this.renderContent(node.data);
            // item.appendChild(itemDom);
            // return itemDom;
        } else {
            // 自定义生成内容dom
            labelDom = document.createElement("div");
            labelDom.className = "h-tree-label";
            labelDom.style.display = "flex";
            labelDom.style.flex = "1";
            labelDom.style.alignItems = "center";
            labelDom.innerText = node.data.label;
        }
        item.appendChild(labelDom);
        
        return item;
    }
    treeWrapScroll(e) {
        
        if (this.showDomNum >= this.visibleNodes.length) {
            return;
        }
        const { scrollTop } = e.target;
        const index = this.computedScrollIndex(scrollTop);
        if (index === this.startIndex) {
            return;
        }
        this.startIndex = Math.min(index, this.visibleNodes.length - this.showDomNum);
        // this.treeWrapContent.style.paddingTop = `${this.paddingTop}px`;
        this.updateDom();
        // console.log(index, this.startIndex);
    }
    computedScrollIndex(scrollTop) {
        let index = 0;
        let height = 0;
        for (let i = 0; i < this.visibleNodes.length; i++) {
            height += this.visibleNodes[i].height;
            if (height >= scrollTop) {
                index = i;
                break;
            }
        }
        return Math.max(0, index - 2); // 预留2个节点的高度
    }
    // 完善 dom数量 根据 visibleNodes showDomNum 及 treeNodeDoms 数量来动态创建 删除 dom
    complateDom() {
        const nodeLen = this.visibleNodes.length;
        const domLen = this.treeNodeDoms.length;
        this.treeWrapContent.style.height = `${this.allHeight}px`; // 重新设置高度
        if (nodeLen < domLen) {
            // 减少 dom
            this.treeNodeDoms.splice(nodeLen, domLen - nodeLen).forEach((item) => {
                this.treeWrapContent.removeChild(item);
            });
            return;
        }
        if (nodeLen > domLen && domLen < this.showDomNum) {
            // 增加dom
            for (let i = this.startIndex + domLen; i < Math.min(nodeLen, this.showDomNum); i++) {
                const node = this.visibleNodes[i];
                const item = this.createElementByNode(node, i);
                this.treeWrapContent.appendChild(item);
                this.treeNodeDoms.push(item);   
            }
        }
    }
    updateDom() {
        // debugger
        this.treeWrapContent.style.paddingTop = `${this.paddingTop}px`;
        // 完善 dom 数量 根据 visibleNodes showDomNum 及 treeNodeDoms 数量来动态创建 删除 dom
        this.complateDom();
        for (let i = 0; i < this.treeNodeDoms.length; i++) {
            const node = this.visibleNodes[this.startIndex + i];
            const dom = this.treeNodeDoms[i];
            this.updateDomAttribute(dom, node);
        }
    }
    updateDomAttribute(nodeDom, node) {
        if (node.id === this.currentNodeKey) {
            nodeDom.classList.add("h-is-current");
        } else {
            nodeDom.classList.remove("h-is-current");
        }
        if (node.isLeaf) {
            nodeDom.classList.add("h-is-leaf");
        } else {
            nodeDom.classList.remove("h-is-leaf");
        }
        if (node.expanded) {
            nodeDom.classList.add("h-is-expanded");
        } else {
            nodeDom.classList.remove("h-is-expanded");
        }
        if (node.checked) {
            nodeDom.classList.add("h-is-checked");
        } else {
            nodeDom.classList.remove("h-is-checked");
        }
        if (node.disabled) {
            nodeDom.classList.add("h-is-disabled");
        } else {
            nodeDom.classList.remove("h-is-disabled");
        }
        if (node.indeterminate) {
            nodeDom.classList.add("h-is-indeterminate");
        } else {
            nodeDom.classList.remove("h-is-indeterminate");
        }
        nodeDom.style.paddingLeft = `${node.level * this.indent}px`;
        nodeDom.style.height = `${node.height}px`;

        nodeDom.querySelector(".h-tree-label").innerHTML = node.label;// 更新label
        // console.log();
        
    }
    expandNode(node) {
        
        // debugger
        if (node.isLeaf) {
            return;
        }
        if (this.accordion && node.expanded === false) {
            // 找到同级节点 开始和结束  中间等级高的节点说明全是 子节点全部删除
            const childrenNodes = node.parentId ? this.nodeMap.get(node.parentId).children : this.treeNodes;
            const firstNode = childrenNodes[0];
            const firstNodeIndex = this.visibleNodes.findIndex((item) => item.id === firstNode.id);
            const lastNode = childrenNodes[childrenNodes.length - 1];
            const lastNodeIndex = this.visibleNodes.findIndex((item) => item.id === lastNode.id);

            // 只获取 展示节点中  本级节点 然后再塞进 展示列表中
            const arr = [];
            for (let i = firstNodeIndex; i < lastNodeIndex; i++) {
                const n = this.visibleNodes[i];
                if (n.level === node.level) {
                    n.expanded = false;
                    arr.push(n);
                }
            }
            this.visibleNodes.splice(firstNodeIndex, lastNodeIndex - firstNodeIndex, ...arr); // 删除所有  并重新加入统计节点
        }
        
        const index = this.visibleNodes.findIndex((item) => item.id === node.id);
        if (node.expanded) {
            node.expanded = false;
            let endIndex = index + 1;
            let nextNode = this.visibleNodes[endIndex];
            while (nextNode && nextNode.level > node.level) {
                // nextNode.visible = false;
                nextNode = this.visibleNodes[++endIndex];
            }
            this.visibleNodes.splice(index + 1, endIndex - index - 1); // 删除子节点
             
            this.updateDom();
            console.log(1, node);
        } else {
            node.expanded = true;
            new Promise((resolve) => {
                if (typeof this.load === "function" && this.load && !node.children.length) { // 如果有load方法，并且没有子节点，则调用load方法获取子节点
                    this.load(node, resolve);  // resolve返回子节点
                } else {
                    resolve(node.children); // 否则直接返回子节点
                }
            }).then((children) => {
                if (typeof this.load === "function" && this.load && !node.children.length) {
                    // node.children = children;
                    // 找到对应的 this.treeNodeDoms 中 dom 节点
                    const dom = this.treeNodeDoms[index - this.startIndex];
                    if (dom) {
                        dom.classList.remove("h-is-loading"); // 移除加载中样式
                    }
                }
                if (children.length === 0) {
                    node.isLeaf = true;
                    node.children = [];
                } else if ( children[0] instanceof Node) {
                    const arr = [];
                    this.initVisibleNodes(children, arr);
                    this.visibleNodes.splice(index + 1, 0, ...arr);
                } else {
                    // 说明是新加载的数据
                    const arr = [];
                    const nodes = this.initTreeNodes(children, node.id, node.level + 1);
                    node.children = children;
                    this.initVisibleNodes(nodes, arr);
                    // 找到原来data中的节点，然后把 children 赋值给他
                    const data = this.getDataByKey(this.datas, node.id);
                    if (data) {
                        data[this.props.children] = children;// 更新data中的数据
                    }
                    this.visibleNodes.splice(index + 1, 0, ...arr);
                }
                // console.log(this.visibleNodes);
                
                
                this.updateDom();
                console.log(node);
                
                
            }).catch((e) => {
                console.log(e);
            });
        }

    }

    checkedNode(node) {
        if (node.disabled) {
            return;
        }

        node.checked = !node.checked;
        node.indeterminate = false;
        if (this.checkStrictly) {
            this.updateDom();
            return;
        }
        // 设置节点选中状态
        const setChecked = (node, checked) => {
            // 设置节点选中状态
            node.checked = checked;
            // 设置节点不确定状态为false
            node.indeterminate = false;
            // 遍历子节点，递归调用setChecked函数
            node.children.forEach((child) => setChecked(child, checked));
        };

        let parentNode = this.nodeMap.get(node.parentId);
        while (parentNode) {
            parentNode.checked = parentNode.children.every((child) => child.checked);
            parentNode.indeterminate = parentNode.children.some((child) => child.checked || child.indeterminate);
            parentNode = this.nodeMap.get(parentNode.parentId);
        }

        // node.checked = !node.checked;
        setChecked(node, node.checked);
        
        console.log(this.visibleNodes);
        
        this.updateDom();
    }

    // 根据节点key重新加载子节点
    reloadChildrenByNodeKey(nodeKey) {
        const node = this.nodeMap.get(nodeKey);
        if (!node) {
            console.warn(`nodeKey ${nodeKey} not found`);
            return;
        }
        for (let i = 0; i < node.children.length; i++) {
            const n = node.children[i];
            this.removeNodeByKey(n.id);
            
        }
        // runDelete(node); // 删除节点
        // 将节点设置为未展开状态
        node.expanded = false;
        // 将节点设置为非叶子节点
        node.isLeaf = false;
        node.children = []; // 清空子节点
        this.updateDom();
        this.expandNode(node); // 重新加载子节点
        
    }

    getDataByKey(arr, key) {
        const keyList = [];
        let node = this.nodeMap.get(key);
        while (node) {
            keyList.push(node.id);
            node = this.nodeMap.get(node.parentId);
        }
        let id = keyList.pop();
        let data = arr.find((item) => item[this.nodeKey] === id); // 找到根节点
        while (keyList.length && data) {
            id = keyList.pop();
            data = data[this.props.children].find((item) => item[this.nodeKey] === id); // 找到子节点
        }
        return keyList.length ? null : data;
    }
    filter(value){
        this.filterText = value;
        this.nodeMap.forEach((node) => {
            node.visible = this.filterNodeMethod(this.filterText, node.data);
            if (node.visible) {
                let parentNode = this.nodeMap.get(node.parentId);
                while (parentNode) {
                    parentNode.visible = true;
                    parentNode.expanded = true;
                    parentNode = this.nodeMap.get(parentNode.parentId);
                }
            }
        });
        this.visibleNodes = [];
        // 根据展开节点来构建所需要展示的所有节点
        this.initVisibleNodes(this.treeNodes, this.visibleNodes);
        this.complateDom(); // 完善dom
        this.updateDom(); // 更新DOM
    }
    removeNodeByKey(nodeKey) {
        const node = this.nodeMap.get(nodeKey);
        const pNode = this.nodeMap.get(node.parentId);
        if (!node) {
            console.warn(`nodeKey ${nodeKey} not found`);
            return;
        }
        if (!pNode) {
            this.treeNodes = this.treeNodes.filter((item) => item.id !== nodeKey);
        }
        if (pNode) {
            pNode.children = pNode.children.filter((item) => item.id !== nodeKey);
        }
        // 去除原始数据中的子节点
        const d = this.getDataByKey(this.datas, nodeKey);
        d[this.props.children] = [];

        // 循环去除 nodeMap 引用 和 节点
        const runDelete = (node) => {
            // 删除节点
            this.nodeMap.delete(node.id);
            this.visibleNodes = this.visibleNodes.filter((item) => item.id !== node.id);
            // 遍历子节点
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                // 递归删除子节点
                runDelete(child);
            }
        };
        runDelete(node);
        this.updateDom();
    }
    updateKeyData(key, data) {
        const node = this.nodeMap.get(key);
        if (!node) {
            return;
        }
        const d = this.getDataByKey(this.datas, key); // 获取原始数据
        if (!d) {
            return;
        }
        const vIndex = this.visibleNodes.findIndex((item) => item.id === key);
        const pNode = this.nodeMap.get(node.parentId);
        let nIndex = 0; // 获取父节点中子节点的索引
        if (pNode) {
            nIndex = pNode.children.findIndex((item) => item.id === key);
        } else {
            nIndex = this.treeNodes.findIndex((item) => item.id === key);
        }
        this.removeNodeByKey(key);

        // 说明是新加载的数据
        const arr = [];
        const nodes = this.initTreeNodes([data], node.parentId, node.level);
        if (pNode) {
            pNode.children.splice(nIndex, 0, ...nodes);
        } else {
            this.treeNodes.splice(nIndex, 0, ...nodes);
        }
        this.initVisibleNodes(nodes, arr);
        node.data = {
            ...data,
            children: [],
        };
        this.visibleNodes.splice(vIndex, 0, ...arr);
        this.nodeMap.set(key, node);
        this.complateDom();
        this.updateDom();
    }

    getCheckedNodes(includeHalfChecked = false) {
        // 接收1个布尔类型参数:1. 默认值为 false. 如果参数为 true, 返回值包含半选中节点数据
        const nodes = [];
        this.nodeMap.forEach((node) => {
            if (node.checked || (node.indeterminate && includeHalfChecked)) {
                nodes.push(node.data); // 获取所有选中的节点
            }
        });
        return nodes;
    }
    setChecked(key, checked) {
        const node = this.nodeMap.get(key);
        if (!node) {
            console.warn(`nodeKey ${key} not found`);
            return;
        }
        node.checked = checked;
        if (this.checkStrictly) {
            this.updateDom();
            return; // 如果是父子不关联，则直接返回
            
        }
        const runCheck = (node, checked) => {
            node.children.forEach((item) => {
                item.checked = checked;
                runCheck(item, checked);
            });
        };
        runCheck(node);
        this.updateDom();
    }
    getCurrentNode() {
        const n = this.nodeMap.get(this.currentNodeKey);
        return n ||  null;
    }
    append(key, data) {
        const pNode = this.nodeMap.get(key);
        if (!pNode) {
            console.warn(`nodeKey ${key} not found`);
            return;
        }
        const lastNode = pNode.children[pNode.children.length - 1];
        const vIndex = this.visibleNodes.findIndex((item) => item.id === lastNode.id);
        const nodes = this.initTreeNodes([data], pNode.id, pNode.level + 1);
        pNode.children.push(...nodes);
        if (vIndex > -1) {
            this.visibleNodes.splice(vIndex + 1, 0, nodes[0]);
            this.complateDom();
            this.updateDom();
        }
    }
    insertAfter(key, data) {
        const preNode = this.nodeMap.get(key);
        if (!preNode) {
            console.warn(`nodeKey ${key} not found`);
            return;
        }
        const parentNode = this.nodeMap.get(preNode.parentId) ;
        const pIndex = (parentNode || this.treeNodes).findIndex((item) => item.id === key);
        const vIndex = this.visibleNodes.findIndex((item) => item.id === key);
        const nodes = this.initTreeNodes([data], preNode.parentId, preNode.level);
        if (parentNode) {
            parentNode.children.splice(pIndex + 1, 0, nodes[0]);
        } else {
            this.treeNodes.splice(pIndex + 1, 0, nodes[0]);
        }
        if (vIndex > -1) {  
            this.visibleNodes.splice(vIndex + 1, 0, nodes[0]);
            this.complateDom();
            this.updateDom();
        }
    }
}