'use client'
import type { FC } from 'react'
import React, { useState } from 'react'
import { Collapse } from 'antd'
import type { CollapseProps } from 'antd'
import type { FieldItemProps } from '../../types'
import styles from './index.module.scss'

type RuleInfo = {
  title: string
  content: string
  examples?: Array<{
    input: string
    rule: string
    output: string
  }>
}

const FormatterRuleInfo: FC<Partial<FieldItemProps>> = ({
  nodeData,
  value,
  onChange,
  required = false,
}) => {
  const [activeKey, setActiveKey] = useState<string | string[]>(['1'])

  // 根据节点数据获取当前选择的解析类型
  const getCurrentFormatterType = () => {
    if (nodeData?.payload__ftype)
      return nodeData.payload__ftype

    return 'PythonFormatter'
  }

  // 根据解析类型生成规则信息
  const generateRuleInfo = (): RuleInfo[] => {
    const formatterType = getCurrentFormatterType()

    switch (formatterType) {
      case 'PythonFormatter':
        return [
          {
            title: '基础字段提取',
            content: '直接提取指定字段的值',
            examples: [
              {
                input: '{"a": 1, "b": 2, "c": 3}',
                rule: '[a]',
                output: '[1]',
              },
              {
                input: '{"a": 1, "b": 2, "c": 3}',
                rule: '[a,b]',
                output: '[1, 2]',
              },
              {
                input: '{"a": 1, "b": 2, "c": 3}',
                rule: '[:]',
                output: '[1, 2, 3]',
              },
              {
                input: '{"a": 1, "b": 2, "c": 3}',
                rule: '{a}',
                output: '[{"a": 1}]',
              },
              {
                input: '{"a": 1, "b": 2, "c": 3}',
                rule: '{a,b}',
                output: '[{"a": 1, "b": 2}]',
              },
              {
                input: '{"a": 1, "b": 2, "c": 3}',
                rule: '{:}',
                output: '[{"a": 1, "b": 2, "c": 3}]',
              },
            ],
          },
        ]

      case 'JsonFormatter':
        return [
          {
            title: 'List类型处理',
            content: '处理数组类型输入，支持索引和切片操作',
            examples: [
              {
                input: '[10, 20, 30, 40]',
                rule: '[0]',
                output: '[10]',
              },
              {
                input: '[10, 20, 30, 40]',
                rule: '[0:3]',
                output: '[10, 20, 30]',
              },
              {
                input: '[10, 20, 30, 40]',
                rule: '[0:3:2]',
                output: '[10, 30]',
              },
              {
                input: '[10, 20, 30, 40]',
                rule: '[0,2]',
                output: '[10, 30]',
              },
              {
                input: '[10, 20, 30, 40]',
                rule: '[:]',
                output: '[10, 20, 30, 40]',
              },
              {
                input: '[10, 20, 30, 40]',
                rule: '[::2]',
                output: '[10, 30]',
              },
            ],
          },
          {
            title: 'Dict/Str类型处理',
            content: '处理字典或字符串类型输入',
            examples: [
              {
                input: '{"a": 1, "b": 2}',
                rule: '[a]',
                output: '[1]',
              },
              {
                input: '{"a": 1, "b": 2}',
                rule: '[a,b]',
                output: '[1, 2]',
              },
              {
                input: '{"a": 1, "b": 2}',
                rule: '[:]',
                output: '[1, 2]',
              },
              {
                input: '{"a": 1, "b": 2}',
                rule: '{a,b}',
                output: '[{"a": 1, "b": 2}]',
              },
              {
                input: '{"a": 1, "b": 2}',
                rule: '{a}',
                output: '[{"a": 1}]',
              },
              {
                input: '{"a": 1, "b": 2}',
                rule: '{:}',
                output: '[{"a": 1, "b": 2}]',
              },
            ],
          },
          {
            title: '混合模式处理',
            content: '处理包含字典的数组',
            examples: [
              {
                input: '[{"age": 23, "name": "张三"}, {"age": 24, "name": "李四"}]',
                rule: '[0:2][age,name]',
                output: '[[23, "张三"], [24, "李四"]]',
              },
            ],
          },
        ]

      case 'YamlFormatter':
        return [
          {
            title: 'YAML字段提取',
            content: '从YAML格式字符串中提取指定字段',
            examples: [
              {
                input: `a: 1
b: true
c:
  d: test`,
                rule: '[a]',
                output: '[1]',
              },
              {
                input: `a: 1
b: true
c:
  d: test`,
                rule: '[a,b]',
                output: '[1, true]',
              },
              {
                input: `a: 1
b: true
c:
  d: test`,
                rule: '{:}',
                output: '[1, true, {"d": "test"}]',
              },
            ],
          },
          {
            title: '保留YAML结构',
            content: '提取时保留YAML的层级结构',
            examples: [
              {
                input: `a: 1
b: true
c:
  d: test`,
                rule: '{c}',
                output: '[{"c": {"d": "test"}}]',
              },
              {
                input: `a: 1
b: true
c:
  d: test`,
                rule: '{a,c}',
                output: '[{"a": 1, "c": {"d": "test"}}]',
              },
            ],
          },
        ]

      default:
        return [
          {
            title: '默认规则',
            content: '请选择具体的解析类型查看详细规则',
          },
        ]
    }
  }

  const ruleInfo = generateRuleInfo()

  const collapseItems: CollapseProps['items'] = ruleInfo.map((rule, index) => ({
    key: String(index + 1),
    label: (
      <div className={styles.collapseHeader}>
        <span className={styles.ruleTitle}>{rule.title}</span>
        <span className={styles.ruleDesc}>{rule.content}</span>
      </div>
    ),
    children: (
      <div className={styles.collapseContent}>
        <div className={styles.ruleDescription}>
          {rule.content}
        </div>
        {rule.examples && rule.examples.length > 0 && (
          <div className={styles.examples}>
            <h4>示例：</h4>
            {rule.examples.map((example, exampleIndex) => (
              <div key={exampleIndex} className={styles.example}>
                <div className={styles.exampleItem}>
                  <span className={styles.exampleLabel}>输入：</span>
                  <code className={styles.exampleCode}>{example.input}</code>
                </div>
                <div className={styles.exampleItem}>
                  <span className={styles.exampleLabel}>规则：</span>
                  <code className={styles.exampleCode}>{example.rule}</code>
                </div>
                <div className={styles.exampleItem}>
                  <span className={styles.exampleLabel}>输出：</span>
                  <code className={styles.exampleCode}>{example.output}</code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
  }))

  return (
    <div className={styles.parseRulesCollapse}>
      <Collapse
        activeKey={activeKey}
        onChange={setActiveKey}
        items={collapseItems}
        expandIconPosition="end"
        ghost
      />
    </div>
  )
}

export default React.memo(FormatterRuleInfo)
