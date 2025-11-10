# 万象应用开发平台产品帮助文档

# 一、产品简介

## 1、什么是万象应用开发平台

万象应用开发平台是一款**面向AI Agent 应用的开发平台**，无论你是否有编程基础，都可以在平台上快速搭建基于大模型的各类 AI
应用，比如智能客服、陪伴聊天机器人、AI翻译、智能阅读等，并将 AI 应用发布到商店，也可以通过 API 或 SDK 将
AI 应用集成到你的业务系统中。

万象应用开发平台深度融合了**应用编排与模型管理**两大核心能力，既可以为AI应用（Agent）开发人员提供一站式全链路的AI应用搭建能力，包括应用开发、知识资源管理、测评、监控，也可以为AI模型开发人员提供一站式模型管理能力，包括模型微调、模型推理服务、数据集管理。

![](./media/media/qpqg0xm6g54jdwzq5rqe-.png)

### 1）应用编排能力

  - 灵活的工作流设计：平台提供大量灵活可组合的节点包括大语言模型LLM、自定义代码块、循环判断逻辑等，无论你是否有编程基础，都可以用拖拽式方法快速搭建一个工作流。比如创建一个撰写行业研究报告的工作流，让智能体写一份20页的报告。

  - 丰富的数据源：内置知识库、数据库、插件、Prompt库等资源管理能力，支持智能体与您自己的数据进行交互。

  - 高可控的知识召回技术：平台提供Rag检索等模块，支持用户自定义检索算法细节，让大模型应用更快更准确的检索返回需要的知识数据。

### 2）模型管理能力

  - 模型微调与优化：内置专业的模型微调工具链，支持企业基于自有数据对基础模型进行定制化优化，使模型更贴合业务场景需求。

  - 推理服务管理：提供高性能的模型推理服务部署能力，支持弹性伸缩、负载均衡等企业级特性，确保AI应用在生产环境中的稳定运行。

  - 数据资产管理：支持结构化与非结构化数据的集中管理，提供数据标注、清洗、增强等预处理能力，为模型训练提供高质量数据基础。

## 2、常用概念

<table>
<tbody>
<tr class="odd">
<td><strong>分类</strong></td>
<td><strong>概念</strong></td>
<td><strong>定义</strong></td>
</tr>
<tr class="even">
<td>大模型应用开发</td>
<td>大模型</td>
<td>语言大模型（LLM）是基于深度学习的人工智能技术，属于自然语言处理核心研究内容。它用大规模数据集训练，能理解文本含义、生成自然语言文本，像GPT、文心一言等都是典型代表。</td>
</tr>
<tr class="odd">
<td></td>
<td>Prompt</td>
<td>输入给AI模型的指令或上下文文本，用于引导其生成特定输出。精炼的Prompt可提升模型效果。</td>
</tr>
<tr class="even">
<td></td>
<td>系统提示词</td>
<td>是给AI设定的全局规则或角色设定，用于指导其整体行为和回答风格，通常由开发者或系统管理员设定，影响AI对所有用户请求的处理方式。</td>
</tr>
<tr class="odd">
<td></td>
<td>用户提示词</td>
<td>是用户向AI提出的具体指令或问题，用于触发AI生成特定回答，内容灵活多变，直接反映用户的即时需求。</td>
</tr>
<tr class="even">
<td></td>
<td>智能体/Agent</td>
<td>智能体是基于对话的 AI 项目，它通过对话方式接收用户的输入，由大模型自动调用插件或工作流等方式执行用户指定的业务流程，并生成最终的回复。智能客服、虚拟伴侣、个人助理、英语外教都是智能体的典型应用场景。</td>
</tr>
<tr class="odd">
<td></td>
<td>工作流</td>
<td>一系列按顺序或条件触发的任务或步骤，用于实现特定业务流程。</td>
</tr>
<tr class="even">
<td></td>
<td>画布</td>
<td>指可视化的交互界面或编辑空间，用于设计、构建或配置内容</td>
</tr>
<tr class="odd">
<td></td>
<td>插件</td>
<td>扩展功能的外部模块，可集成到主线系统中。例如：AI聊天工具通过插件调用天气API、翻译服务，增强原生效能。</td>
</tr>
<tr class="even">
<td>知识库与RAG</td>
<td>知识库</td>
<td>结构化或半结构化的知识存储系统，包含事实、规则、文档等。AI通过知识库回答问题或提供决策支持，例如企业级文档知识库或专业领域知识库。</td>
</tr>
<tr class="odd">
<td></td>
<td>数据库</td>
<td>存储结构化数据的系统（如关系型数据库MySQL、MongoDB）。AI通过查询数据库获取信息，数据库是知识库或工作流的基础数据源。</td>
</tr>
<tr class="even">
<td></td>
<td>RAG</td>
<td>RAG（检索增强生成，Retrieval-Augmented Generation）是一种结合信息检索（Retrieval）和文本生成（Generation）的技术，旨在提高大型语言模型（大模型）的准确性和实用性。通过在生成文本前检索外部知识库中的相关信息，RAG 可以让大模型在回答问题时结合最新、最相关的数据，从而减少幻觉现象，并提升答案的专业性和时效性。</td>
</tr>
<tr class="odd">
<td></td>
<td>文本解析</td>
<td>本解析是指将自然语言文本转换为结构化数据或逻辑形式的过程，使计算机能够理解、分析或处理文本信息。</td>
</tr>
<tr class="even">
<td></td>
<td>向量化（embedding）</td>
<td>Embedding，也就是「嵌入」或「嵌入式表示」，在机器学习和自然语言处理中，是指将数据（如词、句子、图像等）映射到一个低维度的向量空间的过程，这个向量空间可以捕获数据的语义信息和关系</td>
</tr>
<tr class="odd">
<td></td>
<td>召回</td>
<td>知识库召回指的是从一个大型的知识库中，根据用户的查询或问题，快速找到并返回与查询相关的候选答案或信息。这个过程就像信息检索一样，目的是从海量的信息中找到与用户需求最相关的部分。召回的目标是尽可能地找到与用户查询相关的答案，甚至包含一些看似相关的，但实际上不完全正确的信息。</td>
</tr>
<tr class="even">
<td></td>
<td>重排序（精排，rerank）</td>
<td>知识库召回是指从知识库中找出与用户查询相关的知识条目。而重排序则是在初步召回一定数量的相关知识条目后，对这些条目按照与用户查询的相关性、重要性等因素进行重新排序，以确定最终的展示顺序。</td>
</tr>
<tr class="odd">
<td>模型管理</td>
<td>模型微调（fine-tuning）</td>
<td>在预训练模型基础上，用新数据针对性训练以优化特定任务性能。例如，用法律文书微调通用语言模型，使其擅长解析法律问题。</td>
</tr>
<tr class="even">
<td></td>
<td>微调训练模式</td>
<td><p>PT：预训练（pretrain）</p>
<p>SFT：监督微调（Supervised Fine-tuning）</p>
<p>RM：奖励模型（reward model），构造人类偏好排序数据集，训练_奖励模型_，用来建模人类偏好</p>
<p>DPO：Direct Preference Optimization，直接偏好优化，是一种大语言模型训练方法，它直接使用人类偏好数据进行优化，避免了传统强化学习方法中训练奖励模型（Reward Model）的步骤</p>
<p>PPO：Proximal Policy Optimization (PPO) 是一种在强化学习中广泛使用的策略优化算法。它属于策略梯度方法的一种，旨在通过限制新策略和旧策略之间的差异来稳定训练过程。PPO通过引入一个称为“近端策略优化”的技巧来避免过大的策略更新，从而减少了训练过程中的不稳定性和样本复杂性。</p></td>
</tr>
<tr class="odd">
<td></td>
<td>微调类型</td>
<td><p>LoRA：LORa（Layer-wise Optimal Relevance Adjustment）是一种特定的微调策略。它通过在不同层之间引入可学习的关联系数，来调整模型在每个层级上的相关性。这种方法允许不同层级之间的信息传递和调整，以更好地适应微调任务。LORa微调可以通过在微调过程中训练这些关联系数来实现。</p>
<p>Full：Full微调是指在微调过程中更新整个模型的所有参数。这意味着所有的层和参数都会被更新，并且在微调期间都会参与训练。Full微调通常用于对模型进行全面的调整，以适应新的任务或领域。</p></td>
</tr>
<tr class="even">
<td></td>
<td>超参数</td>
<td>超参数是指机器学习模型在训练过程中需要预先设定的外部配置变量，用于控制模型的训练过程和行为。它们不同于模型内部参数，参数是在训练过程中由模型自动学习和优化的，而超参数是由数据科学家手动设置或通过调优算法选择的</td>
</tr>
<tr class="odd">
<td></td>
<td>推理服务</td>
<td>部署AI模型后提供的对外服务，接收输入并返回预测结果。通常通过API实现，例如文本生成或图像识别服务，支持批量推理和低延迟响应。</td>
</tr>
<tr class="even">
<td></td>
<td>模型评测</td>
<td>模型评测是指对机器学习模型性能的评估过程，用于确定模型在处理特定数据时的准确度、效率和其他性能指标。它通过比较模型的预测结果与真实值，或者使用预定义的指标来衡量模型在特定任务中的表现。模型评测有助于选择最佳模型，并为模型改进提供指导。</td>
</tr>
<tr class="odd">
<td></td>
<td>数据集</td>
<td>用于AI训练或测试的已标注数据集合，格式多样（如CSV、JSON）。典型例子：ImageNet（图像）、GLUE（自然语言处理）。数据集划分为训练集、验证集和测试集。训练集用于模型训练，验证集用于模型调优，测试集用于评估模型最终性能。</td>
</tr>
<tr class="even">
<td></td>
<td>token</td>
<td>语言模型处理文本的基本单位，可能是单词、子词（如“unhappiness”拆分为“un”“happiness”）或字符。Token数量决定输入长度和计算成本，例如一句英文的Token数可能少于中文（中文需更多Token表达相同语义）。</td>
</tr>
</tbody>
</table>

