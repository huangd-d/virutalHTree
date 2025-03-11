// 核心类型定义
type TreeNodeProps<T = any> = {
  children?: keyof T
  label?: keyof T
  disabled?: keyof T
  isLeaf?: keyof T,
  class?: string
}

type nodeKey = string | 'id';

type idValue = string | number | symbol;

const defaultNodeHeight = 26;

// 在原有类型基础上添加
type BaseTreeNodeData<K extends TreeNodeProps<any> = {
  children: 'children',
  label: 'label',
  disabled: 'disabled',
  isLeaf: 'isLeaf'
}> = {
  [P in NonNullable<K['children']>]?: BaseTreeNodeData<K>[]  // 递归children结构
} & {
  [P in NonNullable<K['label']>]: string               // label字段类型
} & {
  [P in NonNullable<K['disabled']>]?: boolean          // disabled字段类型
} & {
  [P in NonNullable<K['isLeaf']>]?: boolean             // isLeaf字段类型
} & {
  [key in nodeKey]: idValue // 动态ID字段                      // 必须包含id字段
};

// 节点核心类型
class TreeNode<T = any> {
  constructor(
    public readonly id: idValue,
    public data: T,
    public parentId: idValue | null
  ) {}

  children: TreeNode<T>[] = []
  expanded = false
  checked = false
  indeterminate = false
  visible = true
  level = 0
  label: string = ''
  height: number = defaultNodeHeight
  disabled = false
  // loading = false
  isLeaf = false
}
// 在原有类型基础上修改
type LoadFn<T> = (node: TreeNode<T>, resolve: (children: T[]) => void) => void;

// 修改组件配置项类型约束
interface VitrulHTreeOptions<BaseTreeNodeData> {
    el: HTMLElement
    data: BaseTreeNodeData[]  // 使用动态生成的TreeData类型
    props?: TreeNodeProps,
  load?: LoadFn<BaseTreeNodeData>;
  highlightCurrent?: boolean
  defaultExpandAll?: boolean
  defaultExpandedKeys?: string[]
  defaultCheckedKeys?: string[]
  autoExpandParent?: boolean
  showCheckbox?: boolean
  checkStrictly?: boolean
  indent?: number
  showDomNum?: number
  getNodeHeight?: (data: T) => number
  renderContent?: TreeRenderFn<T>
  filterNodeMethod?: FilterFn<T>
  expandOnClickNode?: boolean
  checkOnClickNode?: boolean
  accordion?: boolean
  nodeClick?: (node: TreeNode<T>, data: T) => void
  checkChange?: (nodes: TreeNode<T>[]) => void
}

// 改造后的组件类
export class VitrulHTree<T = any> {
  private nodeMap = new Map<string, TreeNode<T>>()
  private treeNodes: TreeNode<T>[] = []
  private visibleNodes: TreeNode<T>[] = []
  private treeNodeDoms: HTMLElement[] = []
  
  // 类型化配置属性
  private readonly props: Required<TreeNodeProps<T>>
  private readonly nodeKey: string
  private readonly showDomNum: number
  private readonly indent: number
  // ... 其他属性声明

  constructor(private options: VitrulHTreeOptions<T>) {
    // 类型化初始化逻辑
    this.props = {
      children: 'children' as keyof T,
      label: 'label' as keyof T,
      disabled: 'disabled' as keyof T,
      isLeaf: 'isLeaf' as keyof T,
      ...options.props
    }
    // ... 其他初始化
  }

  // 类型化方法示例
  private initTreeNodes(
    datas: T[],
    parentId: string | null,
    level: number
  ): TreeNode<T>[] {
    return datas.map(item => {
      const nodeKey = this.options.nodeKey || 'id'
      const id = String(item[nodeKey as keyof T])
      
      const node = new TreeNode<T>(id, item, parentId)
      node.label = String(item[this.props.label] as unknown)
      // ... 其他属性初始化
      
      this.nodeMap.set(id, node)
      return node
    })
  }

  // 事件处理类型示例
  private handleNodeClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const index = this.treeNodeDoms.findIndex(dom => 
      dom === target || dom.contains(target)
    );
    // 假设添加一个默认的startIndex为0，可根据实际情况修改
    const startIndex = 0; 
    const node = this.visibleNodes[startIndex + index];
    this.options.nodeClick?.(node, node.data);
  }

  // 泛型工具方法
  private getDataByKey(arr: T[], key: string): T | null {
    const node = this.nodeMap.get(key)
    if (!node) return null
    
    let current: T | undefined = node.data
    let parentId = node.parentId
    while (parentId) {
      const parent = this.nodeMap.get(parentId)
      current = parent?.data[this.props.children]?.find(
        (d: T) => d[this.props.children]?.includes(current)
      )
      parentId = parent?.parentId ?? null
    }
    return current ?? null
  }
}


