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
        this.treeData = [];
        // 保存虚拟滚动容器中显示的节点
        this.visibleNodes = [];
        // 节点唯一key
        this.nodeKey = options.nodeKey || 'id';
        // 根节点
        this.el = options.el;
        // 树节点配置
        this.props = {
            children: 'children',
            label: 'label',
            disabled: 'disabled',
            isLeaf: 'isLeaf',
            ...options.props,
        };
        // 加载子集方法
        this.load = options.load;

        // 是否高亮当前选中节点
        this.highlightCurrent = options.highlightCurrent || false;
        // 是否默认展开所有节点
        this.defaultExpandAll = options.defaultExpandAll || false;
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
 
        // 当前选中节点
        this.currentNodeKey = options.currentNodeKey || null;
        // 缩进距离
        this.indent = options.indent || 16;
        // 是否自动展开父级
        this.accordion = options.accordion || false;
        // 默认滚动展示多少个节点
        this.showDomNum = options.showDomNum || 50;
        // 每个node 高度方法
        this.getNodeHeight = options.getNodeHeight || (() => defaultNodeHeight);
        // 滚动显示的开发节点
        this.startIndex = 0;
        // 自定义渲染节点
        this.renderContent = options.renderContent || null;

        // 生成dom 集合
        this.treeNodeDoms = [];

        // 初始构建树节点
        this.treeData = this.initTreeData(this.datas, null, 0);
        // 根据默认展开节点来构建所需要展示的所有节点
        this.initExpendedNodes();
        // 根据默认选中节点来构建所需要展示的所有节点
        if (this.showCheckbox) {
            this.initCheckedNodes();
        }
        // 根据展开节点来构建所需要展示的所有节点
        this.initVisibleNodes(this.treeData, this.visibleNodes);
        
        // 初始化dom
        this.initDom();
    }
    initExpendedNodes() {
        this.defaultExpandedKeys.forEach(key => {
            const node = this.nodeMap.get(key);
            if (!node) {
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
        this.defaultCheckedKeys.forEach(key => {
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
                parentNode.checked = parentNode.children.every(child => child.checked);
                parentNode.indeterminate = parentNode.children.some(child => !child.checked || child.indeterminate);
                parentNode = this.nodeMap.get(parentNode.parentId);
            }
        });
    }

    initTreeData(datas, parentId, level) {
        return datas.map((item) => {
            const node = new Node();
            node.id = item[this.props.nodeKey];
            node.label = item[this.props.label];
            node.disabled = item[this.props.disabled];
            node.isLeaf = item[this.props.isLeaf];
            node.data = {
                ...item,
            };
            node.data[this.props.children] = null; // 清空 children 防止重复渲染

            node.parentId = parentId;
            node.level = level;
            node.height = this.getNodeHeight(item);

            this.nodeMap[node.id] = node;

            if (item[this.props.children] && item[this.props.children].length > 0) {
                node.children = this.initTreeData(item.children, node.id, level + 1);
            } else {
                node.isLeaf = true;
            }

            return node;
        });
    }

    initVisibleNodes(nodeList, arr) {
        nodeList.forEach(node => {
            arr.push(node);
            if (node.expanded && node.children) {
                this.initVisibleNodes(node.children, arr);
            }
        })
    }
    get paddingTop() {
        return this.visibleNodes.slice(0, this.startIndex).reduce((prev, node) => prev + node.height, 0);
    }
    get allHeight() {
        return this.visibleNodes.reduce((prev, node) => prev + node.height, 0);
    }
    initDom() {
        this.treeWrap = document.createElement('div');
        this.treeWrap.className = 'h-tree';
        this.treeWrap.style.overflowY = 'auto';
        this.treeWrap.addEventListener('scroll', this.treeWrapScroll.bind(this));
        this.el.appendChild(this.treeWrap);

        this.treeWrapContent = document.createElement('div');
        this.treeWrap.appendChild(this.treeWrapContent);

        this.treeWrapContent.className = 'h-tree-content';
        this.treeWrapContent.style.height = `${this.allHeight}px`; // 初始化高度
        this.treeWrapContent.style.paddingTop = `${this.paddingTop}px`;
        this.treeWrapContent.style.boxSizing = 'border-box';
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
        
        const item = document.createElement('div');
        item.className = 'h-tree-item';
        item.style.height = `${node.height}px`;
        item.style.paddingLeft = `${node.level * this.indent}px`;
        item.dataset.id = index;
        // 生成展开节点dom
        const expandIcon = document.createElement('span');
        expandIcon.className = 'h-tree-expand-icon';
        expandIcon.style.display = 'flex';
        expandIcon.style.width = '26px';
        expandIcon.style.height = '100%';
        expandIcon.style.marginRight = `6px`;
        expandIcon.addEventListener('click', (e) => {
            const index = e.target.parentNode.dataset.id;
            const node = this.visibleNodes[this.startIndex + index];
            this.expandNode(node);
        });
        item.appendChild(expandIcon);


        if (this.showCheckbox) {
            //生成 选中框dom
            const checkbox = document.createElement('span');
            checkbox.className = 'h-tree-checkbox';
            checkbox.style.display = 'flex';
            checkbox.style.width = '26px';
            checkbox.style.height = '100%';
            checkbox.style.marginRight = `6px`;
            checkbox.addEventListener('click', (e) => {
                const index = e.target.parentNode.dataset.id;
                const node = this.visibleNodes[this.startIndex + index];
                this.checkedKeysChange(node);
            });
            item.appendChild(checkbox);
        }
        if (this.renderContent) {
            const itemDom = this.renderContent(node.data);
            if (itemDom instanceof HTMLElement) {
                itemDom.style.height = `${node.height}px`;
                itemDom.dataset.id = index;
                return itemDom;
            }
            item.appendChild(content);
            // return itemDom;
        } else {
            // 自定义生成内容dom
            const content = document.createElement('div');
            content.className = 'h-tree-label';
            content.style.display = 'flex';
            content.style.flex = '1';
            content.style.alignItems = 'center';
            content.innerText = node.data.label;
            item.appendChild(content);
        }
        
        return item;
    }
    treeWrapScroll(e) {
        
        if (this.showDomNum >= this.visibleNodes.length) {
            return
        }
        const { scrollTop } = e.target;
        const index = this.computedScrollIndex(scrollTop);
        if (index === this.startIndex) {
            return;
        }
        this.startIndex = Math.min(index, this.visibleNodes.length - this.showDomNum);
        // this.treeWrapContent.style.paddingTop = `${this.paddingTop}px`;
        this.updateDom();
        console.log(index, this.startIndex);
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
    updateDom() {
        // debugger
        this.treeWrapContent.style.paddingTop = `${this.paddingTop}px`;
        for (let i = 0; i < this.treeNodeDoms.length; i++) {
            const node = this.visibleNodes[this.startIndex + i];
            const dom = this.treeNodeDoms[i];
            this.updateDomAttribute(dom, node);
        }
    }
    updateDomAttribute(nodeDom,node) {
        if (node.expanded) {
            nodeDom.classList.add('h-is-expanded');
        } else {
            nodeDom.classList.remove('h-is-expanded');
        }
        if (node.checked) {
            nodeDom.classList.add('h-is-checked');
        } else {
            nodeDom.classList.remove('h-is-checked');
        }
        if (node.disabled) {
            nodeDom.classList.add('h-is-disabled');
        } else {
            nodeDom.classList.remove('h-is-disabled');
        }
        if (node.indeterminate) {
            nodeDom.classList.add('h-is-indeterminate');
        } else {
            nodeDom.classList.remove('h-is-indeterminate');
        }

        nodeDom.querySelector('.h-tree-label').innerText = node.label;// 更新label
        // console.log();
        
    }
}