## 3、产品优势

### 1）具备更强大的算法编排能力

#### 支持知识库自定义编排

许多开发平台（比如coze、dify）将Rag的知识库模块封装为一个组件，难以适应不同的文档情况及解析召回任务需求。LazyLLM企业版将Rag技术中的各个步骤细分为多个子模块和算法（包括检索、rerank等）、用户能够根据具体场景灵活组合排列Rag算法，同时在业界新策略更新时更容易迭代更新。

![](./media/media/7nyvax0mw0191wb6u-jbz.png)

#### 支持多模态输入输出

许多开发平台（比如dify等）的多模态能力局限于生成，无法适应实际场景中多种模态的输入。LazyLLM企业版关注对不同模态（如文本、图像、音频、视频等）数据处理，用户能够输入与输出多种模态信息，提供完成的用户体验。

![](./media/media/lthjgsi7vegd_7icae-8q.png)

### 2）支持本地微调服务

LazyLLM企业版支持微调任务创建、微调任务管理、微调任务监控等全流程微调服务。但是其他开发平台（比如coze、dify等）均不支持微调。

### 3）私有化优势

LazyLLM企业版能够充分利用客户本地算力，非常适合已经采购大量算力的企业并为之提供更具性价比、更安全、更灵活的AI解决方案，让智能应用的开发与部署更加高效。

#### 无需maas平台，可以直接利用本地算力。

Lazy
LLM兼容本地和云算力协同工作，无需额外购买maas平台即可直接将模型运行在本地算力。从而最大化利用企业已有硬件设施，降低额外采购成本。

#### 私有化部署，避免数据泄漏。

  - 平台架构灵活，适配多种硬件环境，支持本地部署和私有化交付

  - 在数据敏感场景（金融、医疗等）确保数据安全，符合合规性要求。

#### 降本增效，高性价比

  - 避免长期租赁云服务，降低算力租赁和带宽成本

  - 支持根据需求动态调整算力资源，更高效支持Agent应用的开发和运行

# 二、功能介绍

## 1、在Studio中搭建应用

搭建一个AI大模型应用主要分为如下几个步骤：

  - 新建应用：创建空白应用或引用模版创建或导入json数据创建。

  - 编辑应用：拖拽各个组件至画布，完成组件内输入输出等配置，并按照数据流动顺序将各组件连接。

  - 应用调试：打开调试功能，查看并解决工作流中的报错，成功运行后，给应用传递输入数据，查看各组件中的输入输出数据是否符合预期并完成调整调优。

  - 应用发布：打开应用发布按钮，即可启用应用。

  - 应用启动：打开应用启动按钮，即可在网页中打开应用并开启应用服务。

### 新建应用

打开产品官网，点击页面右上角的新建应用按钮，即可出现三种创建方式。

1）创建空白应用：从零开始创建应用

2）从应用模版中添加应用：使用模版快速创建应用

3）导入应用json文件：上传json文件一键导入应用

最常见的创建方式是第一种（创建空白应用）。

![](./media/media/kj6tc0mlk5r7uy9q-82kc.png)

![](./media/media/okfecflelhu9nb58zonnr.png)

#### 创建空白应用

点击界面右上方“新建应用”按钮，选择“创建空白应用”

![](./media/media/23bnxri_au6yomyxma-eb.png)

在打开的对话框中上传应用图标、填写应用名称、应用简介，选择应用类别，点击“保存”，即可开始编辑应用。

  - 应用图标：选填

  - 应用名称：必填

  - 应用简介：选填

  - 应用类别：必填

![](./media/media/ewz9lnrjxv3b2p1cokgss.png)

#### 从应用模版中添加应用

选择“从应用模版中添加应用”，即可弹出从模版中创建的弹窗，选择一个应用模版后修改应用的图标、名称、简介、类别，即可开始编辑应用。

  - 我的应用：本人创建并添加为模版的应用

  - 组内应用：权限空间内可查看的应用

  - 内置应用：系统中内置的官方应用模版

![](./media/media/7folettagq5i8ymohouwm.png)

![](./media/media/q8n14tpkjonjsz8-8n4b1.png)

![](./media/media/yjeqkj711xoin8guj9von.png)

#### 导入应用JSON文件

选择“导入应用JSON文件”，导入JSON文件后点击“保存”，可以通过JSON文件创建一个新应用

![](./media/media/qz4qgtyn2v4cjhuyegb6b.png)

![](./media/media/uvb4xftnyyhnj9lhkqxqb.png)

### 编辑应用

新建完成后，会跳转到编辑应用的界面，即画布界面。

左侧是控件栏，分为画布控件和资源控件两类组建，右侧为画布，可以将左侧的控件拖拽至右侧，你可以将节点连接在一起，形成一个无缝的操作链。

  - 画布控件：大模型应用功能型控件，包括基本组件、基础模型、功能模块、控制流。

  - 资源控件：点击“添加资源”，可以将工具或者模型等添加为一个资源，在控件中可以对这些资源进行基本的自定义配置，这些资源会在部分画布控件中使用此资源。（比如工具调用智能体、Rag召回器等）。

首先在画布中，默认有开始和结束两个节点，您可以在开始节点中配置整个工作流所需要的输入项。在开始节点中添加输入参数，定义参数名和参数类型。

![](./media/media/yxwxwz5s77slke93--jpw.png)

其次，在左侧控件栏中，选中需要的画布控件，将其拖拽到画布中，在画布选中控件，右侧会展示这个控件需要配置的具体参数，根据需求填写，并将各个组件按照业务逻辑链接即可。

![](./media/media/1jylchj8hvkcclhpyqb_a.png)

在结束节点配置好参数

![](./media/media/dijjoeoopvlnrrshwp3n8.png)

### 应用预览

点击预览按钮，即可弹出应用预览的弹窗，可在弹窗中进行预览和试用。

![](./media/media/1dq5oyypn9lp0kp_owj8j.png)

### 应用调试

应用调试功能主要是为了对工作流进行测试，看是否有运行错误或者输出效果是否符合用户预期。用户可以通过调试功能，追踪每个节点的输入输出，以可视化监控工作流的运行效果。

在启用调试按钮前，需要观察每个节点是否出现绿色的对勾图标，如果节点中存在报错，需要先修复配置错误。比如结束按钮报错：参数不匹配，请检查连接，则需要点击结束按钮，检查参数是否完成正确配置。

