
控件json格式示例

### 子画布

```json
{
    "nodes":
    [
        {
            "id": "2",
            "kind": "SubGraph",
            "name": "s1",
            "args":
            {
                "nodes":
                [
                    {
                        "id": "1",
                        "kind": "LocalLLM",
                        "name": "m1",
                        "args":
                        {
                            "base_model": "",
                            "deploy_method": "dummy"
                        }
                    }
                ],
                "edges":
                [
                    {
                        "iid": "__start__",
                        "oid": "1"
                    },
                    {
                        "iid": "1",
                        "oid": "__end__"
                    }
                ]
            }
        }
    ],
    "edges":
    [
        {
            "iid": "__start__",
            "oid": "2"
        },
        {
            "iid": "2",
            "oid": "__end__"
        }
    ]
}
```


### 代码块

```json
{
    "nodes":
    [
        {
            "id": "1",
            "kind": "Code",
            "name": "m1",
            "args": "def test(x: int):\n    return 2 * x\n"
        }
    ],
    "edges":
    [
        {
            "iid": "__start__",
            "oid": "1"
        },
        {
            "iid": "1",
            "oid": "__end__"
        }
    ]
}
```

### switch

```json
{
    "nodes":
    [
        {
            "id": "4",
            "kind": "Switch",
            "name": "s1",
            "args":
            {
                "judge_on_full_input": true,
                "nodes":
                {
                    "1":
                    [
                        {
                            "id": "2",
                            "kind": "Code",
                            "name": "m2",
                            "args": "def test(x: int):\n    return 2 * x\n"
                        }
                    ],
                    "2":
                    [
                        {
                            "id": "1",
                            "kind": "Code",
                            "name": "m1",
                            "args": "def test(x: int):\n    return 1 + x\n"
                        },
                        {
                            "id": "2",
                            "kind": "Code",
                            "name": "m2",
                            "args": "def test(x: int):\n    return 2 * x\n"
                        }
                    ],
                    "3":
                    [
                        {
                            "id": "3",
                            "kind": "Code",
                            "name": "m3",
                            "args": "def test(x: int):\n        return x * x\n"
                        }
                    ]
                }
            }
        }
    ],
    "edges":
    [
        {
            "iid": "__start__",
            "oid": "4"
        },
        {
            "iid": "4",
            "oid": "__end__"
        }
    ]
}
```


### ifs

```json
{
    "nodes":
    [
        {
            "id": "4",
            "kind": "Ifs",
            "name": "i1",
            "args":
            {
                "cond": "def cond(x): return x < 10",
                "true":
                [
                    {
                        "id": "1",
                        "kind": "Code",
                        "name": "m1",
                        "args": "def test(x: int):\n    return 1 + x\n"
                    },
                    {
                        "id": "2",
                        "kind": "Code",
                        "name": "m2",
                        "args": "def test(x: int):\n    return 2 * x\n"
                    }
                ],
                "false":
                [
                    {
                        "id": "3",
                        "kind": "Code",
                        "name": "m3",
                        "args": "def test(x: int):\n    return x * x\n"
                    }
                ]
            }
        }
    ],
    "edges":
    [
        {
            "iid": "__start__",
            "oid": "4"
        },
        {
            "iid": "4",
            "oid": "__end__"
        }
    ]
}
```


### loop

```json
{
    "nodes":
    [
        {
            "id": "2",
            "kind": "Loop",
            "name": "loop",
            "args":
            {
                "stop_condition": "def cond(x): return x > 10",
                "nodes":
                [
                    {
                        "id": "1",
                        "kind": "Code",
                        "name": "code",
                        "args": "def square(x: int): return x * x"
                    }
                ],
                "edges":
                [
                    {
                        "iid": "__start__",
                        "oid": "1"
                    },
                    {
                        "iid": "1",
                        "oid": "__end__"
                    }
                ]
            }
        }
    ],
    "edges":
    [
        {
            "iid": "__start__",
            "oid": "2"
        },
        {
            "iid": "2",
            "oid": "__end__"
        }
    ]
}
```


### warp

```json
{
    "nodes":
    [
        {
            "id": "2",
            "kind": "Warp",
            "name": "warp",
            "args":
            {
                "nodes":
                [
                    {
                        "id": "1",
                        "kind": "Code",
                        "name": "code",
                        "args": "def square(x: int): return x * x"
                    }
                ],
                "edges":
                [
                    {
                        "iid": "__start__",
                        "oid": "1"
                    },
                    {
                        "iid": "1",
                        "oid": "__end__"
                    }
                ]
            }
        }
    ],
    "edges":
    [
        {
            "iid": "__start__",
            "oid": "2"
        },
        {
            "iid": "2",
            "oid": "__end__"
        }
    ]
}
```


### formatter

```json
{
    "nodes":
    [
        {
            "id": "1",
            "kind": "Code",
            "name": "m1",
            "args": "def test(x: int):\n    return x\n"
        },
        {
            "id": "2",
            "kind": "Code",
            "name": "m2",
            "args": "def test(x: int):\n    return [[x, 2*x], [3*x, 4*x]]\n"
        },
        {
            "id": "3",
            "kind": "Code",
            "name": "m3",
            "args": "def test(x: int):\n    return dict(a=1, b=x * x)\n"
        },
        {
            "id": "4",
            "kind": "Code",
            "name": "m4",
            "args": "def test(x, y, z):\n    return f\"{x}{y}{z}\"\n"
        }
    ],
    "edges":
    [
        {
            "iid": "__start__",
            "oid": "1"
        },
        {
            "iid": "__start__",
            "oid": "2"
        },
        {
            "iid": "__start__",
            "oid": "3"
        },
        {
            "iid": "1",
            "oid": "4"
        },
        {
            "iid": "2",
            "oid": "4",
            "formatter": "[:, 1]"
        },
        {
            "iid": "3",
            "oid": "4",
            "formatter": "[b]"
        },
        {
            "iid": "4",
            "oid": "__end__"
        }
    ]
}
```

