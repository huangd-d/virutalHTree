import { beforeEach, describe, expect, test } from 'vitest';
import { VitrulHTree } from './vitrulTree';

// 测试用数据模型
interface TestNode {
  id: string;
  label: string;
  children?: TestNode[];
  disabled?: boolean;
}

// 基础测试数据
const mockData: TestNode[] = [{
  id: '1',
  label: '根节点',
  children: [{
    id: '1-1',
    label: '子节点1'
  }]
}];

// 创建容器函数
const createContainer = () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
};

describe('VitrulHTree', () => {
  let instance: VitrulHTree<TestNode>;
  let container: HTMLElement;

  beforeEach(() => {
    container = createContainer();
    instance = new VitrulHTree({
      el: container,
      data: mockData,
      props: {
        children: 'children',
        label: 'label'
      }
    });
  });

  test('初始化应生成正确节点', () => {
    // 验证根节点
    const rootNode = instance.getCurrentNode();
    expect(rootNode?.data.id).toBe('1');
    expect(instance.getCheckedNodes()).toHaveLength(0);
  });

  test('展开/折叠节点', () => {
    const rootNode = instance.getCurrentNode()!;
    instance.expandNode(rootNode);
    expect(rootNode.expanded).toBe(true);
    
    // 验证子节点可见
    const childNodes = instance.getCheckedNodes(true);
    expect(childNodes).toContainEqual(expect.objectContaining({ id: '1-1' }));
    
    instance.expandNode(rootNode);
    expect(rootNode.expanded).toBe(false);
  });

  test('节点选中功能', () => {
    const rootNode = instance.getCurrentNode()!;
    instance.checkedNode(rootNode);
    
    expect(rootNode.checked).toBe(true);
    expect(instance.getCheckedNodes()).toHaveLength(1);
    
    // 验证子节点联动
    const childNode = instance.getNodeByKey('1-1')!;
    expect(childNode.checked).toBe(true);
  });

  test('异步加载子节点', async () => {
    const asyncData = {
      id: '2',
      label: '异步节点',
      children: []
    };

    instance = new VitrulHTree<TestNode>({
      el: createContainer(),
      data: [asyncData],
      load: (node, resolve) => {
        setTimeout(() => resolve([{ id: '2-1', label: '动态子节点', children:[] }]), 10);
      }
    });

    const parentNode = instance.getNodeByKey('2')!;
    await instance.expandNode(parentNode);
    
    expect(parentNode.children).toHaveLength(1);
    expect(!!instance.getNodeByKey('2-1')).toBe(true);
  });

  test('删除节点', () => {
    const rootNode = instance.getCurrentNode()!;
    instance.removeNodeByKey('1');
    expect(!!instance.getNodeByKey('1')).toBe(false);
    expect(instance.getCurrentNode()).toBeUndefined();
  });
});