![](./media/media/wwqheyvgvkzk4dkaumou8.png)

![](./media/media/imw5igunjftclbvekprsd.png)

点击启用调试按钮，开始调试，需要等待一段时间。如果调试失败，则会出现调试启用完成后点击运行按钮，会弹出调试窗口。

![](./media/media/3lvuzdphrjp89xkad54cv.png)

调试窗口共分为输入、结果、追踪三个板块。

  - 输入：用于用户单条或多条的输入或上传工作流的输入参数。如果涉及图片等多模态输入，则需要上传图片文件。

  - 结果：完成输入的填写后，点击开始运行，运行成功后即可查看输出结果。您可以查看到运行状态成功与否、消耗的总tokens数，以及输入输出结果。

  - 追踪：会以列表的形式呈现每个组件，点击组件即可查看该组件下的运行情况以及对应的输入输出。

在输入的窗口中，输入参数后点击开始运行，等待运行完成后，可在结果中查看运行结果。

![](./media/media/npr_crmt0cdjbsyuenxll.png)

![](./media/media/6z4ijvgfkej7gye3jb5lx.png)

点击追踪页面，即可查看运行过程每一步的中间结果

![](./media/media/etdhtvgqys2kc3fuq1dsp.png)
![](./media/media/mmjokgarstvuw42m7ezgi.png)

应用调试成功后，点击关闭调试，关闭调试页面。

调试完毕后，您可以选择批量运行。

在批量运行中，您可以将携带多条input数据的csv文件进行上传，也可以手动增加多条数据。点击运行后，可以在右侧依次查看批量输出的运行结果。您可以下载、复制或者全屏查看这些运行结果。

![](./media/media/_zegb3eab67hcnip1dymw.png)
![](./media/media/5ihfivmtivbcoy5ej5v7i.png)

![](./media/media/9zbbllszk-ypez4bfpnze.png)

![](./media/media/xmomms0u2ffkkli3hruyb.png)

### 应用发布

调试好的应用，点击右上角的“发布”按钮，填写版本号，即可完成应用发布

![](./media/media/7hass8y6_hrj0wsitfocw.png)

发布之后返回应用商店，即可看到该应用的状态已经变成了已发布。

![](./media/media/lumir20r1yqhe-ttc5n3s.png)

发布后，可以再次点击以取消发布。每次发布都回记录一次版本，点击版本管理选择之前的版本可以还原回去

![](./media/media/qrscbyoj5zlxvqxrutnv2.png)
![](./media/media/2z1np5kieubgmn4myiray.png)

### 应用启动

#### 通过连接发布启动

应用发布后才可以完成启动操作。点击应用右上角的开关，即可完成启动。启动后该应用的右下角会出现一个链接，点击即可复制链接，在新标签页中打开，即可跳转至该条应用的使用界面，用户可以在对话框中输入问题，进行自动对话。

![](./media/media/jfaj9f6bmcx1t9_dw9md5.png)

打开链接，输入一张书本封面的图片请模型回答，模型给出了正确的答复

![](./media/media/jcrjwzbtltuwuvubwm3xo.png)
![](./media/media/uyeykyxpivqswfroukcu1.png)

#### 通过API发布启动

右边还有个API发布按钮，按下会弹窗显示api接口

![](./media/media/jl8j2cjgtr1-xuwl81u1i.png)
![](./media/media/uy1mve8vypqqi2cfjajfo.png)

使用上面的地址发送post请求，其中在请求头上对Authorization字段设置成"Bearer {api\_key}"
，api\_key在秘钥管理中创建并获取

![](./media/media/htpquazjbljpatmp_tlgf.png)

点击添加秘钥，需要注意使用范围要包括该应用的空间，然后复制秘钥

![](./media/media/hmwntuz2yv_e7vyhmlrbq.png)

使用postman测试，发送数据{"inputs":\["用python实现两数之和"\]}可以得到大模型的如下结果

![](./media/media/gs5ley2jhgb4kzelssihx.png)

发布后可以点击统计分析看板，可以看到应用使用情况

![](./media/media/xfu9yjnpubch_dcbn66cz.png)

![](./media/media/h_yi7hp9mhfp7xwykbksk.png)

### 应用管理

在应用商店页面中，可以在应用列表的上方 基于标签或发布状态或应用启动状态进行筛选查找。也可以在应用列表的操作栏进行如下操作：

  - 导出：导出应用的json数据

  - 模版：将该应用保存至应用模版

  - 删除：删除该条应用

![](./media/media/okbg0c70abcjrco_najqk.png)

## 2、平台组件介绍

平台主要是基于工作流搭建
应用。工作流的核心在于节点（组件），每个节点是一个具有特定功能的独立组件，代表一个独立的步骤或逻辑。这些节点负责处理数据、按规定的跳转逻辑执行任务、运行算法，它们都有输入和输出以及一些配置项。

每个工作流都会默认有一个开始节点和结束节点：

  - 开始节点是工作流的起始节点，需要在开始节点中定义整个工作流需要的输入参数

  - 结束节点用于返回工作流的运行结果

下面将详细介绍所有组件的功能与配置。

### 基本组件

#### 子模块

子模块，即子工作流。在一个工作流中，你可以将另一个工作流作为其中的一个步骤或节点，实现复杂任务的自动化。例如将常用的、标准化的任务处理流程封装为不同的子工作流，并在主工作流的不同分支内调用这些子工作流执行对应的操作。工作流嵌套可实现复杂任务的模块化拆分和处理，使工作流编排逻辑更加灵活、清晰、更易于管理。

点击子模块即可进入子画布界面，您可以在子画布进行工作流编辑。点击上一级画布即可返回。

![](./media/media/sqwpywovsmofpdes8jtsx.png)
![](./media/media/dahujwn8ny8q43wtxq5uq.png)

子模块节点的输入和输出结构取决于子工作流定义的输入输出结构，不支持自定义设置。在子模块节点中你需要为必选的输入参数指定数据来源，支持设置为固定值或引用上游节点的输出参数。

#### 代码块

在代码块中，您可以定义输入变量，并且通过代码定义函数，从而传递输出变量。

<table>
<tbody>
<tr class="odd">
<td><strong>配置</strong></td>
<td><strong>说明</strong></td>
</tr>
<tr class="even">
<td><strong>输入</strong></td>
<td><p>声明代码中需要使用的变量。添加输入参数时需要设置参数名和变量值，其中变量值支持设置为固定值或引用上游节点的输出参数。</p>
<p>在代码中引用输入参数时，直接通过入参input 取值即可。</p></td>
</tr>
<tr class="odd">
<td><strong>代码</strong>：</td>
<td><p>代码节点中需要执行的代码片段。</p>
<ul>
<li><p>引用变量：直接使用输入参数中的变量，通过<strong>return</strong>一个对象来输出处理结果。</p></li>
<li><p>函数限制：不支持编写多个函数。即使仅有一个输出值，也务必保持以对象的形式返回。</p></li>
</ul>
<p>目前仅支持python语言</p></td>
</tr>
<tr class="even">
<td><strong>输出</strong></td>
<td>代码运行成功后，输出的参数。</td>
</tr>
</tbody>
</table>

![](./media/media/jbfbieklqbiwb6ocy0mai.png)

当团队配置了AI能力，界面会显示一个星星按钮，点击即可用AI生成代码

![](./media/media/0wwwvn0iwhadgs1p-xvdq.png)

![](./media/media/hfoiolst6qgk2fw3satau.png)

#### 格式转换器

格式转换器用于格式化解析输出，并提取期望的字段，常用的Formatter有:

  - PythonFormatter，接收 dict 类型输入，直接提取指定字段，多个输入将打包处理。

![](./media/media/vwq9mhhd057nxdouelepj.png)
![](./media/media/azb--hcu6fmjxscu7lan0.png)

  - JsonFormatter，接收 str/list/dict 类型输入，按 JSON
    规则解析后提取我们期望的字段，兼容PythonFormatter

![](./media/media/21sys-icfzocukybxiem5.png)
![](./media/media/ah8h4yujxvs5x3ju8tysm.png)

#### 输入合并器

