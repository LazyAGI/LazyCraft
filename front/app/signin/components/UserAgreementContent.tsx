import React from 'react'

type UserAgreementContentProps = {
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
}

const UserAgreementContent: React.FC<UserAgreementContentProps> = ({ onScroll }) => (
  <div
    style={{
      maxHeight: '500px',
      overflowY: 'auto',
      padding: '20px',
      lineHeight: '1.8',
    }}
    onScroll={onScroll}
  >
    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
      LazyLLM 大装置平台用户协议
    </h3>

    {/* 重要提示警告框 */}
    <div style={{
      padding: '20px',
      backgroundColor: '#fff2e8',
      borderLeft: '4px solid #ff7a00',
      marginBottom: '24px',
      borderRadius: '4px',
    }}
    >
      <h4 style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#d4380d',
        marginTop: 0,
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
      }}
      >
        <span style={{ fontSize: '24px', marginRight: '8px' }}>⚠️</span>
        重要提示
      </h4>
      <p style={{
        fontSize: '16px',
        color: '#d4380d',
        fontWeight: 'bold',
        marginBottom: '8px',
        lineHeight: '1.8',
      }}
      >
        本系统为演示环境，不对用户数据安全做任何保证。
      </p>
      <p style={{ fontSize: '15px', color: '#ad4e00', marginBottom: '8px', lineHeight: '1.8' }}>
        • 演示环境可能随时重置或清空数据
      </p>
      <p style={{ fontSize: '15px', color: '#ad4e00', marginBottom: '8px', lineHeight: '1.8' }}>
        • 请勿在演示环境中存储任何敏感或重要数据
      </p>
      <p style={{ fontSize: '15px', color: '#ad4e00', marginBottom: '8px', lineHeight: '1.8' }}>
        • 演示环境不保证数据的持久性、完整性和安全性
      </p>
      <p style={{
        fontSize: '16px',
        color: '#d4380d',
        fontWeight: 'bold',
        marginTop: '12px',
        marginBottom: 0,
        lineHeight: '1.8',
      }}
      >
        如需长期使用，请进行私有化部署！
        <a href="https://github.com/LazyAGI/LazyCraft" target="_blank" rel="noreferrer">私有化部署</a>
      </p>
    </div>

    {/* 协议条款 */}
    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px' }}>一、平台介绍</h4>
    <p style={{ marginBottom: '12px' }}>
      LazyLLM 是一个强大的大模型智能共生平台，提供模型训练、推理服务、数据管理等一站式解决方案。本协议是您与平台之间的法律协议，请仔细阅读。
    </p>

    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>二、服务说明</h4>
    <p style={{ marginBottom: '12px' }}>平台提供全方位的大模型开发与应用服务：</p>

    <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#1890ff' }}>核心功能模块：</p>
    <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
      <li><strong>应用商店</strong>：浏览和使用各类 AI 应用，包括客服助手、办公助手、代码助手、文本创作等多种场景</li>
      <li><strong>模型仓库</strong>：管理和部署各类大语言模型，支持主流开源模型和私有模型</li>
      <li><strong>模型微调</strong>：对预训练模型进行定制化调整，适配特定业务场景</li>
      <li><strong>推理服务</strong>：快速部署模型推理服务，提供标准 API 接口和云端/平台化服务</li>
      <li><strong>数据集管理</strong>：上传、处理和管理训练数据，支持多种数据格式和预处理工具</li>
      <li><strong>资源库</strong>：管理知识库和数据库资源，为 AI 应用提供数据支持</li>
      <li><strong>Prompt 工程</strong>：设计和管理提示词模板，优化模型输出效果</li>
      <li><strong>工具集成</strong>：集成各类 AI 工具和 MCP 协议，扩展平台能力</li>
    </ul>

    <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#1890ff' }}>应用场景覆盖：</p>
    <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
      <li><strong>办公提效</strong>：文档处理、数据分析、邮件撰写、会议纪要等</li>
      <li><strong>文本创作</strong>：文章生成、内容改写、创意策划、营销文案等</li>
      <li><strong>代码开发</strong>：代码生成、代码审查、Bug 修复、技术文档等</li>
      <li><strong>客户服务</strong>：智能客服、问答系统、工单处理、咨询助手等</li>
      <li><strong>专业服务</strong>：法律咨询、医疗辅助、教育培训、金融分析等</li>
      <li><strong>数据处理</strong>：数据清洗、格式转换、批量处理、报表生成等</li>
      <li><strong>多媒体处理</strong>：图像识别、音频转写、视频分析等</li>
    </ul>

    <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#1890ff' }}>企业级特性：</p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>用户组和权限管理，支持多租户隔离</li>
      <li>完整的日志追踪和成本核算系统</li>
      <li>灵活的配额管理和资源调度</li>
      <li>支持私有化部署，数据完全可控</li>
      <li>提供完整的 API 接口和 SDK</li>
      <li>详细的监控和统计面板</li>
    </ul>

    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>三、用户权利与义务</h4>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>您有权使用平台提供的各项功能和服务</li>
      <li>您应妥善保管账号密码，不得与他人共享</li>
      <li>您应遵守相关法律法规和平台使用规范</li>
      <li>您不得上传违法、违规或侵权内容</li>
      <li>您应合理使用平台资源，注意配额消耗</li>
    </ul>

    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>四、数据安全与隐私</h4>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li><strong style={{ color: '#d4380d' }}>演示环境特别说明：本环境不对数据安全负责，请勿存储重要数据</strong></li>
      <li>生产环境需私有化部署，确保数据完全掌控</li>
      <li>建议定期备份重要数据和模型</li>
      <li>平台不会未经授权访问或泄露您的数据（生产环境）</li>
      <li>请妥善保管 API 密钥等敏感信息</li>
    </ul>

    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>五、安全建议</h4>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>建议定期修改密码，密码应包含字母、数字和特殊字符</li>
      <li>不要在公共计算机上选择&ldquo;记住密码&rdquo;</li>
      <li>发现异常登录行为请立即修改密码并联系管理员</li>
      <li>不要将账号密码或 API 密钥告知他人</li>
    </ul>

    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>六、免责声明</h4>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li><strong style={{ color: '#d4380d' }}>演示环境下，平台对数据丢失、泄露等不承担任何责任</strong></li>
      <li>用户应自行评估使用平台的风险</li>
      <li>因不可抗力导致的服务中断，平台不承担责任</li>
      <li>用户违规使用导致的后果由用户自行承担</li>
    </ul>

    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>七、私有化部署</h4>
    <p style={{ marginBottom: '12px' }}>
      如需长期稳定使用并确保数据安全，强烈建议进行私有化部署：
    </p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>数据完全存储在您的私有环境中</li>
      <li>享有完整的数据控制权和安全保障</li>
      <li>可根据需求定制功能和配置</li>
      <li>获得专业的技术支持和运维服务</li>
    </ul>

    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>八、技术支持</h4>
    <p style={{ marginBottom: '12px' }}>
      如需帮助，可通过以下方式联系我们：
    </p>
    <ul style={{ marginBottom: '12px', paddingLeft: '20px' }}>
      <li>查看在线文档和常见问题解答</li>
      <li>通过工单系统提交技术支持请求</li>
      <li>联系客服团队获取私有化部署方案</li>
    </ul>

    <div style={{
      marginTop: '30px',
      padding: '16px',
      backgroundColor: '#f0f7ff',
      borderRadius: '4px',
      border: '1px solid #d1e9ff',
    }}
    >
      <p style={{ margin: 0, color: '#1890ff', fontWeight: 'bold' }}>
        提示：请滚动到底部后，点击&ldquo;同意并继续&rdquo;按钮。
      </p>
    </div>
  </div>
)

export default UserAgreementContent