### RAG

```json
{
    "nodes":
    [
        {
            "id": "1",
            "kind": "Retriever",
            "name": "ret1",
            "args":
            {
                "doc": "0",
                "group_name": "CoarseChunk",
                "similarity": "bm25_chinese",
                "topk": 3
            }
        },
        {
            "id": "4",
            "kind": "Reranker",
            "name": "rek1",
            "args":
            {
                "type": "ModuleReranker",
                "output_format": "content",
                "join": true,
                "arguments":
                {
                    "model": "bge-reranker-large",
                    "topk": 1
                }
            }
        },
        {
            "id": "5",
            "kind": "Code",
            "name": "c1",
            "args": "def test(nodes, query): return f'context_str={nodes}, query={query}'"
        },
        {
            "id": "6",
            "kind": "LocalLLM",
            "name": "m1",
            "args":
            {
                "base_model": "",
                "deploy_method": "dummy"
            }
        }
    ],
    "edges":
    [
        {
            "iid": "__start__",
            "oid": "1"
        },
        {
            "iid": "1",
            "oid": "4"
        },
        {
            "iid": "__start__",
            "oid": "4"
        },
        {
            "iid": "4",
            "oid": "5"
        },
        {
            "iid": "__start__",
            "oid": "5"
        },
        {
            "iid": "5",
            "oid": "6"
        },
        {
            "iid": "6",
            "oid": "__end__"
        }
    ],
    "resources":
    [
        {
            "id": "0",
            "kind": "Document",
            "name": "d1",
            "args":
            {
                "dataset_path": "/app/src/learnllm/rag_master"
            }
        }
    ]
}
```


```json
{
    "nodes":
    [
        {
            "id": "1",
            "kind": "Retriever",
            "name": "ret1",
            "args":
            {
                "doc": "0",
                "group_name": "CoarseChunk",
                "similarity": "bm25_chinese",
                "topk": 3
            }
        },
        {
            "id": "4",
            "kind": "Reranker",
            "name": "rek1",
            "args":
            {
                "type": "ModuleReranker",
                "output_format": "content",
                "join": true,
                "arguments":
                {
                    "model": "bge-reranker-large",
                    "topk": 1
                }
            }
        },
        {
            "id": "5",
            "kind": "Code",
            "name": "c1",
            "args": "def test(nodes, query): return f'context_str={nodes}, query={query}'"
        },
        {
            "id": "6",
            "kind": "LocalLLM",
            "name": "m1",
            "args":
            {
                "base_model": "",
                "deploy_method": "dummy"
            }
        },
        {
            "id": "2",
            "kind": "Retriever",
            "name": "ret2",
            "args":
            {
                "doc": "0",
                "group_name": "sentence",
                "similarity": "bm25",
                "topk": 3
            }
        },
        {
            "id": "3",
            "kind": "JoinFormatter",
            "name": "c",
            "args":
            {
                "type": "sum"
            }
        }
    ],
    "edges":
    [
        {
            "iid": "__start__",
            "oid": "1"
        },
        {
            "iid": "__start__",
            "oid": "2"
        },
        {
            "iid": "1",
            "oid": "3"
        },
        {
            "iid": "2",
            "oid": "3"
        },
        {
            "iid": "3",
            "oid": "4"
        },
        {
            "iid": "__start__",
            "oid": "4"
        },
        {
            "iid": "4",
            "oid": "5"
        },
        {
            "iid": "__start__",
            "oid": "5"
        },
        {
            "iid": "5",
            "oid": "6"
        },
        {
            "iid": "6",
            "oid": "__end__"
        }
    ],
    "resources":
    [
        {
            "id": "0",
            "kind": "Document",
            "name": "d1",
            "args":
            {
                "dataset_path": "/app/src/learnllm/rag_master",
                "node_group":
                [
                    {
                        "name": "sentence",
                        "transform": "SentenceSplitter",
                        "chunk_size": 100,
                        "chunk_overlap": 10
                    }
                ]
            }
        }
    ]
}
```

### 多模态机器人

```json
{
    "nodes":
    [
        {
            "id": "4",
            "kind": "Intention",
            "name": "int1",
            "args":
            {
                "base_model": "0",
                "nodes":
                {
                    "music":
                    {
                        "id": "1",
                        "kind": "Code",
                        "name": "m1",
                        "args":
                        {
                            "code": "def music(x): return f\"Music get {x}\""
                        }
                    },
                    "draw":
                    {
                        "id": "2",
                        "kind": "Code",
                        "name": "m2",
                        "args":
                        {
                            "code": "def draw(x): return f\"Draw get {x}\""
                        }
                    },
                    "chat":
                    {
                        "id": "3",
                        "kind": "Code",
                        "name": "m3",
                        "args":
                        {
                            "code": "def chat(x): return f\"Chat get {x}\""
                        }
                    }
                }
            }
        }
    ],
    "edges":
    [
        {
            "iid": "__start__",
            "oid": "4"
        },
        {
            "iid": "4",
            "oid": "__end__"
        }
    ],
    "resources":
    [
        {
            "id": "0",
            "kind": "OnlineLLM",
            "name": "llm",
            "args":
            {
                "source": null
            }
        }
    ]
}
```