按照一定规则将多路输入合并。规则包括：

  - 转换为字典

  - 堆叠成数组

  - 累加

  - 连接成字符串

  - 多媒体

转换为字典是将参数名作为key，值为value打包成dict

![](./media/media/axmr-s-kx6fjguxthop21.png)
![](./media/media/xzgubo9jmujoqs_cx5bws.png)

堆叠成数组是将输入打包成list

使用累加可以合并字符串或者实现数字相加

![](./media/media/c-wnue3ffgyqiaw8rnvma.png)
![](./media/media/o6qhniscnc0u19sczg9v2.png)

![](./media/media/dzxsd9vfa3jqcgtb8rsas.png)
![](./media/media/qznt5xv2m-a6ajpwl9zgs.png)

连接成字符串：将多个输入的字符串用symbol连接起来

![](./media/media/rs0telhz0kwvgqpdygdci.png)
![](./media/media/kmt09d6ptpxowxpxozayb.png)

多媒体规则是将输入和文件进行lazyllm编码，最终输出带\<lazyllm-query\>前缀的字符串

### 基础模型

基础模型组件提供当前主流使用的模型服务，包括

  - 大模型：大语言模型，用户输入问题，模型根据问题自动输出回复。

  - 图文理解：多模态模型，用户输入图片和对应的问题，模型自动理解并给出问题回复或图片描述。

  - 文生图：图片生成模型，根据用户的文字描述，生成图片。

  - 语音转文字：用户上传音频文件，模型自动识别并将语音转录为文字。

  - 文字转语音：用户输入文字，模型自动合成语音文件。

#### 大模型

通过调用大语言模型，定义 变量和提示词 以输出大模型回复。

![](./media/media/hlops5b7kh4sepdn7hwt1.png)
![](./media/media/q5qob9a-9mndhv_0inbrd.png)

<table>
<tbody>
<tr class="odd">
<td><strong>配置</strong></td>
<td><strong>说明</strong></td>
</tr>
<tr class="even">
<td><strong>输入</strong></td>
<td>用户自定义输入变量</td>
</tr>
<tr class="odd">
<td><strong>输出</strong></td>
<td>用户自定义输出变量</td>
</tr>
<tr class="even">
<td><strong>模型来源</strong></td>
<td>选择在线大模型或者平台推理服务</td>
</tr>
<tr class="odd">
<td><strong>模型</strong></td>
<td>模型管理列表中的模型，支持选择微调后的模型，也可以在该页面直接创建微调任务。</td>
</tr>
<tr class="even">
<td><strong>提示词模版</strong></td>
<td>可以从prompt模版中选择合适的模版填写提示词</td>
</tr>
<tr class="odd">
<td><strong>提示词</strong></td>
<td>填写系统提示词和用户提示词</td>
</tr>
<tr class="even">
<td><strong>示例对话</strong></td>
<td>可以添加示例问答，帮助模型理解期望的输出格式和回答风格</td>
</tr>
<tr class="odd">
<td><strong>流式输出</strong></td>
<td><p>开：逐字生成反馈结果</p>
<p>关：一次性输出所有结果</p></td>
</tr>
<tr class="even">
<td><strong>支持上下文对话</strong></td>
<td>模型能够收到前轮对话内容以丰富背景信息输入</td>
</tr>
</tbody>
</table>

#### 图文理解

视觉问答模型，根据输入的图片和问题进行回答。

![](./media/media/e19jle7m03vjq7zqvsb17.png)

|           |                          |
| --------- | ------------------------ |
| **配置**    | **说明**                   |
| **输入**    | 用户自定义输入变量，包括图片文件         |
| **输出**    | 用户自定义输出变量                |
| **模型来源**  | 选择在线大模型或者平台推理服务          |
| **提示词模版** | 可以从prompt模版中选择合适的模版填写提示词 |
| **提示词**   | 填写系统提示词和用户提示词            |

#### 文生图

根据输入内容输出图片

![](./media/media/hke0akzm3mgqiwlyvzbdw.png)

|          |                 |
| -------- | --------------- |
| **配置**   | **说明**          |
| **输入**   | 用户自定义输入变量       |
| **输出**   | 图片文件            |
| **模型来源** | 选择在线大模型或者平台推理服务 |

#### 语音转文字

将语音文件转录成文字

![](./media/media/shwyc7tishghp4heghfir.png)

|          |                 |
| -------- | --------------- |
| **配置**   | **说明**          |
| **输入**   | 用户自定义音频文件       |
| **输出**   | 文字              |
| **模型来源** | 选择在线大模型或者平台推理服务 |

#### 文字转语音

可以将文字合成语音

![](./media/media/gaa52zumjqjognapklsqf.png)

|          |                 |
| -------- | --------------- |
| **配置**   | **说明**          |
| **输入**   | 文字              |
| **输出**   | 音频文件            |
| **模型来源** | 选择在线大模型或者平台推理服务 |

### 功能模块

#### 意图识别及意图识别聚合器

##### 意图识别

意图识别节点能够让智能体识别用户输入的意图，并将不同的意图流转至工作流不同的分支处理，提高用户体验，增强智能体的落地效果。

![](./media/media/9ek9pdq-vl-erzvwdzfmo.png)

<table>
<tbody>
<tr class="odd">
<td><strong>配置</strong></td>
<td><strong>说明</strong></td>
</tr>
<tr class="even">
<td><strong>输入</strong></td>
<td>用户自定义</td>
</tr>
<tr class="odd">
<td><strong>输出</strong></td>
<td>用户自定义</td>
</tr>
<tr class="even">
<td><strong>模型来源</strong></td>
<td><p>在线模型</p>
<p>平台推理服务</p></td>
</tr>
<tr class="odd">
<td><strong>模型服务商</strong></td>
<td>sensenova</td>
</tr>
<tr class="even">
<td><strong>模型名</strong></td>
<td>sensechat-5</td>
</tr>
<tr class="odd">
<td><strong>意图识别分类</strong></td>
<td>用户自定义</td>
</tr>
</tbody>
</table>

##### 意图识别聚合器负责

一个意图识别和一个意图识别聚合器配对使用

![](./media/media/ul2hm4mdktmqcliyqeusy.png)

#### http请求

HTTP 请求节点允许用户通过 HTTP 协议发送请求到外部服务，实现数据的获取、提交和交互。支持多种 HTTP
请求方法，并允许用户配置请求参数、请求头、鉴权信息、请求体等，以满足不同的数据交互需求。此外，HTTP
请求节点还提供了超时设置、重试机制，确保请求的可靠性和数据的正确处理。

HTTP 请求节点的作用如下：

  - **数据获取**：从外部服务获取数据，例如从 API 获取用户信息、天气数据等。

  - **数据提交**：向外部服务提交数据，例如提交表单数据等。

  - **数据更新**：更新外部服务中的数据，例如更新用户信息、修改订单状态等。

  - **数据删除**：删除外部服务中的数据，例如删除用户账户、删除订单等。

![](./media/media/pg8sdavrpol2qlstzcdpn.png)

<table>
<tbody>
<tr class="odd">
<td><strong>配置项</strong></td>
<td><strong>说明</strong></td>
</tr>
<tr class="even">
<td>API</td>
<td><p>配置 API 请求地址和方法，支持以下请求方法：</p>
<ul>
<li><p><strong>GET</strong>：用于请求从外部服务获取数据，例如调用 API 获取用户信息、天气数据等。</p></li>
<li><p><strong>POST</strong>：用于向服务器提交数据，例如提交表单。</p></li>
<li><p><strong>HEAD</strong>：类似于 GET 请求，但服务器不返回请求的资源主体，只返回响应头。</p></li>
<li><p><strong>PATCH</strong>：用于在请求-响应链上的每个节点获取传输路径。</p></li>
<li><p><strong>PUT</strong>：用于向服务器上传资源，通常用于更新已存在的资源或创建新的资源。</p></li>
<li><p><strong>DELETE</strong>：用于请求服务器删除指定的资源。</p></li>
</ul></td>
</tr>
<tr class="odd">
<td>API-Key</td>
<td>api认证信息</td>
</tr>
<tr class="even">
<td>请求参数</td>
<td>请求参数是附加在 URL 后面的键值对，用于向服务器传递额外的信息。例如，在搜索请求中，可以通过请求参数传递搜索关键词。</td>
</tr>
<tr class="odd">
<td>请求头</td>
<td>请求头包含客户端的信息，如 User-Agent、Accept 等。通过配置请求头，可以指定客户端的类型、接受的数据格式等信息。</td>
</tr>
<tr class="even">
<td>请求体</td>
<td>请求体是 POST 请求中包含的数据，可以是表单数据、JSON 数据等。根据不同的请求类型和数据格式，可以选择相应的请求体格式，例如 form-data、x-www-form-urlencoded、raw text、JSON 等。</td>
</tr>
<tr class="odd">
<td>请求超时</td>
<td>请求超时时间（秒），超过此时间将触发重试</td>
</tr>
<tr class="even">
<td>重试次数</td>
<td>请求失败时的重试次数，0表示不重试</td>
</tr>
<tr class="odd">
<td>重试间隔</td>
<td>重试间隔时间（毫秒）</td>
</tr>
</tbody>
</table>

#### 工具调用智能体

首先，在工具调用智能体的组件中配置好模型。

|          |                                |
| -------- | ------------------------------ |
| 厂商       | 支持functioncall的模型列表            |
| 商汤       | SenseChat-5-1202               |
|          | SenseChat-Turbo-1202           |
|          | SenseChat-5                    |
| Deepseek | deepseek-r1                    |
|          | deepseek-r1-0528               |
|          | deepseek-v3                    |
| Qwen     | 通义千问-Max                       |
|          | 通义千问-Plus（非思考模式）               |
|          | 通义千问-Turbo（非思考模式）              |
|          | Qwen3（非思考模式）                   |
|          | Qwen2.5                        |
|          | Qwen2                          |
|          | Qwen1.5                        |
| GLM      | glm-4-plus                     |
|          | glm-4-air-250414               |
|          | glm-4-airx                     |
|          | glm-4-long                     |
|          | glm-4-flashx                   |
|          | glm-4-flash-250414             |
| Doubao   | doubao-seed-1.6                |
|          | doubao-seed-1.6-thinking       |
|          | doubao-seed-1.6-flash          |
|          | doubao-1.5-pro-32k             |
|          | doubao-1.5-lite                |
|          | doubao-1.5-vision-pro          |
|          | doubao-1.5-thinking-pro        |
|          | doubao-1.5-thinking-vision-pro |
| Kimi     | moonshot-v1                    |
|          | kimi-latest                    |
| OpenAI   | GPT-4.5 Preview                |
|          | GPT-4.1系列                      |
|          | GPT-4 Turbo                    |
|          | GPT-4o                         |
|          | GPT-4o mini                    |
|          | GPT-4o Realtime                |
|          | o4-mini                        |
|          | o3                             |
|          | o3-mini                        |
|          | o1                             |
|          | o1-pro                         |

其次，在资源控件中创建工具资源，完成相关配置并开启。在工具调用智能体的组件中引用资源控件中的工具资源。

![](./media/media/klt4vj6jxo1mqvqc01ai7.png)

选择高德的天气预报插件工具，进行测试，可以看到模型给出符合预期的结果

![](./media/media/7xyqvrs1qi62egwgysyfz.png)

#### 数据库调用智能体

将输入的自然语言转成sql语句，并操作数据库。在资源控件中添加大模型资源和sql manager资源，并分别进行参数配置。

![](./media/media/-z5cm_mrppz-9yh9lgx1u.png)

#### Rag召回器

知识库检索组件。用于将用户上传至知识库的文件进行解析、切片并配置召回策略。在该组件中，平台提供丰富独特的文章切分方式并进行了封装，便于用户直接选用。同时，为了能够提高召回准确率，该组件也支持先检索较小的切片，再召回出更大的切片。同时，平台也提供不同的相似度计算方式，以适配不同的文档类型。

因此，在该组件中有如下概念可以先行理解：

1）文档解析器：用于对选中的文档进行切片。返回的输出是文档切片集合。在解析器中，支持用不同的切分方式单次或多次切割文本，返回多个文本切片集合，以支持算法在小的切片中找到大切片，从而提升检索准确性。

2）节点组（group）：对原文档按照某种规则划分后的子集形式。例如固定长度切割或大模型提取逐段的摘要内容。节点组决定检索的最小单元

3） 相似度：是召回器用于衡量节点与用户查询问题的相关性的评估标准，不同的相似度计算方式适合不同的文档类型，BM25
适合基于原文统计，Cosine 更适用于向量表达。

首先，要在资源控件中添加文档管理器资源，并在文档管理器中选中文件路径。在资源控件中添加在线向量模型资源，并将其选入文档管理器中的embedding模型。在文档管理器的节点组中，可以添加节点组，用不同的文本切分方式，将文本切片以节点组的形式返回。您可以只使用一种切分方式，即只定义一个节点组，也可以使用多种切片方式，即定义多个节点组。

支持的文本切片方式有：

  - 文本切分：支持配置分段最大长度、分段重叠长度

  - 预处理函数：支持写入python脚本来进行文本分片

  - 模型节点：支持选择大模型资源，选择生成语言（中文、英文），选择人物类型（摘要、关键词）

再到RAG召回器组件，在知识库中选择对应的文档管理器，在文档切片组名中可以选择在文档管理器中定义好的节点组，比如group1，也可以直接使用组件内提供的切片方式。

切片方式分为：

  - 长段分块(coarsechunk)：章节级别分段，适用于结构清晰的大型文档

  - 段落分块(mediumchunk)：段落级别分段，适用于上下文关联强的内容

  - 短句分块(finechunk)：句子级别拆分，适用于精确匹配的场景

  - 自定义节点组

同时可以选择填写目标group，即支持召回句子级别分段的同时也能将其所属的章节级别的分段进行召回。

再定义输出结果数（召回共几条切片）以及输出格式（节点、字典或内容）

![](./media/media/9owug2bk0oiurq3gidtu0.png)

#### Rag重排器

重排是检索算法中的第二个阶段，主要作用是：在初步检索后，通过一个额外的模型对检索结果进行再次排序以提高最终的效果。
在先前的检索过程中对文档切片并没有进行精确的排序，只是返回了前几名的结果，通过重排序过程后，更重要的文档会被返回到更前面，以提高召回准确率和用户体验感受。

重排器中可以选择重排算法类型：

  - module reranker(用大模型排序)

  - keyword filter(用关键词排序)

![](./media/media/11vvphjb3gregrrnkirjc.png)

#### OCR文字识别

文字识别，需要确认推理服务开启

![](./media/media/rso4erc7jtlrap-i4rurv.png)

![](./media/media/zw1nh5crglx2fb02jlfvu.png)

|         |          |
| ------- | -------- |
| **配置项** | **说明**   |
| 推理服务    | 需提前开启    |
| 输入      | 文字图片/pdf |
| 输出      | 文字       |

#### Reader文件读取

文件读取

读取pdf、docx、txt、csv等文件，统一输出为str，与OCR不同的是读取pdf不会识别图片上的文字

![](./media/media/d1knen_ko0acw0rcnlbvj.png)
![](./media/media/zazwrt7ckwdqdvx7_cl6-.png)

#### 问题改写

输入是用户给定的query，您可以配置大模型并填写需求改写的prompt。在知识库检索过程中，对用户输入的语句进行一定程度的修改或优化可以提高检索结果的相关性和准确性。通过问题改写组件可以较好的完成该步骤。

![](./media/media/-adel9qdivw9gpdy0uixc.png)
![](./media/media/fqyeea0repnsezfu88dx9.png)

#### 参数提取器

可以利用大模型，将自然语言中提取一些结构化的参数，用户需要设置要在输入的文本中提取哪些参数，分别为参数设置参数名、类型以及描述，大模型会参考描述进行提取

![](./media/media/c8fgjan88z-0dtflki6vh.png)
![](./media/media/6lrkrd7i_9umx2sxfhfrp.png)

![](./media/media/i14_nihqzf3ez9xahlqgj.png)

### 控制流

#### 批处理

批处理节点用于批量执行部分操作。与子模块类似可以点击批处理节点进入子画布，编辑子工作流。

![](./media/media/a1xv2g3ndlshgmki-2dqe.png)

批处理专门处理list类型的输入参数，在最左侧选择批处理:是开启批处理

![](./media/media/cl1mrd4p6it68es0e85we.png)

进入批处理子画布，设置处理为两个int相加

![](./media/media/t5gzqknvomusgoasuj4r1.png)

输入\[0,1,2\]和\[1,1,1\]，结果正确

![](./media/media/393h9k294ebk3asck46ul.png)

#### 多路选择与多路选择聚合器

##### 多路选择

拖拽多路选择组件，会出现多路选择和多路选择聚合器两个组件。在多路选择中，填写各个case条件，每一个case可以连接不同的其他组件，最终再连接到聚合器。

![](./media/media/zt22csv7zpwwvy-fktdsu.png)

组件用判断代码对输入做处理，根据得到的输出选择对应的case分支走下去

![](./media/media/l6nv4frs7-limsd_qtdkb.png)

##### 多路选择聚合器

#### 条件分支与条件分支聚合器

##### 条件分支

该节点是一个 if-else 节点，用于设计工作流内的分支流程。

当向该节点输入参数时，节点会判断是否符合**如果**区域的条件，符合则执行**如果**对应的工作流分支，否则执行**否则**对应的工作流分支。

每个分支条件支持添加多个判断条件（且/或），同时支持添加多个条件分支，可通过拖拽分支条件配置面板来设定分支条件的优先级。

![](./media/media/jcrsrmfvjmuczdetkrhv4.png)

在条件分支节点里在IF块写python函数，若函数有return，则return的值输出到IF线路，否则把x1输出到else线路

![](./media/media/mkykkct9eyax3le3nabtz.png)

##### 条件分支聚合器

一个条件分支与一个条件分支聚合器配对使用

![](./media/media/ihuqqr1g2-xsoubmkk7yg.png)

#### 循环分支

循环是一种常见的控制机制，用于重复执行一系列任务，直到满足某个条件为止。当需要重复执行一些操作，或循环处理一组数据时，可以使用循环节点实现。点击循环分支可以进入子画布进行编辑循环模块中的工作流。

![](./media/media/04cvmlrmir6zonsmtz9jx.png)

新建一个应用，在画布内添加一个循环分支组件，输入输出为int，循环10次

![](./media/media/33ieth7ejrf8gcnihyfto.png)

双击循环分支进去子画布，添加一个代码块，输入输出皆为int，输出=输入+1，我们输入0进行测试，给出正确

![](./media/media/pqgwykxj7zrpgcoyauqa9.png)
![](./media/media/nchsnrywlgy5ojwlrhfuv.png)

### AI能力管理 

在用户组管理中可以开启AI能力，可以为代码智能生成和Prompt智能生成配置模型，可选已验证api\_key的云服务模型或已开启推理服务的本地模型

![](./media/media/eilngkonrubo6-hoos-jc.png)

![](./media/media/-gcuqmcspegljlv5oa9ru.png)

配置完成后在prompt和代码块会生成AI按钮，注意输入内容会进行大模型意图识别是否有关(比如AI编写提示语，结果输入"你好"，明显与编写提示语无关)，若无关则直接报错返回

![](./media/media/l3fptrzbsj7px-xsp_ra0.png)
![](./media/media/vkhvzzhlwblhyqbpyjsma.png)

![](./media/media/saesee1otyjpgzhmcfmbu.png)

![](./media/media/holz5atw0osag1hj142gi.png)

![](./media/media/aboheb534e8ri34bxpzva.png)

### 传输数据切片

点击画布连接中编辑按钮，可以编辑数据切片设置，有简单和指令两者设置，设置完后数据在传输过程中会先进行切片再输入到节点中

![](./media/media/ms2zyzl66tm6lo80rxyan.png)

![](./media/media/57bmcl1ucwunpsfomxgkd.png)
![](./media/media/zit3fiut9v1j54c-inq2l.png)

![](./media/media/cfwqy6gojwpsrwhgsaarq.png)

## 3、资源库

### 知识库

点击资源库即可找到知识库的入口。您可以在知识库首页中查看到各个知识库的列表。

![](./media/media/ogpkgx2rbvay-qlg2i6_j.png)

点击知识库主页右上角的“新建知识库”按钮，即可弹出新建知识库弹窗，输入知识库名称和简介，选择知识库标签，点击“下一步”，即可完成一个新知识库的创建。

![](./media/media/x0olwmrd52kfyhtpjs_eb.png)

系统会自动跳转至新知识库内，并弹出上传文件的弹窗，您可以在此处进行文件上传。上传完成后，可在文件列表中查看已经上传的文件。可以点击查看或者下载或者删除文件。

![](./media/media/ebndvbuuajm8hdfvffkyl.png)

![](./media/media/ozxkvqmnnblji6w9sq_-k.png)

\[视频暂不支持导出\]

### 数据库

在资源库中，点击数据库，即可查看数据库列表。

您可以直观的看到每条数据库所对应的：

  - 数据库名称

  - 表数量

  - 创建时间

  - 创建人

您可以点击详情查看数据库内容，点击删除按钮删除整个数据库。

![](./media/media/dlyubxftwxbusgo2ci7ov.png)

点击页面右上角的新建数据库，则会弹出新建数据库弹窗。输入数据库名称和简介即可完成数据库新建。进入数据库后，点击新建数据库表，需要填写：

  - 数据库表名

  - 简介

  - 数据库表结构（即表头）

即可完成一张数据表的创建

![](./media/media/cljxbqe9xeccfeb2z_cdb.png)

![](./media/media/t4hkd3uwy7gmyq9lw2ybe.png)

![](./media/media/dsrtn_cabizdrmpbqkeve.png)

返回数据库详情页，即可看到该数据库下所有的表，包括：

  - 表名

  - 数据量

  - 创建时间

  - 创建人

可以支持如下操作：

  - 编辑表结构：增加/修改/删除表格字段（即表头）

  - 编辑表数据：增加/修改/删除表格所包含的数据

  - 数据表详情：查看整张数据表

  - 删除：删除数据表

![](./media/media/pblb7ok7v7tgc8vn0uxkm.png)

点击编辑表结构，点击数据表结构的相关字段或其属性即可进行编辑修改，点击添加字段即可进行添加操作，点击删除按钮则删除该条字段。

![](./media/media/pc_7kkypuhfxxgqtnuplz.png)

点击编辑表数据，点击添加一列数据即可新增单条数据，点击导入数据，则可以上传表格文件进行批量导入。

点击表数据对应的数值即可进行修改编辑。

点击删除按钮即可删除该条数据。

![](./media/media/y6tas76tsb0v47mtpumsc.png)

点击数据表详情，即可预览当前数据表的形态。

![](./media/media/wcxxd8k__onf70qcai31d.png)

\[视频暂不支持导出\]

### Prompt

Prompt，即提示词，该模块包含prompt及prompt模版。其中模版是多数由官方提供的在主流场景下的在大模型中表现较好的prompt内容，用户可以自建prompt模版，也可以基于模版新建prompt。在搭建应用的过程中可以一键使用prompt或prompt模版。

#### 新建Prompt

点击页面右上方“新建Prompt”，即可弹出新建prompt的弹窗，您可以输入：

  - prompt名称（标题）

  - prompt标签（用于分类索引）

  - 简介（会出现在列表中，用于快速识别prompt内容）

  - prompt模版（选择一个模版，模版中的prompt内容会自动填写在prompt内容里）

  - prompt内容（可根据模版内容进行修改改写）

  - 系统角色(必填，若配置AI能力则会出现AI按钮，可以让AI写prompt)

即可保存一条新的prompt记录

![](./media/media/-hknqgva0ukrrhoivnisj.png)

![](./media/media/z4wkc5a7oy-1vkhaukzzj.png)

#### 管理Prompt

在prompt页面中，可以根据标签或创建人进行分类筛选。对于用户自己创建的prompt可以进行编辑或删除操作，平台内置的不可修改。

![](./media/media/kylum-xrhekcoo9dxxrcf.png)

#### 复制Prompt

点击prompt右下角复制按钮，可以以当前Prompt为模板修改并保存出一份新的Prompt

![](./media/media/s7xx9nlskq2gxrqez-jri.png)
![](./media/media/bajncieky6hdlpxno5-hc.png)

\[视频暂不支持导出\]

### 工具

#### 自定义工具

点击工具页面，即可查看所有工具的表单，系统官方发布的工具则会以创建人是“Lazy LLM官方”体现，用户可以直接使用。

![](./media/media/mb7eivtkfgpmjl6zpxb4v.png)

点击“新建工具”，填写工具名称、选择工具标签、填写工具简介，点击“下一步”

![](./media/media/e3uufwub_r386zgm9fyda.png)

工具支持两种创建方式：

  - 外部API创建

  - 在IDE中创建

选择“使用外部API创建”，填写URL和Header信息后，点击“下一步”

![](./media/media/qsaqvcuiwfb8gviscj0o7.png)

填写输入参数和输出参数

![](./media/media/nd_wxsvzyowbzuv8wzxdw.png)
![](./media/media/wfxdifs1azz567cwsl5ab.png)

在调试阶段，输入参数后，点击运行，即可进行调试。测试通过后，点击“保存”，完成工具创建，点击右上角的“发布”，可以将工具发布

![](./media/media/gilgtb70qm6ct0mwbbofo.png)
![](./media/media/y3lq7ygreinzg93liruhr.png)

或选择“在IDE中创建”，编写代码，填写参数后，点击“保存”，并进行工具测试及发布, 此方式有限制：

1、不能调用内置的"exec", "eval", "open", "compile", "getattr", "setattr"函数

2、不能调用os模块的"system", "popen", "remove", "rmdir", "unlink", "rename"

3、不能调用sys模块的"exit", "modules"

4、不能导入"pickle", "subprocess", "socket", "shutil", "requests", "inspect",
"tempfile"模块

5、不能访问os.environ和tempfile

![](./media/media/dysdjplq6lqtfy11vs2rg.png)
![](./media/media/vjnpnfyngxwpashvyq25j.png)

\[视频暂不支持导出\]

#### 插件工具MCP

点击"新建插件"

![](./media/media/axqejycvnwiyoh42b_gnc.png)

输入服务名，选择服务标签，选择传输类型

若传输类型选择STDIO，则需要选择启动命令和填写启动参数和环境变量，点击确定可以看到MCP服务是否同步成功，若选择SSE，需要填写服务URL和请求头

![](./media/media/aczrzgee1up4hmiq8_qjo.png)

![](./media/media/airyr_qswl8_3rkw9cr6q.png)

之后页面会显示插件内含有哪些工具，可以对每一个工具进行测试，一切完成后点击发布即可

![](./media/media/whjawmi5v-slo7ntsvmcm.png)

发布后页面上对应的MCP服务会显示是否开启按钮，点击开始后可以在画布里被引用，注意只有工具测试过才能开启、被引用

![](./media/media/v7-d7dkkvy2zth0o07nk_.png)

\[视频暂不支持导出\]

## 4、模型全流程管理

模型仓库是对平台内支持的各种模型进行管理的模块。您可以在模型仓库中查看并管理上线的模型，也可以进行模型测评。同时，平台也支持使用自己的数据集对模型进行模型微调，以及开启模型的推理服务。

![](./media/media/rbcv9jp8_w89lxmgt9tzr.png)

### 模型管理

在模型管理界面，您可以看到当前所支持的所有模型列表，可以根据服务方式、模型类别、模型标签、模型厂商、可用状态以及下载状态进行分类筛选查找。

![](./media/media/nrv7qmylxofhtykwwsfcd.png)

点击右上角新建模型的按钮，即可上传或从外部平台导入自己的本地模型。支持的新建方式有：

  - huggingface：提供模型路径以及访问令牌

  - modelscope：提供模型路径以及访问令牌

  - 上传模型：本地文件上传

  - 已有模型导入：在平台当前已有的模型列表中选择

![](./media/media/bx-irmynzcsvamcu1aqce.png)

点击相应模型卡片的右上角“设置”按钮，可以为在线模型添加API KEY

![](./media/media/3dlawulxpyo28mcjvnzsh.png)
![](./media/media/gmggbttraqg4ol84foon-.png)

针对未被下载到平台的模型，可以点击进入模型详情，点击右上角下载模型，即可完成下载。

![](./media/media/l9wbevowqfvp7bipm4vd-.png)
![](./media/media/3xdb28xqrwh2h4yq_-ks_.png)

### 模型测评

模型评测模块主要是针对语言大模型进行人工或AI评测，通过准备固定的问答对评测集，评测任务会根据评测集中的问题批量生成回复，和评测集一起输入给裁判模型进行打分。裁判模型根据评测任务中设置的评测规则，对比每一条评测用例的理想回答和实际回答，输出打分和理由。开发者可以下载评测结果，分析评测对象表现不佳的具体问题。

![](./media/media/txj05rh690ft_po8itawr.png)

![](./media/media/j0o4_d0bepvzb8n5sgesc.png)

对评测对象的表现进行评价时，你可以选择由模型打分或人工打分。

<table>
<tbody>
<tr class="odd">
<td><strong>评测方式</strong></td>
<td><strong>说明</strong></td>
</tr>
<tr class="even">
<td>模型打分</td>
<td><p>裁判模型是专用于评估智能体输出质量的辅助模型，该模型在评测中充当裁判员的角色，对评测对象输出的生成结果进行质量评估，并根据评测规则对每一条回复进行打分。裁判模型也可以评测主观问题和开放性问题，只需要用户 Query 和模型回复，即可自动对评测对象的表现进行质量评估与评价，无需人工标注，流程高度自动化，可大幅提高评测效率。</p>
<p>选择模型打分时，需要指定明确、详细、清晰的评分标准。</p></td>
</tr>
<tr class="odd">
<td>人工打分</td>
<td><p>不设置裁判模型和评测规则，评测完毕后直接输出智能体回复列表，由人类评审员来打分、统计分数和评测结果。</p>
<p>人工打分是基于人类偏好的评测方式，评测结果更接近预期，但可能耗费较多的人力资源和时间成本。</p></td>
</tr>
</tbody>
</table>

模型测评功能可以针对模型管理中的模型进行测评。

![](./media/media/u3_kpft3dscaa79l88ron.png)

点击右上角的创建测评任务按钮，即可弹出测评任务弹窗。根据提示，填写测评数据后，点击保存，即可创建一个新的测评任务，测评方式可以选择人工测评或者AI测评。

  - 任务名称

  - 选择模型：在模型管理中的模型列表中选择模型

  - 测评数据集：可以选择在线推理（使用平台中上传的数据集）或离线结果（本地上传测评数据集）

  - 测评方式：人工测评（人工填写测评维度）或AI测评（填写大模型prompt）

![](./media/media/z2uyk7erpttidns1qdxpx.png)

![](./media/media/foxsbjusbgloy-gkrnczo.png)

点击相应测评任务操作列对应的“标注”，可以对测评结果进行标注

![](./media/media/i_4fgntfilduv-c-muenl.png)

![](./media/media/nvha3xouzjw2qpetm6nos.png)

点击相应测评任务操作列对应的“测评报告”，可以查看报告

![](./media/media/zvo237klymbia3gaan2rf.png)

![](./media/media/76ooh4knkuw-nvgl-f3vo.png)

### 模型微调

大模型微调（Fine-tuning）是指在已经预训练好的大型语言模型基础上，使用特定的数据集进行进一步的训练，以使模型适应特定任务或领域。

其根本原理在于，机器学习模型只能够代表它所接收到的数据集的逻辑和理解，而对于其没有获得的数据样本，其并不能很好地识别/理解，且对于大模型而言，也无法很好地回答特定场景下的问题。

例如，一个通用大模型涵盖了许多语言信息，并能够进行流畅的对话。但是如果需要医药方面能够很好地回答患者问题的应用，就需要为这个通用大模型提供很多新的数据以供学习和理解。例如，布洛芬到底能否和感冒药同时吃？为了确定模型可以回答正确，我们就需要对基础模型进行微调。

您可以在模型微调页面，结合自己上传的数据集对上线的模型进行微调。

![](./media/media/xaanf2udsa0vgr1xoh8nl.png)

点击右上角的创建微调，则进入创建微调的弹窗，您可以按需填写基础信息和超参数配置。

  - 任务名称

  - 选择模型：下拉列表即可看到目前已上线支持微调的模型

  - 训练数据集：选择在数据集管理模块管理的数据集版本

  - 验证集占比：定义在训练数据集中抽取一定比例的数据作为验证集

  - 训练模式：包括PT/SFT/RM/PPO/DPO

  - 微调类型：LoRA/QLoRA/Full

超参数配置中可以选择系统默认的偏好设置，也可自定义各参数。

![](./media/media/dntoavbwcyzh_vtmk6m9a.png)

点击发布微调任务即可在任务列表中看到该任务正在运行。

您可以在任务列表中对微调任务进行管理，包括删除和查看。

点击详情可以查看该微调任务的训练状态、用时、所用数据集和模型配置等、训练日志。

![](./media/media/zcoz7ywr7qbzjaxi07dye.png)

### 推理服务

推理服务模块可以针对平台支持的模型进行开启服务。在任务列表中，可以查看每个模型下对应的服务。点击启动后，则该模型服务会变成在线状态，即可以在应用中直接使用。

![](./media/media/bkqwk0gr4lwp5grsoskkd.png)
![](./media/media/8oexg-dps5jf0i6qdi_lh.png)

点击右上角的新建推理服务，即可弹出新建弹窗，您可以选择模型管理中支持的模型，并填写服务名称，支持一次开启多个服务。返回推理服务列表，点击开启任务，即可将服务设置为在线。点击测试按钮，即可弹出测试对话框，测试模型的对话表现。

![](./media/media/-a61ve7d8y0jzfdyyhirc.png)

![](./media/media/ertapko2tngreftasyekt.png)

![](./media/media/vo8rm8lns8uj1i0irlkoc.png)

\[视频暂不支持导出\]

## 5、数据管理

在数据集页面中可以在左侧侧边栏选择数据集管理以对数据集进行上传、清晰、增强等操作，选择脚本管理以对脚本进行增删改查。

![](./media/media/ky02ezdihzmof7ogmjg16.png)

#### 数据集管理

点击右上角的添加数据集，即可弹出添加数据集的弹窗。可以填写：

  - 数据集名称

  - 数据集标签

  - 简介

  - 数据类型（文本数据/图片数据）

  - 导入方式（本地上传/链接导入）

  - 数据集类型：
    
      - alpaca预训练
    
      - alpaca指令微调
    
      - openai指令微调

  - 导入文件：填写url/本地上传文件

即可完成一次新数据集的创建。

![](./media/media/hpig8jh8w3j_b-gwbu_gw.png)

在数据集管理页面，可以对创建的数据集进行删除或者查看详情。

![](./media/media/bd4jzo7y1m3bxdq5mtjv5.png)

点击详情，可以进入数据集详情页，可以对数据集进行操作管理。

点击添加branches，则可以创建数据集副本。

![](./media/media/jmyonoq0o9xmkzw1d-vd_.png)

在数据集各个版本的列表中，可以进行操作：

  - 数据清洗（运行数据清洗脚本对数据集进行清洗操作）

  - 数据增强（运行数据增强脚本对数据集进行增强操作）

  - 详情（查看数据集文件）

  - 删除（删除该版本的数据集）

![](./media/media/xpjywdas2otaudmdvrraz.png)

![](./media/media/_hedoazmtqsf6gnvli80s.png)
![](./media/media/a2ng8szt8cemf0jy4wx7q.png)

\[视频暂不支持导出\]

#### 脚本管理

脚本管理中可以上传多个数据清洗或数据增强的python脚本文件，用于对数据集进行清洗或增强。

![](./media/media/faomhvtpp1elp_lalz_-g.png)

点击“新建脚本”，填写脚本名称、简介，脚本类型可以选择“数据清洗”或者“数据增强”，从本地上传一个.py文件,点击“保存”

![](./media/media/x_irvx--8cbzxro1lskxl.png)

\[视频暂不支持导出\]

# 三、快速开始

## 1、搭建一个AI看图说话智能体

步骤一：创建应用

点击新建应用-创建空白应用，输入应用名称，点击保存。

![](./media/media/yiuxgdh2_tst9fvp4zqvn.png)

步骤二：编辑应用

将图文理解组件拖入画布中央，并点击组件弹出配置弹窗。

![](./media/media/pf_lqo1uwshusvtl6n2fq.png)

在配置项中完成输入和输出的填写、模型的选择以及提示词的编写，可以直接使用默认的提示词，也可以进行一些修改。

  - 输入参数：query（即用户发起询问的用户提示词），file（即用户上传的图片）

  - 输出参数：output（即图文理解大模型返回的输出）

  - 模型：mini-internVL-Chat-2B- V1-5

  - 提示词：你是一个专业的视觉问答助手。请根据提供的图片内容和用户问题，给出准确、详细的回答。

![](./media/media/kwqt_gvfxioq33lvndw6_.png)

![](./media/media/uj97myggr1mr3zhf4w4kx.png)

返回画布界面，将开始、图文理解、结束三个组件按顺序连接。

![](./media/media/hc2cdn5qic6bxg2pawevx.png)

点击开始按钮，配置输入参数，需要和图文理解的输入参数类型保持一致。再点击结束按钮，配置参数，需要和图文理解的输出参数类型保持一致。

![](./media/media/eunp8w6ge-y4khmuinwbx.png)

![](./media/media/r-et3b6jkhbn6d7wbe6t7.png)

点击右上角启用调试，启用成功后点击运行按钮。在运行的输入中填写输入参数配置，并输入一张小猫的图片。

![](./media/media/vbqrl3hnm8ghdxzowub3c.png)

![](./media/media/ftktgjfd35rtqdbn-dthr.png)
![](./media/media/eehv0rqxwa-w0xy9tdgd2.png)

点击开始运行，等待运行完成。运行完成后可以查看运行时长为7秒，输出的结果是：“这是一只猫”。

![](./media/media/hyjpiuimgoi5-aqquhklf.png)

关闭调试模式，点击发布，返回应用商店，可以看到看图说话应用的状态已经是已发布状态，点击启用按钮完成应用开启。

![](./media/media/fy0p2ptxw5djhpg1urpu2.png)

![](./media/media/fybvaeg4nb_g4lrmmjxih.png)

服务启动后，点击复制链接地址，并粘贴到新标签页中。

![](./media/media/ndnpfjgvvz_7ghn1lvlqx.png)

即可得到一个问答界面。在输入框中输入用户提示词，并上传图片。点击发送后，即可得到模型的响应。

![](./media/media/s76i4a8zy1lzpb09scgnd.png)

# 四、技术架构及方案说明

## 1、整体技术架构

万象应用开发平台以LazyLLM为技术框架，LazyLLM是一款低代码构建**多Agent**大模型应用的开发工具，协助开发者用极低的成本构建复杂的AI应用，并可以持续的迭代优化效果。LazyLLM提供了便捷的搭建应用的workflow，并且为应用开发过程中的各个环节提供了大量的标准流程和工具。  
基于LazyLLM的AI应用构建流程是**原型搭建 -\> 数据回流 -\>
迭代优化**，即您可以先基于LazyLLM快速跑通应用的原型，再结合场景任务数据进行bad-case分析，然后对应用中的关键环节进行算法迭代和模型微调，进而逐步提升整个应用的效果。

项目技术文档可见：<https://github.com/LazyAGI/LazyLLM/blob/main/README.CN.md>

![](./media/media/0piq0e-les-htukwmp-i4.png)

## 2、知识库检索技术

在本平台中，RAG可以实现多路召回能力，即设置多个检索器在不同粒度进行检索或使用不同的相似度计算方法进行文档召回，再对所有检索器召回的文档进行排序得到最终上下文的方法。其中包含的各个优化点如下：

1）支持大模型对用户的需求进行改写/扩写。

2）使用节点组概念，设置多种文档切片方式，按照不同粒度和不同相似度计算方式进行文档切片召回

3）使用重排序算法对召回的切片进行重新精排序，使更准确的知识更优先被返回。

![](./media/media/9ww3ijvy92t6gjlxmzvpv.png)

# 五、部署操作说明

# 六、开放API
